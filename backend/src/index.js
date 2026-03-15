import cron from 'node-cron';
import { config } from './config.js';
import { verifyMailer } from './mailer.js';
import { publicClient } from './contracts.js';
import { runKeeper } from './keeper.js';
import { createApp } from './api.js';
import { count } from './registry.js';

console.log('');
console.log('  ██████╗  ██████╗ ████████╗    ██╗     ███████╗ ██████╗  █████╗  ██████╗██╗   ██╗');
console.log('  ██╔══██╗██╔═══██╗╚══██╔══╝    ██║     ██╔════╝██╔════╝ ██╔══██╗██╔════╝╚██╗ ██╔╝');
console.log('  ██║  ██║██║   ██║   ██║       ██║     █████╗  ██║  ███╗███████║██║      ╚████╔╝ ');
console.log('  ██║  ██║██║   ██║   ██║       ██║     ██╔══╝  ██║   ██║██╔══██║██║       ╚██╔╝  ');
console.log('  ██████╔╝╚██████╔╝   ██║       ███████╗███████╗╚██████╔╝██║  ██║╚██████╗   ██║   ');
console.log('  ╚═════╝  ╚═════╝    ╚═╝       ╚══════╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝   ╚═╝  ');
console.log('');
console.log('  Keeper + API Service — On-Chain Crypto Inheritance Protocol');
console.log('  Network: Polkadot Hub TestNet | chainId: 420420417');
console.log('');

async function startup() {
  // 1. RPC check
  try {
    const block = await publicClient.getBlockNumber();
    console.log(`✅ RPC connected — block #${block}`);
  } catch (err) {
    console.error(`❌ RPC failed: ${err.message}`);
    process.exit(1);
  }

  // 2. Email check
  await verifyMailer();

  // 3. Start Express API
  const app = createApp();
  app.listen(config.api.port, () => {
    console.log(`✅ API server running on http://localhost:${config.api.port}`);
    console.log(`   POST /api/register  — register will + email from frontend`);
    console.log(`   GET  /api/will/:id  — get will status`);
    console.log(`   GET  /api/health    — health check`);
  });

  // 4. Log config
  console.log('');
  console.log(`📋 Keeper config:`);
  console.log(`   LegacyVault:     ${config.legacyVaultAddress}`);
  console.log(`   Deploy block:    ${config.vaultDeployBlock}`);
  console.log(`   Poll interval:   every ${config.pollIntervalMinutes} minutes`);
  console.log(`   Warning at:      ${config.warningDays} days before deadline`);
  console.log(`   Urgent at:       ${config.urgentDays} days before deadline`);
  console.log(`   Registered wills: ${count()}`);
  console.log('');

  // 5. Run keeper immediately on startup
  await runKeeper();

  // 6. Schedule cron
  const cronExpr = config.pollIntervalMinutes >= 60
    ? `0 */${Math.floor(config.pollIntervalMinutes / 60)} * * *`
    : `*/${config.pollIntervalMinutes} * * * *`;

  cron.schedule(cronExpr, async () => { await runKeeper(); });
  console.log(`⏰ Keeper scheduled: ${cronExpr}`);
  console.log('🚀 Service running. Press Ctrl+C to stop.\n');
}

process.on('SIGINT', () => { console.log('\n👋 Service stopped.'); process.exit(0); });
process.on('unhandledRejection', (reason) => { console.error('Unhandled:', reason); });

startup().catch(err => { console.error('Fatal:', err); process.exit(1); });