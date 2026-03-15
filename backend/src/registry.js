/**
 * registry.js — Persistent will → email registry
 *
 * Stores: willId (string) → { email, ownerAddress, registeredAt }
 * Backed by: registry.json in the project root
 *
 * Any user who creates a will and provides their email via the frontend
 * API is stored here. The keeper reads this to know who to notify.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = join(__dirname, '..', 'registry.json');

// -----------------------------------------------------------------------
// Load registry from disk — returns plain object
// -----------------------------------------------------------------------
function load() {
  if (!existsSync(REGISTRY_PATH)) return {};
  try {
    return JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'));
  } catch {
    return {};
  }
}

// -----------------------------------------------------------------------
// Save registry to disk
// -----------------------------------------------------------------------
function save(data) {
  writeFileSync(REGISTRY_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// -----------------------------------------------------------------------
// Register a will → email mapping
// Called by the API when a user creates a will from the frontend
// -----------------------------------------------------------------------
export function registerWill({ willId, email, ownerAddress }) {
  const key  = willId.toString();
  const data = load();

  data[key] = {
    email:        email.toLowerCase().trim(),
    ownerAddress: ownerAddress.toLowerCase(),
    registeredAt: new Date().toISOString(),
  };

  save(data);
  console.log(`📝 Registry: will #${key} → ${email}`);
}

// -----------------------------------------------------------------------
// Get email for a willId
// -----------------------------------------------------------------------
export function getEmail(willId) {
  const data = load();
  return data[willId.toString()]?.email || null;
}

// -----------------------------------------------------------------------
// Get full entry for a willId
// -----------------------------------------------------------------------
export function getEntry(willId) {
  const data = load();
  return data[willId.toString()] || null;
}

// -----------------------------------------------------------------------
// Get all registered will IDs as bigints
// -----------------------------------------------------------------------
export function getAllWillIds() {
  const data = load();
  return Object.keys(data).map(id => BigInt(id));
}

// -----------------------------------------------------------------------
// Get all entries — returns array of { willId, email, ownerAddress }
// -----------------------------------------------------------------------
export function getAllEntries() {
  const data = load();
  return Object.entries(data).map(([willId, entry]) => ({
    willId: BigInt(willId),
    ...entry,
  }));
}

// -----------------------------------------------------------------------
// Remove a will from registry (on execute or revoke)
// -----------------------------------------------------------------------
export function unregisterWill(willId) {
  const key  = willId.toString();
  const data = load();
  if (data[key]) {
    delete data[key];
    save(data);
    console.log(`🗑️  Registry: will #${key} removed`);
  }
}

// -----------------------------------------------------------------------
// Count registered wills
// -----------------------------------------------------------------------
export function count() {
  return Object.keys(load()).length;
}