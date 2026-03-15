export function StatusBadge({ status }: { status: number }) {
  const styles: Record<number, { label: string; cls: string; dot: string }> = {
    0: { label: 'Active',    cls: 'bg-emerald-950/80 text-emerald-400 border-emerald-800/50', dot: 'bg-emerald-400' },
    1: { label: 'Warning',   cls: 'bg-yellow-950/80 text-yellow-400 border-yellow-800/50',   dot: 'bg-yellow-400' },
    2: { label: 'Claimable', cls: 'bg-red-950/80 text-red-400 border-red-800/50',             dot: 'bg-red-400'    },
    3: { label: 'Executing', cls: 'bg-purple-950/80 text-purple-400 border-purple-800/50',   dot: 'bg-purple-400' },
    4: { label: 'Executed',  cls: 'bg-gray-900 text-gray-500 border-gray-800',                dot: 'bg-gray-500'   },
    5: { label: 'Revoked',   cls: 'bg-gray-900 text-gray-500 border-gray-800',                dot: 'bg-gray-500'   },
  }
  const s = styles[status] ?? styles[0]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} animate-pulse`} />
      {s.label}
    </span>
  )
}