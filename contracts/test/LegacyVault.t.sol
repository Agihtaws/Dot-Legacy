// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {LegacyVault} from "../src/LegacyVault.sol";
import {WillCertificate} from "../src/WillCertificate.sol";
import {GuardianManager} from "../src/GuardianManager.sol";
import {ILegacyVault} from "../src/interfaces/ILegacyVault.sol";
import {ERC20Mock} from "../src/mocks/ERC20Mock.sol";

/// @notice Mock PVM secret sharing contract for tests
contract MockSecretSharing {
    bool public shouldVerify = true;

    function setVerify(bool v) external { shouldVerify = v; }

    function verifyShares(
        uint256[] calldata,
        uint256[] calldata,
        uint256,
        bytes32
    ) external view returns (bool) {
        return shouldVerify;
    }

    function reconstructHash(
        uint256[] calldata,
        uint256[] calldata,
        uint256
    ) external pure returns (bytes32) {
        return keccak256("test-secret");
    }
}

contract LegacyVaultTest is Test {
    // -----------------------------------------------------------------------
    // Contracts
    // -----------------------------------------------------------------------
    LegacyVault        vault;
    WillCertificate    cert;
    GuardianManager    gm;
    MockSecretSharing  mockPvm;
    ERC20Mock          usdt;
    ERC20Mock          dot;

    // -----------------------------------------------------------------------
    // Actors
    // -----------------------------------------------------------------------
    address owner      = address(0x1001);
    address beneficiary1 = address(0x2001);
    address beneficiary2 = address(0x2002);
    address guardian1  = address(0x3001);
    address guardian2  = address(0x3002);
    address guardian3  = address(0x3003);
    address stranger   = address(0x9999);

    // -----------------------------------------------------------------------
    // Constants
    // -----------------------------------------------------------------------
    uint256 constant CHECK_IN_PERIOD = 90 days;
    uint256 constant INITIAL_BALANCE = 1000 * 1e6; // 1000 USDT
    bytes32 constant SECRET_HASH = keccak256("test-secret");

    // -----------------------------------------------------------------------
    // Setup
    // -----------------------------------------------------------------------
    function setUp() public {
        // Deploy contracts
        mockPvm = new MockSecretSharing();
        cert    = new WillCertificate();
        gm      = new GuardianManager(address(this)); // temp vault = test contract

        vault = new LegacyVault(address(mockPvm), address(cert), address(gm));

        // Wire up
        cert.setLegacyVault(address(vault));
        gm.grantRole(gm.VAULT_ROLE(), address(vault));

        // Deploy test tokens
        usdt = new ERC20Mock("Tether USD", "USDT", 6);
        dot  = new ERC20Mock("Polkadot",   "DOT",  10);

        // Fund owner
        usdt.mint(owner, INITIAL_BALANCE);
        dot.mint(owner,  INITIAL_BALANCE);
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------
    function _createWill() internal returns (uint256 willId) {
        address[] memory bens   = new address[](2);
        uint256[] memory shares = new uint256[](2);
        address[] memory guards = new address[](3);
        address[] memory tokens = new address[](1);
        uint256[] memory amounts = new uint256[](1);

        bens[0]    = beneficiary1;  shares[0] = 6000; // 60%
        bens[1]    = beneficiary2;  shares[1] = 4000; // 40%
        guards[0]  = guardian1;
        guards[1]  = guardian2;
        guards[2]  = guardian3;
        tokens[0]  = address(usdt);
        amounts[0] = INITIAL_BALANCE;

        // Owner approves vault to spend tokens
        vm.startPrank(owner);
        usdt.approve(address(vault), INITIAL_BALANCE);

        willId = vault.createWill(
            bens, shares, guards,
            2,                   // threshold: 2-of-3
            CHECK_IN_PERIOD,
            tokens, amounts,
            SECRET_HASH,
            "ipfs://QmTest"
        );
        vm.stopPrank();
    }

    function _submitShares(uint256 willId, uint256 count) internal {
        address[3] memory guards = [guardian1, guardian2, guardian3];
        for (uint256 i = 0; i < count; i++) {
            vm.prank(guards[i]);
            vault.submitShare(willId, uint256(keccak256(abi.encodePacked(i))));
        }
    }

    // -----------------------------------------------------------------------
    // Will Creation
    // -----------------------------------------------------------------------
    function test_CreateWill_Success() public {
        uint256 willId = _createWill();
        assertEq(willId, 1);

        ILegacyVault.WillSummary memory s = vault.getWillSummary(willId);
        assertEq(s.owner,         owner);
        assertEq(s.checkInPeriod, CHECK_IN_PERIOD);
        assertEq(s.threshold,     2);
        assertEq(s.totalGuardians, 3);
        assertEq(uint256(s.status), uint256(ILegacyVault.WillStatus.Active));

        // WillCertificate NFT minted to owner
        assertEq(cert.ownerOf(willId), owner);
    }

    function test_CreateWill_PercentagesMustSum10000() public {
        address[] memory bens   = new address[](2);
        uint256[] memory shares = new uint256[](2);
        address[] memory guards = new address[](2);
        address[] memory tokens = new address[](1);
        uint256[] memory amounts = new uint256[](1);

        bens[0] = beneficiary1; shares[0] = 5000; // only 50% — wrong
        bens[1] = beneficiary2; shares[1] = 4000;
        guards[0] = guardian1; guards[1] = guardian2;
        tokens[0] = address(usdt); amounts[0] = 100;

        vm.prank(owner);
        vm.expectRevert(ILegacyVault.PercentagesMustSum10000.selector);
        vault.createWill(bens, shares, guards, 1, 90 days, tokens, amounts, SECRET_HASH, "");
    }

    function test_CreateWill_InvalidThreshold() public {
        address[] memory bens   = new address[](1);
        uint256[] memory shares = new uint256[](1);
        address[] memory guards = new address[](2);
        address[] memory tokens = new address[](1);
        uint256[] memory amounts = new uint256[](1);

        bens[0] = beneficiary1; shares[0] = 10_000;
        guards[0] = guardian1; guards[1] = guardian2;
        tokens[0] = address(usdt); amounts[0] = 100;

        vm.prank(owner);
        vm.expectRevert(ILegacyVault.InvalidThreshold.selector);
        vault.createWill(bens, shares, guards, 5, 90 days, tokens, amounts, SECRET_HASH, ""); // threshold > guardians
    }

    // -----------------------------------------------------------------------
    // Check-in
    // -----------------------------------------------------------------------
    function test_CheckIn_ResetsTimer() public {
        uint256 willId = _createWill();

        // Fast forward 50 days
        vm.warp(block.timestamp + 50 days);

        vm.prank(owner);
        vault.checkIn(willId);

        ILegacyVault.WillSummary memory s = vault.getWillSummary(willId);
        assertEq(s.lastCheckIn, block.timestamp);
        assertEq(uint256(s.status), uint256(ILegacyVault.WillStatus.Active));
    }

    function test_CheckIn_NotOwnerReverts() public {
        uint256 willId = _createWill();
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(ILegacyVault.NotWillOwner.selector, willId));
        vault.checkIn(willId);
    }

    // -----------------------------------------------------------------------
    // Status transitions
    // -----------------------------------------------------------------------
    function test_MarkWarning_AfterCheckInExpiry() public {
        uint256 willId = _createWill();

        vm.warp(block.timestamp + CHECK_IN_PERIOD + 1 days); // past deadline, in grace

        vault.markWarning(willId); // anyone can call

        ILegacyVault.WillSummary memory s = vault.getWillSummary(willId);
        assertEq(uint256(s.status), uint256(ILegacyVault.WillStatus.Warning));
    }

    function test_MarkClaimable_AfterGracePeriod() public {
        uint256 willId = _createWill();

        // Past check-in AND grace period
        vm.warp(block.timestamp + CHECK_IN_PERIOD + 15 days + 1);

        vault.markClaimable(willId);

        ILegacyVault.WillSummary memory s = vault.getWillSummary(willId);
        assertEq(uint256(s.status), uint256(ILegacyVault.WillStatus.Claimable));
    }

    // -----------------------------------------------------------------------
    // Guardian shares + claim
    // -----------------------------------------------------------------------
    function test_SubmitShares_TriggersClaim() public {
        uint256 willId = _createWill();
        vm.warp(block.timestamp + CHECK_IN_PERIOD + 16 days);
        vault.markClaimable(willId);

        // Guardian 1 submits
        vm.prank(guardian1);
        vault.submitShare(willId, 111);

        ILegacyVault.WillSummary memory s = vault.getWillSummary(willId);
        assertEq(s.sharesSubmitted, 1);
        assertEq(uint256(s.status), uint256(ILegacyVault.WillStatus.Claimable));

        // Guardian 2 submits — threshold met (2-of-3) → auto triggers
        vm.prank(guardian2);
        vault.submitShare(willId, 222);

        s = vault.getWillSummary(willId);
        assertEq(uint256(s.status), uint256(ILegacyVault.WillStatus.Executing));
        assertGt(s.claimStartTime, 0);
    }

    function test_SubmitShare_DuplicateReverts() public {
        uint256 willId = _createWill();
        vm.warp(block.timestamp + CHECK_IN_PERIOD + 16 days);
        vault.markClaimable(willId);

        vm.prank(guardian1);
        vault.submitShare(willId, 111);

        vm.prank(guardian1);
        vm.expectRevert(abi.encodeWithSelector(ILegacyVault.AlreadySubmittedShare.selector, willId, guardian1));
        vault.submitShare(willId, 111);
    }

    function test_SubmitShare_StrangerReverts() public {
        uint256 willId = _createWill();
        vm.warp(block.timestamp + CHECK_IN_PERIOD + 16 days);
        vault.markClaimable(willId);

        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(ILegacyVault.NotAGuardian.selector, willId, stranger));
        vault.submitShare(willId, 999);
    }

    function test_PVMVerificationFails_Reverts() public {
        mockPvm.setVerify(false); // PVM returns false

        uint256 willId = _createWill();
        vm.warp(block.timestamp + CHECK_IN_PERIOD + 16 days);
        vault.markClaimable(willId);

        vm.prank(guardian1);
        vault.submitShare(willId, 111);

        vm.prank(guardian2);
        vm.expectRevert(abi.encodeWithSelector(ILegacyVault.ShareVerificationFailed.selector, willId));
        vault.submitShare(willId, 222);
    }

    // -----------------------------------------------------------------------
    // Distribution
    // -----------------------------------------------------------------------
    function test_ExecuteDistribution_Success() public {
        uint256 willId = _createWill();
        vm.warp(block.timestamp + CHECK_IN_PERIOD + 16 days);
        vault.markClaimable(willId);
        _submitShares(willId, 2); // triggers claim → Executing

        // Fast forward past timelock (48 hours)
        vm.warp(block.timestamp + 48 hours + 1);

        uint256 b1Before = usdt.balanceOf(beneficiary1);
        uint256 b2Before = usdt.balanceOf(beneficiary2);

        vault.executeDistribution(willId);

        uint256 b1After = usdt.balanceOf(beneficiary1);
        uint256 b2After = usdt.balanceOf(beneficiary2);

        // beneficiary1 gets 60%, beneficiary2 gets 40%
        assertEq(b1After - b1Before, INITIAL_BALANCE * 6000 / 10_000);
        assertEq(b2After - b2Before, INITIAL_BALANCE * 4000 / 10_000);

        // Will certificate burned
        vm.expectRevert();
        cert.ownerOf(willId);
    }

    function test_ExecuteDistribution_BeforeTimelockReverts() public {
        uint256 willId = _createWill();
        vm.warp(block.timestamp + CHECK_IN_PERIOD + 16 days);
        vault.markClaimable(willId);
        _submitShares(willId, 2);

        // Only 1 hour after claim — timelock not expired
        vm.warp(block.timestamp + 1 hours);

        vm.expectRevert();
        vault.executeDistribution(willId);
    }

    function test_ExecuteDistribution_OwnerSpentSome() public {
        uint256 willId = _createWill();
        vm.warp(block.timestamp + CHECK_IN_PERIOD + 16 days);
        vault.markClaimable(willId);
        _submitShares(willId, 2);
        vm.warp(block.timestamp + 48 hours + 1);

        // Owner spent 400 USDT between will creation and execution
        vm.prank(owner);
        bool success = usdt.transfer(stranger, 400 * 1e6);
        require(success, "transfer failed");

        // Owner now only has 600 USDT — vault sweeps only 600
        vault.executeDistribution(willId);

        // beneficiary1 gets 60% of 600 = 360, beneficiary2 gets 40% of 600 = 240
        assertEq(usdt.balanceOf(beneficiary1), 360 * 1e6);
        assertEq(usdt.balanceOf(beneficiary2), 240 * 1e6);
    }

    // -----------------------------------------------------------------------
    // Revoke
    // -----------------------------------------------------------------------
    function test_RevokeWill_Success() public {
        uint256 willId = _createWill();

        vm.prank(owner);
        vault.revokeWill(willId);

        ILegacyVault.WillSummary memory s = vault.getWillSummary(willId);
        assertEq(uint256(s.status), uint256(ILegacyVault.WillStatus.Revoked));

        // NFT burned
        vm.expectRevert();
        cert.ownerOf(willId);
    }

    function test_RevokeWill_StrangerReverts() public {
        uint256 willId = _createWill();
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(ILegacyVault.NotWillOwner.selector, willId));
        vault.revokeWill(willId);
    }

    // -----------------------------------------------------------------------
    // Multiple wills per owner
    // -----------------------------------------------------------------------
    function test_MultipleWills() public {
        uint256 w1 = _createWill();

        // Create second will with different period
        address[] memory bens   = new address[](1);
        uint256[] memory shares = new uint256[](1);
        address[] memory guards = new address[](2);
        address[] memory tokens = new address[](1);
        uint256[] memory amounts = new uint256[](1);

        bens[0]    = beneficiary1;  shares[0] = 10_000;
        guards[0]  = guardian1;     guards[1]  = guardian2;
        tokens[0]  = address(dot);  amounts[0] = 500;

        vm.startPrank(owner);
        dot.approve(address(vault), 500);
        uint256 w2 = vault.createWill(bens, shares, guards, 1, 180 days, tokens, amounts, SECRET_HASH, "");
        vm.stopPrank();

        assertEq(w1, 1);
        assertEq(w2, 2);

        uint256[] memory ownerWills = vault.getOwnerWills(owner);
        assertEq(ownerWills.length, 2);
    }
}
