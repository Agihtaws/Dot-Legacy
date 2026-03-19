'use client'

import { useAccount }                     from 'wagmi'
import { bpsToPercent, shortAddress }     from '@/lib/utils'

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

  /* ── not connected ── */
  if (!address) {
    return (
      <div style={{
        padding:      '16px',
        borderRadius: '12px',
        background:   'rgba(15,15,26,0.9)',
        border:       '1px solid #1E1E2E',
        textAlign:    'center',
      }}>
        <p style={{ fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: '13px', color: '#9CA3AF' }}>
          Connect your wallet to check if you're a beneficiary
        </p>
      </div>
    )
  }

  /* ── not a beneficiary ── */
  if (!myShare) {
    return (
      <div style={{
        padding:      '16px',
        borderRadius: '12px',
        background:   'rgba(15,15,26,0.9)',
        border:       '1px solid #1E1E2E',
        textAlign:    'center',
      }}>
        <p style={{ fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: '13px', color: '#9CA3AF', marginBottom: '4px' }}>
          Your connected wallet is not a beneficiary of this will.
        </p>
        <p style={{ fontFamily: 'monospace', fontSize: '11px', color: '#4B5563' }}>
          {shortAddress(address, 10)}
        </p>
      </div>
    )
  }

  /* ── is a beneficiary ── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* your share highlight */}
      <div style={{
        padding:      '20px',
        borderRadius: '14px',
        background:   'rgba(230,0,122,0.06)',
        border:       '1px solid rgba(230,0,122,0.2)',
      }}>
        <p style={{
          fontFamily:    'var(--font-body)',
          fontWeight:    700,
          fontSize:      '10px',
          letterSpacing: '0.16em',
          textTransform: 'uppercase' as const,
          color:         'rgba(230,0,122,0.8)',
          marginBottom:  '14px',
        }}>
          Your Inheritance
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{
              fontFamily:   'var(--font-display)',
              fontWeight:   800,
              fontSize:     '2.5rem',
              color:        '#FFFFFF',
              lineHeight:   1,
              marginBottom: '6px',
            }}>
              {bpsToPercent(myShare.sharePercent)}
            </p>
            <p style={{ fontFamily: 'monospace', fontSize: '11px', color: '#6B7280' }}>
              {shortAddress(address, 10)}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: '11px', color: '#6B7280', marginBottom: '8px' }}>
              of all registered tokens
            </p>
            <span style={{
              display:      'inline-flex',
              alignItems:   'center',
              gap:          '6px',
              padding:      '5px 12px',
              borderRadius: '999px',
              fontFamily:   'var(--font-body)',
              fontWeight:   600,
              fontSize:     '11px',
              ...(executed
                ? { background: 'rgba(6,78,59,0.4)',    border: '1px solid rgba(52,211,153,0.3)', color: '#34D399' }
                : { background: 'rgba(230,0,122,0.1)',  border: '1px solid rgba(230,0,122,0.3)',  color: '#FF6DC3' }
              ),
            }}>
              {executed ? '✓ Received' : 'Pending'}
            </span>
          </div>
        </div>
      </div>

      {/* all beneficiaries table */}
      <div style={{
        borderRadius: '12px',
        background:   'rgba(15,15,26,0.9)',
        border:       '1px solid #1E1E2E',
        overflow:     'hidden',
      }}>
        <p style={{
          fontFamily:    'var(--font-body)',
          fontWeight:    400,
          fontSize:      '10px',
          letterSpacing: '0.1em',
          textTransform: 'uppercase' as const,
          color:         '#4B5563',
          padding:       '12px 16px 8px',
          borderBottom:  '1px solid #1E1E2E',
        }}>
          All Beneficiaries
        </p>
        {beneficiaries.map((b, i) => {
          const isMe = b.wallet.toLowerCase() === address?.toLowerCase()
          return (
            <div key={i} style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'space-between',
              padding:        '10px 16px',
              borderBottom:   i < beneficiaries.length - 1 ? '1px solid rgba(30,30,46,0.6)' : 'none',
              background:     isMe ? 'rgba(230,0,122,0.04)' : 'transparent',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isMe && (
                  <span style={{
                    padding:      '2px 6px',
                    borderRadius: '4px',
                    background:   'rgba(230,0,122,0.15)',
                    fontFamily:   'var(--font-body)',
                    fontWeight:   700,
                    fontSize:     '10px',
                    color:        '#FF6DC3',
                    letterSpacing:'0.05em',
                  }}>
                    YOU
                  </span>
                )}
                <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#9CA3AF' }}>
                  {shortAddress(b.wallet)}
                </span>
              </div>
              <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px', color: '#FF6DC3' }}>
                {bpsToPercent(b.sharePercent)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}