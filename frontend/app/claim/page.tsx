'use client'

import { useState }                                      from 'react'
import { useReadContract }                               from 'wagmi'
import { useAccount }                                    from 'wagmi'
import { CONTRACTS, LEGACY_VAULT_ABI }                   from '@/config/contracts'
import { formatDate, shortAddress, formatDuration }                      from '@/lib/utils'
import { Navbar }                                        from '@/components/Navbar'
import { StatusBadge }                                   from '@/components/ui/StatusBadge'
import { WillLookup }                                    from './components/WillLookup'
import { SharesProgress }                                from './components/SharesProgress'
import { GuardianSubmit }                                from './components/GuardianSubmit'
import { TimelockCountdown }                             from './components/TimelockCountdown'
import { BeneficiaryView }                               from './components/BeneficiaryView'

/* ── shared style atoms ──────────────────────────────── */
const card: React.CSSProperties = {
  position:       'relative',
  background:     'rgba(17,17,24,0.85)',
  border:         '1px solid #1E1E2E',
  borderRadius:   '18px',
  overflow:       'hidden',
  backdropFilter: 'blur(10px)',
}

const cardAccent: React.CSSProperties = {
  position:   'absolute',
  top: 0, left: 0, right: 0,
  height:     '1px',
  background: 'linear-gradient(90deg, transparent, rgba(230,0,122,0.3), transparent)',
  pointerEvents: 'none',
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily:    'var(--font-body)',
      fontWeight:    700,
      fontSize:      '10px',
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color:         'rgba(230,0,122,0.8)',
      marginBottom:  '14px',
    }}>
      {children}
    </p>
  )
}

const HOW_IT_WORKS = [
  { emoji: '🔍', title: 'Find the will',           desc: 'Enter the will ID shared by the owner or their family.' },
  { emoji: '🔑', title: 'Guardians submit shares', desc: 'Each guardian connects their wallet and submits their Shamir share. When the threshold is met, the Rust PVM contract verifies the shares.' },
  { emoji: '⏳', title: 'Wait for timelock',        desc: '48-hour safety period. The owner can still check in to cancel during this window.' },
  { emoji: '💸', title: 'Execute distribution',    desc: "After timelock, anyone can trigger distribution. Tokens go directly to beneficiaries' wallets." },
]

