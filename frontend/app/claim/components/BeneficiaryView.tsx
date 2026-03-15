'use client'

import { useAccount }       from 'wagmi'
import { bpsToPercent, shortAddress } from '@/lib/utils'

interface Beneficiary {
  wallet:       string
  sharePercent: bigint
}

interface Props {
  beneficiaries: readonly Beneficiary[]
  willId:        bigint
  executed:      boolean
}

export function BeneficiaryView({ beneficiaries, willId, executed }: Props) {
  const { address } = useAccount()

  const myShare = address
    ? beneficiaries.find(b => b.wallet.toLowerCase() === address.toLowerCase())
    : null

  if (!address) {
    return (
      <div className="p-4 rounded-xl bg-[#0F0F1A] border border-[#1E1E2E] text-center">
        <p className="text-sm text-gray-400">Connect your wallet to check if you're a beneficiary</p>
      </div>
    )
  }

  if (!myShare) {
    return (
      <div className="p-4 rounded-xl bg-[#0F0F1A] border border-[#1E1E2E]">
        <p className="text-sm text-gray-400 text-center">
          Your connected wallet is not a beneficiary of this will.
        </p>
        <p className="text-xs text-gray-600 text-center mt-1 font-mono">{shortAddress(address, 10)}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="p-5 rounded-2xl bg-[#E6007A]/5 border border-[#E6007A]/20">
        <p className="text-xs text-[#E6007A] font-bold uppercase tracking-widest mb-3">
          Your Inheritance
        </p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold text-white">
              {bpsToPercent(myShare.sharePercent)}
            </p>
            <p className="text-xs text-gray-500 mt-1 font-mono">{shortAddress(address, 10)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 mb-1">of all registered tokens</p>
            {executed ? (
              <span className="px-3 py-1 rounded-full bg-emerald-950/50 border border-emerald-800/50 text-emerald-400 text-xs font-semibold">
                ✓ Received
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-[#E6007A]/10 border border-[#E6007A]/30 text-[#FF6DC3] text-xs font-semibold">
                Pending
              </span>
            )}
          </div>
        </div>
      </div>

      {/* All beneficiaries */}
      <div className="bg-[#0F0F1A] rounded-xl p-4 border border-[#1E1E2E]">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">All beneficiaries</p>
        <div className="space-y-2">
          {beneficiaries.map((b, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                {b.wallet.toLowerCase() === address?.toLowerCase() && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#E6007A]/20 text-[#FF6DC3] font-semibold">YOU</span>
                )}
                <span className="text-gray-400 font-mono">{shortAddress(b.wallet)}</span>
              </div>
              <span className="font-bold text-[#FF6DC3]">{bpsToPercent(b.sharePercent)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}