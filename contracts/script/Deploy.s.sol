// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {WillCertificate} from "../src/WillCertificate.sol";
import {GuardianManager} from "../src/GuardianManager.sol";
import {LegacyVault} from "../src/LegacyVault.sol";
import {ERC20Mock} from "../src/mocks/ERC20Mock.sol";

/// @notice Deploy DotLegacy contracts to Polkadot Hub TestNet
/// @dev Run with:
///      forge script script/Deploy.s.sol --rpc-url $RPC_URL \
///        --private-key $PRIVATE_KEY --broadcast --legacy
contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer    = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        // ----------------------------------------------------------------
        // 1. Deploy mock ERC-20 tokens (testnet only)
        // ----------------------------------------------------------------
        ERC20Mock dot  = new ERC20Mock("Polkadot",   "DOT",  10);
        ERC20Mock usdt = new ERC20Mock("Tether USD",  "USDT", 6);
        ERC20Mock usdc = new ERC20Mock("USD Coin",    "USDC", 6);

        // Mint 1M of each to deployer for testing
        dot.mint(deployer,  1_000_000 * 10 ** 10);
        usdt.mint(deployer, 1_000_000 * 10 ** 6);
        usdc.mint(deployer, 1_000_000 * 10 ** 6);

        console.log("DOT  mock:", address(dot));
        console.log("USDT mock:", address(usdt));
        console.log("USDC mock:", address(usdc));

        // ----------------------------------------------------------------
        // 2. Deploy WillCertificate (ERC-721) — vault address set after
        // ----------------------------------------------------------------
        WillCertificate cert = new WillCertificate();
        console.log("WillCertificate:", address(cert));

        // ----------------------------------------------------------------
        // 3. Deploy GuardianManager with deployer as temporary VAULT_ROLE
        //    holder — role will be transferred to vault and revoked below.
        // ----------------------------------------------------------------
        GuardianManager gm = new GuardianManager(deployer);
        console.log("GuardianManager:", address(gm));

        // ----------------------------------------------------------------
        // 4. Deploy LegacyVault
        //    PVM_SECRET_SHARING_ADDRESS must be set in .env
        // ----------------------------------------------------------------
        address pvmAddress = vm.envOr("PVM_SECRET_SHARING_ADDRESS", address(0));

        if (pvmAddress == address(0)) {
            console.log("WARNING: PVM address not set. Deploy pvm-contract first.");
            console.log("Set PVM_SECRET_SHARING_ADDRESS in .env and re-run.");
            vm.stopBroadcast();
            return;
        }

        LegacyVault vault = new LegacyVault(pvmAddress, address(cert), address(gm));
        console.log("LegacyVault:", address(vault));

        // ----------------------------------------------------------------
        // 5. Wire up: grant vault role in GuardianManager + set vault in Cert
        // ----------------------------------------------------------------
        gm.grantRole(gm.VAULT_ROLE(), address(vault));
        cert.setLegacyVault(address(vault));

        // ----------------------------------------------------------------
        // 6. Clean up deployer privileges — vault is now the only authority
        //    Revoke deployer's temporary VAULT_ROLE on GuardianManager
        //    Renounce deployer's DEFAULT_ADMIN_ROLE on GuardianManager
        //    (WillCertificate ownership is kept for emergency pause only)
        // ----------------------------------------------------------------
        gm.revokeRole(gm.VAULT_ROLE(), deployer);
        gm.renounceRole(gm.DEFAULT_ADMIN_ROLE(), deployer);

        vm.stopBroadcast();

        // ----------------------------------------------------------------
        // Summary
        // ----------------------------------------------------------------
        console.log("\n=== DOTLEGACY DEPLOYED ===");
        console.log("Network:           Polkadot Hub TestNet (chainId 420420417)");
        console.log("Deployer:          ", deployer);
        console.log("PVM Risk Engine:   ", pvmAddress);
        console.log("WillCertificate:   ", address(cert));
        console.log("GuardianManager:   ", address(gm));
        console.log("LegacyVault:       ", address(vault));
        console.log("DOT  token:        ", address(dot));
        console.log("USDT token:        ", address(usdt));
        console.log("USDC token:        ", address(usdc));
        console.log("\n=== ROLES ===");
        console.log("GuardianManager VAULT_ROLE:         LegacyVault only");
        console.log("GuardianManager DEFAULT_ADMIN_ROLE: renounced");
        console.log("WillCertificate owner:              ", deployer, "(emergency only)");
    }
}
