'use client'

import { useEffect, useState }                                        from 'react'
import { useWriteContract, useWaitForTransactionReceipt }             from 'wagmi'
import { CONTRACTS, LEGACY_VAULT_ABI }                                from '@/config/contracts'
import { shortAddress, bpsToPercent, formatDate }                     from '@/lib/utils'
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

export function WillCard({ willId, onRefresh }: WillCardProps) {
  const [justCheckedIn, setJustCheckedIn] = useState(false)
  const [localDeadline, setLocalDeadline] = useState<number | null>(null)

  const { data: summary,  refetch: refetchSummary  } = useWillSummary(willId)
  const { data: deadline, refetch: refetchDeadline } = useCheckInDeadline(willId)
  const { data: beneficiaries }                       = useWillBeneficiaries(willId)
  const { data: tokensData }                          = useWillTokens(willId)

  const { writeContract, data: txHash, isPending, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess }            = useWaitForTransactionReceipt({ hash: txHash })

  const deadlineTs = localDeadline ?? Number(deadline ?? 0)
  const { daysLeft, isExpired, isUrgent, isWarning } = useCountdown(deadlineTs)

  useEffect(() => {
    if (isSuccess && summary) {
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
  }, [isSuccess])

  if (!summary || !deadline) {
    return (
      <div className="bg-[#111118] border border-[#1E1E2E] rounded-2xl p-6 animate-pulse">
        <div className="h-5 bg-[#1E1E2E] rounded w-1/4 mb-4" />
        <div className="h-32 bg-[#1E1E2E] rounded-2xl" />
      </div>
    )
  }

  const statusCode  = Number(summary.status)
  const isActive    = statusCode === 0 || statusCode === 1
  const isExecuted  = statusCode === 4
  const isRevoked   = statusCode === 5
  const isLoading   = isPending || isConfirming
  const checkInDays = Math.floor(Number(summary.checkInPeriod) / 86400)
  const shouldShowCheckIn = isActive && !justCheckedIn && (isExpired || isUrgent || isWarning || checkInDays <= 15)

  function handleCheckIn() {
    writeContract({ address: CONTRACTS.LEGACY_VAULT, abi: LEGACY_VAULT_ABI, functionName: 'checkIn', args: [willId] })
  }

  function handleRevoke() {
    if (!confirm('Revoke your will? This cannot be undone.')) return
    writeContract({ address: CONTRACTS.LEGACY_VAULT, abi: LEGACY_VAULT_ABI, functionName: 'revokeWill', args: [willId] })
  }

  return (
    <div className="bg-[#111118] border border-[#1E1E2E] rounded-2xl p-6 space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-white">Will #{willId.toString()}</h2>
          <StatusBadge status={statusCode} />
        </div>
        <span className="text-xs text-gray-600">Created {formatDate(Number(summary.lastCheckIn))}</span>
      </div>

      {/* ── Details grid — shown first ── */}
      <div className="grid grid-cols-3 gap-3">
        {/* Beneficiaries */}
        <div className="bg-[#0F0F1A] rounded-xl p-4 border border-[#1E1E2E]">
          <p className="text-[10px] text-[#E6007A] font-bold uppercase tracking-widest mb-3">Beneficiaries</p>
          <div className="space-y-2.5">
            {beneficiaries?.map((b, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-400 font-mono truncate">{shortAddress(b.wallet)}</span>
                <span className="text-xs font-bold text-[#FF6DC3] shrink-0">{bpsToPercent(b.sharePercent)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Details */}
        <div className="bg-[#0F0F1A] rounded-xl p-4 border border-[#1E1E2E]">
          <p className="text-[10px] text-[#E6007A] font-bold uppercase tracking-widest mb-3">Will Details</p>
          <div className="space-y-2">
            {[
              ['Period',    `${checkInDays}d`],
              ['Guardians', `${Number(summary.totalGuardians)}`],
              ['Threshold', `${Number(summary.threshold)}-of-${Number(summary.totalGuardians)}`],
              ['Timelock',  `${Number(summary.timelockDelay) / 3600}h`],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between text-xs">
                <span className="text-gray-500">{l}</span>
                <span className="text-white font-semibold">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tokens */}
        <div className="bg-[#0F0F1A] rounded-xl p-4 border border-[#1E1E2E]">
          <p className="text-[10px] text-[#E6007A] font-bold uppercase tracking-widest mb-3">Protected Tokens</p>
          <div className="space-y-2">
            {tokensData?.[0].map((token, i) => (
              <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#111118] border border-[#2E2E4E]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E6007A] shrink-0" />
                <span className="text-xs text-gray-300 font-mono truncate">{shortAddress(token, 8)}</span>
              </div>
            ))}
            {!tokensData?.[0].length && <p className="text-xs text-gray-600">None</p>}
          </div>
        </div>
      </div>

      {/* ── Countdown ── */}
      {isActive && <CountdownTimer deadline={deadlineTs} />}

      {/* ── Success banner ── */}
      {justCheckedIn && (
        <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800/40 text-emerald-400 text-sm text-center font-medium">
          ✅ Check-in confirmed! Next deadline in {checkInDays} days.
        </div>
      )}

      {/* ── Check-in button ── */}
      {shouldShowCheckIn && (
        <div className="space-y-1.5">
          <Button fullWidth size="lg"
            variant={isExpired || isUrgent ? 'danger' : 'primary'}
            onClick={handleCheckIn} loading={isLoading}>
            {isLoading        ? 'Confirming on-chain...'
              : isExpired     ? '🚨 URGENT: Check In Now!'
              : isUrgent      ? `⚠️ Check In — ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`
              : `✓  Check In — I'm Alive`}
          </Button>
          {!isExpired && !isUrgent && (
            <p className="text-xs text-gray-600 text-center">
              Resets your {checkInDays}-day timer · ~0.0018 PAS gas
            </p>
          )}
        </div>
      )}

      {/* ── Safe state ── */}
      {isActive && !shouldShowCheckIn && !justCheckedIn && (
        <div className="p-3 rounded-xl bg-[#0F0F1A] border border-[#1E1E2E] text-center">
          <p className="text-sm text-gray-400 font-medium">✓ You're safe — check-in not required yet</p>
          <p className="text-xs text-gray-600 mt-1">Come back when timer shows ≤15 days</p>
        </div>
      )}

      {/* ── Claimable ── */}
      {statusCode === 2 && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-900/50">
          <p className="text-red-300 font-bold mb-1">⚠️ Will is now claimable!</p>
          <p className="text-sm text-red-400 mb-3">Guardians can trigger inheritance. Check in immediately to cancel.</p>
          <Button variant="danger" size="sm" onClick={handleCheckIn} loading={isLoading}>Check In to Cancel</Button>
        </div>
      )}

      {/* ── Executing ── */}
      {statusCode === 3 && (
        <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-900/50">
          <p className="text-purple-300 font-bold mb-1">⏳ Timelock in progress</p>
          <p className="text-sm text-purple-400">Distribution begins after {Number(summary.timelockDelay) / 3600}h.</p>
        </div>
      )}

      {/* ── Executed / Revoked ── */}
      {(isExecuted || isRevoked) && (
        <div className="p-4 rounded-xl bg-[#0F0F1A] border border-[#1E1E2E] text-center">
          <p className="text-gray-500 text-sm">{isExecuted ? 'Will executed — assets distributed ✓' : 'Will revoked'}</p>
        </div>
      )}

      {/* ── Footer actions ── */}
      {isActive && (
        <div className="flex items-center justify-between pt-3 border-t border-[#1E1E2E]">
          <Link href="/claim">
            <Button variant="ghost" size="sm">Guardian / Beneficiary? →</Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={handleRevoke} loading={isLoading}
            className="text-red-500 hover:text-red-400">
            Revoke Will
          </Button>
        </div>
      )}
    </div>
  )
}