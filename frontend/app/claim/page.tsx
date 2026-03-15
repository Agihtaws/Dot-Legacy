'use client'

import { useState, useCallback }                             from 'react'
import { useReadContract }                                   from 'wagmi'
import { CONTRACTS, LEGACY_VAULT_ABI, WILL_STATUS }          from '@/config/contracts'
import { formatDate, shortAddress }                          from '@/lib/utils'
import { Navbar }                                            from '@/components/Navbar'
import { StatusBadge }                                       from '@/components/ui/StatusBadge'
import { WillLookup }                                        from './components/WillLookup'
import { SharesProgress }                                    from './components/SharesProgress'
import { GuardianSubmit }                                    from './components/GuardianSubmit'
import { TimelockCountdown }                                 from './components/TimelockCountdown'
import { BeneficiaryView }                                   from './components/BeneficiaryView'

export default function ClaimPage() {
  const [willId,    setWillId]    = useState<bigint | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // ── Fetch will summary ──
  const { data: summary, isLoading: loadingSummary, refetch: refetchSummary } = useReadContract({
    address:      CONTRACTS.LEGACY_VAULT,
    abi:          LEGACY_VAULT_ABI,
    functionName: 'getWillSummary',
    args:         willId !== null ? [willId] : undefined,
    query:        { enabled: willId !== null, refetchInterval: 10_000 },
  })

  // ── Fetch beneficiaries ──
  const { data: beneficiaries, refetch: refetchBeneficiaries } = useReadContract({
    address:      CONTRACTS.LEGACY_VAULT,
    abi:          LEGACY_VAULT_ABI,
    functionName: 'getBeneficiaries',
    args:         willId !== null ? [willId] : undefined,
    query:        { enabled: willId !== null },
  })

  function handleSearch(id: bigint) {
    setWillId(id)
    setRefreshKey(k => k + 1)
  }

  function handleRefresh() {
    refetchSummary()
    refetchBeneficiaries()
    setRefreshKey(k => k + 1)
  }

  const statusCode = summary ? Number(summary.status) : -1
  const isActive       = statusCode === 0 || statusCode === 1
  const isClaimable    = statusCode === 2
  const isExecuting    = statusCode === 3
  const isExecuted     = statusCode === 4
  const isRevoked      = statusCode === 5
  const notFound       = willId !== null && !loadingSummary && !summary

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <Navbar />

      <div className="max-w-2xl mx-auto px-6 pt-28 pb-16">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Claim Inheritance</h1>
          <p className="text-sm text-gray-500">
            Guardians submit shares to verify. Beneficiaries collect after distribution.
          </p>
        </div>

        {/* Will lookup */}
        <div className="bg-[#111118] border border-[#1E1E2E] rounded-2xl p-6 mb-6">
          <p className="text-xs text-[#E6007A] font-bold uppercase tracking-widest mb-4">
            Find a Will
          </p>
          <WillLookup onSearch={handleSearch} loading={loadingSummary} />
        </div>

        {/* Not found */}
        {notFound && (
          <div className="bg-[#111118] border border-[#1E1E2E] rounded-2xl p-6 text-center">
            <p className="text-gray-400 text-sm">Will #{willId?.toString()} not found on chain.</p>
            <p className="text-gray-600 text-xs mt-1">Check the ID and try again.</p>
          </div>
        )}

        {/* Will found */}
        {summary && willId !== null && (
          <div className="space-y-4">

            {/* Will header card */}
            <div className="bg-[#111118] border border-[#1E1E2E] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-white">Will #{willId.toString()}</h2>
                  <StatusBadge status={statusCode} />
                </div>
                <button onClick={handleRefresh}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-1 rounded-lg hover:bg-[#1E1E2E]">
                  ↻ Refresh
                </button>
              </div>

              {/* Summary row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  ['Owner',      shortAddress(summary.owner)],
                  ['Created',    formatDate(Number(summary.lastCheckIn))],
                  ['Threshold',  `${Number(summary.threshold)}-of-${Number(summary.totalGuardians)}`],
                  ['Timelock',   `${Number(summary.timelockDelay) / 3600}h`],
                ].map(([l, v]) => (
                  <div key={l} className="bg-[#0F0F1A] rounded-xl p-3 border border-[#1E1E2E]">
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">{l}</p>
                    <p className="text-sm text-white font-semibold font-mono">{v}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── ACTIVE / WARNING — not ready yet ── */}
            {isActive && (
              <div className="bg-[#111118] border border-[#1E1E2E] rounded-2xl p-6 text-center space-y-3">
                <p className="text-4xl">🔒</p>
                <p className="text-white font-semibold">Will is still active</p>
                <p className="text-sm text-gray-400">
                  The owner is still checking in. This will cannot be claimed yet.
                  Come back after the check-in deadline passes.
                </p>
              </div>
            )}

            {/* ── CLAIMABLE — guardians submit shares ── */}
            {isClaimable && (
              <div className="bg-[#111118] border border-[#1E1E2E] rounded-2xl p-6 space-y-5">
                <div>
                  <p className="text-xs text-[#E6007A] font-bold uppercase tracking-widest mb-1">
                    Guardian Verification
                  </p>
                  <p className="text-sm text-gray-400">
                    The will is claimable. Guardians must submit their Shamir shares to verify the inheritance.
                    Need {Number(summary.threshold)} of {Number(summary.totalGuardians)} guardians to agree.
                  </p>
                </div>

                <SharesProgress
                  submitted={Number(summary.sharesSubmitted)}
                  threshold={Number(summary.threshold)}
                  total={Number(summary.totalGuardians)}
                />

                <div className="border-t border-[#1E1E2E] pt-4">
                  <GuardianSubmit
                    willId={willId}
                    threshold={Number(summary.threshold)}
                    submitted={Number(summary.sharesSubmitted)}
                    onSuccess={handleRefresh}
                  />
                </div>
              </div>
            )}

            {/* ── EXECUTING — timelock countdown ── */}
            {isExecuting && (
              <div className="bg-[#111118] border border-[#1E1E2E] rounded-2xl p-6 space-y-4">
                <div>
                  <p className="text-xs text-[#E6007A] font-bold uppercase tracking-widest mb-1">
                    Timelock Period
                  </p>
                  <p className="text-sm text-gray-400">
                    All shares verified. Waiting for the safety timelock before distribution.
                  </p>
                </div>

                <SharesProgress
                  submitted={Number(summary.sharesSubmitted)}
                  threshold={Number(summary.threshold)}
                  total={Number(summary.totalGuardians)}
                />

                <div className="border-t border-[#1E1E2E] pt-4">
                  <TimelockCountdown
                    willId={willId}
                    claimStartTime={Number(summary.claimStartTime)}
                    timelockDelay={Number(summary.timelockDelay)}
                    onSuccess={handleRefresh}
                  />
                </div>
              </div>
            )}

            {/* ── EXECUTED — show beneficiary result ── */}
            {isExecuted && (
              <div className="bg-[#111118] border border-[#1E1E2E] rounded-2xl p-6 space-y-4">
                <div className="text-center py-4">
                  <p className="text-5xl mb-3">✅</p>
                  <p className="text-xl font-bold text-white mb-1">Distribution Complete</p>
                  <p className="text-sm text-gray-400">
                    Assets have been distributed to all beneficiaries.
                  </p>
                </div>

                {beneficiaries && (
                  <BeneficiaryView
                    beneficiaries={beneficiaries}
                    willId={willId}
                    executed={true}
                  />
                )}
              </div>
            )}

            {/* ── EXECUTING — also show beneficiary view ── */}
            {isExecuting && beneficiaries && (
              <div className="bg-[#111118] border border-[#1E1E2E] rounded-2xl p-6">
                <p className="text-xs text-[#E6007A] font-bold uppercase tracking-widest mb-4">
                  Beneficiaries
                </p>
                <BeneficiaryView
                  beneficiaries={beneficiaries}
                  willId={willId}
                  executed={false}
                />
              </div>
            )}

            {/* ── CLAIMABLE — also show beneficiary view ── */}
            {isClaimable && beneficiaries && (
              <div className="bg-[#111118] border border-[#1E1E2E] rounded-2xl p-6">
                <p className="text-xs text-[#E6007A] font-bold uppercase tracking-widest mb-4">
                  Beneficiaries
                </p>
                <BeneficiaryView
                  beneficiaries={beneficiaries}
                  willId={willId}
                  executed={false}
                />
              </div>
            )}

            {/* ── REVOKED ── */}
            {isRevoked && (
              <div className="bg-[#111118] border border-[#1E1E2E] rounded-2xl p-6 text-center">
                <p className="text-4xl mb-3">🚫</p>
                <p className="text-white font-semibold">Will Revoked</p>
                <p className="text-sm text-gray-400 mt-2">
                  The owner revoked this will. Nothing will be distributed.
                </p>
              </div>
            )}

          </div>
        )}

        {/* Help section */}
        {!willId && (
          <div className="bg-[#111118] border border-[#1E1E2E] rounded-2xl p-6 space-y-4">
            <p className="text-xs text-[#E6007A] font-bold uppercase tracking-widest">How claiming works</p>
            <div className="space-y-3">
              {[
                { icon: '🔍', title: 'Find the will', desc: 'Enter the will ID shared by the owner or their family.' },
                { icon: '🔑', title: 'Guardians submit shares', desc: 'Each guardian connects their wallet and submits their Shamir share. When the threshold is met, the Rust PVM contract verifies the shares.' },
                { icon: '⏳', title: 'Wait for timelock', desc: '48-hour safety period. The owner can still check in to cancel during this window.' },
                { icon: '💸', title: 'Execute distribution', desc: 'After timelock, anyone can trigger distribution. Tokens go directly to beneficiaries\' wallets.' },
              ].map(item => (
                <div key={item.title} className="flex gap-3">
                  <span className="text-xl shrink-0">{item.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}