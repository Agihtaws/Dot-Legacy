'use client'

import { useCountdown } from '@/hooks/useCountdown'

export function CountdownTimer({ deadline }: { deadline: number }) {
  const { daysLeft, display, isExpired, isUrgent, isWarning } = useCountdown(deadline)

  const theme = isExpired || isUrgent
    ? { bg: 'bg-red-950/40 border-red-900/50',    text: 'text-red-400',    label: 'text-red-500/70' }
    : isWarning
    ? { bg: 'bg-yellow-950/40 border-yellow-900/50', text: 'text-yellow-400', label: 'text-yellow-500/70' }
    : { bg: 'bg-[#0F0F1A] border-[#E6007A]/20',   text: 'text-[#FF6DC3]', label: 'text-gray-500' }

  const msg = isExpired ? 'Check-in overdue!' : isUrgent ? 'Check in urgently' : isWarning ? 'Check-in approaching' : 'Next check-in in'

  return (
    <div className={`rounded-2xl border p-8 text-center ${theme.bg}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${theme.label}`}>{msg}</p>
      <p className={`text-7xl font-bold tracking-tight tabular-nums ${theme.text}`}>
        {isExpired ? 'EXPIRED' : display}
      </p>
      {!isExpired && (
        <p className={`text-sm mt-3 ${theme.label}`}>
          {daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining
        </p>
      )}
    </div>
  )
}