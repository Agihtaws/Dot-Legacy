'use client'

import { useReadContract, useReadContracts } from 'wagmi'
import { CONTRACTS, LEGACY_VAULT_ABI }        from '@/config/contracts'

// -----------------------------------------------------------------------
// Get all will IDs for a wallet address
// -----------------------------------------------------------------------
export function useOwnerWills(address?: `0x${string}`) {
  return useReadContract({
    address:      CONTRACTS.LEGACY_VAULT,
    abi:          LEGACY_VAULT_ABI,
    functionName: 'getOwnerWills',
    args:         address ? [address] : undefined,
    query:        { enabled: !!address, refetchInterval: 15_000 },
  })
}

// -----------------------------------------------------------------------
// Get full will summary for a willId
// -----------------------------------------------------------------------
export function useWillSummary(willId?: bigint) {
  return useReadContract({
    address:      CONTRACTS.LEGACY_VAULT,
    abi:          LEGACY_VAULT_ABI,
    functionName: 'getWillSummary',
    args:         willId !== undefined ? [willId] : undefined,
    query:        { enabled: willId !== undefined, refetchInterval: 15_000 },
  })
}

// -----------------------------------------------------------------------
// Get beneficiaries for a willId
// -----------------------------------------------------------------------
export function useWillBeneficiaries(willId?: bigint) {
  return useReadContract({
    address:      CONTRACTS.LEGACY_VAULT,
    abi:          LEGACY_VAULT_ABI,
    functionName: 'getBeneficiaries',
    args:         willId !== undefined ? [willId] : undefined,
    query:        { enabled: willId !== undefined },
  })
}

// -----------------------------------------------------------------------
// Get next check-in deadline for a willId
// -----------------------------------------------------------------------
export function useCheckInDeadline(willId?: bigint) {
  return useReadContract({
    address:      CONTRACTS.LEGACY_VAULT,
    abi:          LEGACY_VAULT_ABI,
    functionName: 'getNextCheckInDeadline',
    args:         willId !== undefined ? [willId] : undefined,
    query:        { enabled: willId !== undefined, refetchInterval: 15_000 },
  })
}

// -----------------------------------------------------------------------
// Get tokens registered for a will
// -----------------------------------------------------------------------
export function useWillTokens(willId?: bigint) {
  return useReadContract({
    address:      CONTRACTS.LEGACY_VAULT,
    abi:          LEGACY_VAULT_ABI,
    functionName: 'getTokens',
    args:         willId !== undefined ? [willId] : undefined,
    query:        { enabled: willId !== undefined },
  })
}

// -----------------------------------------------------------------------
// Check if a will is claimable
// -----------------------------------------------------------------------
export function useIsClaimable(willId?: bigint) {
  return useReadContract({
    address:      CONTRACTS.LEGACY_VAULT,
    abi:          LEGACY_VAULT_ABI,
    functionName: 'isClaimable',
    args:         willId !== undefined ? [willId] : undefined,
    query:        { enabled: willId !== undefined, refetchInterval: 15_000 },
  })
}