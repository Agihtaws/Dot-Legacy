// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title ILegacyVault
/// @notice External interface for LegacyVault
interface ILegacyVault {
    // -----------------------------------------------------------------------
    // Enums
    // -----------------------------------------------------------------------

    enum WillStatus {
        Active,     // owner is checking in normally
        Warning,    // check-in overdue, within grace period
        Claimable,  // grace period expired, guardians can trigger
        Executing,  // timelock in progress
        Executed,   // assets distributed
        Revoked     // owner cancelled
    }

    // -----------------------------------------------------------------------
    // Structs
    // -----------------------------------------------------------------------

    struct Beneficiary {
        address wallet;
        uint256 sharePercent; // basis points — total must equal 10_000
    }

    struct WillSummary {
        uint256 willId;
        address owner;
        WillStatus status;
        uint256 checkInPeriod;    // seconds
        uint256 gracePeriod;      // seconds — extra window after checkInPeriod
        uint256 lastCheckIn;      // timestamp
        uint256 claimStartTime;   // timestamp when claim was initiated (0 if not started)
        uint256 timelockDelay;    // seconds before distribution executes after claim
        uint256 threshold;        // K in K-of-N guardian scheme
        uint256 totalGuardians;   // N
        uint256 sharesSubmitted;  // how many guardian shares received so far
        bytes32 secretHash;       // hash of the Shamir secret stored on creation
    }

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------

    event WillCreated(uint256 indexed willId, address indexed owner, uint256 checkInPeriod);
    event CheckedIn(uint256 indexed willId, address indexed owner, uint256 nextDeadline);
    event WillEnteredWarning(uint256 indexed willId, address indexed owner, uint256 gracePeriodEnds);
    event ClaimStarted(uint256 indexed willId, uint256 timelockEnds);
    event GuardianShareSubmitted(uint256 indexed willId, address indexed guardian, uint256 sharesTotal);
    event WillExecuted(uint256 indexed willId, address indexed owner);
    event WillRevoked(uint256 indexed willId, address indexed owner);
    event BeneficiaryPaid(uint256 indexed willId, address indexed beneficiary, address token, uint256 amount);

    // -----------------------------------------------------------------------
    // Errors
    // -----------------------------------------------------------------------

    error WillNotFound(uint256 willId);
    error NotWillOwner(uint256 willId);
    error WillNotActive(uint256 willId);
    error WillNotClaimable(uint256 willId);
    error WillNotExecuting(uint256 willId);
    error TimelockNotExpired(uint256 willId, uint256 unlocksAt);
    error CheckInTooEarly(uint256 willId);
    error AlreadySubmittedShare(uint256 willId, address guardian);
    error NotAGuardian(uint256 willId, address caller);
    error InvalidBeneficiaries();
    error InvalidGuardians();
    error InvalidThreshold();
    error ShareVerificationFailed(uint256 willId);
    error PercentagesMustSum10000();
    error NoTokensRegistered();
    error ZeroAddress();
}
