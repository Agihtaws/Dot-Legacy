// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title ISecretSharing
/// @notice Solidity interface matching the Rust PVM contract's ABI
/// @dev Deploy the .polkavm binary first, then use that address here.
///
/// Function selectors (must match SELECTOR_* constants in main.rs):
///   verifyShares:    cast sig "verifyShares(uint256[],uint256[],uint256,bytes32)"
///   reconstructHash: cast sig "reconstructHash(uint256[],uint256[],uint256)"
interface ISecretSharing {
    /// @notice Verify K guardian shares reconstruct to the stored secret
    /// @param shares       Share values from guardians
    /// @param indices      1-based guardian indices (must match will creation)
    /// @param threshold    K — minimum shares needed
    /// @param secretHash   keccak256 of the original secret (stored on will creation)
    /// @return valid       True if shares are valid and reconstruct the correct secret
    function verifyShares(
        uint256[] calldata shares,
        uint256[] calldata indices,
        uint256 threshold,
        bytes32 secretHash
    ) external view returns (bool valid);

    /// @notice Reconstruct and hash the secret from shares (for off-chain tooling)
    /// @param shares     Share values
    /// @param indices    1-based indices
    /// @param threshold  K
    /// @return hash      keccak256 of the reconstructed secret
    function reconstructHash(
        uint256[] calldata shares,
        uint256[] calldata indices,
        uint256 threshold
    ) external pure returns (bytes32 hash);
}
