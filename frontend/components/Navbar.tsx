'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useBalance }    from 'wagmi'
import { formatUnits }   from 'viem'
import Link              from 'next/link'
import { usePathname }   from 'next/navigation'
import { useState }      from 'react'

/* ── Connected wallet button ─────────────────────────────── */
function ConnectedButton({
  address, displayName, hasPendingTransactions, openAccountModal,
}: {
  address: `0x${string}`; displayName: string
  hasPendingTransactions: boolean; openAccountModal: () => void
}) {
  const { data: balance } = useBalance({ address, chainId: 420420417 })
  const balanceLabel = balance
    ? `${Number(formatUnits(balance.value, balance.decimals)).toFixed(3)} ${balance.symbol}`
    : null

  return (
    <button onClick={openAccountModal} style={{
      display: 'inline-flex', alignItems: 'center', gap: '7px',
      padding: '7px 12px', borderRadius: '10px',
      background: 'rgba(17,17,24,0.9)', border: '1px solid #252538',
      cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s',
      whiteSpace: 'nowrap',
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(230,0,122,0.4)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(22,22,31,0.95)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#252538'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(17,17,24,0.9)' }}
    >
      <span style={{ width:'7px',height:'7px',borderRadius:'50%',background:'#34D399',flexShrink:0,boxShadow:'0 0 6px rgba(52,211,153,0.6)',animation:'pulse-dot 2s ease-in-out infinite' }} />
      {hasPendingTransactions && (
        <span style={{ width:'13px',height:'13px',borderRadius:'50%',border:'2px solid rgba(255,255,255,0.15)',borderTopColor:'#FF6DC3',animation:'spin 0.7s linear infinite',flexShrink:0 }} />
      )}
      <span style={{ fontFamily:'monospace',fontWeight:500,fontSize:'12px',color:'#FFFFFF',letterSpacing:'0.01em' }}>
        {displayName}
      </span>
      {balanceLabel && (
        <>
          <span style={{ color:'#374151',fontSize:'10px' }}>·</span>
          <span style={{ fontFamily:'var(--font-body)',fontSize:'11px',color:'#9CA3AF' }}>{balanceLabel}</span>
        </>
      )}
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
        <path d="M2 4l4 4 4-4" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  )
}

/* ── Wallet button ───────────────────────────────────────── */
function WalletButton() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const ready = mounted
        const connected = ready && account && chain
        if (!ready) return <div style={{ opacity:0,width:1,height:1 }} aria-hidden />
        if (connected && chain.unsupported) return (
          <button onClick={openChainModal} style={{ display:'inline-flex',alignItems:'center',gap:'6px',padding:'7px 12px',borderRadius:'10px',background:'rgba(127,29,29,0.4)',color:'#FCA5A5',fontFamily:'var(--font-body)',fontWeight:600,fontSize:'12px',border:'1px solid rgba(239,68,68,0.4)',cursor:'pointer' }}>
            ⚠️ Wrong Network
          </button>
        )
        if (!connected) return (
          <button onClick={openConnectModal} style={{ display:'inline-flex',alignItems:'center',gap:'7px',padding:'8px 18px',borderRadius:'10px',background:'linear-gradient(135deg,#E6007A 0%,#C4006A 100%)',color:'#fff',fontFamily:'var(--font-body)',fontWeight:600,fontSize:'13px',border:'none',cursor:'pointer',boxShadow:'0 4px 16px rgba(230,0,122,0.28)',whiteSpace:'nowrap' }}>
            Connect Wallet
          </button>
        )
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

/* ── Main Navbar ─────────────────────────────────────────── */
export function Navbar() {
  const pathname        = usePathname()
  const [open, setOpen] = useState(false)

  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/claim',     label: 'Claim'     },
  ]

  const linkStyle = (active: boolean) => ({
    fontFamily:     'var(--font-body)',
    fontWeight:     active ? 500 : 400,
    fontSize:       '14px',
    color:          active ? '#FFFFFF' : '#6B7280',
    textDecoration: 'none',
    padding:        '6px 14px',
    borderRadius:   '8px',
    background:     active ? 'rgba(230,0,122,0.1)' : 'transparent',
    border:         active ? '1px solid rgba(230,0,122,0.2)' : '1px solid transparent',
    transition:     'color 0.15s, background 0.15s',
    display:        'block',
  } as React.CSSProperties)

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      borderBottom: '1px solid rgba(30,30,46,0.8)',
      background: 'rgba(10,10,15,0.92)',
      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
    }}>
      {/* ── Top bar ── */}
      <div style={{
        maxWidth: '1200px', margin: '0 auto', padding: '0 20px',
        height: '60px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: '16px',
      }}>

        {/* Logo */}
        <Link href="/" style={{ display:'flex',alignItems:'center',gap:'9px',textDecoration:'none',flexShrink:0 }}>
          <div style={{ width:'32px',height:'32px',borderRadius:'9px',background:'linear-gradient(135deg,#E6007A 0%,#C4006A 100%)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 14px rgba(230,0,122,0.35)' }}>
            <span style={{ fontFamily:'var(--font-display)',fontWeight:800,fontSize:'14px',color:'#fff' }}>D</span>
          </div>
          <span style={{ fontFamily:'var(--font-display)',fontWeight:700,fontSize:'1rem',color:'#FFFFFF',letterSpacing:'-0.01em' }}>DotLegacy</span>
        </Link>

        {/* Desktop: nav links centered */}
        <div className="nav-desktop" style={{ alignItems:'center',gap:'4px',flex:1,justifyContent:'center' }}>
          {links.map(({ href, label }) => {
            const active = pathname === href
            return (
              <Link key={href} href={href} style={linkStyle(active)}
                onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLAnchorElement).style.color='#FFF'; (e.currentTarget as HTMLAnchorElement).style.background='rgba(255,255,255,0.04)' } }}
                onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLAnchorElement).style.color='#6B7280'; (e.currentTarget as HTMLAnchorElement).style.background='transparent' } }}
              >{label}</Link>
            )
          })}
        </div>

        {/* Desktop: wallet */}
        <div className="nav-desktop"><WalletButton /></div>

        {/* Mobile: hamburger */}
        <button
          className="nav-hamburger"
          onClick={() => setOpen(v => !v)}
          aria-label="Toggle menu"
          style={{ background:'transparent',border:'1px solid #252538',borderRadius:'8px',padding:'7px 9px',cursor:'pointer',flexDirection:'column',gap:'4px',flexShrink:0 }}
        >
          {[0,1,2].map(i => (
            <span key={i} style={{
              display:'block',width:'18px',height:'2px',
              background: open && i===1 ? 'transparent' : '#9CA3AF',
              borderRadius:'2px',transition:'all 0.2s ease',
              transform: open
                ? i===0 ? 'translateY(6px) rotate(45deg)'
                : i===2 ? 'translateY(-6px) rotate(-45deg)'
                : 'none'
                : 'none',
            }} />
          ))}
        </button>

      </div>

      {/* ── Mobile dropdown — full width, block layout ── */}
      {open && (
        <div className="nav-mobile-menu">
          <div className="nav-mobile-links">
            {links.map(({ href, label }) => {
              const active = pathname === href
              return (
                <Link key={href} href={href}
                  onClick={() => setOpen(false)}
                  style={{ ...linkStyle(active), padding:'11px 14px', fontSize:'15px' }}
                >{label}</Link>
              )
            })}
          </div>
          <WalletButton />
        </div>
      )}
    </nav>
  )
}