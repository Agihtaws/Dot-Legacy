import { config } from './config.js';
import {
  publicClient,
  getWillSummary,
  getNextCheckInDeadline,
  isClaimable,
  scanWillCreatedEvents,
  scanFinishedWillEvents,
  WillStatus,
} from './contracts.js';
import { sendWarningEmail, sendClaimableEmail } from './mailer.js';
import { getAllEntries, getEmail, unregisterWill } from './registry.js';

// -----------------------------------------------------------------------
// In-memory notification state — prevents duplicate emails per run cycle
// Cleared on process restart (intentional — re-check after restart)
// -----------------------------------------------------------------------
const notified = new Set();

function notifKey(willId, type) {
  return `${willId}-${type}`;
}

// -----------------------------------------------------------------------
// Step 1: Discover all will IDs from chain events + registry
//
// Strategy:
//  a) Read all WillCreated events from deployment block to now
//  b) Combine with manually registered wills (from API)
//  c) Remove wills that are already Executed or Revoked
// -----------------------------------------------------------------------
async function discoverActiveWillIds() {
  const latestBlock = await publicClient.getBlockNumber();
  const fromBlock   = config.vaultDeployBlock;

  console.log(`  🔍 Scanning events: block ${fromBlock} → ${latestBlock}`);

  // Scan WillCreated events
  const createdEvents = await scanWillCreatedEvents(fromBlock, latestBlock);
  const chainWillIds  = createdEvents.map(e => e.args.willId);

  // Combine with registry (frontend-registered wills)
  const registryEntries = getAllEntries();
  const registryIds     = registryEntries.map(e => e.willId);

  // Deduplicate
  const allIds = [...new Set([...chainWillIds, ...registryIds].map(id => id.toString()))]
    .map(id => BigInt(id));

  console.log(`  📋 Found ${allIds.length} will(s): ${chainWillIds.length} from chain, ${registryIds.length} from registry`);

  // Scan finished wills to exclude
  const finishedEvents  = await scanFinishedWillEvents(fromBlock, latestBlock);
  const finishedIds     = new Set(finishedEvents.map(e => e.args.willId.toString()));

  const activeIds = allIds.filter(id => !finishedIds.has(id.toString()));
  console.log(`  ✅ ${activeIds.length} active will(s) after excluding ${finishedIds.size} finished`);

  return activeIds;
}

// -----------------------------------------------------------------------
// Step 2: Process a single will
// -----------------------------------------------------------------------
async function processWill(willId) {
  try {
    const [summary, deadline, claimable] = await Promise.all([
      getWillSummary(willId),
      getNextCheckInDeadline(willId),
      isClaimable(willId),
    ]);

    const statusName  = WillStatus[Number(summary.status)] || 'Unknown';
    const now         = BigInt(Math.floor(Date.now() / 1000));
    const secondsLeft = deadline > now ? Number(deadline - now) : 0;
    const daysLeft    = Math.floor(secondsLeft / 86400);
    const deadlineDate = new Date(Number(deadline) * 1000);

    // Get email from registry
    const email = getEmail(willId);

    console.log(`  Will #${willId} | ${statusName} | ${daysLeft}d left | email: ${email || 'not registered'}`);

    // --- Clean up finished wills ---
    if (summary.status === 4n || summary.status === 5n) {
      console.log(`    ↳ ${statusName} — cleaning up registry`);
      unregisterWill(willId);
      return;
    }

    // Skip if no email registered for this will
    if (!email) {
      console.log(`    ↳ No email registered — skipping notification`);
      return;
    }

    // --- Claimable notification ---
    if (claimable) {
      const key = notifKey(willId, 'claimable');
      if (!notified.has(key)) {
        await sendClaimableEmail({ to: email, willId, ownerAddress: summary.owner });
        notified.add(key);
      } else {
        console.log(`    ↳ Claimable email already sent this session`);
      }
      return;
    }

    // --- Urgent: ≤ urgentDays ---
    if (daysLeft <= config.urgentDays && daysLeft >= 0) {
      const key = notifKey(willId, `urgent-${daysLeft}`);
      if (!notified.has(key)) {
        await sendWarningEmail({ to: email, willId, ownerAddress: summary.owner, daysLeft, deadline: deadlineDate });
        notified.add(key);
      }
      return;
    }

    // --- Warning: ≤ warningDays ---
    if (daysLeft <= config.warningDays) {
      // Bucket by 5-day intervals to avoid daily spam: 15d, 10d, 5d
      const bucket = Math.floor(daysLeft / 5) * 5;
      const key    = notifKey(willId, `warning-${bucket}`);
      if (!notified.has(key)) {
        await sendWarningEmail({ to: email, willId, ownerAddress: summary.owner, daysLeft, deadline: deadlineDate });
        notified.add(key);
      }
      return;
    }

    console.log(`    ↳ Safe — ${daysLeft} days until check-in needed`);

  } catch (err) {
    if (err.message?.includes('WillNotFound') || err.message?.includes('revert')) {
      console.log(`  Will #${willId} | Not found on chain — skipping`);
    } else {
      console.error(`  Will #${willId} | Error: ${err.message}`);
    }
  }
}

// -----------------------------------------------------------------------
// Main keeper run
// -----------------------------------------------------------------------
export async function runKeeper() {
  console.log(`\n🔍 [${new Date().toISOString()}] Keeper running...`);

  try {
    const activeWillIds = await discoverActiveWillIds();

    if (activeWillIds.length === 0) {
      console.log('  No active wills found.');
      console.log('  Waiting for users to create wills via the frontend.\n');
      return;
    }

    // Process all wills sequentially to avoid RPC rate limits
    for (const willId of activeWillIds) {
      await processWill(willId);
    }
  } catch (err) {
    console.error(`  Keeper error: ${err.message}`);
  }

  console.log(`✅ Keeper run complete\n`);
}