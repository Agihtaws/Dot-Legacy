import { config }                        from './config.js';
import {
  publicClient,
  getWillSummary,
  getNextCheckInDeadline,
  isClaimable,
  callMarkWarning,
  callMarkClaimable,
  scanWillCreatedEvents,
  scanFinishedWillEvents,
  WillStatus,
} from './contracts.js';
import { sendWarningEmail, sendClaimableEmail } from './mailer.js';
import { getAllEntries, getEmail, unregisterWill } from './registry.js';

// -----------------------------------------------------------------------
// In-memory dedup — prevents re-sending on same run
// Note: resets on server restart — acceptable for hackathon demo
// -----------------------------------------------------------------------
const notified    = new Set();
const actionTaken = new Set();

function notifKey(willId, type)  { return `${willId}-notif-${type}`;  }
function actionKey(willId, type) { return `${willId}-action-${type}`; }

// -----------------------------------------------------------------------
// Discover all active will IDs (chain events + registry)
// -----------------------------------------------------------------------
async function discoverActiveWillIds() {
  const latestBlock = await publicClient.getBlockNumber();
  const fromBlock   = config.vaultDeployBlock;

  console.log(`  🔍 Scanning events: block ${fromBlock} → ${latestBlock}`);

  const createdEvents = await scanWillCreatedEvents(fromBlock, latestBlock);
  const chainWillIds  = createdEvents.map(e => e.args.willId);
  const registryIds   = getAllEntries().map(e => e.willId);

  const allIds = [...new Set([...chainWillIds, ...registryIds].map(id => id.toString()))]
    .map(id => BigInt(id));

  console.log(`  📋 Found ${allIds.length} will(s): ${chainWillIds.length} from chain, ${registryIds.length} from registry`);

  const finishedEvents = await scanFinishedWillEvents(fromBlock, latestBlock);
  const finishedIds    = new Set(finishedEvents.map(e => e.args.willId.toString()));
  const activeIds      = allIds.filter(id => !finishedIds.has(id.toString()));

  console.log(`  ✅ ${activeIds.length} active will(s) after excluding ${finishedIds.size} finished`);
  return activeIds;
}

// -----------------------------------------------------------------------
// Process a single will
// -----------------------------------------------------------------------
async function processWill(willId) {
  try {
    const summary  = await getWillSummary(willId);
    const deadline = await getNextCheckInDeadline(willId);

    const statusCode    = Number(summary.status);
    const statusName    = WillStatus[statusCode] || 'Unknown';
    const now           = Math.floor(Date.now() / 1000);
    const checkInPeriod = Number(summary.checkInPeriod);
    const gracePeriod   = Number(summary.gracePeriod);
    const lastCheckIn   = Number(summary.lastCheckIn);

    const realDeadline  = lastCheckIn + checkInPeriod;
    const claimableAt   = lastCheckIn + checkInPeriod + gracePeriod;

    const secondsToDeadline = Math.max(0, realDeadline - now);
    const daysLeft          = secondsToDeadline / 86400;
    const minutesLeft       = Math.floor(secondsToDeadline / 60);
    const deadlineDate      = new Date(realDeadline * 1000);
    const email             = getEmail(willId);

    console.log(`  Will #${willId} | ${statusName} | ${minutesLeft}m left | email: ${email || 'not registered'}`);

    // ── Clean up finished wills ──
    if (statusCode === 4 || statusCode === 5) {
      console.log(`    ↳ ${statusName} — removing from registry`);
      unregisterWill(willId);
      return;
    }

    // ── AUTO: markClaimable ──
    if ((statusCode === 0 || statusCode === 1) && now > claimableAt) {
      const key = actionKey(willId, 'markClaimable');
      if (!actionTaken.has(key)) {
        console.log(`    ⚡ Auto: calling markClaimable for will #${willId}`);
        try {
          const hash = await callMarkClaimable(willId);
          console.log(`    ✅ markClaimable tx: ${hash}`);
          actionTaken.add(key);
          if (email) {
            const emailKey = notifKey(willId, 'claimable');
            if (!notified.has(emailKey)) {
              await sendClaimableEmail({ to: email, willId, ownerAddress: summary.owner });
              notified.add(emailKey);
            }
          }
        } catch (err) {
          console.error(`    ❌ markClaimable failed: ${err.message}`);
        }
        return;
      }
    }

    // ── AUTO: markWarning ──
    if (statusCode === 0 && now > realDeadline && now <= claimableAt) {
      const key = actionKey(willId, 'markWarning');
      if (!actionTaken.has(key)) {
        console.log(`    ⚡ Auto: calling markWarning for will #${willId}`);
        try {
          const hash = await callMarkWarning(willId);
          console.log(`    ✅ markWarning tx: ${hash}`);
          actionTaken.add(key);
        } catch (err) {
          console.error(`    ❌ markWarning failed: ${err.message}`);
        }
      }
      return;
    }

    // ── Already Claimable status — send email if not yet sent ──
    if (statusCode === 2 && email) {
      const key = notifKey(willId, 'claimable');
      if (!notified.has(key)) {
        await sendClaimableEmail({ to: email, willId, ownerAddress: summary.owner });
        notified.add(key);
      } else {
        console.log(`    ↳ Claimable email already sent`);
      }
      return;
    }

    if (!email) {
      console.log(`    ↳ No email registered — skipping notifications`);
      return;
    }

    // ── Threshold: only notify when < 50% of period remains ──
    const halfPeriod = checkInPeriod / 2;

    // Urgent warning
    if (secondsToDeadline <= halfPeriod && daysLeft <= config.urgentDays && secondsToDeadline > 0) {
      const key = notifKey(willId, 'urgent');
      if (!notified.has(key)) {
        await sendWarningEmail({ to: email, willId, ownerAddress: summary.owner, daysLeft: Math.ceil(daysLeft), deadline: deadlineDate });
        notified.add(key);
        console.log(`    ↳ Urgent email sent`);
      }
      return;
    }

    // Regular warning
    if (secondsToDeadline <= halfPeriod && daysLeft <= config.warningDays && secondsToDeadline > 0) {
      const key = notifKey(willId, 'warning');
      if (!notified.has(key)) {
        await sendWarningEmail({ to: email, willId, ownerAddress: summary.owner, daysLeft: Math.ceil(daysLeft), deadline: deadlineDate });
        notified.add(key);
        console.log(`    ↳ Warning email sent`);
      }
      return;
    }

    console.log(`    ↳ Safe — ${minutesLeft} minutes until check-in needed`);

  } catch (err) {
    if (err.message?.includes('WillNotFound') || err.message?.includes('revert')) {
      console.log(`  Will #${willId} | Not found — skipping`);
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
      console.log('  No active wills. Waiting for users to create wills.\n');
      return;
    }
    for (const willId of activeWillIds) {
      await processWill(willId);
    }
  } catch (err) {
    console.error(`  Keeper error: ${err.message}`);
  }
  console.log(`✅ Keeper run complete\n`);
}