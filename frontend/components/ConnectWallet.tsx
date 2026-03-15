'use client'

import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi'
import { polkadotHubTestnet }                                      from '@/config/chain'
import { shortAddress }                                            from '@/lib/utils'
import { Button }                                                  from './ui/Button'
import { useState }                                                from 'react'

export function ConnectWallet() {
  const { address, isConnected, chainId } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect }                     = useDisconnect()
  const { switchChain }                    = useSwitchChain()
  const [showMenu, setShowMenu]            = useState(false)
  const isWrongChain = isConnected && chainId !== polkadotHubTestnet.id

  if (!isConnected) {
    return (
      <Button onClick={() => connect({ connector: connectors[0] })} loading={isPending} size="md">
        Connect Wallet
      </Button>
    )
  }

  if (isWrongChain) {
    return (
      <Button variant="danger" size="md" onClick={() => switchChain({ chainId: polkadotHubTestnet.id })}>
        Switch Network
      </Button>
    )
  }

  return (
    <div className="relative">
      <button onClick={() => setShowMenu(v => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#111118] border border-[#2E2E4E] hover:border-[#E6007A]/50 transition-all text-sm">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-white font-medium font-mono">{shortAddress(address!)}</span>
        <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {showMenu && (
        <div className="absolute right-0 mt-2 w-52 bg-[#111118] border border-[#2E2E4E] rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1E1E2E]">
            <p className="text-xs text-gray-500">Connected to Polkadot Hub</p>
            <p className="text-sm text-white font-mono mt-0.5">{shortAddress(address!, 8)}</p>
          </div>
          <button onClick={() => { disconnect(); setShowMenu(false) }}
            className="w-full px-4 py-3 text-sm text-red-400 hover:bg-[#1A1A2E] text-left transition-colors">
            Disconnect
          </button>
        </div>
      )}
    </div>
  )
}