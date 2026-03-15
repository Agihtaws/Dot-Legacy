// -----------------------------------------------------------------------
// Deployed contract addresses — Polkadot Hub TestNet (v2 — demo timing)
// Deploy block: 6435416
// MIN_CHECK_IN_PERIOD = 10 minutes
// GRACE_PERIOD        = 5 minutes
// TIMELOCK_DELAY      = 2 minutes
// -----------------------------------------------------------------------
export const CONTRACTS = {
  LEGACY_VAULT:       '0x75F082aAd0bdCE2147D23d5085C4B9BD6f4bb644' as `0x${string}`,
  WILL_CERTIFICATE:   '0xA100B5aDf8A1f72d70B49124962b9E9029590333' as `0x${string}`,
  GUARDIAN_MANAGER:   '0x34E854A8F475b07032244300f1975266db56150a' as `0x${string}`,
  PVM_SECRET_SHARING: '0x5463626Ca6d5A9BC4cbA6C2D74018eaBB117Dfae' as `0x${string}`,
  TOKEN_DOT:          '0x0A631C96722eA998C89802aAF151bF28ba75EE59' as `0x${string}`,
  TOKEN_USDT:         '0xB32BffC9AB9DA5F3C84788e31fC9c7cA5381194D' as `0x${string}`,
  TOKEN_USDC:         '0x44C1AC1EcBB5Ef7CD42D49f5ea9b40C18eD18f28' as `0x${string}`,
} as const

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export const LEGACY_VAULT_ABI = [
  { name: 'createWill', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'beneficiaries_', type: 'address[]' }, { name: 'sharePercents_', type: 'uint256[]' }, { name: 'guardians_', type: 'address[]' }, { name: 'threshold_', type: 'uint256' }, { name: 'checkInPeriod_', type: 'uint256' }, { name: 'tokens_', type: 'address[]' }, { name: 'amounts_', type: 'uint256[]' }, { name: 'secretHash_', type: 'bytes32' }, { name: 'metadataUri_', type: 'string' }], outputs: [{ name: 'willId', type: 'uint256' }] },
  { name: 'checkIn', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'willId', type: 'uint256' }], outputs: [] },
  { name: 'revokeWill', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'willId', type: 'uint256' }], outputs: [] },
  { name: 'markWarning', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'willId', type: 'uint256' }], outputs: [] },
  { name: 'markClaimable', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'willId', type: 'uint256' }], outputs: [] },
  { name: 'submitShare', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'willId', type: 'uint256' }, { name: 'share', type: 'uint256' }], outputs: [] },
  { name: 'executeDistribution', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'willId', type: 'uint256' }], outputs: [] },
  { name: 'getWillSummary', type: 'function', stateMutability: 'view', inputs: [{ name: 'willId', type: 'uint256' }], outputs: [{ name: '', type: 'tuple', components: [{ name: 'willId', type: 'uint256' }, { name: 'owner', type: 'address' }, { name: 'status', type: 'uint8' }, { name: 'checkInPeriod', type: 'uint256' }, { name: 'gracePeriod', type: 'uint256' }, { name: 'lastCheckIn', type: 'uint256' }, { name: 'claimStartTime', type: 'uint256' }, { name: 'timelockDelay', type: 'uint256' }, { name: 'threshold', type: 'uint256' }, { name: 'totalGuardians', type: 'uint256' }, { name: 'sharesSubmitted', type: 'uint256' }, { name: 'secretHash', type: 'bytes32' }] }] },
  { name: 'getBeneficiaries', type: 'function', stateMutability: 'view', inputs: [{ name: 'willId', type: 'uint256' }], outputs: [{ name: '', type: 'tuple[]', components: [{ name: 'wallet', type: 'address' }, { name: 'sharePercent', type: 'uint256' }] }] },
  { name: 'getOwnerWills', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ name: '', type: 'uint256[]' }] },
  { name: 'getNextCheckInDeadline', type: 'function', stateMutability: 'view', inputs: [{ name: 'willId', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'isClaimable', type: 'function', stateMutability: 'view', inputs: [{ name: 'willId', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'getTokens', type: 'function', stateMutability: 'view', inputs: [{ name: 'willId', type: 'uint256' }], outputs: [{ name: 'tokens', type: 'address[]' }, { name: 'amounts', type: 'uint256[]' }] },
  { name: 'WillCreated', type: 'event', inputs: [{ name: 'willId', type: 'uint256', indexed: true }, { name: 'owner', type: 'address', indexed: true }, { name: 'checkInPeriod', type: 'uint256', indexed: false }] },
  { name: 'CheckedIn', type: 'event', inputs: [{ name: 'willId', type: 'uint256', indexed: true }, { name: 'owner', type: 'address', indexed: true }, { name: 'nextDeadline', type: 'uint256', indexed: false }] },
] as const

export const ERC20_ABI = [
  { name: 'approve',   type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view',       inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view',       inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'decimals',  type: 'function', stateMutability: 'view',       inputs: [], outputs: [{ name: '', type: 'uint8' }] },
  { name: 'symbol',    type: 'function', stateMutability: 'view',       inputs: [], outputs: [{ name: '', type: 'string' }] },
  { name: 'mint',      type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
] as const

export const WILL_STATUS = {
  0: 'Active', 1: 'Warning', 2: 'Claimable',
  3: 'Executing', 4: 'Executed', 5: 'Revoked',
} as const

export type WillStatusCode = keyof typeof WILL_STATUS

export const CHECK_IN_PERIODS = [
  { label: '10 minutes  (demo)', value: 10 * 60           },
  { label: '30 minutes  (demo)', value: 30 * 60           },
  { label: '1 hour      (demo)', value: 60 * 60           },
  { label: '7 days',             value: 7  * 24 * 60 * 60 },
  { label: '30 days',            value: 30 * 24 * 60 * 60 },
  { label: '90 days',            value: 90 * 24 * 60 * 60 },
] as const

export const SUPPORTED_TOKENS = [
  { symbol: 'USDT', address: CONTRACTS.TOKEN_USDT, decimals: 6  },
  { symbol: 'USDC', address: CONTRACTS.TOKEN_USDC, decimals: 6  },
  { symbol: 'DOT',  address: CONTRACTS.TOKEN_DOT,  decimals: 10 },
] as const