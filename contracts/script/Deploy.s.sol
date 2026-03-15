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
        // 3. Deploy GuardianManager — needs vault address too, use temp
        //    We deploy a placeholder and re-set after vault is deployed.
        //    For simplicity: deploy vault first, then grant role.
        //
        //    Deployment order:
        //      a) cert (no vault needed in constructor)
        //      b) vault — needs cert + guardianMgr → use pre-computed addresses
        //         OR deploy guardianMgr with msg.sender as temporary vault role,
        //         then grant vault role after
        // ----------------------------------------------------------------

        // Deploy GuardianManager with deployer as temporary VAULT_ROLE holder
        GuardianManager gm = new GuardianManager(deployer);
        console.log("GuardianManager:", address(gm));

        // ----------------------------------------------------------------
        // 4. Deploy LegacyVault
        //    NOTE: PVM contract must be deployed FIRST via cast send --create
        //    Set PVM_SECRET_SHARING_ADDRESS in .env before running this script.
        //    For initial testnet deploy without PVM, use address(0) stub below
        //    and replace once PVM contract is live.
        // ----------------------------------------------------------------
        address pvmAddress = vm.envOr("PVM_SECRET_SHARING_ADDRESS", address(0));

        // For testnet demo without PVM ready: deploy a mock secret sharing stub
        // Replace this with real PVM address once contract.polkavm is deployed
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
    }
}
