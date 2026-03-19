'use client'

import { useState, useEffect }                                                   from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { CONTRACTS, LEGACY_VAULT_ABI }                                from '@/config/contracts'
import { Button }                                                     from '@/components/ui/Button'
import { Input }                                                      from '@/components/ui/Input'
import { shortAddress }                                               from '@/lib/utils'

interface Props {
  willId:    bigint
  threshold: number
  submitted: number
  onSuccess: () => void
}

export function GuardianSubmit({ willId, threshold, submitted, onSuccess }: Props) {
  const { address, isConnected }                   = useAccount()
  const [shareValue, setShareValue]                = useState('')
  const [error, setError]                          = useState('')

  const { writeContract, data: txHash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess }     = useWaitForTransactionReceipt({ hash: txHash })

  useEffect(() => {
  if (isSuccess) {
    const t = setTimeout(() => onSuccess(), 1500)
    return () => clearTimeout(t)
  }
}, [isSuccess])

  const alreadyReached = submitted >= threshold

  function handleSubmit() {
    setError('')
    if (!shareValue || isNaN(Number(shareValue))) {
      setError('Enter your share value (a number given to you by the will owner)')
      return
    }
    if (!isConnected) { setError('Connect your wallet first'); return }
    writeContract({
      address:      CONTRACTS.LEGACY_VAULT,
      abi:          LEGACY_VAULT_ABI,
      functionName: 'submitShare',
      args:         [willId, BigInt(shareValue)],
    })
  }

  if (alreadyReached) {
    return (
      <div style={{
        padding:      '14px 16px',
        borderRadius: '12px',
        background:   'rgba(6,78,59,0.25)',
        border:       '1px solid rgba(52,211,153,0.25)',
        textAlign:    'center',
      }}>
        <p style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '13px', color: '#34D399' }}>
          ✅ Enough shares collected — no more needed
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* info banner */}
      <div style={{
        display:      'flex',
        gap:          '14px',
        padding:      '14px 16px',
        borderRadius: '12px',
        background:   'rgba(230,0,122,0.05)',
        border:       '1px solid rgba(230,0,122,0.15)',
        alignItems:   'flex-start',
      }}>
        <span style={{ fontSize: '22px', lineHeight: 1, flexShrink: 0 }}>🔑</span>
        <div>
          <p style={{
            fontFamily:   'var(--font-display)',
            fontWeight:   600,
            fontSize:     '14px',
            color:        '#FFFFFF',
            marginBottom: '5px',
          }}>
            You are a guardian
          </p>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 300,
            fontSize:   '12px',
            color:      '#9CA3AF',
            lineHeight: 1.6,
          }}>
            Submit your Shamir share to help verify this inheritance. Your share was given to you
            by the will owner. Need {threshold} guardians total — {submitted} already submitted.
          </p>
        </div>
      </div>

      {/* connected wallet pill */}
      {isConnected && (
        <div style={{
          display:      'inline-flex',
          alignItems:   'center',
          gap:          '8px',
          padding:      '7px 12px',
          borderRadius: '8px',
          background:   'rgba(17,17,24,0.9)',
          border:       '1px solid #252538',
          width:        'fit-content',
        }}>
          <span style={{
            width: '7px', height: '7px', borderRadius: '50%',
            background: '#34D399', boxShadow: '0 0 6px rgba(52,211,153,0.6)',
          }} />
          <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#D1D5DB' }}>
            {shortAddress(address!, 10)}
          </span>
        </div>
      )}

      <Input
        label="Your share value"
        placeholder="Enter the number your will owner gave you…"
        value={shareValue}
        onChange={v => { setShareValue(v); setError('') }}
        type="number"
        hint="This is your unique Shamir secret share — a large number"
        error={error}
      />

      {isSuccess && (
        <div style={{
          padding:      '12px 16px',
          borderRadius: '12px',
          background:   'rgba(6,78,59,0.25)',
          border:       '1px solid rgba(52,211,153,0.25)',
          textAlign:    'center',
        }}>
          <p style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '13px', color: '#34D399' }}>
            ✅ Share submitted successfully!
          </p>
        </div>
      )}

      <Button
        fullWidth size="lg"
        onClick={handleSubmit}
        loading={isPending || isConfirming}
        disabled={!isConnected}
      >
        {!isConnected
          ? 'Connect wallet to submit'
          : isPending || isConfirming
          ? 'Submitting share…'
          : 'Submit My Share'}
      </Button>
    </div>
  )
}