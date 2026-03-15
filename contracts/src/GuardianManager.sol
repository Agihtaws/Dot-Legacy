// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title GuardianManager
/// @notice Manages guardian roles per will using OpenZeppelin AccessControl.
///         Each will has its own set of guardians identified by willId.
///         Guardians are trusted parties who submit Shamir shares to trigger inheritance.
contract GuardianManager is AccessControl {
    // -----------------------------------------------------------------------
    // Roles
    // -----------------------------------------------------------------------

    /// @notice Role granted to the LegacyVault to manage guardian assignments
    bytes32 public constant VAULT_ROLE = keccak256("VAULT_ROLE");

    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------

    /// @notice willId → guardian addresses
    mapping(uint256 => address[]) private _willGuardians;

    /// @notice willId → guardian address → is registered
    mapping(uint256 => mapping(address => bool)) private _isGuardian;

    /// @notice willId → guardian address → index (1-based, for Shamir share index)
    mapping(uint256 => mapping(address => uint256)) private _guardianIndex;

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------

    event GuardiansAssigned(uint256 indexed willId, address[] guardians);
    event GuardiansCleared(uint256 indexed willId);

    // -----------------------------------------------------------------------
    // Errors
    // -----------------------------------------------------------------------

    error DuplicateGuardian(address guardian);
    error GuardianNotFound(uint256 willId, address guardian);

    // -----------------------------------------------------------------------
    // Constructor
    // -----------------------------------------------------------------------

    constructor(address vaultAddress) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VAULT_ROLE, vaultAddress);
    }

    // -----------------------------------------------------------------------
    // Vault-only — called by LegacyVault during will creation
    // -----------------------------------------------------------------------

    /// @notice Assign guardians to a will
    /// @param willId    The will being configured
    /// @param guardians Array of guardian addresses (max 10)
    function assignGuardians(uint256 willId, address[] calldata guardians)
        external
        onlyRole(VAULT_ROLE)
    {
        uint256 len = guardians.length;
        for (uint256 i = 0; i < len; i++) {
            address g = guardians[i];
            if (_isGuardian[willId][g]) revert DuplicateGuardian(g);
            _isGuardian[willId][g] = true;
            _guardianIndex[willId][g] = i + 1; // 1-based index for Shamir
            _willGuardians[willId].push(g);
        }
        emit GuardiansAssigned(willId, guardians);
    }

    /// @notice Clear guardians when a will is executed or revoked
    function clearGuardians(uint256 willId) external onlyRole(VAULT_ROLE) {
        address[] storage guardians = _willGuardians[willId];
        uint256 len = guardians.length;
        for (uint256 i = 0; i < len; i++) {
            address g = guardians[i];
            delete _isGuardian[willId][g];
            delete _guardianIndex[willId][g];
        }
        delete _willGuardians[willId];
        emit GuardiansCleared(willId);
    }

    // -----------------------------------------------------------------------
    // View
    // -----------------------------------------------------------------------

    function isGuardian(uint256 willId, address account) external view returns (bool) {
        return _isGuardian[willId][account];
    }

    function getGuardianIndex(uint256 willId, address guardian) external view returns (uint256) {
        if (!_isGuardian[willId][guardian]) revert GuardianNotFound(willId, guardian);
        return _guardianIndex[willId][guardian];
    }

    function getGuardians(uint256 willId) external view returns (address[] memory) {
        return _willGuardians[willId];
    }

    function getGuardianCount(uint256 willId) external view returns (uint256) {
        return _willGuardians[willId].length;
    }
}
