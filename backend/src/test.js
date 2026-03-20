/**
 * Test script — run: node src/test.js
 * Tests: RPC, API register, email
 */
import { publicClient } from './contracts.js';
import { verifyMailer, sendWelcomeEmail } from './mailer.js';
import { registerWill, getEntry, unregisterWill } from './registry.js';
import { config } from './config.js';

async function run() {
  console.log('🧪 DotLegacy Backend v2 — Test Script\n');

  // Test 1: RPC
  console.log('Test 1: RPC connection...');
  try {
    const block = await publicClient.getBlockNumber();
    console.log(`  ✅ Connected — block #${block}\n`);
  } catch (err) {
    console.error(`  ❌ ${err.message}\n`);
  }

  // Test 2: Registry
  console.log('Test 2: Registry read/write...');
  registerWill({ willId: 99n, email: 'test@example.com', ownerAddress: '0xtest' });
  const entry = getEntry(99n);
  console.log(`  ✅ Saved: will #99 → ${entry?.email}`);
  unregisterWill(99n);
  console.log(`  ✅ Cleaned up\n`);

  // Test 3: Email
  console.log('Test 3: Send welcome email...');
  const ok = await verifyMailer();
  if (!ok) { console.log('  ❌ Email not configured\n'); return; }
  try {
    await sendWelcomeEmail({
      to:                   config.email.user,
      willId:               1n,
      ownerAddress:         '0x63eea403e3075D9e6b5eA18c28021e6FfdD04a67',
      checkInPeriodSeconds: 90 * 86400,   // fixed: was checkInPeriodDays: 90
    });
    console.log(`  ✅ Welcome email sent to ${config.email.user}\n`);
  } catch (err) {
    console.error(`  ❌ ${err.message}\n`);
  }

  console.log('✅ All tests complete');
  console.log('\nNext: npm start — then test the API:');
  console.log(`  curl http://localhost:${config.api.port}/api/health`);
}

run().catch(console.error);