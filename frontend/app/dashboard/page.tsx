'use client'

import { useAccount }       from 'wagmi'
import { useOwnerWills }    from '@/hooks/useWill'
import { WillCard }         from './components/WillCard'
import { CreateWillForm }   from './components/CreateWillForm'
import { Navbar }           from '@/components/Navbar'
import { Card }             from '@/components/ui/Card'
import { Button }           from '@/components/ui/Button'
import Link                 from 'next/link'
import { useState }         from 'react'

export default function DashboardPage() {
  const { address, isConnected }       = useAccount()
  const { data: willIds, refetch }     = useOwnerWills(address)
  const [showCreate, setShowCreate]    = useState(false)

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#0A0A0F]">
        <Navbar />
        <div className="pt-32 px-6 flex items-center justify-center">
          <Card className="max-w-md w-full text-center" padding="lg">
            <div className="w-16 h-16 rounded-2xl bg-[#E6007A]/10 border border-[#E6007A]/20 flex items-center justify-center mx-auto mb-5">
              <span className="text-3xl">🔐</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Connect your wallet</h2>
            <p className="text-gray-400 text-sm mb-2">
              Connect MetaMask to view your will or create a new one.
            </p>
            <p className="text-xs text-gray-600">Polkadot Hub TestNet · chainId 420420417</p>
          </Card>
        </div>
      </div>
    )
  }

  const activeWills = willIds ?? []

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 pt-24 pb-16">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">My Will</h1>
            <p className="text-sm text-gray-500 mt-1">
              {activeWills.length === 0 ? 'No will created yet' : `${activeWills.length} active will${activeWills.length > 1 ? 's' : ''}`}
            </p>
          </div>
          {activeWills.length > 0 && !showCreate && (
            <Button size="sm" onClick={() => setShowCreate(true)}>+ New Will</Button>
          )}
        </div>

        {/* Existing wills — full width grid */}
        {activeWills.length > 0 && !showCreate && (
          <div className="space-y-8">
            {activeWills.map(willId => (
              <WillCard key={willId.toString()} willId={willId} onRefresh={refetch} />
            ))}
            
          </div>
        )}

        {/* Create form */}
        {(activeWills.length === 0 || showCreate) && (
          <div className="max-w-2xl mx-auto">
            <Card>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {showCreate ? 'Create Another Will' : 'Create Your Will'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">Set up on-chain inheritance in minutes</p>
                </div>
                {showCreate && (
                  <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
                )}
              </div>
              <CreateWillForm onSuccess={() => { refetch(); setShowCreate(false) }} />
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}