export default function ClaimPage() {
  const [willId,     setWillId]     = useState<bigint | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const { address }                 = useAccount()

  const { data: summary, isLoading: loadingSummary, refetch: refetchSummary } = useReadContract({
    address:      CONTRACTS.LEGACY_VAULT,
    abi:          LEGACY_VAULT_ABI,
    functionName: 'getWillSummary',
    args:         willId !== null ? [willId] : undefined,
    query:        { enabled: willId !== null, refetchInterval: 10_000 },
  })

  const { data: beneficiaries, refetch: refetchBeneficiaries } = useReadContract({
    address:      CONTRACTS.LEGACY_VAULT,
    abi:          LEGACY_VAULT_ABI,
    functionName: 'getBeneficiaries',
    args:         willId !== null ? [willId] : undefined,
    query:        { enabled: willId !== null },
  })

  function handleSearch(id: bigint) { setWillId(id); setRefreshKey(k => k + 1) }
  function handleRefresh() { refetchSummary(); refetchBeneficiaries(); setRefreshKey(k => k + 1) }

  const statusCode  = summary ? Number(summary.status) : -1
  const isActive    = statusCode === 0 || statusCode === 1
  const isClaimable = statusCode === 2
  const isExecuting = statusCode === 3
  const isExecuted  = statusCode === 4
  const isRevoked   = statusCode === 5
  const notFound    = willId !== null && !loadingSummary && !summary
  // Owner should not be able to submit shares — they'd be verifying their own death
  const isOwner     = !!(address && summary?.owner &&
    address.toLowerCase() === summary.owner.toLowerCase())

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0A0A0F', position: 'relative' }}>

      {/* ambient glow */}
      <div aria-hidden style={{
        position: 'absolute', top: '-100px', right: '-100px',
        width: '500px', height: '500px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(230,0,122,0.07) 0%, transparent 70%)',
        filter: 'blur(40px)', pointerEvents: 'none',
      }} />

      <Navbar />

      <div style={{
        maxWidth:    '680px',
        margin:      '0 auto',
        padding:     '112px 24px 80px',
        display:     'flex',
        flexDirection: 'column',
        gap:         '16px',
      }}>

        {/* ── page header ── */}
        <div style={{ marginBottom: '8px' }}>
          <p style={{
            fontFamily:    'var(--font-body)',
            fontWeight:    600,
            fontSize:      '11px',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color:         'rgba(255,109,195,0.7)',
            marginBottom:  '8px',
          }}>
            Inheritance Portal
          </p>
          <h1 style={{
            fontFamily:  'var(--font-display)',
            fontWeight:  800,
            fontSize:    'clamp(1.75rem, 5vw, 2.5rem)',
            color:       '#FFFFFF',
            lineHeight:  1.1,
            marginBottom:'10px',
          }}>
            Claim Inheritance
          </h1>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 300,
            fontSize:   '14px',
            color:      '#6B7280',
          }}>
            Guardians submit shares to verify. Beneficiaries collect after distribution.
          </p>
        </div>

        {/* ── will lookup card ── */}
        <div style={card}>
          <div style={cardAccent} aria-hidden />
          <div style={{ padding: '24px' }}>
            <SectionLabel>Find a Will</SectionLabel>
            <WillLookup onSearch={handleSearch} loading={loadingSummary} />
          </div>
        </div>

        {/* ── not found ── */}
        {notFound && (
          <div style={{ ...card, padding: '32px 24px', textAlign: 'center' }}>
            <div aria-hidden style={cardAccent} />
            <p style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔎</p>
            <p style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '14px', color: '#9CA3AF', marginBottom: '6px' }}>
              Will #{willId?.toString()} not found on chain.
            </p>
            <p style={{ fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: '12px', color: '#4B5563' }}>
              Check the ID and try again.
            </p>
          </div>
        )}

        {/* ── will found ── */}
        {summary && willId !== null && (
          <>
            {/* will header */}
            <div style={card}>
              <div aria-hidden style={cardAccent} />
              <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h2 style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      fontSize:   '1.15rem',
                      color:      '#FFFFFF',
                    }}>
                      Will #{willId.toString()}
                    </h2>
                    <StatusBadge status={statusCode} />
                  </div>
                  <button
                    onClick={handleRefresh}
                    style={{
                      fontFamily:  'var(--font-body)',
                      fontSize:    '12px',
                      color:       '#6B7280',
                      background:  'transparent',
                      border:      '1px solid transparent',
                      borderRadius:'8px',
                      padding:     '5px 10px',
                      cursor:      'pointer',
                      transition:  'color 0.15s, background 0.15s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.color = '#D1D5DB'
                      ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.color = '#6B7280'
                      ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                    }}
                  >
                    ↻ Refresh
                  </button>
                </div>

                {/* summary grid */}
                <div style={{
                  display:             'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap:                 '10px',
                }}>
                  {[
                    ['Owner',     shortAddress(summary.owner)],
                    ['Created',   formatDate(Number(summary.lastCheckIn))],
                    ['Threshold', `${Number(summary.threshold)}-of-${Number(summary.totalGuardians)}`],
                    ['Timelock',  formatDuration(Number(summary.timelockDelay))],
                  ].map(([l, v]) => (
                    <div key={l} style={{
                      background:   'rgba(15,15,26,0.9)',
                      border:       '1px solid #1E1E2E',
                      borderRadius: '12px',
                      padding:      '12px',
                    }}>
                      <p style={{
                        fontFamily:    'var(--font-body)',
                        fontWeight:    400,
                        fontSize:      '10px',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color:         '#4B5563',
                        marginBottom:  '6px',
                      }}>
                        {l}
                      </p>
                      <p style={{
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        fontSize:   '13px',
                        color:      '#FFFFFF',
                      }}>
                        {v}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── active / warning ── */}
            {isActive && (
              <div style={{ ...card, padding: '40px 24px', textAlign: 'center' }}>
                <div aria-hidden style={cardAccent} />
                <p style={{ fontSize: '3rem', marginBottom: '14px' }}>🔒</p>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: '#FFFFFF', marginBottom: '10px' }}>
                  Will is still active
                </p>
                <p style={{ fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: '14px', color: '#6B7280', maxWidth: '380px', margin: '0 auto', lineHeight: 1.6 }}>
                  The owner is still checking in. This will cannot be claimed yet.
                  Come back after the check-in deadline passes.
                </p>
              </div>
            )}

            {/* ── claimable — guardian verification ── */}
            {isClaimable && (
              <div style={card}>
                <div aria-hidden style={cardAccent} />
                <div style={{ padding: '24px' }}>
                  <SectionLabel>Guardian Verification</SectionLabel>
                  <p style={{ fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: '13px', color: '#9CA3AF', marginBottom: '20px', lineHeight: 1.6 }}>
                    The will is claimable. Guardians must submit their Shamir shares to verify
                    the inheritance. Need {Number(summary.threshold)} of {Number(summary.totalGuardians)} guardians to agree.
                  </p>
                  <SharesProgress
                    submitted={Number(summary.sharesSubmitted)}
                    threshold={Number(summary.threshold)}
                    total={Number(summary.totalGuardians)}
                  />
                  <div style={{ borderTop: '1px solid #1E1E2E', marginTop: '20px', paddingTop: '20px' }}>
                    {isOwner ? (
                      /* Owner cannot submit shares for their own will */
                      <div style={{
                        padding: '14px 16px', borderRadius: '12px', textAlign: 'center',
                        background: 'rgba(17,17,24,0.9)', border: '1px solid #252538',
                      }}>
                        <p style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: '13px', color: '#6B7280' }}>
                          You are the will owner. Guardians must submit shares from their own wallets.
                        </p>
                        <p style={{ fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: '12px', color: '#4B5563', marginTop: '6px' }}>
                          You can still <strong style={{ color: '#FF6DC3' }}>check in</strong> from the Dashboard to cancel this process.
                        </p>
                      </div>
                    ) : (
                      <GuardianSubmit
                        willId={willId}
                        threshold={Number(summary.threshold)}
                        submitted={Number(summary.sharesSubmitted)}
                        onSuccess={handleRefresh}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── executing — timelock ── */}
            {isExecuting && (
              <div style={card}>
                <div aria-hidden style={cardAccent} />
                <div style={{ padding: '24px' }}>
                  <SectionLabel>Timelock Period</SectionLabel>
                  <p style={{ fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: '13px', color: '#9CA3AF', marginBottom: '20px' }}>
                    All shares verified. Waiting for the safety timelock before distribution.
                  </p>
                  <SharesProgress
                    submitted={Number(summary.sharesSubmitted)}
                    threshold={Number(summary.threshold)}
                    total={Number(summary.totalGuardians)}
                  />
                  <div style={{ borderTop: '1px solid #1E1E2E', marginTop: '20px', paddingTop: '20px' }}>
                    <TimelockCountdown
                      willId={willId}
                      claimStartTime={Number(summary.claimStartTime)}
                      timelockDelay={Number(summary.timelockDelay)}
                      onSuccess={handleRefresh}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── executed ── */}
            {isExecuted && (
              <div style={card}>
                <div aria-hidden style={cardAccent} />
                <div style={{ padding: '40px 24px 28px', textAlign: 'center' }}>
                  <p style={{ fontSize: '3.5rem', marginBottom: '14px' }}>✅</p>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', color: '#FFFFFF', marginBottom: '8px' }}>
                    Distribution Complete
                  </p>
                  <p style={{ fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: '14px', color: '#6B7280', marginBottom: '24px' }}>
                    Assets have been distributed to all beneficiaries.
                  </p>
                  {beneficiaries && (
                    <BeneficiaryView beneficiaries={beneficiaries} willId={willId} executed={true} />
                  )}
                </div>
              </div>
            )}

            {/* ── beneficiary view for claimable / executing ── */}
            {(isClaimable || isExecuting) && beneficiaries && (
              <div style={card}>
                <div aria-hidden style={cardAccent} />
                <div style={{ padding: '24px' }}>
                  <SectionLabel>Beneficiaries</SectionLabel>
                  <BeneficiaryView beneficiaries={beneficiaries} willId={willId} executed={false} />
                </div>
              </div>
            )}

            {/* ── revoked ── */}
            {isRevoked && (
              <div style={{ ...card, padding: '40px 24px', textAlign: 'center' }}>
                <div aria-hidden style={cardAccent} />
                <p style={{ fontSize: '3rem', marginBottom: '14px' }}>🚫</p>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: '#FFFFFF', marginBottom: '10px' }}>
                  Will Revoked
                </p>
                <p style={{ fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: '14px', color: '#6B7280' }}>
                  The owner revoked this will. Nothing will be distributed.
                </p>
              </div>
            )}
          </>
        )}

        {/* ── help / how claiming works ── */}
        {!willId && (
          <div style={card}>
            <div aria-hidden style={cardAccent} />
            <div style={{ padding: '24px' }}>
              <SectionLabel>How Claiming Works</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {HOW_IT_WORKS.map((item, i) => (
                  <div key={item.title} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                    <div style={{
                      width:        '36px',
                      height:       '36px',
                      borderRadius: '10px',
                      background:   'rgba(230,0,122,0.08)',
                      border:       '1px solid rgba(230,0,122,0.15)',
                      display:      'flex',
                      alignItems:   'center',
                      justifyContent:'center',
                      fontSize:     '18px',
                      flexShrink:   0,
                    }}>
                      {item.emoji}
                    </div>
                    <div>
                      <p style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 600,
                        fontSize:   '14px',
                        color:      '#FFFFFF',
                        marginBottom:'4px',
                      }}>
                        {item.title}
                      </p>
                      <p style={{
                        fontFamily: 'var(--font-body)',
                        fontWeight: 300,
                        fontSize:   '13px',
                        color:      '#6B7280',
                        lineHeight: 1.6,
                      }}>
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}