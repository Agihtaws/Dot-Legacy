'use client'

import { useState }                                                   from 'react'
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
  const { address, isConnected } = useAccount()
  const [shareValue, setShareValue] = useState('')
  const [error, setError]           = useState('')

  const { writeContract, data: txHash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess }     = useWaitForTransactionReceipt({ hash: txHash })

  if (isSuccess && onSuccess) {
    onSuccess()
  }

  const alreadyReached = submitted >= threshold

  function handleSubmit() {
    setError('')
    if (!shareValue || isNaN(Number(shareValue))) {
      setError('Enter your share value (a number given to you by the will owner)')
      return
    }
    if (!isConnected) {
      setError('Connect your wallet first')
      return
    }
    writeContract({
      address:      CONTRACTS.LEGACY_VAULT,
      abi:          LEGACY_VAULT_ABI,
      functionName: 'submitShare',
      args:         [willId, BigInt(shareValue)],
    })
  }

  if (alreadyReached) {
    return (
      <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-center">
        <p className="text-emerald-400 font-semibold">
          ✅ Enough shares collected — no more needed
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-[#E6007A]/5 border border-[#E6007A]/20">
        <span className="text-2xl mt-0.5">🔑</span>
        <div>
          <p className="text-sm font-semibold text-white mb-1">You are a guardian</p>
          <p className="text-xs text-gray-400 leading-relaxed">
            Submit your Shamir share to help verify this inheritance. Your share was given to you
            by the will owner when they set up DotLegacy. You need {threshold} guardians total —
            {submitted} already submitted.
          </p>
        </div>
      </div>

      {isConnected && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#111118] border border-[#2E2E4E]">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-xs text-gray-300 font-mono">{shortAddress(address!, 10)}</span>
        </div>
      )}

      <Input
        label="Your share value"
        placeholder="Enter the number your will owner gave you..."
        value={shareValue}
        onChange={setShareValue}
        type="number"
        hint="This is your unique Shamir secret share — a large number"
        error={error}
      />

      {isSuccess && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 text-sm text-center">
          ✅ Share submitted successfully!
        </div>
      )}

      <Button
        fullWidth
        size="lg"
        onClick={handleSubmit}
        loading={isPending || isConfirming}
        disabled={!isConnected}
      >
        {!isConnected
          ? 'Connect wallet to submit'
          : isPending || isConfirming
          ? 'Submitting share...'
          : 'Submit My Share'}
      </Button>
    </div>
  )
}