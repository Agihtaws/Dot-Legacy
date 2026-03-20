'use client'

import { useState }                                                              from 'react'
import { useWriteContract, useWaitForTransactionReceipt,
         usePublicClient, useAccount, useReadContract }                         from 'wagmi'
import { parseUnits, formatUnits }                                               from 'viem'
import { CONTRACTS, LEGACY_VAULT_ABI, ERC20_ABI,
         SUPPORTED_TOKENS, CHECK_IN_PERIODS, API_URL }                          from '@/config/contracts'
import { isValidAddress, isValidEmail }                                         from '@/lib/utils'
import { generateShares }                                                       from '@/lib/shamir'
import { Input }                                                                from '@/components/ui/Input'
import { Button }                                                               from '@/components/ui/Button'

interface Beneficiary { address: string; percent: string }
interface Props { onWillCreated: (shares: bigint[], guardians: string[], willId: string) => void }

const STEPS = ['Beneficiaries', 'Guardians', 'Check-in', 'Tokens & Email', 'Confirm']

/* ── shared sub-components ──────────────────────────────── */

function StepCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'rgba(15,15,26,0.9)', border: '1px solid #1E1E2E' }}>
      {children}
    </div>
  )
}

function StepLabel({ color, children }: { color?: string; children: React.ReactNode }) {
  return (
    <p
      className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2"
      style={{ fontFamily: 'var(--font-body)', color: color ?? '#E6007A' }}
    >
      {children}
    </p>
  )
}

function SectionNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[13px] text-gray-400 leading-relaxed" style={{ fontFamily: 'var(--font-body)', fontWeight: 300 }}>
      {children}
    </p>
  )
}

function ToggleButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200"
      style={{
        fontFamily: 'var(--font-body)',
        background: active ? 'rgba(230,0,122,0.12)' : 'rgba(15,15,26,0.9)',
        border:     active ? '1px solid rgba(230,0,122,0.5)' : '1px solid #1E1E2E',
        color:      active ? '#FF6DC3' : '#6B7280',
      }}
    >
      {children}
    </button>
  )
}

