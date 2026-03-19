'use client'

import { ConnectButton }  from '@rainbow-me/rainbowkit'
import { useBalance }     from 'wagmi'
import { formatUnits }    from 'viem'

/* ── Separate component so useBalance follows Rules of Hooks ── */
function ConnectedButton({
  address,
  displayName,
  hasPendingTransactions,
  openAccountModal,
}: {
  address:               `0x${string}`
  displayName:           string
  hasPendingTransactions:boolean
  openAccountModal:      () => void
}) {
  const { data: balance } = useBalance({ address })

  const balanceLabel = balance
    ? `${Number(formatUnits(balance.value, balance.decimals)).toFixed(3)} ${balance.symbol}`
    : null

  return (
    <button
      onClick={openAccountModal}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        padding: '8px 14px', borderRadius: '10px',
        background: 'rgba(17,17,24,0.9)', border: '1px solid #252538',
        cursor: 'pointer',
        transition: 'border-color 0.15s ease, background 0.15s ease',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(230,0,122,0.4)'
        ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(22,22,31,0.95)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = '#252538'
        ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(17,17,24,0.9)'
      }}
    >
      {/* live green dot */}
      <span style={{
        width: '7px', height: '7px', borderRadius: '50%',
        background: '#34D399', flexShrink: 0,
        boxShadow: '0 0 6px rgba(52,211,153,0.6)',
        animation: 'pulse-dot 2s ease-in-out infinite',
      }} />

      {/* pending tx spinner */}
      {hasPendingTransactions && (
        <span style={{
          width: '14px', height: '14px', borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.15)',
          borderTopColor: '#FF6DC3',
          animation: 'spin 0.7s linear infinite', flexShrink: 0,
        }} />
      )}

      {/* truncated address */}
      <span style={{
        fontFamily: 'monospace', fontWeight: 500,
        fontSize: '13px', color: '#FFFFFF', letterSpacing: '0.01em',
      }}>
        {displayName}
      </span>

      {/* balance */}
      {balanceLabel && (
        <>
          <span style={{ color: '#374151', fontSize: '11px', userSelect: 'none' }}>·</span>
          <span style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: '12px', color: '#9CA3AF' }}>
            {balanceLabel}
          </span>
        </>
      )}

      {/* chevron */}
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
        <path d="M2 4l4 4 4-4" stroke="#6B7280" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  )
}

/* ── Main export ── */
export function ConnectWallet() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const ready     = mounted
        const connected = ready && account && chain

        if (!ready) return (
          <div style={{ opacity: 0, pointerEvents: 'none', userSelect: 'none' }} aria-hidden />
        )

        if (connected && chain.unsupported) {
          return (
            <button onClick={openChainModal} style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '9px 18px', borderRadius: '10px',
              background: 'rgba(127,29,29,0.4)', color: '#FCA5A5',
              fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '13px',
              border: '1px solid rgba(239,68,68,0.4)', cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
              ⚠️ Wrong Network
            </button>
          )
        }

        if (!connected) {
          return (
            <button
              onClick={openConnectModal}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '9px 20px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #E6007A 0%, #C4006A 100%)',
                color: '#fff', fontFamily: 'var(--font-body)', fontWeight: 600,
                fontSize: '13px', letterSpacing: '0.01em', border: 'none',
                cursor: 'pointer', boxShadow: '0 4px 16px rgba(230,0,122,0.28)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease', whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 24px rgba(230,0,122,0.40)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(230,0,122,0.28)'
              }}
            >
              Connect Wallet
            </button>
          )
        }

        return (
          <ConnectedButton
            address={account.address as `0x${string}`}
            displayName={account.displayName}
            hasPendingTransactions={account.hasPendingTransactions}
            openAccountModal={openAccountModal}
          />
        )
      }}
    </ConnectButton.Custom>
  )
}