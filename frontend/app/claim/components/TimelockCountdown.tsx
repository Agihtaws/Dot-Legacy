'use client'

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
  const executeAt = claimStartTime + timelockDelay
  const { display, secondsLeft, isExpired } = useCountdown(executeAt)

  const { writeContract, data: txHash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess }     = useWaitForTransactionReceipt({ hash: txHash })

  if (isSuccess) onSuccess()

  function handleExecute() {
    writeContract({
      address:      CONTRACTS.LEGACY_VAULT,
      abi:          LEGACY_VAULT_ABI,
      functionName: 'executeDistribution',
      args:         [willId],
    })
  }

  return (
    <div className="space-y-4">
      {!isExpired ? (
        // Timelock still running
        <div className="p-6 rounded-2xl bg-purple-950/30 border border-purple-900/50 text-center space-y-3">
          <p className="text-xs text-purple-400 font-bold uppercase tracking-widest">
            Safety Timelock In Progress
          </p>
          <p className="text-5xl font-bold text-purple-300 tabular-nums">{display}</p>
          <p className="text-sm text-purple-400/70">
            Distribution unlocks in {display}
          </p>
          <div className="pt-2 p-3 rounded-xl bg-purple-950/40 border border-purple-800/30">
            <p className="text-xs text-purple-300">
              ⚠️ If the will owner is still alive, they can check in during this window to cancel.
            </p>
          </div>
        </div>
      ) : (
        // Timelock expired — ready to execute
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-emerald-950/30 border border-emerald-800/50 text-center">
            <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest mb-2">
              Timelock Complete
            </p>
            <p className="text-4xl font-bold text-emerald-400 mb-2">✓ Ready</p>
            <p className="text-sm text-emerald-400/70">
              Distribution can now be executed
            </p>
          </div>

          {isSuccess ? (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-center">
              <p className="text-emerald-400 font-semibold text-sm">
                ✅ Distribution executed! Tokens sent to beneficiaries.
              </p>
            </div>
          ) : (
            <Button
              fullWidth
              size="lg"
              onClick={handleExecute}
              loading={isPending || isConfirming}
            >
              {isPending || isConfirming ? 'Executing...' : '🚀 Execute Distribution'}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}