/* ─────────────────────────────────────────────────────────
   SharesDisplay (exported — rendered at page level)
───────────────────────────────────────────────────────── */
export function SharesDisplay({
  shares, guardians, willId, onDone,
}: {
  shares: bigint[]; guardians: string[]; willId: string; onDone: () => void
}) {
  const [copied, setCopied] = useState<number | null>(null)

  function copyShare(idx: number) {
    navigator.clipboard.writeText(shares[idx].toString())
    setCopied(idx)
    setTimeout(() => setCopied(null), 2000)
  }

  const isPending = willId === '…'

  return (
    <div className="space-y-4">

      {/* success header */}
      <div className="p-5 rounded-2xl text-center" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
        <p className="text-3xl mb-2">✅</p>
        <p className="text-white mb-1" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem' }}>
          {isPending ? 'Will Created — Confirming on-chain…' : `Will #${willId} Created`}
        </p>
        {isPending && (
          <p className="text-[12px] text-amber-400/80 mb-1 animate-pulse" style={{ fontFamily: 'var(--font-body)', fontWeight: 300 }}>
            Transaction submitted — your shares are ready now. Will ID resolves in background.
          </p>
        )}
        <p className="text-[13px] text-gray-400" style={{ fontFamily: 'var(--font-body)', fontWeight: 300 }}>
          Welcome email sent to your inbox.
        </p>
      </div>

      {/* warning */}
      <div className="p-4 rounded-xl" style={{ background: 'rgba(120,53,15,0.25)', border: '1px solid rgba(146,64,14,0.4)' }}>
        <p className="text-amber-300 font-semibold text-[13px] mb-1" style={{ fontFamily: 'var(--font-display)' }}>
          ⚠️ Save these shares now
        </p>
        <p className="text-[12px] text-amber-400 leading-relaxed" style={{ fontFamily: 'var(--font-body)', fontWeight: 300 }}>
          Generated once, never shown again. Each guardian needs their own unique share to trigger inheritance.
        </p>
      </div>

      {/* share cards */}
      <div className="space-y-2.5">
        {guardians.map((guardian, i) => (
          <div key={i} className="rounded-xl p-4" style={{ background: 'rgba(15,15,26,0.9)', border: '1px solid #1E1E2E' }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <StepLabel>Guardian {i + 1} Share</StepLabel>
                <p className="text-[11px] text-gray-500 font-mono" style={{ fontFamily: 'var(--font-body)' }}>
                  {guardian.slice(0, 8)}…{guardian.slice(-6)}
                </p>
              </div>
              <button
                onClick={() => copyShare(i)}
                className="px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-150"
                style={{
                  fontFamily: 'var(--font-body)',
                  background: copied === i ? 'rgba(16,185,129,0.1)' : 'rgba(230,0,122,0.08)',
                  border:     copied === i ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(230,0,122,0.25)',
                  color:      copied === i ? '#6EE7B7' : '#FF6DC3',
                }}
              >
                {copied === i ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <div className="p-3 rounded-lg" style={{ background: 'rgba(17,17,24,0.95)', border: '1px solid #252538' }}>
              <p className="text-[12px] text-white font-mono break-all leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                {shares[i].toString()}
              </p>
            </div>
            <p className="text-[11px] text-gray-600 mt-2" style={{ fontFamily: 'var(--font-body)', fontWeight: 300 }}>
              Send privately to {guardian.slice(0, 8)}… — they enter it on the Claim page.
            </p>
          </div>
        ))}
      </div>

      <Button fullWidth size="lg" onClick={onDone}>
        Go to Dashboard →
      </Button>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   CreateWillForm
───────────────────────────────────────────────────────── */
export function CreateWillForm({ onWillCreated }: Props) {
  const { address }       = useAccount()
  const publicClient      = usePublicClient()
  const [step, setStep]   = useState(0)
  const [error, setError] = useState('')

  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([{ address: '', percent: '100' }])
  const [guardians,     setGuardians]     = useState([''])
  const [threshold,     setThreshold]     = useState(1)
  const [checkInPeriod, setCheckInPeriod] = useState(CHECK_IN_PERIODS[0].value)
  const [selectedToken, setSelectedToken] = useState<typeof SUPPORTED_TOKENS[number]>(SUPPORTED_TOKENS[0])
  const [tokenAmount,   setTokenAmount]   = useState('')
  const [email,         setEmail]         = useState('')
  const [txStatus, setTxStatus]           = useState<'idle' | 'approving' | 'creating' | 'registering' | 'done'>('idle')

  const { data: tokenBalance } = useReadContract({
    address:      selectedToken.address,
    abi:          ERC20_ABI,
    functionName: 'balanceOf',
    args:         address ? [address] : undefined,
    query:        { enabled: !!address, refetchInterval: 10_000 },
  })
  const balanceDisplay = tokenBalance ? formatUnits(tokenBalance as bigint, selectedToken.decimals) : '0'

  const { writeContractAsync } = useWriteContract()

  /* ── helpers ── */
  const ownerAddr          = address?.toLowerCase() ?? ''
  const filledGuardians    = guardians.filter(g => g.trim())
  const filledBeneficiaries = beneficiaries.map(b => b.address.toLowerCase()).filter(Boolean)
  const filledGuardianAddrs = filledGuardians.map(g => g.toLowerCase())

  /* ── validation ── */
  function validateStep(): boolean {
    setError('')

    if (step === 0) {
      // Percentages must sum to 100
      const total = beneficiaries.reduce((s, b) => s + Number(b.percent || 0), 0)
      if (total !== 100) { setError(`Percentages must add up to 100% (currently ${total}%)`); return false }

      for (const b of beneficiaries) {
        if (!isValidAddress(b.address)) {
          setError(`Invalid address: ${b.address || '(empty)'}`)
          return false
        }
        // Beneficiary cannot be the will owner
        if (b.address.toLowerCase() === ownerAddr) {
          setError(`Beneficiary cannot be the will owner address — if you pass away, you cannot claim your own assets`)
          return false
        }
        // Beneficiary cannot be a guardian
        if (filledGuardianAddrs.includes(b.address.toLowerCase())) {
          setError(`${b.address.slice(0, 10)}… is already a guardian — a guardian cannot also be a beneficiary`)
          return false
        }
      }

      // Beneficiaries must be unique
      const addrs = beneficiaries.map(b => b.address.toLowerCase())
      if (new Set(addrs).size !== addrs.length) {
        setError('Beneficiary addresses must be unique')
        return false
      }
    }

    if (step === 1) {
      if (filledGuardians.length < 1) { setError('Enter at least 1 guardian'); return false }

      for (const g of filledGuardians) {
        if (!isValidAddress(g)) {
          setError(`Invalid guardian address: ${g}`)
          return false
        }
        // Guardian cannot be the will owner
        if (g.toLowerCase() === ownerAddr) {
          setError(`Guardian cannot be the will owner address — guardians must be independent trusted people`)
          return false
        }
        // Guardian cannot be a beneficiary
        if (filledBeneficiaries.includes(g.toLowerCase())) {
          setError(`${g.slice(0, 10)}… is already a beneficiary — a beneficiary cannot also be a guardian`)
          return false
        }
      }

      // Guardians must be unique
      if (new Set(filledGuardians.map(g => g.toLowerCase())).size !== filledGuardians.length) {
        setError('Guardian addresses must be unique')
        return false
      }

      if (threshold > filledGuardians.length) {
        setError(`Threshold (${threshold}) cannot exceed number of guardians (${filledGuardians.length})`)
        return false
      }
    }

    if (step === 3) {
      if (!tokenAmount || isNaN(Number(tokenAmount)) || Number(tokenAmount) <= 0) {
        setError('Enter a valid token amount')
        return false
      }
      if (!isValidEmail(email)) { setError('Enter a valid email address'); return false }
    }

    return true
  }

  function next() { if (validateStep()) setStep(s => s + 1) }
  function back() { setStep(s => s - 1); setError('') }

  /* ── per-address inline warnings (non-blocking, shown in real time) ── */
  function getBeneficiaryHint(addr: string): string | undefined {
    if (!addr) return undefined
    if (addr.toLowerCase() === ownerAddr) return '⚠ This is your own address'
    if (filledGuardianAddrs.includes(addr.toLowerCase())) return '⚠ Already used as a guardian'
    return undefined
  }

  function getGuardianHint(addr: string): string | undefined {
    if (!addr) return undefined
    if (addr.toLowerCase() === ownerAddr) return '⚠ This is your own address'
    if (filledBeneficiaries.includes(addr.toLowerCase())) return '⚠ Already used as a beneficiary'
    return undefined
  }

  /* ── submit ── */
  async function handleSubmit() {
    if (!address || !publicClient) return
    setError('')
    const activeGuardians = filledGuardians as `0x${string}`[]

    try {
      const { shares, secretHash } = generateShares(threshold, activeGuardians.length)

      // ── Step 1: Approve token ──
      setTxStatus('approving')
      const amount = parseUnits(tokenAmount, selectedToken.decimals)
      const approveTxHash = await writeContractAsync({
        address: selectedToken.address, abi: ERC20_ABI,
        functionName: 'approve', args: [CONTRACTS.LEGACY_VAULT, amount],
      })
      await publicClient.waitForTransactionReceipt({ hash: approveTxHash })

      // ── Step 2: Create will ──
      setTxStatus('creating')
      const bpsPercents = beneficiaries.map(b => BigInt(Math.round(Number(b.percent) * 100)))
      const txHash = await writeContractAsync({
        address: CONTRACTS.LEGACY_VAULT, abi: LEGACY_VAULT_ABI,
        functionName: 'createWill',
        args: [
          beneficiaries.map(b => b.address as `0x${string}`),
          bpsPercents, activeGuardians, BigInt(threshold),
          BigInt(checkInPeriod), [selectedToken.address], [amount],
          secretHash, 'ipfs://dotlegacy-will',
        ],
      })

      // ── Show shares IMMEDIATELY — don't block on receipt ──
      // The shares are generated client-side and don't depend on chain confirmation.
      // willId resolves in the background; we use '…' as placeholder.
      setTxStatus('done')
      onWillCreated(shares, activeGuardians, '…')

      // ── Background: resolve willId + register ──
      ;(async () => {
        let willId = ''
        try {
          setTxStatus('registering') // purely informational at this point
          const receipt = await Promise.race([
            publicClient.waitForTransactionReceipt({ hash: txHash }),
            new Promise<null>(r => setTimeout(() => r(null), 45_000)),
          ])

          if (receipt && receipt !== null) {
            const log = (receipt as any).logs?.find((l: any) =>
              l.address.toLowerCase() === CONTRACTS.LEGACY_VAULT.toLowerCase() &&
              l.topics[0] === '0xeac02bfde2bb7261f68689a99ae1e8d24927531e7ca2502a8b12de1eed25c096'
            )
            if (log?.topics[1]) willId = BigInt(log.topics[1]).toString()
          }

          // Fallback: read from chain
          if (!willId) {
            const ownerWills = await publicClient.readContract({
              address: CONTRACTS.LEGACY_VAULT, abi: LEGACY_VAULT_ABI,
              functionName: 'getOwnerWills', args: [address],
            }) as bigint[]
            if (ownerWills.length > 0) willId = ownerWills[ownerWills.length - 1].toString()
          }
        } catch { console.warn('Could not resolve willId from chain') }

        // Backend registration (fire-and-forget)
        try {
          await fetch(`${API_URL}/api/register`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ willId: willId || 'unknown', email, ownerAddress: address, txHash }),
          })
        } catch { console.warn('Backend registration failed — will created on-chain successfully') }
      })()

    } catch (err: any) {
      const msg = err?.shortMessage || err?.message || 'Transaction failed'
      setError(msg.includes('user rejected') ? 'Transaction rejected in MetaMask' : msg)
      setTxStatus('idle')
    }
  }

  const isSubmitting = txStatus === 'approving' || txStatus === 'creating'

  if (txStatus === 'done') return null

  const totalPercent = beneficiaries.reduce((s, b) => s + Number(b.percent || 0), 0)

  return (
    <div className="space-y-6">

      {/* ── step indicator ── */}
      <div>
        <div className="h-1 w-full rounded-full overflow-hidden mb-4" style={{ background: '#1E1E2E' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width:      `${(step / (STEPS.length - 1)) * 100}%`,
              background: 'linear-gradient(90deg, #E6007A, #FF6DC3)',
            }}
          />
        </div>
        <div className="flex items-start justify-between">
          {STEPS.map((s, i) => {
            const done    = i < step
            const current = i === step
            return (
              <div key={i} className="flex flex-col items-center gap-1.5" style={{ flex: 1 }}>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300"
                  style={{
                    fontFamily: 'var(--font-body)',
                    background: done || current ? 'linear-gradient(135deg,#E6007A,#C4006A)' : '#1E1E2E',
                    color:      done || current ? '#fff' : '#4B5563',
                    boxShadow:  current ? '0 0 0 3px rgba(230,0,122,0.25)' : 'none',
                  }}
                >
                  {done ? '✓' : i + 1}
                </div>
                <p
                  className="text-center leading-tight hidden sm:block"
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize:   '10px',
                    fontWeight: current ? 600 : 300,
                    color:      current ? '#FF6DC3' : done ? '#6B7280' : '#374151',
                  }}
                >
                  {s}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── step 0 — beneficiaries ── */}
      {step === 0 && (
        <div className="space-y-3">
          <SectionNote>Who receives your assets? Percentages must total 100%.</SectionNote>

          {/* owner address reminder */}
          {ownerAddr && (
            <div
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
              style={{ background: 'rgba(230,0,122,0.04)', border: '1px solid rgba(230,0,122,0.15)' }}
            >
              <span style={{ fontSize: '13px' }}>🚫</span>
              <p className="text-[11px] text-[#FF6DC3]/70 leading-relaxed" style={{ fontFamily: 'var(--font-body)', fontWeight: 300 }}>
                Your address (<span className="font-mono">{ownerAddr.slice(0,8)}…</span>) and guardian addresses cannot be beneficiaries.
              </p>
            </div>
          )}

          {beneficiaries.map((b, i) => {
            const hint = getBeneficiaryHint(b.address)
            return (
              <StepCard key={i}>
                <div className="flex items-center justify-between mb-3">
                  <StepLabel>Beneficiary {i + 1}</StepLabel>
                  {beneficiaries.length > 1 && (
                    <button
                      onClick={() => setBeneficiaries(beneficiaries.filter((_, idx) => idx !== i))}
                      className="text-[11px] text-red-500/70 hover:text-red-400 transition-colors"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="space-y-2.5">
                  <Input
                    label="Wallet address"
                    placeholder="0x…"
                    value={b.address}
                    onChange={v => { const a = [...beneficiaries]; a[i].address = v; setBeneficiaries(a) }}
                    error={hint}
                  />
                  <Input
                    label="Percentage (%)"
                    placeholder="100"
                    type="number"
                    value={b.percent}
                    onChange={v => {
                      const a = [...beneficiaries]; a[i].percent = v
                      if (beneficiaries.length === 2 && i === 0 && v !== '') {
                        const r = 100 - Number(v)
                        if (r >= 0 && r <= 100) a[1].percent = r.toString()
                      }
                      setBeneficiaries(a)
                    }}
                  />
                </div>
              </StepCard>
            )
          })}

          <div className="flex items-center justify-between pt-1">
            <span
              className={`text-[12px] font-semibold ${totalPercent === 100 ? 'text-emerald-400' : 'text-[#FF6DC3]'}`}
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Total: {totalPercent}% {totalPercent === 100 ? '✓' : `(need ${100 - totalPercent}% more)`}
            </span>
            <button
              onClick={() => setBeneficiaries([...beneficiaries, { address: '', percent: '0' }])}
              className="text-[12px] text-[#E6007A] hover:text-[#FF6DC3] transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              + Add beneficiary
            </button>
          </div>
        </div>
      )}

      {/* ── step 1 — guardians ── */}
      {step === 1 && (
        <div className="space-y-3">
          <SectionNote>
            Trusted people who confirm your inheritance.{' '}
            <span className="text-white font-medium">
              {threshold}-of-{guardians.length}
            </span>{' '}
            must agree.
          </SectionNote>

          {/* owner address reminder */}
          {ownerAddr && (
            <div
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
              style={{ background: 'rgba(230,0,122,0.04)', border: '1px solid rgba(230,0,122,0.15)' }}
            >
              <span style={{ fontSize: '13px' }}>🚫</span>
              <p className="text-[11px] text-[#FF6DC3]/70 leading-relaxed" style={{ fontFamily: 'var(--font-body)', fontWeight: 300 }}>
                Your address and beneficiary addresses cannot be guardians.
              </p>
            </div>
          )}

          {guardians.map((g, i) => {
            const hint = getGuardianHint(g)
            return (
              <StepCard key={i}>
                <div className="flex items-center justify-between mb-2.5">
                  <StepLabel>Guardian {i + 1}</StepLabel>
                  {guardians.length > 1 && (
                    <button
                      onClick={() => {
                        const updated = guardians.filter((_, idx) => idx !== i)
                        setGuardians(updated)
                        // Clamp threshold if needed
                        if (threshold > updated.length) setThreshold(updated.length)
                      }}
                      className="text-[11px] text-red-500/70 hover:text-red-400 transition-colors"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <Input
                  placeholder="0x…"
                  value={g}
                  onChange={v => { const a = [...guardians]; a[i] = v; setGuardians(a) }}
                  error={hint}
                />
              </StepCard>
            )
          })}

          <button
            onClick={() => setGuardians([...guardians, ''])}
            className="text-[12px] text-[#E6007A] hover:text-[#FF6DC3] transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            + Add guardian
          </button>

          {/* threshold — uses guardians.length (total slots, not just filled) */}
          <div>
            <p className="text-[12px] font-medium text-gray-300 mb-2.5" style={{ fontFamily: 'var(--font-body)' }}>
              Threshold — how many must agree?
            </p>
            <div className="flex gap-2">
              {Array.from({ length: guardians.length }, (_, i) => i + 1).map(t => (
                <ToggleButton key={t} active={threshold === t} onClick={() => setThreshold(t)}>
                  {t}-of-{guardians.length}
                </ToggleButton>
              ))}
            </div>
          </div>

          <div className="p-3.5 rounded-xl" style={{ background: 'rgba(230,0,122,0.04)', border: '1px solid rgba(230,0,122,0.15)' }}>
            <p className="text-[12px] text-[#FF6DC3]/80 leading-relaxed" style={{ fontFamily: 'var(--font-body)', fontWeight: 300 }}>
              🔑 After creation you'll see each guardian's unique share number. Send privately — each guardian gets a different number.
            </p>
          </div>
        </div>
      )}

      {/* ── step 2 — check-in period ── */}
      {step === 2 && (
        <div className="space-y-2.5">
          <SectionNote>How often will you check in? Miss the deadline and guardians can act.</SectionNote>
          {CHECK_IN_PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setCheckInPeriod(p.value)}
              className="w-full px-4 py-3.5 rounded-xl text-left transition-all duration-150"
              style={{
                fontFamily: 'var(--font-body)',
                fontSize:   '13px',
                fontWeight: checkInPeriod === p.value ? 600 : 400,
                background: checkInPeriod === p.value ? 'rgba(230,0,122,0.08)' : 'rgba(15,15,26,0.9)',
                border:     checkInPeriod === p.value ? '1px solid rgba(230,0,122,0.45)' : '1px solid #1E1E2E',
                color:      checkInPeriod === p.value ? '#FF6DC3' : '#9CA3AF',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* ── step 3 — token + email ── */}
      {step === 3 && (
        <div className="space-y-4">
          <SectionNote>Which token should be distributed? Vault will be approved to spend it from your wallet.</SectionNote>
          <div>
            <p className="text-[12px] font-medium text-gray-300 mb-2.5" style={{ fontFamily: 'var(--font-body)' }}>Token</p>
            <div className="flex gap-2">
              {SUPPORTED_TOKENS.map(t => (
                <ToggleButton key={t.symbol} active={selectedToken.symbol === t.symbol} onClick={() => setSelectedToken(t)}>
                  {t.symbol}
                </ToggleButton>
              ))}
            </div>
          </div>
          <Input
            label={`Amount (${selectedToken.symbol}) — Balance: ${Number(balanceDisplay).toFixed(2)} ${selectedToken.symbol}`}
            placeholder="100"
            type="number"
            value={tokenAmount}
            onChange={setTokenAmount}
            hint="Max amount the vault can distribute from your wallet"
          />
          <Input
            label="Your email"
            placeholder="you@example.com"
            type="email"
            value={email}
            onChange={setEmail}
            hint="You'll receive check-in reminders before your deadline expires"
          />
        </div>
      )}

      {/* ── step 4 — confirm ── */}
      {step === 4 && (
        <div className="space-y-3">
          <SectionNote>Review before creating on-chain.</SectionNote>
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1E1E2E' }}>
            {[
              ['Beneficiaries', beneficiaries.map(b => `${b.address.slice(0, 8)}… (${b.percent}%)`).join(', ')],
              ['Guardians',     `${filledGuardians.length} guardian${filledGuardians.length > 1 ? 's' : ''} · ${threshold}-of-${filledGuardians.length} threshold`],
              ['Check-in',      CHECK_IN_PERIODS.find(p => p.value === checkInPeriod)?.label ?? ''],
              ['Token',         `${tokenAmount} ${selectedToken.symbol}`],
              ['Email',         email],
            ].map(([label, value], idx, arr) => (
              <div
                key={label}
                className="flex justify-between items-start px-4 py-3 gap-4"
                style={{
                  background:   idx % 2 === 0 ? 'rgba(15,15,26,0.9)' : 'rgba(11,11,20,0.9)',
                  borderBottom: idx < arr.length - 1 ? '1px solid #1E1E2E' : 'none',
                }}
              >
                <span className="text-gray-500 shrink-0" style={{ fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: '12px' }}>
                  {label}
                </span>
                <span className="text-white text-right font-mono break-all" style={{ fontFamily: 'var(--font-body)', fontSize: '11px' }}>
                  {value}
                </span>
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded-xl" style={{ background: 'rgba(120,53,15,0.2)', border: '1px solid rgba(146,64,14,0.35)' }}>
            <p className="text-amber-300/80 text-[12px] leading-relaxed" style={{ fontFamily: 'var(--font-body)', fontWeight: 300 }}>
              ⚠️ Two MetaMask confirmations:{' '}
              <span className="font-semibold text-amber-300">1.</span> Approve {selectedToken.symbol}{'  '}
              <span className="font-semibold text-amber-300">2.</span> Create will
            </p>
          </div>

          {txStatus === 'approving'   && <TxStatusLine>Step 1/2: Approving {selectedToken.symbol}…</TxStatusLine>}
          {txStatus === 'creating'    && <TxStatusLine>Step 2/2: Creating will on-chain…</TxStatusLine>}
        </div>
      )}

      {/* ── error ── */}
      {error && (
        <div
          className="px-4 py-3 rounded-xl text-[13px]"
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 300,
            background: 'rgba(127,29,29,0.2)',
            border:     '1px solid rgba(153,27,27,0.4)',
            color:      '#FCA5A5',
          }}
        >
          {error}
        </div>
      )}

      {/* ── navigation ── */}
      <div className="flex gap-2.5 pt-1">
        {step > 0 && (
          <Button variant="secondary" onClick={back} disabled={isSubmitting}>← Back</Button>
        )}
        {step < STEPS.length - 1 && (
          <Button fullWidth onClick={next}>Continue →</Button>
        )}
        {step === STEPS.length - 1 && (
          <Button fullWidth onClick={handleSubmit} loading={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create Will on-chain →'}
          </Button>
        )}
      </div>

    </div>
  )
}

/* ── tiny tx status line ── */
function TxStatusLine({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-center animate-pulse"
      style={{ fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: '13px', color: '#FF6DC3' }}
    >
      {children}
    </p>
  )
}