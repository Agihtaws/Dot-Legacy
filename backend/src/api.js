/**
 * DotLegacy REST API
 *
 * Endpoints:
 *   POST /api/register        — frontend calls this after createWill()
 *   GET  /api/will/:id        — get will status + email for a willId
 *   GET  /api/wills           — list all registered wills (admin)
 *   GET  /api/health          — health check
 *   DELETE /api/will/:id      — remove a will from registry
 */

import express from 'express';
import cors    from 'cors';
import { config } from './config.js';
import {
  registerWill,
  getEntry,
  getAllEntries,
  unregisterWill,
  count,
} from './registry.js';
import { getWillSummary, getNextCheckInDeadline, isClaimable, WillStatus } from './contracts.js';
import { sendWelcomeEmail } from './mailer.js';

export function createApp() {
  const app = express();

  // -----------------------------------------------------------------------
  // Middleware
  // -----------------------------------------------------------------------
  app.use(cors({ origin: config.api.corsOrigin }));
  app.use(express.json());

  // Request logger
  app.use((req, _res, next) => {
    console.log(`→ ${req.method} ${req.path}`);
    next();
  });

  // -----------------------------------------------------------------------
  // GET /api/health
  // -----------------------------------------------------------------------
  app.get('/api/health', (_req, res) => {
    res.json({
      status:    'ok',
      service:   'DotLegacy Keeper',
      timestamp: new Date().toISOString(),
      wills:     count(),
      vault:     config.legacyVaultAddress,
    });
  });

  // -----------------------------------------------------------------------
  // POST /api/register
  //
  // Called by frontend after a successful createWill() transaction.
  // Body: { willId: string, email: string, ownerAddress: string, txHash: string }
  //
  // Returns: { success: true, willId, email }
  // -----------------------------------------------------------------------
  app.post('/api/register', async (req, res) => {
    try {
      const { willId, email, ownerAddress, txHash } = req.body;

      // --- Validate inputs ---
      if (!willId || !email || !ownerAddress) {
        return res.status(400).json({
          error: 'Missing required fields: willId, email, ownerAddress',
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email address' });
      }

      const willIdBig = BigInt(willId);

      // --- Verify will exists on-chain ---
      let summary;
      try {
        summary = await getWillSummary(willIdBig);
      } catch {
        return res.status(404).json({ error: `Will #${willId} not found on chain` });
      }

      // --- Verify the owner matches ---
      if (summary.owner.toLowerCase() !== ownerAddress.toLowerCase()) {
        return res.status(403).json({ error: 'Owner address does not match will on-chain' });
      }

      // --- Save to registry ---
      registerWill({ willId: willIdBig, email, ownerAddress });

      // --- Send welcome email ---
      const checkInDays = Math.floor(Number(summary.checkInPeriod) / 86400);
      try {
        await sendWelcomeEmail({ to: email, willId: willIdBig, ownerAddress, checkInPeriodDays: checkInDays });
      } catch (emailErr) {
        // Non-fatal — log but don't fail the request
        console.warn(`  ⚠️  Welcome email failed: ${emailErr.message}`);
      }

      return res.json({
        success:      true,
        willId:       willId.toString(),
        email,
        ownerAddress,
        txHash:       txHash || null,
        message:      `Will #${willId} registered. Welcome email sent to ${email}.`,
      });

    } catch (err) {
      console.error('POST /api/register error:', err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // -----------------------------------------------------------------------
  // GET /api/will/:id
  //
  // Returns combined on-chain + registry data for a will.
  // -----------------------------------------------------------------------
  app.get('/api/will/:id', async (req, res) => {
    try {
      const willId = BigInt(req.params.id);
      const entry  = getEntry(willId);

      // Fetch on-chain data
      let summary, deadline, claimable;
      try {
        [summary, deadline, claimable] = await Promise.all([
          getWillSummary(willId),
          getNextCheckInDeadline(willId),
          isClaimable(willId),
        ]);
      } catch {
        return res.status(404).json({ error: `Will #${req.params.id} not found on chain` });
      }

      const now          = BigInt(Math.floor(Date.now() / 1000));
      const secondsLeft  = deadline > now ? Number(deadline - now) : 0;
      const daysLeft     = Math.floor(secondsLeft / 86400);

      return res.json({
        willId:         req.params.id,
        owner:          summary.owner,
        status:         WillStatus[Number(summary.status)] || 'Unknown',
        statusCode:     Number(summary.status),
        checkInPeriod:  Number(summary.checkInPeriod),
        lastCheckIn:    Number(summary.lastCheckIn),
        deadline:       Number(deadline),
        deadlineDate:   new Date(Number(deadline) * 1000).toISOString(),
        daysLeft,
        claimable,
        threshold:      Number(summary.threshold),
        totalGuardians: Number(summary.totalGuardians),
        sharesSubmitted:Number(summary.sharesSubmitted),
        // Registry info (email hidden for privacy — only show if registered)
        registered:     !!entry,
        registeredAt:   entry?.registeredAt || null,
      });

    } catch (err) {
      console.error(`GET /api/will/${req.params.id} error:`, err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // -----------------------------------------------------------------------
  // GET /api/wills
  //
  // Returns all registered wills (admin view — no emails exposed)
  // -----------------------------------------------------------------------
  app.get('/api/wills', (_req, res) => {
    const entries = getAllEntries().map(e => ({
      willId:       e.willId.toString(),
      ownerAddress: e.ownerAddress,
      registeredAt: e.registeredAt,
      // email intentionally omitted from list endpoint
    }));

    res.json({ count: entries.length, wills: entries });
  });

  // -----------------------------------------------------------------------
  // DELETE /api/will/:id
  //
  // Remove a will from the notification registry.
  // -----------------------------------------------------------------------
  app.delete('/api/will/:id', (req, res) => {
    const willId = BigInt(req.params.id);
    const entry  = getEntry(willId);

    if (!entry) {
      return res.status(404).json({ error: `Will #${req.params.id} not in registry` });
    }

    unregisterWill(willId);
    return res.json({ success: true, message: `Will #${req.params.id} removed from registry` });
  });

  // -----------------------------------------------------------------------
  // 404 handler
  // -----------------------------------------------------------------------
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  return app;
}