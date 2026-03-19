import 'dotenv/config';

const required = [
  'RPC_URL',
  'LEGACY_VAULT_ADDRESS',
  'EMAIL_USER',
  'EMAIL_PASS',
  'EMAIL_FROM',
  'KEEPER_PRIVATE_KEY',
];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`❌ Missing required env var: ${key}`);
    process.exit(1);
  }
}

export const config = {
  rpcUrl:             process.env.RPC_URL,
  chainId:            Number(process.env.CHAIN_ID || 420420417),
  legacyVaultAddress: process.env.LEGACY_VAULT_ADDRESS,
  vaultDeployBlock:   BigInt(process.env.VAULT_DEPLOY_BLOCK || 0),
  keeperPrivateKey:   process.env.KEEPER_PRIVATE_KEY,

  email: {
    host:   process.env.EMAIL_HOST || 'smtp.gmail.com',
    port:   Number(process.env.EMAIL_PORT || 587),
    secure: process.env.EMAIL_SECURE === 'true',
    user:   process.env.EMAIL_USER,
    pass:   process.env.EMAIL_PASS,
    from:   process.env.EMAIL_FROM,
  },

  api: {
    port:       Number(process.env.API_PORT    || 3001),
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },

  // Frontend URL used in email CTAs
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  pollIntervalMinutes: Number(process.env.POLL_INTERVAL_MINUTES || 60),
  warningDays:         Number(process.env.WARNING_DAYS || 15),
  urgentDays:          Number(process.env.URGENT_DAYS  || 3),
};