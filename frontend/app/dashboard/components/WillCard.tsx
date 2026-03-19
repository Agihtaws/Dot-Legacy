'use client'

import { useEffect, useState }                                        from 'react'
import { useWriteContract, useWaitForTransactionReceipt }             from 'wagmi'
import { CONTRACTS, LEGACY_VAULT_ABI }                                from '@/config/contracts'
import { shortAddress, bpsToPercent, formatDate, formatDuration }     from '@/lib/utils'
import { useWillSummary, useWillBeneficiaries,
         useWillTokens, useCheckInDeadline }                          from '@/hooks/useWill'
import { CountdownTimer }                                             from './CountdownTimer'
import { StatusBadge }                                                from '@/components/ui/StatusBadge'
import { Button }                                                     from '@/components/ui/Button'
import { useCountdown }                                               from '@/hooks/useCountdown'
import Link                                                           from 'next/link'

interface WillCardProps {
  willId:    bigint
  onRefresh: () => void
}

/* ── tiny section label ─────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#E6007A]/70 mb-3"
      style={{ fontFamily: 'var(--font-body)' }}
    >
      {children}
    </p>
  )
}

/* ── key-value row ──────────────────────────────────────── */
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span
        className="text-[12px] text-gray-500"
        style={{ fontFamily: 'var(--font-body)', fontWeight: 300 }}
      >
        {label}
      </span>
      <span
        className="text-[12px] text-white font-semibold"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {value}
      </span>
    </div>
  )
}

/* ── info panel ─────────────────────────────────────────── */
function InfoPanel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: 'rgba(15,15,26,0.8)',
        border:     '1px solid #1E1E2E',
      }}
    >
      {children}
    </div>
  )
}

