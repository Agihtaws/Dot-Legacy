const BADGE_STYLES: Record<number, { label: string; bg: string; color: string; border: string; dot: string }> = {
  0: { label: 'Active',    bg: 'rgba(6,78,59,0.5)',   color: '#34D399', border: 'rgba(52,211,153,0.25)',  dot: '#34D399' },
  1: { label: 'Warning',   bg: 'rgba(78,63,6,0.5)',   color: '#FBBF24', border: 'rgba(251,191,36,0.25)',  dot: '#FBBF24' },
  2: { label: 'Claimable', bg: 'rgba(78,6,6,0.5)',    color: '#F87171', border: 'rgba(248,113,113,0.25)', dot: '#F87171' },
  3: { label: 'Executing', bg: 'rgba(59,6,78,0.5)',   color: '#C084FC', border: 'rgba(192,132,252,0.25)', dot: '#C084FC' },
  4: { label: 'Executed',  bg: 'rgba(17,17,24,0.8)',  color: '#6B7280', border: '#252538',                dot: '#6B7280' },
  5: { label: 'Revoked',   bg: 'rgba(17,17,24,0.8)',  color: '#6B7280', border: '#252538',                dot: '#6B7280' },
}
 
export function StatusBadge({ status }: { status: number }) {
  const s = BADGE_STYLES[status] ?? BADGE_STYLES[0]
  return (
    <span style={{
      display:     'inline-flex',
      alignItems:  'center',
      gap:         '6px',
      padding:     '4px 10px',
      borderRadius:'999px',
      background:  s.bg,
      border:      `1px solid ${s.border}`,
      fontFamily:  'var(--font-body)',
      fontWeight:  500,
      fontSize:    '11px',
      color:       s.color,
      letterSpacing: '0.02em',
      whiteSpace:  'nowrap',
    }}>
      <span style={{
        width:       '6px',
        height:      '6px',
        borderRadius:'50%',
        background:  s.dot,
        flexShrink:  0,
        boxShadow:   `0 0 6px ${s.dot}`,
        animation:   status < 4 ? 'pulse-dot 2s ease-in-out infinite' : 'none',
      }} />
      {s.label}
    </span>
  )
}