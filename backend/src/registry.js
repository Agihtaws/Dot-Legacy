/**
 * registry.js — Persistent will → email registry
 *
 * Stores: willId (string) → { email, ownerAddress, registeredAt }
 * Backed by: registry.json in the project root
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname    = dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = join(__dirname, '..', 'registry.json');

function load() {
  if (!existsSync(REGISTRY_PATH)) return {};
  try {
    return JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function save(data) {
  writeFileSync(REGISTRY_PATH, JSON.stringify(data, null, 2), 'utf8');
}

export function registerWill({ willId, email, ownerAddress }) {
  const key  = willId.toString();
  const data = load();
  data[key]  = {
    email:        email.toLowerCase().trim(),
    ownerAddress: ownerAddress.toLowerCase(),
    registeredAt: new Date().toISOString(),
  };
  save(data);
  console.log(`📝 Registry: will #${key} → ${email}`);
}

export function getEmail(willId) {
  return load()[willId.toString()]?.email || null;
}

export function getEntry(willId) {
  return load()[willId.toString()] || null;
}

export function getAllWillIds() {
  return Object.keys(load()).map(id => BigInt(id));
}

export function getAllEntries() {
  return Object.entries(load()).map(([willId, entry]) => ({
    willId: BigInt(willId),
    ...entry,
  }));
}

export function unregisterWill(willId) {
  const key  = willId.toString();
  const data = load();
  if (data[key]) {
    delete data[key];
    save(data);
    console.log(`🗑️  Registry: will #${key} removed`);
  }
}

export function count() {
  return Object.keys(load()).length;
}