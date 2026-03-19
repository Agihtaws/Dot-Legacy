'use client'

import { useEffect }                                      from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { CONTRACTS, LEGACY_VAULT_ABI }                    from '@/config/contracts'
import { useCountdown }                                   from '@/hooks/useCountdown'
import { Button }                                         from '@/components/ui/Button'

interface Props {
  willId:         bigint
  claimStartTime: number
  timelockDelay:  number
  onSuccess:      () => void
}

export function TimelockCountdown({ willId, claimStartTime, timelockDelay, onSuccess }: Props) {
  const executeAt                                  = claimStartTime + timelockDelay
  const { display, isExpired }                     = useCountdown(executeAt)
  const { writeContract, data: txHash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess }     = useWaitForTransactionReceipt({ hash: txHash })

  useEffect(() => {
  if (isSuccess) {
    const t = setTimeout(() => onSuccess(), 1500)
    return () => clearTimeout(t)
  }
}, [isSuccess])

  function handleExecute() {
    writeContract({
      address:      CONTRACTS.LEGACY_VAULT,
      abi:          LEGACY_VAULT_ABI,
      functionName: 'executeDistribution',
      args:         [willId],
    })
  }

  /* ── timelock still running ── */
  if (!isExpired) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{
          padding:      '28px 24px',
          borderRadius: '14px',
          background:   'rgba(59,6,78,0.25)',
          border:       '1px solid rgba(192,132,252,0.2)',
          textAlign:    'center',
        }}>
          <p style={{
            fontFamily:    'var(--font-body)',
            fontWeight:    700,
            fontSize:      '10px',
            letterSpacing: '0.16em',
            textTransform: 'uppercase' as const,
            color:         'rgba(192,132,252,0.7)',
            marginBottom:  '14px',
          }}>
            Safety Timelock In Progress
          </p>
          <p style={{
            fontFamily:         'var(--font-display)',
            fontWeight:         800,
            fontSize:           'clamp(2.5rem, 8vw, 4rem)',
            color:              '#C084FC',
            lineHeight:         1,
            marginBottom:       '14px',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {display}
          </p>
          <p style={{ fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: '13px', color: 'rgba(192,132,252,0.6)' }}>
            Distribution unlocks in {display}
          </p>
        </div>
        <div style={{
          padding:      '12px 16px',
          borderRadius: '12px',
          background:   'rgba(59,6,78,0.15)',
          border:       '1px solid rgba(192,132,252,0.15)',
          textAlign:    'center',
        }}>
          <p style={{ fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: '12px', color: '#C084FC' }}>
            ⚠️ If the will owner is still alive, they can check in during this window to cancel.
          </p>
        </div>
      </div>
    )
  }

  /* ── timelock complete ── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{
        padding:      '28px 24px',
        borderRadius: '14px',
        background:   'rgba(6,78,59,0.2)',
        border:       '1px solid rgba(52,211,153,0.2)',
        textAlign:    'center',
      }}>
        <p style={{
          fontFamily:    'var(--font-body)',
          fontWeight:    700,
          fontSize:      '10px',
          letterSpacing: '0.16em',
          textTransform: 'uppercase' as const,
          color:         'rgba(52,211,153,0.7)',
          marginBottom:  '14px',
        }}>
          Timelock Complete
        </p>
        <p style={{
          fontFamily:   'var(--font-display)',
          fontWeight:   800,
          fontSize:     '3rem',
          color:        '#34D399',
          lineHeight:   1,
          marginBottom: '10px',
        }}>
          ✓ Ready
        </p>
        <p style={{ fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: '13px', color: 'rgba(52,211,153,0.6)' }}>
          Distribution can now be executed
        </p>
      </div>

      {isSuccess ? (
        <div style={{
          padding:      '14px 16px',
          borderRadius: '12px',
          background:   'rgba(6,78,59,0.25)',
          border:       '1px solid rgba(52,211,153,0.25)',
          textAlign:    'center',
        }}>
          <p style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '13px', color: '#34D399' }}>
            ✅ Distribution executed! Tokens sent to beneficiaries.
          </p>
        </div>
      ) : (
        <Button fullWidth size="lg" onClick={handleExecute} loading={isPending || isConfirming}>
          {isPending || isConfirming ? 'Executing…' : '🚀 Execute Distribution'}
        </Button>
      )}
    </div>
  )
}