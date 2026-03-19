/**
 * shamir.ts — Shamir's Secret Sharing in TypeScript
 * Uses Mersenne prime M_127 = 2^127 - 1, same as the Rust PVM contract.
 */

import { keccak256 } from 'viem'

const PRIME = (BigInt(1) << BigInt(127)) - BigInt(1)

function addMod(a: bigint, b: bigint): bigint {
  const sum = a + b
  return sum >= PRIME ? sum - PRIME : sum
}

function subMod(a: bigint, b: bigint): bigint {
  return a >= b ? a - b : PRIME - (b - a)
}

function mulMod(a: bigint, b: bigint): bigint {
  let result = BigInt(0)
  let aa = a % PRIME
  let bb = b % PRIME
  while (bb > BigInt(0)) {
    if (bb & BigInt(1)) result = addMod(result, aa)
    aa = addMod(aa, aa)
    bb >>= BigInt(1)
  }
  return result
}

function modInverse(a: bigint): bigint {
  return powMod(a, PRIME - BigInt(2))
}

function powMod(base: bigint, exp: bigint): bigint {
  let result = BigInt(1)
  let b = base % PRIME
  let e = exp
  while (e > BigInt(0)) {
    if (e & BigInt(1)) result = mulMod(result, b)
    b = mulMod(b, b)
    e >>= BigInt(1)
  }
  return result
}

function generateSecret(): bigint {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  let secret = BigInt(0)
  for (const byte of bytes) secret = (secret << BigInt(8)) | BigInt(byte)
  return secret % PRIME
}

function splitSecret(secret: bigint, threshold: number, total: number): bigint[] {
  const coefficients: bigint[] = [secret]
  for (let i = 1; i < threshold; i++) {
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    let coeff = BigInt(0)
    for (const byte of bytes) coeff = (coeff << BigInt(8)) | BigInt(byte)
    coefficients.push(coeff % PRIME)
  }
  const shares: bigint[] = []
  for (let x = 1; x <= total; x++) {
    let y = BigInt(0)
    let xPow = BigInt(1)
    const xBig = BigInt(x)
    for (const coeff of coefficients) {
      y = addMod(y, mulMod(coeff, xPow))
      xPow = mulMod(xPow, xBig)
    }
    shares.push(y)
  }
  return shares
}

export function reconstructSecret(shares: bigint[], indices: number[]): bigint {
  let secret = BigInt(0)
  const k = shares.length
  for (let i = 0; i < k; i++) {
    let numerator   = BigInt(1)
    let denominator = BigInt(1)
    const xi = BigInt(indices[i])
    for (let j = 0; j < k; j++) {
      if (i === j) continue
      const xj = BigInt(indices[j])
      numerator   = mulMod(numerator, PRIME - xj)
      denominator = mulMod(denominator, subMod(xi, xj))
    }
    const lagrange = mulMod(numerator, modInverse(denominator))
    secret = addMod(secret, mulMod(shares[i], lagrange))
  }
  return secret
}

export function computeSecretHash(secret: bigint): `0x${string}` {
  // Rust: buf[16..32] = secret.to_be_bytes() — 32 bytes, secret in last 16
  const hex    = secret.toString(16).padStart(32, '0')  // 16 bytes
  const padded = '0'.repeat(32) + hex                   // 32 bytes total
  return keccak256(`0x${padded}`)
}

export interface ShamirResult {
  secret:     bigint
  shares:     bigint[]
  secretHash: `0x${string}`
}

export function generateShares(threshold: number, total: number): ShamirResult {
  const secret     = generateSecret()
  const shares     = splitSecret(secret, threshold, total)
  const secretHash = computeSecretHash(secret)
  return { secret, shares, secretHash }
}