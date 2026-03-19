# DotLegacy — On-Chain Crypto Inheritance

> Polkadot Solidity Hackathon 2026 · **Track 2: PVM + OpenZeppelin**

$140 billion in crypto is permanently lost every year because people die without leaving access to their wallets. DotLegacy puts your inheritance on-chain — automatic, trustless, no lawyers required.

---

## Links

| | |
|---|---|
| 🌐 Live App | `[PLACEHOLDER]` |
| 🎥 Demo | `[PLACEHOLDER]` |
| 📦 GitHub | https://github.com/Agihtaws/Dot-Legacy |
| 🔍 Vault | [0x327052…Cf86b](https://blockscout-testnet.polkadot.io/address/0x327052a9B195A1a3F78e411f5fe78e76b81Cf86b) |
| 🦀 PVM | [0x37E33f…36Ed](https://blockscout-testnet.polkadot.io/address/0x37E33fAA9148980EC76aAF1179bE02B648e036Ed) |

---

## What Track and Why

This project enters **Track 2 (PVM Smart Contracts)** and the **OpenZeppelin Sponsor Track**.

For Track 2 — the Rust PVM contract does the actual cryptographic verification of Shamir shares using Lagrange interpolation over a 127-bit prime field. It's not just calling a library — the full math is implemented from scratch in `no_std` Rust targeting RISC-V PolkaVM, then called from Solidity via a cross-VM interface. The EVM and PVM sides talk to each other on every inheritance claim.

For OpenZeppelin — the Solidity contracts go well beyond a standard token deployment. `LegacyVault` uses `ReentrancyGuard`, `Pausable`, and `SafeERC20`. `WillCertificate` extends `ERC721` + `ERC721Enumerable`. `GuardianManager` is built on `AccessControl` with proper role separation — deployer privileges are revoked after deployment so the vault is the only authority.

---

## The Problem

Most crypto holders have no plan for what happens when they're gone. Private keys die with people. Seed phrases get lost. Centralized solutions require trusting a company that can go offline, get hacked, or censor you. On-chain inheritance hasn't existed in a meaningful way — until now.

---

## How It Works

**Create a will** — you pick who gets what (beneficiaries with % splits), choose trusted guardians, set a check-in period, and approve which tokens to distribute. A Shamir secret is generated in your browser, split among guardians, and only the `keccak256` hash goes on-chain. Nobody — not even us — can reconstruct your secret alone.

**Check in regularly** — one transaction every few months proves you're alive. Resets the clock.

**If you stop** — the keeper bot marks the will claimable after your deadline passes. Guardians submit their shares on the Claim page. When enough shares arrive, `LegacyVault` calls the Rust PVM contract to verify them. If the math checks out, a 48-hour safety timelock begins.

**Distribution** — after the timelock, anyone can trigger it. Tokens are pulled from your wallet (using the pre-approval) and sent directly to beneficiaries in one transaction. The WillCertificate NFT burns. Done.

The owner can check in or revoke at any point before the timelock expires — so there's always a recovery path.

---

## Architecture

```
Frontend (Next.js + RainbowKit + wagmi)
         │
         ▼
LegacyVault.sol  ──── WillCertificate.sol (ERC-721)
    │                 GuardianManager.sol  (AccessControl)
    │
    ▼  cross-VM call on every claim
Rust PVM Contract (RISC-V / PolkaVM)
  └─ Shamir's Secret Sharing
  └─ Lagrange interpolation over M₁₂₇
  └─ keccak256 verification
         │
         ▼
Backend Keeper (Node.js)
  └─ Watches deadlines via event scanning
  └─ Auto-calls markWarning / markClaimable
  └─ Sends email reminders
  └─ REST API for will registration
```

---

## Contracts

| Contract | Address |
|----------|---------|
| LegacyVault | [0x3270…Cf86b](https://blockscout-testnet.polkadot.io/address/0x327052a9B195A1a3F78e411f5fe78e76b81Cf86b) |
| WillCertificate | [0xBFEe…aa07](https://blockscout-testnet.polkadot.io/address/0xBFEe5E2B30eEB28049f5dAeDe652ACe35d8Daa07) |
| GuardianManager | [0x32F8…38b8](https://blockscout-testnet.polkadot.io/address/0x32F8155E260572b7F036c15C8F25527955dc38b8) |
| PVM Secret Sharing | [0x37E3…36Ed](https://blockscout-testnet.polkadot.io/address/0x37E33fAA9148980EC76aAF1179bE02B648e036Ed) |
| DOT (mock) | [0xf0E5…8320](https://blockscout-testnet.polkadot.io/address/0xf0E53EBb33d0fF826739c1D753220df8642E8320) |
| USDT (mock) | [0x5Ee0…d687](https://blockscout-testnet.polkadot.io/address/0x5Ee07bc463B6eb673666E9156F25cae918c7d687) |
| USDC (mock) | [0x1A00…9791](https://blockscout-testnet.polkadot.io/address/0x1A00B6633615326CFD8e8CA880b655a487BC9791) |

**Network:** Polkadot Hub TestNet · chainId `420420417`

### Testnet vs Production timing

| | Testnet | Production |
|---|---|---|
| Check-in minimum | 10 minutes | 7 days |
| Grace period | 5 minutes | 7 days |
| Timelock delay | 2 minutes | 48 hours |

The short values are for demo purposes. The production values match what you'd actually want in a real will.

---

## Deployment

### 1. Deploy the PVM contract

```bash
cd dotlegacy/pvm-contract

# Run tests first
RUSTFLAGS="" cargo test --no-default-features --target x86_64-pc-windows-msvc

# Build for PolkaVM (RISC-V target)
cargo +nightly -Zjson-target-spec build --release

# Link and strip the binary
polkatool link --strip --output contract.polkavm \
  target/riscv64emac-unknown-none-polkavm/release/contract

# Deploy to Polkadot Hub TestNet
PAYLOAD=$(xxd -p -c 99999 contract.polkavm)
cast send \
  --gas-price 1100gwei \
  --private-key $PRIVATE_KEY \
  --rpc-url https://services.polkadothub-rpc.com/testnet \
  --json \
  --create "0x$PAYLOAD"
```

The response JSON contains your deployed PVM address. Save it as `PVM_SECRET_SHARING_ADDRESS`.

### 2. Verify PVM works before deploying Solidity

```bash
# Test reconstructHash with a known value
cast call $PVM_ADDRESS \
  "reconstructHash(uint256[],uint256[],uint256)(bytes32)" \
  "[42]" "[1]" 1 \
  --rpc-url https://services.polkadothub-rpc.com/testnet
# Should return a valid bytes32, not revert
```

### 3. Deploy Solidity contracts

```bash
cd dotlegacy/contracts

# Set up .env
echo "PRIVATE_KEY=<your_key>" >> .env
echo "RPC_URL=https://services.polkadothub-rpc.com/testnet" >> .env
echo "PVM_SECRET_SHARING_ADDRESS=<address_from_step_1>" >> .env

forge build

forge script script/Deploy.s.sol \
  --rpc-url https://services.polkadothub-rpc.com/testnet \
  --private-key $PRIVATE_KEY \
  --broadcast --legacy --skip-simulation --no-storage-caching
```

### 4. Verify the wiring

```bash
# Check LegacyVault points to the right PVM address
cast call $VAULT_ADDRESS \
  "SECRET_SHARING()(address)" \
  --rpc-url https://services.polkadothub-rpc.com/testnet

# Should return your PVM contract address
```

### 5. Update frontend and backend

In `frontend/config/contracts.ts`, update all addresses to match the deploy output.

In `backend/.env`, set `LEGACY_VAULT_ADDRESS` and `VAULT_DEPLOY_BLOCK` to the new values.

---

## Running Locally

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:3001
npm run dev
```

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Fill in: RPC_URL, LEGACY_VAULT_ADDRESS, KEEPER_PRIVATE_KEY,
#          EMAIL_USER, EMAIL_PASS, EMAIL_FROM, FRONTEND_URL
node src/index.js
```

### MetaMask network config

| Field | Value |
|---|---|
| Network | Polkadot Hub TestNet |
| RPC | https://services.polkadothub-rpc.com/testnet |
| Chain ID | 420420417 |
| Symbol | PAS |
| Explorer | https://blockscout-testnet.polkadot.io |

---

## Tech Stack

**Frontend** — Next.js 16, RainbowKit, wagmi v2, viem v2, Syne + DM Sans, Tailwind CSS v3

**Contracts** — Solidity 0.8.28, OpenZeppelin v5, Foundry

**PVM** — Rust (no_std), RISC-V via polkavm-derive, uapi for host calls

**Backend** — Node.js, Express, viem, nodemailer, node-cron

---

## Security Notes

- Tokens never move until distribution — the vault uses ERC-20 approve, not custody
- Shamir shares are generated client-side and never sent anywhere — only the hash goes on-chain
- After deployment, the deployer's `VAULT_ROLE` on `GuardianManager` is revoked and `DEFAULT_ADMIN_ROLE` is renounced — no backdoor
- `ReentrancyGuard` on all vault state changes, `SafeERC20` for all transfers
- 48-hour timelock gives the owner a window to cancel even after all shares are verified

---

## Production Roadmap

The hackathon version uses mock ERC-20 tokens, which is expected for testnet. In production:

**Real tokens** — use the official Snowbridge-bridged USDT address on Polkadot Hub, and the native DOT precompile address instead of mock contracts.

**XCM** — beneficiaries on other parachains could receive assets cross-chain without bridging manually. One will, multiple chain destinations.

**Snowbridge** — users could bridge ETH or WETH from Ethereum into Polkadot Hub directly, then protect it with DotLegacy.

**Longer timers** — swap the demo values (2 minute timelock) for production ones (48 hours), making it suitable for real inheritance.

---

## Project Structure

```
Dot-Legacy/
├── frontend/               # Next.js app
│   ├── app/page.tsx        # Landing page
│   ├── app/dashboard/      # Will management
│   ├── app/claim/          # Guardian & beneficiary portal
│   ├── components/         # Navbar, ConnectWallet, UI components
│   ├── config/             # Chain definition, contract ABIs + addresses
│   ├── hooks/              # useWill, useCountdown
│   └── lib/                # shamir.ts, utils.ts, wagmi.ts
│
├── backend/                # Keeper + REST API
│   └── src/
│       ├── index.js        # Entry + cron scheduler
│       ├── keeper.js       # Will monitoring
│       ├── api.js          # Express routes
│       ├── contracts.js    # viem calls
│       ├── mailer.js       # Email templates
│       └── registry.js     # JSON persistence
│
├── contracts/              # Solidity
│   ├── src/LegacyVault.sol
│   ├── src/WillCertificate.sol
│   ├── src/GuardianManager.sol
│   └── script/Deploy.s.sol
│
└── pvm-contract/           # Rust PVM (RISC-V)
    └── src/main.rs         # Shamir + Lagrange + keccak256
```

---

Built for the Polkadot Solidity Hackathon 2026 by a solo hacker.