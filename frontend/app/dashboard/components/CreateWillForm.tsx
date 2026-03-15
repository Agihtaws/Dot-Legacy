'use client'

import { useState }                                              from 'react'
import { useWriteContract, useWaitForTransactionReceipt,
         usePublicClient, useAccount }                           from 'wagmi'
import { parseUnits }                                           from 'viem'
import { CONTRACTS, LEGACY_VAULT_ABI, ERC20_ABI,
         SUPPORTED_TOKENS, CHECK_IN_PERIODS, API_URL }          from '@/config/contracts'
import { isValidAddress, isValidEmail,
         generateDemoSecretHash }                               from '@/lib/utils'
import { Input }                                                from '@/components/ui/Input'
import { Button }                                               from '@/components/ui/Button'

interface Beneficiary { address: string; percent: string }
interface Props       { onSuccess: () => void }

const STEPS = ['Beneficiaries', 'Guardians', 'Check-in', 'Tokens & Email', 'Confirm']

export function CreateWillForm({ onSuccess }: Props) {
  const { address }     = useAccount()
  const publicClient    = usePublicClient()
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')

  // Form state
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([
    { address: '', percent: '60' },
    { address: '', percent: '40' },
  ])
  const [guardians,      setGuardians]      = useState(['', '', ''])
  const [threshold,      setThreshold]      = useState(2)
  const [checkInPeriod,  setCheckInPeriod]  = useState(CHECK_IN_PERIODS[0].value)
  const [selectedToken, setSelectedToken] = useState<typeof SUPPORTED_TOKENS[number]>(SUPPORTED_TOKENS[0])
  const [tokenAmount,    setTokenAmount]    = useState('')
  const [email,          setEmail]          = useState('')
  const [txStatus, setTxStatus] = useState<'idle'|'approving'|'creating'|'registering'|'done'>('idle')

  const { writeContractAsync } = useWriteContract()

  // ── Validation per step ──
  function validateStep(): boolean {
    setError('')

    if (step === 0) {
      const total = beneficiaries.reduce((s, b) => s + Number(b.percent || 0), 0)
      if (total !== 100) { setError(`Percentages must add up to 100% (currently ${total}%)`); return false }
      for (const b of beneficiaries) {
        if (!isValidAddress(b.address)) { setError(`Invalid address: ${b.address || '(empty)'}`); return false }
      }
      const addrs = beneficiaries.map(b => b.address.toLowerCase())
      if (new Set(addrs).size !== addrs.length) { setError('Beneficiary addresses must be unique'); return false }
    }

    if (step === 1) {
      const filled = guardians.filter(g => g.trim())
      if (filled.length < 1) { setError('Enter at least 1 guardian'); return false }
      for (const g of filled) {
        if (!isValidAddress(g)) { setError(`Invalid guardian address: ${g}`); return false }
      }
      const unique = new Set(filled.map(g => g.toLowerCase()))
      if (unique.size !== filled.length) { setError('Guardian addresses must be unique'); return false }
      if (threshold > filled.length) {
        setError(`Threshold (${threshold}) cannot exceed number of guardians (${filled.length})`); return false
      }
    }

    if (step === 3) {
      if (!tokenAmount || isNaN(Number(tokenAmount)) || Number(tokenAmount) <= 0) {
        setError('Enter a valid token amount'); return false
      }
      if (!isValidEmail(email)) { setError('Enter a valid email address'); return false }
    }

    return true
  }

  function next() { if (validateStep()) setStep(s => s + 1) }
  function back() { setStep(s => s - 1); setError('') }

  // ── Submit ──
  async function handleSubmit() {
    if (!address || !publicClient) return
    setError('')

    try {
      // Filter out empty guardian slots
      const activeGuardians = guardians.filter(g => g.trim()) as `0x${string}`[]

      // 1. Approve token spend
      setTxStatus('approving')
      const amount = parseUnits(tokenAmount, selectedToken.decimals)
      await writeContractAsync({
        address:      selectedToken.address,
        abi:          ERC20_ABI,
        functionName: 'approve',
        args:         [CONTRACTS.LEGACY_VAULT, amount],
      })

      // 2. Create will on-chain
      setTxStatus('creating')
      const secretHash  = generateDemoSecretHash(address)
      const bpsPercents = beneficiaries.map(b => BigInt(Math.round(Number(b.percent) * 100)))

      const txHash = await writeContractAsync({
        address:      CONTRACTS.LEGACY_VAULT,
        abi:          LEGACY_VAULT_ABI,
        functionName: 'createWill',
        args: [
          beneficiaries.map(b => b.address as `0x${string}`),
          bpsPercents,
          activeGuardians,
          BigInt(threshold),
          BigInt(checkInPeriod),
          [selectedToken.address],
          [amount],
          secretHash,
          'ipfs://dotlegacy-will',
        ],
      })

      // 3. Wait for tx receipt to get actual willId from logs
      setTxStatus('registering')
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })

      // Find WillCreated event log — topic[1] is willId (indexed)
      let willId = '1'
      try {
        const willCreatedLog = receipt.logs.find(log =>
          log.address.toLowerCase() === CONTRACTS.LEGACY_VAULT.toLowerCase() &&
          log.topics[0] === '0xeac02bfde2bb7261f68689a99ae1e8d24927531e7ca2502a8b12de1eed25c096'
        )
        if (willCreatedLog?.topics[1]) {
          willId = BigInt(willCreatedLog.topics[1]).toString()
        } else {
          // Fallback: read from chain
          const ownerWills = await publicClient.readContract({
            address:      CONTRACTS.LEGACY_VAULT,
            abi:          LEGACY_VAULT_ABI,
            functionName: 'getOwnerWills',
            args:         [address],
          }) as bigint[]
          if (ownerWills.length > 0) {
            willId = ownerWills[ownerWills.length - 1].toString()
          }
        }
      } catch {
        // fallback to getOwnerWills
        try {
          const ownerWills = await publicClient.readContract({
            address:      CONTRACTS.LEGACY_VAULT,
            abi:          LEGACY_VAULT_ABI,
            functionName: 'getOwnerWills',
            args:         [address],
          }) as bigint[]
          if (ownerWills.length > 0) {
            willId = ownerWills[ownerWills.length - 1].toString()
          }
        } catch {}
      }

      // 4. Register with backend — with real willId
      try {
        await fetch(`${API_URL}/api/register`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            willId,
            email,
            ownerAddress: address,
            txHash,
          }),
        })
      } catch {
        // Non-fatal — will was created on-chain, email is optional
        console.warn('Backend registration failed — will created but email not registered')
      }

      setTxStatus('done')
      setTimeout(() => onSuccess(), 1500)

    } catch (err: any) {
      const msg = err?.shortMessage || err?.message || 'Transaction failed'
      setError(msg.includes('user rejected') ? 'Transaction rejected in MetaMask' : msg)
      setTxStatus('idle')
    }
  }

  const isSubmitting = txStatus !== 'idle' && txStatus !== 'done'

  // ── Percent helpers ──
  function updatePercent(idx: number, val: string) {
    const arr = [...beneficiaries]
    arr[idx].percent = val
    // Auto-fill second if only 2 beneficiaries
    if (beneficiaries.length === 2 && idx === 0 && val !== '') {
      const remainder = 100 - Number(val)
      if (remainder >= 0 && remainder <= 100) arr[1].percent = remainder.toString()
    }
    setBeneficiaries(arr)
  }

  const totalPercent = beneficiaries.reduce((s, b) => s + Number(b.percent || 0), 0)

  return (
    <div className="space-y-6">

      {/* Step indicator */}
      <div className="flex items-center gap-1.5">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
              ${i < step  ? 'bg-[#E6007A] text-white'
              : i === step ? 'bg-[#E6007A] text-white ring-2 ring-[#E6007A]/40 ring-offset-2 ring-offset-[#111118]'
              : 'bg-[#1E1E2E] text-gray-500'}`}>
              {i < step ? '✓' : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-4 ${i < step ? 'bg-[#E6007A]' : 'bg-[#1E1E2E]'}`} />
            )}
          </div>
        ))}
        <p className="ml-2 text-xs text-gray-500">{STEPS[step]}</p>
      </div>

      {/* ── Step 0 — Beneficiaries ── */}
      {step === 0 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Who receives your assets? Must total 100%.</p>
          {beneficiaries.map((b, i) => (
            <div key={i} className="bg-[#0F0F1A] rounded-xl p-4 border border-[#1E1E2E] space-y-3">
              <p className="text-xs text-[#E6007A] font-semibold uppercase tracking-wider">
                Beneficiary {i + 1}
              </p>
              <Input
                label="Wallet address"
                placeholder="0x..."
                value={b.address}
                onChange={v => { const a=[...beneficiaries]; a[i].address=v; setBeneficiaries(a) }}
              />
              <Input
                label="Percentage"
                placeholder="50"
                type="number"
                value={b.percent}
                onChange={v => updatePercent(i, v)}
              />
            </div>
          ))}
          <div className="flex items-center justify-between text-xs">
            <span className={`font-semibold ${totalPercent === 100 ? 'text-emerald-400' : 'text-[#FF6DC3]'}`}>
              Total: {totalPercent}% {totalPercent === 100 ? '✓' : `(need ${100 - totalPercent}% more)`}
            </span>
            <button
              onClick={() => setBeneficiaries([...beneficiaries, { address: '', percent: '0' }])}
              className="text-[#E6007A] hover:text-[#FF6DC3] transition-colors"
            >
              + Add beneficiary
            </button>
          </div>
        </div>
      )}

      {/* ── Step 1 — Guardians ── */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Trusted people who confirm your inheritance. Minimum 1, recommended 3.
            You need <span className="text-white font-semibold">{threshold}-of-{guardians.filter(g=>g).length || 3}</span> to agree.
          </p>
          {guardians.map((g, i) => (
            <Input
              key={i}
              label={`Guardian ${i + 1}${i >= 1 ? ' (optional)' : ''}`}
              placeholder="0x..."
              value={g}
              onChange={v => { const a=[...guardians]; a[i]=v; setGuardians(a) }}
            />
          ))}
          <div>
            <p className="text-sm font-medium text-gray-300 mb-2">
              Threshold — how many must agree?
            </p>
            <div className="flex gap-2">
              {[1, 2, 3].map(t => (
                <button key={t} onClick={() => setThreshold(t)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors
                    ${threshold === t
                      ? 'bg-[#E6007A]/20 border-[#E6007A]/60 text-[#FF6DC3]'
                      : 'bg-[#0F0F1A] border-[#1E1E2E] text-gray-400 hover:border-[#E6007A]/30'}`}>
                  {t}-of-{guardians.filter(g=>g).length || 3}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2 — Check-in period ── */}
      {step === 2 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-400">
            How often will you check in? Miss the deadline + 15-day grace period and guardians can act.
          </p>
          {CHECK_IN_PERIODS.map(p => (
            <button key={p.value} onClick={() => setCheckInPeriod(p.value)}
              className={`w-full px-4 py-3.5 rounded-xl text-sm text-left border transition-colors font-medium
                ${checkInPeriod === p.value
                  ? 'bg-[#E6007A]/10 border-[#E6007A]/50 text-[#FF6DC3]'
                  : 'bg-[#0F0F1A] border-[#1E1E2E] text-gray-300 hover:border-[#E6007A]/20'}`}>
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Step 3 — Token + Email ── */}
      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Which token should be distributed? The vault will be approved to spend it from your wallet.
          </p>
          <div>
            <p className="text-sm font-medium text-gray-300 mb-2">Token</p>
            <div className="flex gap-2">
              {SUPPORTED_TOKENS.map(t => (
                <button key={t.symbol} onClick={() => setSelectedToken(t)}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-colors
                    ${selectedToken.symbol === t.symbol
                      ? 'bg-[#E6007A]/10 border-[#E6007A]/50 text-[#FF6DC3]'
                      : 'bg-[#0F0F1A] border-[#1E1E2E] text-gray-400 hover:border-[#E6007A]/20'}`}>
                  {t.symbol}
                </button>
              ))}
            </div>
          </div>
          <Input
            label={`Amount (${selectedToken.symbol})`}
            placeholder="100"
            type="number"
            value={tokenAmount}
            onChange={setTokenAmount}
            hint="Max amount the vault can distribute from your wallet on your behalf"
          />
          <Input
            label="Your email"
            placeholder="you@gmail.com"
            type="email"
            value={email}
            onChange={setEmail}
            hint="You'll receive check-in reminders before your deadline expires"
          />
        </div>
      )}

      {/* ── Step 4 — Confirm ── */}
      {step === 4 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-400 mb-4">Review before creating on-chain.</p>

          {[
            ['Beneficiaries', beneficiaries.map(b => `${b.address.slice(0,8)}... (${b.percent}%)`).join(', ')],
            ['Guardians',     `${guardians.filter(g=>g).length} guardians · ${threshold}-of-${guardians.filter(g=>g).length} threshold`],
            ['Check-in',      CHECK_IN_PERIODS.find(p => p.value === checkInPeriod)?.label ?? ''],
            ['Token',         `${tokenAmount} ${selectedToken.symbol}`],
            ['Email',         email],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between items-start py-2.5 border-b border-[#1E1E2E] text-sm gap-4">
              <span className="text-gray-500 shrink-0">{label}</span>
              <span className="text-white text-right text-xs font-mono break-all">{value}</span>
            </div>
          ))}

          <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-900/40 mt-4">
            <p className="text-amber-300 text-xs leading-relaxed">
              ⚠️ Two MetaMask confirmations required:<br/>
              <span className="font-semibold">1.</span> Approve {selectedToken.symbol} spend &nbsp;
              <span className="font-semibold">2.</span> Create will on-chain
            </p>
          </div>

          {/* Status messages */}
          {txStatus === 'approving'   && <p className="text-sm text-[#FF6DC3] text-center animate-pulse">Step 1/2: Approving {selectedToken.symbol}...</p>}
          {txStatus === 'creating'    && <p className="text-sm text-[#FF6DC3] text-center animate-pulse">Step 2/2: Creating will on-chain...</p>}
          {txStatus === 'registering' && <p className="text-sm text-[#FF6DC3] text-center animate-pulse">Registering email notifications...</p>}
          {txStatus === 'done'        && <p className="text-sm text-emerald-400 text-center font-semibold">✅ Will created successfully!</p>}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 rounded-xl bg-red-950/40 border border-red-900/50 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 pt-1">
        {step > 0 && (
          <Button variant="secondary" onClick={back} disabled={isSubmitting}>
            ← Back
          </Button>
        )}
        {step < STEPS.length - 1 && (
          <Button fullWidth onClick={next}>Next →</Button>
        )}
        {step === STEPS.length - 1 && (
          <Button fullWidth onClick={handleSubmit} loading={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Will on-chain →'}
          </Button>
        )}
      </div>
    </div>
  )
}