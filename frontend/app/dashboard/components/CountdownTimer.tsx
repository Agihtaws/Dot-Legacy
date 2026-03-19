'use client'

import { useCountdown } from '@/hooks/useCountdown'

export function CountdownTimer({ deadline, status }: { deadline: number; status?: number }) {
  const { daysLeft, display, isExpired, isUrgent, isWarning } = useCountdown(deadline, status)

  const theme = isExpired || isUrgent
    ? {
        bg:      'bg-red-950/30 border-red-900/40',
        text:    'text-red-400',
        label:   'text-red-500/60',
        bar:     'bg-red-500/30',
        barFill: 'bg-red-400',
        dot:     'bg-red-400',
      }
    : isWarning
    ? {
        bg:      'bg-amber-950/30 border-amber-900/40',
        text:    'text-amber-300',
        label:   'text-amber-500/60',
        bar:     'bg-amber-900/30',
        barFill: 'bg-amber-400',
        dot:     'bg-amber-400',
      }
    : {
        bg:      'bg-[#0F0F1A] border-[#E6007A]/15',
        text:    'text-[#FF6DC3]',
        label:   'text-gray-600',
        bar:     'bg-[#1E1E2E]',
        barFill: 'bg-gradient-to-r from-[#E6007A] to-[#FF6DC3]',
        dot:     'bg-[#E6007A]',
      }

  const msg = isExpired
    ? 'Check-in overdue!'
    : isUrgent
    ? 'Check in urgently'
    : isWarning
    ? 'Check-in approaching'
    : 'Next check-in in'

  /* progress bar: 0–100 based on days left (cap at 30 for visual) */
  const progressPct = isExpired ? 0 : Math.min(100, Math.round((daysLeft / 30) * 100))

  return (
    <div className={`relative rounded-2xl border overflow-hidden ${theme.bg}`}>
      {/* subtle top accent */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: isExpired || isUrgent
            ? 'linear-gradient(90deg, transparent, rgba(239,68,68,0.5), transparent)'
            : isWarning
            ? 'linear-gradient(90deg, transparent, rgba(251,191,36,0.4), transparent)'
            : 'linear-gradient(90deg, transparent, rgba(230,0,122,0.4), transparent)',
        }}
      />

      <div className="px-8 pt-8 pb-6 text-center">
        {/* label row */}
        <div className="flex items-center justify-center gap-2 mb-5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${theme.dot}`}
            style={{ animation: isExpired || isUrgent ? 'pulse-dot 1.2s ease-in-out infinite' : undefined }}
          />
          <p
            className={`text-[11px] font-semibold uppercase tracking-[0.15em] ${theme.label}`}
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {msg}
          </p>
        </div>

        {/* main time display */}
        <p
          className={`font-bold tracking-tight tabular-nums leading-none mb-5 ${theme.text}`}
          style={{
            fontFamily: 'var(--font-display)',
            fontSize:   'clamp(3rem, 10vw, 5rem)',
          }}
        >
          {isExpired ? 'EXPIRED' : display}
        </p>

        {/* days remaining pill */}
        {!isExpired && (
          <p
            className={`text-sm mb-6 ${theme.label}`}
            style={{ fontFamily: 'var(--font-body)', fontWeight: 300 }}
          >
            {daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining
          </p>
        )}

        {/* progress bar */}
        {!isExpired && (
          <div className={`h-1 w-full rounded-full overflow-hidden ${theme.bar}`}>
            <div
              className={`h-full rounded-full transition-all duration-700 ${theme.barFill}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}