'use client'

interface Props {
  submitted: number
  threshold: number
  total:     number
}

export function SharesProgress({ submitted, threshold, total }: Props) {
  const pct     = Math.min((submitted / Math.max(threshold, 1)) * 100, 100)
  const reached = submitted >= threshold

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* label row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: '13px', color: '#9CA3AF' }}>
          Guardian shares submitted
        </p>
        <p style={{
          fontFamily: 'var(--font-body)',
          fontWeight: 700,
          fontSize:   '13px',
          color:      reached ? '#34D399' : '#FF6DC3',
        }}>
          {submitted} / {threshold} required
        </p>
      </div>

      {/* progress bar */}
      <div style={{ height: '6px', borderRadius: '999px', background: '#1E1E2E', overflow: 'hidden' }}>
        <div style={{
          height:      '100%',
          borderRadius:'999px',
          background:   reached
            ? 'linear-gradient(90deg, #34D399, #6EE7B7)'
            : 'linear-gradient(90deg, #E6007A, #FF6DC3)',
          width:       `${pct}%`,
          transition:  'width 0.6s ease',
          boxShadow:   reached ? '0 0 8px rgba(52,211,153,0.5)' : '0 0 8px rgba(230,0,122,0.4)',
        }} />
      </div>

      {/* guardian slot pills */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {Array.from({ length: total }).map((_, i) => {
          const filled = i < submitted
          return (
            <div key={i} style={{
              flex:           1,
              height:         '36px',
              borderRadius:   '10px',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              fontFamily:     'var(--font-body)',
              fontWeight:     600,
              fontSize:       '11px',
              background:     filled ? 'rgba(230,0,122,0.12)' : 'rgba(15,15,26,0.9)',
              border:         filled ? '1px solid rgba(230,0,122,0.4)' : '1px solid #252538',
              color:          filled ? '#FF6DC3' : '#4B5563',
              transition:     'all 0.3s ease',
            }}>
              {filled ? '✓' : `G${i + 1}`}
            </div>
          )
        })}
      </div>

      {reached && (
        <div style={{
          padding:      '12px 16px',
          borderRadius: '12px',
          background:   'rgba(6,78,59,0.25)',
          border:       '1px solid rgba(52,211,153,0.25)',
          textAlign:    'center',
        }}>
          <p style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '13px', color: '#34D399' }}>
            ✅ Threshold reached — verification complete
          </p>
        </div>
      )}
    </div>
  )
}