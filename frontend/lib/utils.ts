
// -----------------------------------------------------------------------
// Format address: 0x1234...5678
// -----------------------------------------------------------------------
export function shortAddress(address: string, chars = 6): string {
  if (!address) return ''
  return `${address.slice(0, chars)}...${address.slice(-4)}`
}

// -----------------------------------------------------------------------
// Format token amount with decimals
// -----------------------------------------------------------------------
export function formatAmount(amount: bigint, decimals: number, precision = 2): string {
  const divisor = BigInt(10 ** decimals)
  const whole   = amount / divisor
  const frac    = amount % divisor
  const fracStr = frac.toString().padStart(decimals, '0').slice(0, precision)
  return `${whole}.${fracStr}`
}

// -----------------------------------------------------------------------
// Countdown from seconds
// -----------------------------------------------------------------------
export function formatCountdown(secondsLeft: number): string {
  if (secondsLeft <= 0) return 'Expired'
  const days    = Math.floor(secondsLeft / 86400)
  const hours   = Math.floor((secondsLeft % 86400) / 3600)
  const minutes = Math.floor((secondsLeft % 3600) / 60)
  if (days > 0)  return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

// -----------------------------------------------------------------------
// Format duration from raw seconds → human readable
// e.g. 120 → "2m" | 3600 → "1h" | 5400 → "1h 30m" | 172800 → "2d"
// -----------------------------------------------------------------------
export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0 && h > 0) return `${d}d ${h}h`
  if (d > 0)           return `${d}d`
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0)           return `${h}h`
  return `${m}m`
}

// -----------------------------------------------------------------------
// Seconds until a unix timestamp
// -----------------------------------------------------------------------
export function secondsUntil(timestamp: number): number {
  return Math.max(0, timestamp - Math.floor(Date.now() / 1000))
}

// -----------------------------------------------------------------------
// Will status label + color
// -----------------------------------------------------------------------
export function getStatusStyle(status: number): {
  label: string
  bg:    string
  text:  string
  dot:   string
} {
  const styles: Record<number, { label: string; bg: string; text: string; dot: string }> = {
    0: { label: 'Active',    bg: 'bg-green-100',  text: 'text-green-800',  dot: 'bg-green-500'  },
    1: { label: 'Warning',   bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500' },
    2: { label: 'Claimable', bg: 'bg-red-100',    text: 'text-red-800',    dot: 'bg-red-500'    },
    3: { label: 'Executing', bg: 'bg-purple-100', text: 'text-purple-800', dot: 'bg-purple-500' },
    4: { label: 'Executed',  bg: 'bg-gray-100',   text: 'text-gray-600',   dot: 'bg-gray-400'   },
    5: { label: 'Revoked',   bg: 'bg-gray-100',   text: 'text-gray-600',   dot: 'bg-gray-400'   },
  }
  return styles[status] ?? styles[0]
}

// -----------------------------------------------------------------------
// Format date
// -----------------------------------------------------------------------
export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year:  'numeric',
    month: 'short',
    day:   'numeric',
  })
}

// -----------------------------------------------------------------------
// Basis points to percentage string: 6000 → "60%"
// -----------------------------------------------------------------------
export function bpsToPercent(bps: bigint): string {
  return `${Number(bps) / 100}%`
}

// -----------------------------------------------------------------------
// Generate a deterministic secret hash for a wallet (for demo)
// -----------------------------------------------------------------------
export function generateDemoSecretHash(ownerAddress: string): `0x${string}` {
  const padded = ownerAddress.toLowerCase().replace('0x', '').padStart(64, '0')
  return `0x${padded}` as `0x${string}`
}

// -----------------------------------------------------------------------
// Generate demo share for a guardian (index 1-based)
// -----------------------------------------------------------------------
export function generateDemoShare(secret: string, index: number): bigint {
  const secretNum = BigInt('0x' + secret.replace('0x', '').slice(0, 32))
  return secretNum + BigInt(index) * 1000n
}

// -----------------------------------------------------------------------
// Validate Ethereum address
// -----------------------------------------------------------------------
export function isValidAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr)
}

// -----------------------------------------------------------------------
// Validate email
// -----------------------------------------------------------------------
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}