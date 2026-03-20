/**
 * DotLegacy REST API
 *
 * POST   /api/register     — frontend calls after createWill()
 * POST   /api/reregister   — manually add/update email for an existing on-chain will
 *                            (use this for wills created before the backend was running)
 * GET    /api/will/:id     — get will status + registry info
 * GET    /api/wills        — list all registered wills (admin)
 * GET    /api/health       — health check
 * DELETE /api/will/:id     — remove will from registry
 */

import express from 'express';
import cors    from 'cors';
import { config } from './config.js';
import {
  registerWill, getEntry, getAllEntries,
  unregisterWill, count,
} from './registry.js';
import {
  getWillSummary, getNextCheckInDeadline,
  isClaimable, WillStatus,
} from './contracts.js';
import { sendWelcomeEmail } from './mailer.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: config.api.corsOrigin }));
  app.use(express.json());
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
  // Called by frontend immediately after createWill() tx is submitted.
  // Only runs once willId is resolved — will not be called with '…' or 'unknown'.
  // -----------------------------------------------------------------------
  app.post('/api/register', async (req, res) => {
    try {
      const { willId, email, ownerAddress, txHash } = req.body;

      if (!willId || !email || !ownerAddress) {
        return res.status(400).json({ error: 'Missing required fields: willId, email, ownerAddress' });
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Invalid email address' });
      }

      // Reject placeholder values sent before willId was resolved
      if (willId === '…' || willId === 'unknown' || willId === '') {
        return res.status(400).json({ error: 'Will ID not yet resolved — retry once transaction confirms' });
      }

      let willIdBig;
      try { willIdBig = BigInt(willId); }
      catch { return res.status(400).json({ error: 'Invalid will ID format' }); }

      if (getEntry(willIdBig)) {
        return res.status(409).json({ error: `Will #${willId} is already registered. Use /api/reregister to update the email.` });
      }

      let summary;
      try { summary = await getWillSummary(willIdBig); }
      catch { return res.status(404).json({ error: `Will #${willId} not found on chain` }); }

      if (summary.owner.toLowerCase() !== ownerAddress.toLowerCase()) {
        return res.status(403).json({ error: 'Owner address does not match will on-chain' });
      }

      registerWill({ willId: willIdBig, email, ownerAddress });

      try {
        await sendWelcomeEmail({
          to: email,
          willId: willIdBig,
          ownerAddress,
          checkInPeriodSeconds: Number(summary.checkInPeriod),
        });
      } catch (emailErr) {
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
  // POST /api/reregister
  // Use this to add or update email for a will that was created on-chain
  // before the backend was running, or to correct a wrong email address.
  // Unlike /register, this overwrites any existing entry.
  // -----------------------------------------------------------------------
  app.post('/api/reregister', async (req, res) => {
    try {
      const { willId, email, ownerAddress } = req.body;

      if (!willId || !email || !ownerAddress) {
        return res.status(400).json({ error: 'Missing required fields: willId, email, ownerAddress' });
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Invalid email address' });
      }

      let willIdBig;
      try { willIdBig = BigInt(willId); }
      catch { return res.status(400).json({ error: 'Invalid will ID format' }); }

      // Verify the will exists on-chain
      let summary;
      try { summary = await getWillSummary(willIdBig); }
      catch { return res.status(404).json({ error: `Will #${willId} not found on chain` }); }

      // Verify ownership
      if (summary.owner.toLowerCase() !== ownerAddress.toLowerCase()) {
        return res.status(403).json({ error: 'Owner address does not match will on-chain' });
      }

      const existing = getEntry(willIdBig);

      // Overwrite (or create) the registry entry
      registerWill({ willId: willIdBig, email, ownerAddress });

      // Only send welcome email if this is a brand-new registration
      if (!existing) {
        try {
          await sendWelcomeEmail({
            to: email,
            willId: willIdBig,
            ownerAddress,
            checkInPeriodSeconds: Number(summary.checkInPeriod),
          });
        } catch (emailErr) {
          console.warn(`  ⚠️  Welcome email failed: ${emailErr.message}`);
        }
      }

      return res.json({
        success:  true,
        willId:   willId.toString(),
        email,
        ownerAddress,
        updated:  !!existing,
        message:  existing
          ? `Will #${willId} email updated to ${email}.`
          : `Will #${willId} registered with email ${email}. Welcome email sent.`,
      });

    } catch (err) {
      console.error('POST /api/reregister error:', err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // -----------------------------------------------------------------------
  // GET /api/will/:id
  // -----------------------------------------------------------------------
  app.get('/api/will/:id', async (req, res) => {
    try {
      let willId;
      try { willId = BigInt(req.params.id); }
      catch { return res.status(400).json({ error: 'Invalid will ID format' }); }

      const entry = getEntry(willId);

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

      const now         = BigInt(Math.floor(Date.now() / 1000));
      const secondsLeft = deadline > now ? Number(deadline - now) : 0;
      const daysLeft    = Math.floor(secondsLeft / 86400);

      return res.json({
        willId:          req.params.id,
        owner:           summary.owner,
        status:          WillStatus[Number(summary.status)] || 'Unknown',
        statusCode:      Number(summary.status),
        checkInPeriod:   Number(summary.checkInPeriod),
        lastCheckIn:     Number(summary.lastCheckIn),
        deadline:        Number(deadline),
        deadlineDate:    new Date(Number(deadline) * 1000).toISOString(),
        daysLeft,
        claimable,
        threshold:       Number(summary.threshold),
        totalGuardians:  Number(summary.totalGuardians),
        sharesSubmitted: Number(summary.sharesSubmitted),
        registered:      !!entry,
        registeredAt:    entry?.registeredAt || null,
      });

    } catch (err) {
      console.error(`GET /api/will/${req.params.id} error:`, err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // -----------------------------------------------------------------------
  // GET /api/wills
  // -----------------------------------------------------------------------
  app.get('/api/wills', (_req, res) => {
    const entries = getAllEntries().map(e => ({
      willId:       e.willId.toString(),
      ownerAddress: e.ownerAddress,
      registeredAt: e.registeredAt,
    }));
    res.json({ count: entries.length, wills: entries });
  });

  // -----------------------------------------------------------------------
  // DELETE /api/will/:id
  // -----------------------------------------------------------------------
  app.delete('/api/will/:id', (req, res) => {
    let willId;
    try { willId = BigInt(req.params.id); }
    catch { return res.status(400).json({ error: 'Invalid will ID format' }); }

    if (!getEntry(willId)) {
      return res.status(404).json({ error: `Will #${req.params.id} not in registry` });
    }

    unregisterWill(willId);
    return res.json({ success: true, message: `Will #${req.params.id} removed from registry` });
  });

  // 404
  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

  return app;
}