'use client'

interface Props {
  submitted: number
  threshold: number
  total:     number
}

export function SharesProgress({ submitted, threshold, total }: Props) {
  const pct     = Math.min((submitted / threshold) * 100, 100)
  const reached = submitted >= threshold

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400 font-medium">Guardian shares submitted</span>
        <span className={`font-bold ${reached ? 'text-emerald-400' : 'text-[#FF6DC3]'}`}>
          {submitted} / {threshold} required
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2.5 rounded-full bg-[#1E1E2E] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            reached ? 'bg-emerald-400' : 'bg-[#E6007A]'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Guardian slots */}
      <div className="flex gap-2">
        {Array.from({ length: total }).map((_, i) => {
          const filled = i < submitted
          return (
            <div key={i} className={`flex-1 h-8 rounded-lg border flex items-center justify-center text-xs font-semibold transition-colors
              ${filled
                ? 'bg-[#E6007A]/20 border-[#E6007A]/50 text-[#FF6DC3]'
                : 'bg-[#0F0F1A] border-[#2E2E4E] text-gray-600'}`}
            >
              {filled ? '✓' : `G${i + 1}`}
            </div>
          )
        })}
      </div>

      {reached && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-center">
          <p className="text-emerald-400 text-sm font-semibold">
            ✅ Threshold reached — verification complete
          </p>
        </div>
      )}
    </div>
  )
}