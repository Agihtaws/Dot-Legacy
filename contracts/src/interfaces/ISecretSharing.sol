// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title ISecretSharing
/// @notice Interface for the Rust PVM Shamir's Secret Sharing contract
/// @dev Called from LegacyVault to verify guardian shares before distribution
interface ISecretSharing {
    /// @notice Verify that enough valid shares reconstruct the correct secret
    /// @param shares       Array of share values submitted by guardians (uint256 each)
    /// @param indices      Array of share indices (1-based, matching guardian positions)
    /// @param threshold    Minimum shares needed (K in K-of-N)
    /// @param secretHash   keccak256 hash of the original secret stored on-chain at will creation
    /// @return valid       True if shares reconstruct a secret whose hash matches secretHash
    function verifyShares(
        uint256[] calldata shares,
        uint256[] calldata indices,
        uint256 threshold,
        bytes32 secretHash
    ) external view returns (bool valid);

    /// @notice Compute the hash of a reconstructed secret from K shares
    /// @dev Used internally for verification — exposed for off-chain testing
    /// @param shares       Array of share values
    /// @param indices      Array of share indices (1-based)
    /// @param threshold    Minimum shares needed
    /// @return hash        keccak256 of the reconstructed secret
    function reconstructHash(
        uint256[] calldata shares,
        uint256[] calldata indices,
        uint256 threshold
    ) external pure returns (bytes32 hash);
}
