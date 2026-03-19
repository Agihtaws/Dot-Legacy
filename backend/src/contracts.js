import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount }                          from 'viem/accounts';
import { config }                                       from './config.js';

// -----------------------------------------------------------------------
// Chain definition
// -----------------------------------------------------------------------
const polkadotTestnet = {
  id:   config.chainId,
  name: 'Polkadot Hub TestNet',
  nativeCurrency: { name: 'PAS', symbol: 'PAS', decimals: 18 },
  rpcUrls: { default: { http: [config.rpcUrl] } },
};

// -----------------------------------------------------------------------
// Clients
// -----------------------------------------------------------------------
export const publicClient = createPublicClient({
  chain:     polkadotTestnet,
  transport: http(config.rpcUrl),
});

const keeperAccount = privateKeyToAccount(config.keeperPrivateKey);

export const walletClient = createWalletClient({
  account:   keeperAccount,
  chain:     polkadotTestnet,
  transport: http(config.rpcUrl),
});

console.log(`🔑 Keeper wallet: ${keeperAccount.address}`);

// -----------------------------------------------------------------------
// LegacyVault ABI
// -----------------------------------------------------------------------
export const VAULT_ABI = [
  {
    name: 'getWillSummary',
    type: 'function',
    stateMutability: 'view',
    inputs:  [{ name: 'willId', type: 'uint256' }],
    outputs: [{
      name: '', type: 'tuple',
      components: [
        { name: 'willId',          type: 'uint256' },
        { name: 'owner',           type: 'address' },
        { name: 'status',          type: 'uint8'   },
        { name: 'checkInPeriod',   type: 'uint256' },
        { name: 'gracePeriod',     type: 'uint256' },
        { name: 'lastCheckIn',     type: 'uint256' },
        { name: 'claimStartTime',  type: 'uint256' },
        { name: 'timelockDelay',   type: 'uint256' },
        { name: 'threshold',       type: 'uint256' },
        { name: 'totalGuardians',  type: 'uint256' },
        { name: 'sharesSubmitted', type: 'uint256' },
        { name: 'secretHash',      type: 'bytes32' },
      ],
    }],
  },
  {
    name: 'getNextCheckInDeadline',
    type: 'function',
    stateMutability: 'view',
    inputs:  [{ name: 'willId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'isClaimable',
    type: 'function',
    stateMutability: 'view',
    inputs:  [{ name: 'willId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'markWarning',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs:  [{ name: 'willId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'markClaimable',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs:  [{ name: 'willId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'WillCreated',
    type: 'event',
    inputs: [
      { name: 'willId',        type: 'uint256', indexed: true  },
      { name: 'owner',         type: 'address', indexed: true  },
      { name: 'checkInPeriod', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'WillExecuted',
    type: 'event',
    inputs: [
      { name: 'willId', type: 'uint256', indexed: true },
      { name: 'owner',  type: 'address', indexed: true },
    ],
  },
  {
    name: 'WillRevoked',
    type: 'event',
    inputs: [
      { name: 'willId', type: 'uint256', indexed: true },
      { name: 'owner',  type: 'address', indexed: true },
    ],
  },
];

// -----------------------------------------------------------------------
// WillStatus enum
// -----------------------------------------------------------------------
export const WillStatus = {
  0: 'Active', 1: 'Warning', 2: 'Claimable',
  3: 'Executing', 4: 'Executed', 5: 'Revoked',
};

// -----------------------------------------------------------------------
// Read functions
// -----------------------------------------------------------------------
export async function getWillSummary(willId) {
  return publicClient.readContract({
    address: config.legacyVaultAddress, abi: VAULT_ABI,
    functionName: 'getWillSummary', args: [willId],
  });
}

export async function getNextCheckInDeadline(willId) {
  return publicClient.readContract({
    address: config.legacyVaultAddress, abi: VAULT_ABI,
    functionName: 'getNextCheckInDeadline', args: [willId],
  });
}

export async function isClaimable(willId) {
  return publicClient.readContract({
    address: config.legacyVaultAddress, abi: VAULT_ABI,
    functionName: 'isClaimable', args: [willId],
  });
}

// -----------------------------------------------------------------------
// Write functions — keeper calls these automatically
// -----------------------------------------------------------------------
export async function callMarkWarning(willId) {
  const hash = await walletClient.writeContract({
    address: config.legacyVaultAddress, abi: VAULT_ABI,
    functionName: 'markWarning', args: [willId],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function callMarkClaimable(willId) {
  const hash = await walletClient.writeContract({
    address: config.legacyVaultAddress, abi: VAULT_ABI,
    functionName: 'markClaimable', args: [willId],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

// -----------------------------------------------------------------------
// Event scanner — 500-block chunks to avoid RPC limits
// -----------------------------------------------------------------------
const CHUNK_SIZE = 500n;

export async function scanWillCreatedEvents(fromBlock, toBlock) {
  const events = [];
  for (let start = fromBlock; start <= toBlock; start += CHUNK_SIZE) {
    const end = start + CHUNK_SIZE - 1n < toBlock ? start + CHUNK_SIZE - 1n : toBlock;
    try {
      const logs = await publicClient.getLogs({
        address: config.legacyVaultAddress,
        event:   VAULT_ABI.find(e => e.name === 'WillCreated'),
        fromBlock: start, toBlock: end,
      });
      events.push(...logs);
    } catch (err) {
      console.warn(`  ⚠️  Block scan ${start}-${end} failed: ${err.message}`);
    }
  }
  return events;
}

export async function scanFinishedWillEvents(fromBlock, toBlock) {
  const events = [];
  for (let start = fromBlock; start <= toBlock; start += CHUNK_SIZE) {
    const end = start + CHUNK_SIZE - 1n < toBlock ? start + CHUNK_SIZE - 1n : toBlock;
    try {
      const [executed, revoked] = await Promise.all([
        publicClient.getLogs({ address: config.legacyVaultAddress, event: VAULT_ABI.find(e => e.name === 'WillExecuted'), fromBlock: start, toBlock: end }),
        publicClient.getLogs({ address: config.legacyVaultAddress, event: VAULT_ABI.find(e => e.name === 'WillRevoked'),  fromBlock: start, toBlock: end }),
      ]);
      events.push(...executed, ...revoked);
    } catch (err) {
      console.warn(`  ⚠️  Finished scan ${start}-${end} failed: ${err.message}`);
    }
  }
  return events;
}