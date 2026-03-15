// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title WillCertificate
/// @notice ERC-721 NFT issued to a will creator on DotLegacy.
///         Each token represents one active on-chain will.
///         Burned when the will is executed or revoked.
/// @dev Only the LegacyVault contract can mint and burn certificates.
contract WillCertificate is ERC721, ERC721Enumerable, Ownable {
    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------

    /// @notice Address of the LegacyVault — the only minter/burner
    address public legacyVault;

    /// @notice willId → IPFS / data URI of the will metadata
    mapping(uint256 => string) private _willUris;

    // -----------------------------------------------------------------------
    // Errors
    // -----------------------------------------------------------------------

    error OnlyLegacyVault();
    error VaultAlreadySet();

    // -----------------------------------------------------------------------
    // Modifiers
    // -----------------------------------------------------------------------

    modifier onlyVault() {
        _checkVault();
        _;
    }

    function _checkVault() internal view {
        if (msg.sender != legacyVault) revert OnlyLegacyVault();
    }

    // -----------------------------------------------------------------------
    // Constructor
    // -----------------------------------------------------------------------

    constructor() ERC721("DotLegacy Will Certificate", "DLWC") Ownable(msg.sender) {}

    // -----------------------------------------------------------------------
    // Admin — called once after LegacyVault is deployed
    // -----------------------------------------------------------------------

    /// @notice Set the vault address. Can only be called once by the deployer.
    function setLegacyVault(address _vault) external onlyOwner {
        if (legacyVault != address(0)) revert VaultAlreadySet();
        if (_vault == address(0)) revert OnlyLegacyVault();
        legacyVault = _vault;
    }

    // -----------------------------------------------------------------------
    // Vault-only functions
    // -----------------------------------------------------------------------

    /// @notice Mint a certificate to the will creator
    /// @param to       Will creator's address
    /// @param willId   Unique will ID (used as token ID)
    /// @param uri      Metadata URI (JSON with beneficiaries, period, etc.)
    function mint(address to, uint256 willId, string calldata uri) external onlyVault {
        _safeMint(to, willId);
        _willUris[willId] = uri;
    }

    /// @notice Burn a certificate when the will is executed or revoked
    /// @param willId   Token ID to burn
    function burn(uint256 willId) external onlyVault {
        _burn(willId);
        delete _willUris[willId];
    }

    // -----------------------------------------------------------------------
    // View
    // -----------------------------------------------------------------------

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return _willUris[tokenId];
    }

    // -----------------------------------------------------------------------
    // Required overrides (ERC721 + ERC721Enumerable)
    // -----------------------------------------------------------------------

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
