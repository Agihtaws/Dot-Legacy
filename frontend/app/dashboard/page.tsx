'use client'

import { useState }           from 'react'
import { useAccount }         from 'wagmi'
import { useOwnerWills }      from '@/hooks/useWill'
import { useReadContracts }   from 'wagmi'
import { CONTRACTS, LEGACY_VAULT_ABI } from '@/config/contracts'
import { WillCard }           from './components/WillCard'
import { CreateWillForm }     from './components/CreateWillForm'
import { Assets }             from './components/Assets'
import { Navbar }             from '@/components/Navbar'
import { Button }             from '@/components/ui/Button'

/* ── Shares display lives HERE at page level so it can never
   be unmounted by auto-refetch of useOwnerWills ── */
import { SharesDisplay }      from './components/CreateWillForm'

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
      <rect x="5" y="13" width="18" height="13" rx="3" stroke="#E6007A" strokeWidth="1.5"/>
      <path d="M9 13V9a5 5 0 0110 0v4" stroke="#E6007A" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export default function DashboardPage() {
  const { address, isConnected }   = useAccount()
  const { data: willIds, refetch } = useOwnerWills(address)
  const [showCreate, setShowCreate] = useState(false)

  // ── Shares state lives at page level — survives refetches ──
  const [pendingShares, setPendingShares] = useState<{
    shares:    bigint[]
    guardians: string[]
    willId:    string
  } | null>(null)

  const statusResults = useReadContracts({
    contracts: (willIds ?? []).map(id => ({
      address:      CONTRACTS.LEGACY_VAULT,
      abi:          LEGACY_VAULT_ABI,
      functionName: 'getWillSummary' as const,
      args:         [id]              as const,
    })),
    query: { enabled: (willIds ?? []).length > 0 },
  })

  const activeWills = (willIds ?? []).filter((_, i) => {
    const result = statusResults.data?.[i]
    if (!result || result.status !== 'success') return true
    const status = Number((result.result as any)?.status ?? 0)
    return status < 4
  })

  function handleWillCreated(shares: bigint[], guardians: string[], willId: string) {
    // Called by CreateWillForm the moment shares are ready
    // Store at page level so it survives any refetch
    setPendingShares({ shares, guardians, willId })
    refetch()
    setShowCreate(false)
  }

  function handleSharesDone() {
    setPendingShares(null)
    refetch()
  }

  const shouldShowForm = activeWills.length === 0 || showCreate

  /* ── disconnected ── */
  if (!isConnected) {
    return (
      <div className="min-h-screen relative overflow-hidden" style={{ background: '#0A0A0F' }}>
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(230,0,122,0.07) 0%, transparent 70%)',
        }} />
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-5">
          <div className="relative max-w-sm w-full rounded-2xl overflow-hidden text-center p-10"
            style={{ background:'rgba(17,17,24,0.85)',border:'1px solid #1E1E2E',backdropFilter:'blur(12px)' }}>
            <div aria-hidden className="absolute top-0 left-0 right-0 h-px"
              style={{ background:'linear-gradient(90deg,transparent,rgba(230,0,122,0.4),transparent)' }} />
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
              style={{ background:'rgba(230,0,122,0.08)',border:'1px solid rgba(230,0,122,0.2)' }}>
              <LockIcon />
            </div>
            <h2 className="text-white mb-2"
              style={{ fontFamily:'var(--font-display)',fontWeight:700,fontSize:'1.25rem' }}>
              Connect your wallet
            </h2>
            <p className="text-gray-400 mb-3 leading-relaxed"
              style={{ fontFamily:'var(--font-body)',fontWeight:300,fontSize:'14px' }}>
              Connect MetaMask to view your will or create a new one.
            </p>
            <p className="text-gray-700"
              style={{ fontFamily:'var(--font-body)',fontWeight:300,fontSize:'12px' }}>
              Polkadot Hub TestNet · chainId 420420417
            </p>
          </div>
        </div>
      </div>
    )
  }

  /* ── shares screen — shown at page level, never unmounted by refetch ── */
  if (pendingShares) {
    return (
      <div className="min-h-screen relative" style={{ background: '#0A0A0F' }}>
        <Navbar />
        <div className="relative max-w-3xl mx-auto px-5 pt-24 pb-20">
          <div className="relative rounded-2xl overflow-hidden"
            style={{ background:'rgba(17,17,24,0.85)',border:'1px solid #1E1E2E',backdropFilter:'blur(10px)' }}>
            <div aria-hidden className="absolute top-0 left-0 right-0 h-px"
              style={{ background:'linear-gradient(90deg,transparent,rgba(230,0,122,0.3),transparent)' }} />
            <div className="p-6">
              <SharesDisplay
                shares={pendingShares.shares}
                guardians={pendingShares.guardians}
                willId={pendingShares.willId}
                onDone={handleSharesDone}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ── main dashboard ── */
  return (
    <div className="min-h-screen relative" style={{ background: '#0A0A0F' }}>
      <div aria-hidden className="pointer-events-none absolute top-0 left-0 right-0 h-96" style={{
        background:'radial-gradient(ellipse 70% 100% at 50% 0%,rgba(230,0,122,0.05) 0%,transparent 100%)',
      }} />

      <Navbar />

      <div className="relative max-w-3xl mx-auto px-5 pt-24 pb-20 space-y-5">

        {/* header */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-1"
              style={{ fontFamily:'var(--font-body)',color:'#FF6DC3' }}>
              Dashboard
            </p>
            <h1 className="text-white leading-tight"
              style={{ fontFamily:'var(--font-display)',fontWeight:800,fontSize:'clamp(1.6rem,4vw,2.2rem)' }}>
              My Will
            </h1>
            <p className="text-gray-500 mt-1"
              style={{ fontFamily:'var(--font-body)',fontWeight:300,fontSize:'13px' }}>
              {activeWills.length === 0
                ? 'No active will yet'
                : `${activeWills.length} active will${activeWills.length > 1 ? 's' : ''}`}
            </p>
          </div>
          {activeWills.length > 0 && !showCreate && (
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <PlusIcon /> New Will
            </Button>
          )}
        </div>

        {/* assets */}
        <Assets />

        {/* active wills */}
        {activeWills.length > 0 && !showCreate && (
          <div className="space-y-5">
            {activeWills.map(willId => (
              <WillCard
                key={willId.toString()}
                willId={willId}
                onRefresh={() => { refetch(); statusResults.refetch?.() }}
              />
            ))}
          </div>
        )}

        {/* create form */}
        {shouldShowForm && (
          <div className="relative rounded-2xl overflow-hidden"
            style={{ background:'rgba(17,17,24,0.85)',border:'1px solid #1E1E2E',backdropFilter:'blur(10px)' }}>
            <div aria-hidden className="absolute top-0 left-0 right-0 h-px"
              style={{ background:'linear-gradient(90deg,transparent,rgba(230,0,122,0.3),transparent)' }} />
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-white"
                    style={{ fontFamily:'var(--font-display)',fontWeight:700,fontSize:'1.125rem' }}>
                    {showCreate ? 'Create Another Will' : 'Create Your Will'}
                  </h2>
                  <p className="text-gray-500 mt-1"
                    style={{ fontFamily:'var(--font-body)',fontWeight:300,fontSize:'13px' }}>
                    Set up on-chain inheritance in minutes
                  </p>
                </div>
                {showCreate && (
                  <button onClick={() => setShowCreate(false)}
                    className="text-gray-500 hover:text-gray-300 transition-colors"
                    style={{ fontFamily:'var(--font-body)',fontSize:'13px' }}>
                    Cancel
                  </button>
                )}
              </div>

              <CreateWillForm onWillCreated={handleWillCreated} />
            </div>
          </div>
        )}

      </div>
    </div>
  )
}