export function WillCard({ willId, onRefresh }: WillCardProps) {
  const [justCheckedIn, setJustCheckedIn] = useState(false)
  const [localDeadline, setLocalDeadline] = useState<number | null>(null)
  const [lastAction,    setLastAction]    = useState<'checkin' | 'revoke' | null>(null)

  const { data: summary,  refetch: refetchSummary  } = useWillSummary(willId)
  const { data: deadline, refetch: refetchDeadline } = useCheckInDeadline(willId)
  const { data: beneficiaries }                       = useWillBeneficiaries(willId)
  const { data: tokensData }                          = useWillTokens(willId)

  const { writeContract, data: txHash, isPending, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess }            = useWaitForTransactionReceipt({ hash: txHash })

  const statusCode = summary?.status !== undefined ? Number(summary.status) : undefined
  const deadlineTs = localDeadline ?? Number(deadline ?? 0)
  const { daysLeft, isExpired, isUrgent, isWarning } = useCountdown(deadlineTs, statusCode)

  useEffect(() => {
    if (isSuccess && summary) {
      if (lastAction === 'checkin') {
        setJustCheckedIn(true)
        setLocalDeadline(Math.floor(Date.now() / 1000) + Number(summary.checkInPeriod))
        const t1 = setTimeout(() => { refetchSummary(); refetchDeadline(); onRefresh() }, 3000)
        const t2 = setTimeout(async () => {
          setJustCheckedIn(false); reset()
          const r = await refetchDeadline()
          if (r.data) setLocalDeadline(Number(r.data))
        }, 6000)
        return () => { clearTimeout(t1); clearTimeout(t2) }
      }
      if (lastAction === 'revoke') {
        const t = setTimeout(() => { refetchSummary(); onRefresh(); reset() }, 2000)
        return () => clearTimeout(t)
      }
    }
  }, [isSuccess])

  /* ── skeleton ── */
  if (!summary || !deadline) {
    return (
      <div
        className="rounded-2xl p-6 animate-pulse space-y-4"
        style={{ background: '#111118', border: '1px solid #1E1E2E' }}
      >
        <div className="flex items-center justify-between">
          <div className="h-5 bg-[#1E1E2E] rounded-lg w-32" />
          <div className="h-5 bg-[#1E1E2E] rounded-full w-20" />
        </div>
        <div className="h-32 bg-[#1E1E2E] rounded-2xl" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <div key={i} className="h-28 bg-[#1E1E2E] rounded-xl" />)}
        </div>
      </div>
    )
  }

  const isActive    = statusCode === 0 || statusCode === 1
  const isClaimable = statusCode === 2
  const isExecuting = statusCode === 3
  const isExecuted  = statusCode === 4
  const isRevoked   = statusCode === 5
  const isLoading   = isPending || isConfirming

  const checkInDays   = Math.floor(Number(summary.checkInPeriod) / 86400)
  const checkInMins   = Math.floor(Number(summary.checkInPeriod) / 60)
  const periodLabel   = checkInDays === 0 ? `${checkInMins}m` : `${checkInDays}d`
  const timelockLabel = formatDuration(Number(summary.timelockDelay))

  const shouldShowCheckIn = isActive && !justCheckedIn && (isExpired || isUrgent || isWarning || checkInDays === 0)

  function handleCheckIn() {
    setLastAction('checkin')
    writeContract({ address: CONTRACTS.LEGACY_VAULT, abi: LEGACY_VAULT_ABI, functionName: 'checkIn', args: [willId] })
  }

  function handleRevoke() {
    if (!confirm('Revoke your will? This cannot be undone.')) return
    setLastAction('revoke')
    writeContract({ address: CONTRACTS.LEGACY_VAULT, abi: LEGACY_VAULT_ABI, functionName: 'revokeWill', args: [willId] })
  }

  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{ background: '#111118', border: '1px solid #1E1E2E' }}
    >
      {/* top accent */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(230,0,122,0.35), transparent)' }}
      />

      <div className="p-6 space-y-5">

        {/* ── header ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2
              className="text-white"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.125rem' }}
            >
              Will #{willId.toString()}
            </h2>
            <StatusBadge status={statusCode ?? 0} />
          </div>
          <span
            className="text-[11px] text-gray-600"
            style={{ fontFamily: 'var(--font-body)', fontWeight: 300 }}
          >
            {formatDate(Number(summary.lastCheckIn))}
          </span>
        </div>

        {/* ── three info panels ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

          {/* beneficiaries */}
          <InfoPanel>
            <SectionLabel>Beneficiaries</SectionLabel>
            <div className="space-y-2">
              {beneficiaries?.map((b, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <span
                    className="text-[12px] text-gray-400 font-mono truncate"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {shortAddress(b.wallet)}
                  </span>
                  <span
                    className="text-[12px] font-bold shrink-0"
                    style={{ fontFamily: 'var(--font-body)', color: '#FF6DC3' }}
                  >
                    {bpsToPercent(b.sharePercent)}
                  </span>
                </div>
              ))}
            </div>
          </InfoPanel>

          {/* will details */}
          <InfoPanel>
            <SectionLabel>Details</SectionLabel>
            <div className="divide-y divide-[#1E1E2E]">
              <DetailRow label="Period"    value={periodLabel} />
              <DetailRow label="Guardians" value={`${Number(summary.totalGuardians)}`} />
              <DetailRow label="Threshold" value={`${Number(summary.threshold)}-of-${Number(summary.totalGuardians)}`} />
              <DetailRow label="Timelock"  value={timelockLabel} />
            </div>
          </InfoPanel>

          {/* protected tokens */}
          <InfoPanel>
            <SectionLabel>Protected Tokens</SectionLabel>
            <div className="space-y-1.5">
              {tokensData?.[0].map((token, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg"
                  style={{ background: 'rgba(17,17,24,0.9)', border: '1px solid #252538' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E6007A] shrink-0" />
                  <span
                    className="text-[11px] text-gray-400 font-mono truncate"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {shortAddress(token, 8)}
                  </span>
                </div>
              ))}
              {!tokensData?.[0]?.length && (
                <p className="text-[12px] text-gray-600" style={{ fontFamily: 'var(--font-body)' }}>None</p>
              )}
            </div>
          </InfoPanel>

        </div>

        {/* ── active state ── */}
        {isActive && (
          <>
            <CountdownTimer deadline={deadlineTs} status={statusCode} />

            {justCheckedIn && lastAction === 'checkin' && (
              <div
                className="px-4 py-3 rounded-xl text-center text-[13px] font-medium"
                style={{
                  fontFamily: 'var(--font-body)',
                  background: 'rgba(16,185,129,0.08)',
                  border:     '1px solid rgba(16,185,129,0.25)',
                  color:      '#6EE7B7',
                }}
              >
                ✓ Check-in confirmed — next deadline in {periodLabel}
              </div>
            )}

            {shouldShowCheckIn && (
              <div className="space-y-1.5">
                <Button
                  fullWidth
                  size="lg"
                  variant={isExpired || isUrgent ? 'danger' : 'primary'}
                  onClick={handleCheckIn}
                  loading={isLoading}
                >
                  {isLoading
                    ? 'Confirming on-chain…'
                    : isExpired
                    ? '🚨 URGENT: Check In Now'
                    : isUrgent
                    ? `⚠️ Check In — ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`
                    : `✓ Check In — I'm Alive`}
                </Button>
                {!isExpired && !isUrgent && (
                  <p
                    className="text-[11px] text-gray-600 text-center"
                    style={{ fontFamily: 'var(--font-body)', fontWeight: 300 }}
                  >
                    Resets your {periodLabel} timer
                  </p>
                )}
              </div>
            )}

            <div
              className="flex items-center justify-between pt-4"
              style={{ borderTop: '1px solid #1E1E2E' }}
            >
              <Link href="/claim">
                <Button variant="ghost" size="sm">Guardian / Beneficiary? →</Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRevoke}
                loading={isLoading}
                className="text-red-500 hover:text-red-400"
              >
                Revoke Will
              </Button>
            </div>
          </>
        )}

        {/* ── claimable ── */}
        {isClaimable && (
          <div
            className="p-4 rounded-xl"
            style={{ background: 'rgba(127,29,29,0.25)', border: '1px solid rgba(153,27,27,0.5)' }}
          >
            <p
              className="font-bold text-red-300 mb-1"
              style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem' }}
            >
              ⚠️ Will is now claimable
            </p>
            <p
              className="text-[13px] text-red-400 mb-3"
              style={{ fontFamily: 'var(--font-body)', fontWeight: 300 }}
            >
              Guardians can trigger inheritance. Check in immediately to cancel.
            </p>
            <Button variant="danger" size="sm" onClick={handleCheckIn} loading={isLoading}>
              Check In to Cancel
            </Button>
          </div>
        )}

        {/* ── executing / timelock ── */}
        {isExecuting && (
          <div
            className="p-4 rounded-xl"
            style={{ background: 'rgba(88,28,135,0.2)', border: '1px solid rgba(107,33,168,0.4)' }}
          >
            <p
              className="font-bold text-purple-300 mb-1"
              style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem' }}
            >
              ⏳ Timelock in progress
            </p>
            <p
              className="text-[13px] text-purple-400"
              style={{ fontFamily: 'var(--font-body)', fontWeight: 300 }}
            >
              Distribution begins after {timelockLabel} timelock.
            </p>
          </div>
        )}

        {/* ── executed ── */}
        {isExecuted && (
          <div
            className="p-4 rounded-xl text-center"
            style={{ background: 'rgba(15,15,26,0.8)', border: '1px solid #1E1E2E' }}
          >
            <p
              className="text-[13px] text-gray-500"
              style={{ fontFamily: 'var(--font-body)', fontWeight: 300 }}
            >
              Will executed — assets distributed ✓
            </p>
          </div>
        )}

      </div>
    </div>
  )
}