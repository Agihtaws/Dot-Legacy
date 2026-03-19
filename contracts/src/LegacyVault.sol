// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ISecretSharing} from "./interfaces/ISecretSharing.sol";
import {ILegacyVault} from "./interfaces/ILegacyVault.sol";
import {WillCertificate} from "./WillCertificate.sol";
import {GuardianManager} from "./GuardianManager.sol";

/// @title LegacyVault
/// @notice Core DotLegacy contract. Owners register their will on-chain,
///         check in periodically to prove they are alive, and if they stop
///         checking in, guardians use Shamir's Secret Sharing (verified by
///         the Rust PVM contract) to trigger distribution to beneficiaries.
///
/// @dev Architecture:
///      - Assets stay in the OWNER'S wallet via ERC-20 pre-approvals.
///        The vault only holds the config — not the tokens — until distribution.
///      - Shamir share verification is delegated to the PVM contract (ISecretSharing).
///      - Distribution is delayed by a configurable timelock for safety.
///      - Each will is represented by a WillCertificate ERC-721 NFT.
///      - Guardian roles are managed by GuardianManager (OZ AccessControl).
contract LegacyVault is ILegacyVault, ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    // -----------------------------------------------------------------------
    // Constants
    // -----------------------------------------------------------------------

    uint256 public constant BASIS_POINTS         = 10_000;
    uint256 public constant MIN_CHECK_IN_PERIOD  = 10 minutes;
    uint256 public constant MAX_CHECK_IN_PERIOD  = 365 days;
    uint256 public constant GRACE_PERIOD         = 5 minutes;
    uint256 public constant TIMELOCK_DELAY       = 2 minutes;
    uint256 public constant MAX_BENEFICIARIES    = 10;
    uint256 public constant MAX_GUARDIANS        = 10;
    uint256 public constant MAX_TOKENS_PER_WILL  = 10;

    // -----------------------------------------------------------------------
    // Immutables
    // -----------------------------------------------------------------------

    ISecretSharing   public immutable SECRET_SHARING;
    WillCertificate  public immutable WILL_CERTIFICATE;
    GuardianManager  public immutable GUARDIAN_MANAGER;

    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------

    uint256 private _nextWillId;

    /// @dev Core will configuration (non-mapping fields)
    struct WillCore {
        address owner;
        WillStatus status;
        uint256 checkInPeriod;   // seconds
        uint256 lastCheckIn;     // unix timestamp
        uint256 claimStartTime;  // when startClaim() was called (0 if not started)
        uint256 threshold;       // K — min guardians needed
        bytes32 secretHash;      // hash of the Shamir secret
        uint256 sharesSubmitted; // how many guardian shares received
    }

    /// @dev Token allowance registered by owner at will creation
    struct TokenAllowance {
        address token;   // ERC-20 contract address
        uint256 amount;  // max amount vault is authorised to sweep
    }

    mapping(uint256 => WillCore) private _wills;
    mapping(uint256 => Beneficiary[]) private _beneficiaries;
    mapping(uint256 => TokenAllowance[]) private _tokens;

    /// @dev willId → guardian address → share value submitted
    mapping(uint256 => mapping(address => uint256)) private _guardianShares;
    /// @dev willId → guardian address → has submitted
    mapping(uint256 => mapping(address => bool)) private _hasSubmitted;

    /// @dev owner address → active will IDs
    mapping(address => uint256[]) private _ownerWills;

    // -----------------------------------------------------------------------
    // Constructor
    // -----------------------------------------------------------------------

    /// @param _secretSharing  Address of the deployed Rust PVM contract
    /// @param _certificate    Address of the WillCertificate ERC-721 contract
    /// @param _guardianMgr    Address of the GuardianManager contract
    constructor(
        address _secretSharing,
        address _certificate,
        address _guardianMgr
    ) Ownable(msg.sender) {
        if (_secretSharing == address(0)) revert ZeroAddress();
        if (_certificate   == address(0)) revert ZeroAddress();
        if (_guardianMgr   == address(0)) revert ZeroAddress();

        SECRET_SHARING   = ISecretSharing(_secretSharing);
        WILL_CERTIFICATE = WillCertificate(_certificate);
        GUARDIAN_MANAGER = GuardianManager(_guardianMgr);
    }

    // -----------------------------------------------------------------------
    // Owner — create / manage will
    // -----------------------------------------------------------------------

    /// @notice Create a new on-chain will
    /// @param beneficiaries_   Array of beneficiary addresses
    /// @param sharePercents_   Basis-point splits (must sum to 10_000)
    /// @param guardians_       Array of guardian addresses
    /// @param threshold_       Minimum guardians needed to trigger inheritance (K-of-N)
    /// @param checkInPeriod_   Seconds between required check-ins (7d – 365d)
    /// @param tokens_          ERC-20 token addresses the owner pre-approves
    /// @param amounts_         Corresponding approved amounts per token
    /// @param secretHash_      keccak256 of the Shamir secret (generated client-side)
    /// @param metadataUri_     IPFS URI for WillCertificate NFT metadata
    /// @return willId          The newly created will ID
    function createWill(
        address[]  calldata beneficiaries_,
        uint256[]  calldata sharePercents_,
        address[]  calldata guardians_,
        uint256             threshold_,
        uint256             checkInPeriod_,
        address[]  calldata tokens_,
        uint256[]  calldata amounts_,
        bytes32             secretHash_,
        string     calldata metadataUri_
    ) external whenNotPaused nonReentrant returns (uint256 willId) {
        // --- Validation ---
        if (beneficiaries_.length == 0 || beneficiaries_.length > MAX_BENEFICIARIES)
            revert InvalidBeneficiaries();
        if (beneficiaries_.length != sharePercents_.length)
            revert InvalidBeneficiaries();
        if (guardians_.length == 0 || guardians_.length > MAX_GUARDIANS)
            revert InvalidGuardians();
        if (threshold_ == 0 || threshold_ > guardians_.length)
            revert InvalidThreshold();
        if (checkInPeriod_ < MIN_CHECK_IN_PERIOD || checkInPeriod_ > MAX_CHECK_IN_PERIOD)
            revert WillNotActive(0);
        if (tokens_.length == 0 || tokens_.length > MAX_TOKENS_PER_WILL)
            revert NoTokensRegistered();
        if (tokens_.length != amounts_.length)
            revert NoTokensRegistered();

        // --- Percentages must sum to 10_000 basis points ---
        uint256 total = 0;
        for (uint256 i = 0; i < sharePercents_.length; i++) {
            total += sharePercents_[i];
        }
        if (total != BASIS_POINTS) revert PercentagesMustSum10000();

        // --- Assign will ID ---
        willId = ++_nextWillId;

        // --- Store core will ---
        _wills[willId] = WillCore({
            owner:          msg.sender,
            status:         WillStatus.Active,
            checkInPeriod:  checkInPeriod_,
            lastCheckIn:    block.timestamp,
            claimStartTime: 0,
            threshold:      threshold_,
            secretHash:     secretHash_,
            sharesSubmitted: 0
        });

        // --- Store beneficiaries ---
        for (uint256 i = 0; i < beneficiaries_.length; i++) {
            if (beneficiaries_[i] == address(0)) revert ZeroAddress();
            _beneficiaries[willId].push(Beneficiary({
                wallet:       beneficiaries_[i],
                sharePercent: sharePercents_[i]
            }));
        }

        // --- Store token allowances ---
        for (uint256 i = 0; i < tokens_.length; i++) {
            if (tokens_[i] == address(0)) revert ZeroAddress();
            _tokens[willId].push(TokenAllowance({
                token:  tokens_[i],
                amount: amounts_[i]
            }));
        }

        // --- Register guardians in GuardianManager ---
        GUARDIAN_MANAGER.assignGuardians(willId, guardians_);

        // --- Track by owner ---
        _ownerWills[msg.sender].push(willId);

        // --- Mint will certificate NFT ---
        WILL_CERTIFICATE.mint(msg.sender, willId, metadataUri_);

        emit WillCreated(willId, msg.sender, checkInPeriod_);
    }

    /// @notice Owner proves they are alive — resets the check-in timer
    /// @dev Can be called any time while the will is Active or Warning
    function checkIn(uint256 willId) external nonReentrant {
        WillCore storage w = _wills[willId];
        if (w.owner != msg.sender)                     revert NotWillOwner(willId);
        if (w.status == WillStatus.Executed)           revert WillNotActive(willId);
        if (w.status == WillStatus.Revoked)            revert WillNotActive(willId);
        if (w.status == WillStatus.Executing)          revert WillNotActive(willId);

        // Reset to Active and update timer
        w.status      = WillStatus.Active;
        w.lastCheckIn = block.timestamp;

        uint256 nextDeadline = block.timestamp + w.checkInPeriod;
        emit CheckedIn(willId, msg.sender, nextDeadline);
    }

    /// @notice Owner permanently cancels their will
    function revokeWill(uint256 willId) external nonReentrant {
        WillCore storage w = _wills[willId];
        if (w.owner != msg.sender)           revert NotWillOwner(willId);
        if (w.status == WillStatus.Executed) revert WillNotActive(willId);
        if (w.status == WillStatus.Revoked)  revert WillNotActive(willId);

        w.status = WillStatus.Revoked;

        GUARDIAN_MANAGER.clearGuardians(willId);
        WILL_CERTIFICATE.burn(willId);

        emit WillRevoked(willId, msg.sender);
    }

    // -----------------------------------------------------------------------
    // Public — anyone can call to update status
    // -----------------------------------------------------------------------

    /// @notice Mark a will as Warning if the check-in period has passed
    ///         but the grace period has not yet expired
    function markWarning(uint256 willId) external {
        WillCore storage w = _wills[willId];
        if (w.status != WillStatus.Active)  revert WillNotActive(willId);

        uint256 deadline = w.lastCheckIn + w.checkInPeriod;
        require(block.timestamp > deadline, "Check-in period not expired");
        require(block.timestamp < deadline + GRACE_PERIOD, "Grace period expired, use markClaimable");

        w.status = WillStatus.Warning;
        emit WillEnteredWarning(willId, w.owner, deadline + GRACE_PERIOD);
    }

    /// @notice Mark a will as Claimable once both check-in and grace periods have passed
    function markClaimable(uint256 willId) external {
        WillCore storage w = _wills[willId];
        if (w.status != WillStatus.Active && w.status != WillStatus.Warning)
            revert WillNotActive(willId);

        uint256 claimableAt = w.lastCheckIn + w.checkInPeriod + GRACE_PERIOD;
        require(block.timestamp > claimableAt, "Grace period not expired");

        w.status = WillStatus.Claimable;
    }

    // -----------------------------------------------------------------------
    // Guardians — submit shares and trigger distribution
    // -----------------------------------------------------------------------

    /// @notice Guardian submits their Shamir share for a claimable will
    /// @param willId   The will being claimed
    /// @param share    The guardian's Shamir share value
    function submitShare(uint256 willId, uint256 share) external nonReentrant {
        WillCore storage w = _wills[willId];
        if (w.status != WillStatus.Claimable) revert WillNotClaimable(willId);
        if (!GUARDIAN_MANAGER.isGuardian(willId, msg.sender))
            revert NotAGuardian(willId, msg.sender);
        if (_hasSubmitted[willId][msg.sender])
            revert AlreadySubmittedShare(willId, msg.sender);

        _guardianShares[willId][msg.sender] = share;
        _hasSubmitted[willId][msg.sender]   = true;
        w.sharesSubmitted++;

        emit GuardianShareSubmitted(willId, msg.sender, w.sharesSubmitted);

        // Auto-trigger if threshold is met
        if (w.sharesSubmitted >= w.threshold) {
            _startClaim(willId, w);
        }
    }

    // -----------------------------------------------------------------------
    // Distribution — execute after timelock
    // -----------------------------------------------------------------------

    /// @notice Execute distribution after the timelock delay has passed
    /// @dev Anyone can call this — the timelock is enforced on-chain
    function executeDistribution(uint256 willId) external nonReentrant whenNotPaused {
        WillCore storage w = _wills[willId];
        if (w.status != WillStatus.Executing) revert WillNotExecuting(willId);

        uint256 unlocksAt = w.claimStartTime + TIMELOCK_DELAY;
        if (block.timestamp < unlocksAt) revert TimelockNotExpired(willId, unlocksAt);

        w.status = WillStatus.Executed;

        // Distribute each registered token to beneficiaries
        address owner_            = w.owner;
        Beneficiary[] storage bens = _beneficiaries[willId];
        TokenAllowance[] storage toks = _tokens[willId];

        for (uint256 t = 0; t < toks.length; t++) {
            IERC20 token        = IERC20(toks[t].token);
            uint256 maxAmount   = toks[t].amount;

            // Sweep only what is available (owner may have spent some)
            uint256 ownerBalance = token.balanceOf(owner_);
            uint256 ownerAllowance = token.allowance(owner_, address(this));
            uint256 sweepable   = _min(maxAmount, _min(ownerBalance, ownerAllowance));

            if (sweepable == 0) continue;

            // Pull from owner into vault, then push to each beneficiary
            token.safeTransferFrom(owner_, address(this), sweepable);

            for (uint256 b = 0; b < bens.length; b++) {
                uint256 payout = (sweepable * bens[b].sharePercent) / BASIS_POINTS;
                if (payout > 0) {
                    token.safeTransfer(bens[b].wallet, payout);
                    emit BeneficiaryPaid(willId, bens[b].wallet, address(token), payout);
                }
            }
        }

        // Clean up guardian state and burn certificate
        GUARDIAN_MANAGER.clearGuardians(willId);
        WILL_CERTIFICATE.burn(willId);

        emit WillExecuted(willId, owner_);
    }

    // -----------------------------------------------------------------------
    // Admin
    // -----------------------------------------------------------------------

    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // -----------------------------------------------------------------------
    // View
    // -----------------------------------------------------------------------

    function getWillSummary(uint256 willId) external view returns (WillSummary memory) {
        WillCore storage w = _wills[willId];
        if (w.owner == address(0)) revert WillNotFound(willId);

        return WillSummary({
            willId:          willId,
            owner:           w.owner,
            status:          w.status,
            checkInPeriod:   w.checkInPeriod,
            gracePeriod:     GRACE_PERIOD,
            lastCheckIn:     w.lastCheckIn,
            claimStartTime:  w.claimStartTime,
            timelockDelay:   TIMELOCK_DELAY,
            threshold:       w.threshold,
            totalGuardians:  GUARDIAN_MANAGER.getGuardianCount(willId),
            sharesSubmitted: w.sharesSubmitted,
            secretHash:      w.secretHash
        });
    }

    function getBeneficiaries(uint256 willId) external view returns (Beneficiary[] memory) {
        return _beneficiaries[willId];
    }

    function getTokens(uint256 willId)
        external view returns (address[] memory tokens, uint256[] memory amounts)
    {
        TokenAllowance[] storage toks = _tokens[willId];
        tokens  = new address[](toks.length);
        amounts = new uint256[](toks.length);
        for (uint256 i = 0; i < toks.length; i++) {
            tokens[i]  = toks[i].token;
            amounts[i] = toks[i].amount;
        }
    }

    function getOwnerWills(address owner_) external view returns (uint256[] memory) {
        return _ownerWills[owner_];
    }

    function isClaimable(uint256 willId) external view returns (bool) {
        WillCore storage w = _wills[willId];
        return block.timestamp > w.lastCheckIn + w.checkInPeriod + GRACE_PERIOD
            && w.status != WillStatus.Executed
            && w.status != WillStatus.Revoked
            && w.status != WillStatus.Executing;
    }

    function getNextCheckInDeadline(uint256 willId) external view returns (uint256) {
        return _wills[willId].lastCheckIn + _wills[willId].checkInPeriod;
    }

    // -----------------------------------------------------------------------
    // Internal
    // -----------------------------------------------------------------------

    function _startClaim(uint256 willId, WillCore storage w) internal {
        // Collect submitted shares and indices for PVM verification
        address[] memory guardians_ = GUARDIAN_MANAGER.getGuardians(willId);
        uint256 k = w.threshold;

        uint256[] memory shares  = new uint256[](k);
        uint256[] memory indices = new uint256[](k);
        uint256 count = 0;

        for (uint256 i = 0; i < guardians_.length && count < k; i++) {
            address g = guardians_[i];
            if (_hasSubmitted[willId][g]) {
                shares[count]  = _guardianShares[willId][g];
                indices[count] = GUARDIAN_MANAGER.getGuardianIndex(willId, g);
                count++;
            }
        }

        // Call Rust PVM contract to verify Shamir shares
        bool valid = SECRET_SHARING.verifyShares(shares, indices, k, w.secretHash);
        if (!valid) revert ShareVerificationFailed(willId);

        // Start timelock
        w.status         = WillStatus.Executing;
        w.claimStartTime = block.timestamp;

        emit ClaimStarted(willId, block.timestamp + TIMELOCK_DELAY);
    }

    function _min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
}
