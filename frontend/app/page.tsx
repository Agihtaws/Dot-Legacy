'use client'

import Link      from 'next/link'
import { Navbar } from '@/components/Navbar'

/* ── icons ── */
function ArrowRight() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
}
function ChevronRight() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
}
function ShieldIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 3l8 3.5v5c0 4.5-3.3 8.7-8 10-4.7-1.3-8-5.5-8-10v-5L12 3z" stroke="#E6007A" strokeWidth="1.5" strokeLinejoin="round"/></svg>
}
function KeyIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden><circle cx="8" cy="12" r="4" stroke="#E6007A" strokeWidth="1.5"/><path d="M12 12h9M17 10v4" stroke="#E6007A" strokeWidth="1.5" strokeLinecap="round"/></svg>
}
function ClockIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden><circle cx="12" cy="12" r="9" stroke="#E6007A" strokeWidth="1.5"/><path d="M12 7v5l3 3" stroke="#E6007A" strokeWidth="1.5" strokeLinecap="round"/></svg>
}
function CoinsIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden><circle cx="9" cy="9" r="6" stroke="#E6007A" strokeWidth="1.5"/><path d="M15 6a6 6 0 11-6 10.2" stroke="#E6007A" strokeWidth="1.5" strokeLinecap="round"/></svg>
}

const STATS = [
  { value: '$140B+', label: 'Lost annually to\ncrypto inheritance failures' },
  { value: '20%',    label: 'Of all Bitcoin is\npermanently inaccessible'   },
  { value: '90%',    label: 'Of crypto holders have\nzero inheritance plan'  },
]

const STEPS = [
  { n: '01', color: '#E6007A', title: 'Create your will',       desc: 'Set beneficiaries with % splits, trusted guardians, check-in period, and tokens to distribute.' },
  { n: '02', color: '#FF6DC3', title: 'Check in regularly',     desc: "One transaction every few months proves you're alive. Resets the timer." },
  { n: '03', color: '#A855F7', title: 'Guardians verify (PVM)', desc: 'Guardians submit Shamir shares — verified by our Rust contract on RISC-V PolkaVM.' },
  { n: '04', color: '#F9A8D4', title: 'Assets distribute',      desc: 'After a 48h timelock, tokens go directly to beneficiaries. Automatic. On-chain.' },
]

const FEATURES = [
  { icon: <ShieldIcon />, title: 'Trustless & Unstoppable',   desc: 'No lawyers, no banks, no central authority. Smart contracts enforce your wishes automatically.' },
  { icon: <KeyIcon />,    title: "Shamir's Secret Sharing",   desc: 'Your secret is split among guardians. No single person holds enough power to act alone.' },
  { icon: <ClockIcon />, title: 'Safety Timelock',            desc: 'A 48-hour window after verification lets you cancel if you\'re still alive. Zero risk.' },
  { icon: <CoinsIcon />, title: 'Any ERC-20 Token',           desc: 'Protect USDT, USDC, DOT, or any token. Assets stay in your wallet until the moment of distribution.' },
]

const BADGES = [
  { label: 'Rust PVM',        style: { background:'rgba(124,45,18,0.5)',  color:'#FDBA74', border:'rgba(194,65,12,0.4)'  } },
  { label: 'RISC-V PolkaVM',  style: { background:'rgba(127,29,29,0.5)',  color:'#FCA5A5', border:'rgba(185,28,28,0.4)'  } },
  { label: 'OpenZeppelin v5', style: { background:'rgba(23,37,84,0.6)',   color:'#93C5FD', border:'rgba(29,78,216,0.4)'  } },
  { label: "Shamir's SSS",    style: { background:'rgba(230,0,122,0.1)',  color:'#FF6DC3', border:'rgba(230,0,122,0.3)'  } },
  { label: 'ERC-721 Will NFT',style: { background:'rgba(88,28,135,0.5)', color:'#C084FC', border:'rgba(126,34,206,0.4)' } },
  { label: 'Solidity 0.8.28', style: { background:'rgba(15,15,26,0.9)',  color:'#9CA3AF', border:'#252538'               } },
  { label: 'Foundry',         style: { background:'rgba(15,15,26,0.9)',  color:'#9CA3AF', border:'#252538'               } },
]

export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0A0A0F', overflowX: 'hidden', position: 'relative' }}>

      {/* Ambient orbs */}
      <div aria-hidden style={{ position:'absolute',inset:0,overflow:'hidden',pointerEvents:'none',zIndex:0 }}>
        <div style={{ position:'absolute',top:'-120px',right:'-120px',width:'min(600px,90vw)',height:'min(600px,90vw)',borderRadius:'50%',background:'radial-gradient(circle,rgba(230,0,122,0.10) 0%,transparent 70%)',filter:'blur(40px)' }} />
        <div style={{ position:'absolute',bottom:'10%',left:'-140px',width:'min(500px,80vw)',height:'min(500px,80vw)',borderRadius:'50%',background:'radial-gradient(circle,rgba(168,85,247,0.07) 0%,transparent 70%)',filter:'blur(50px)' }} />
      </div>

      {/* Dot grid */}
      <div aria-hidden className="dot-grid" style={{ position:'absolute',inset:0,pointerEvents:'none',zIndex:0,maskImage:'radial-gradient(ellipse 90% 60% at 50% 0%,black 20%,transparent 100%)',WebkitMaskImage:'radial-gradient(ellipse 90% 60% at 50% 0%,black 20%,transparent 100%)' }} />

      <div style={{ position:'relative',zIndex:1 }}>
        <Navbar />

        {/* ══ HERO ══════════════════════════════════════════ */}
        <section style={{ paddingTop:'clamp(100px,18vw,148px)', paddingBottom:'clamp(60px,10vw,100px)', paddingLeft:'20px', paddingRight:'20px', textAlign:'center' }}>
          <div style={{ maxWidth:'860px', margin:'0 auto' }}>

            {/* Badge */}
            <div className="fade-up" style={{ display:'inline-flex',alignItems:'center',gap:'10px',padding:'8px 16px',borderRadius:'999px',marginBottom:'clamp(28px,5vw,40px)',background:'rgba(230,0,122,0.08)',border:'1px solid rgba(230,0,122,0.2)' }}>
              <span className="pulse-dot" style={{ width:'6px',height:'6px',borderRadius:'50%',background:'#E6007A',flexShrink:0 }} />
              <span style={{ fontFamily:'var(--font-body)',fontWeight:600,fontSize:'clamp(10px,2.5vw,11px)',color:'#FF6DC3',textTransform:'uppercase',letterSpacing:'0.12em' }}>
                Polkadot Hub · Track 2 PVM + OpenZeppelin · Hackathon 2026
              </span>
            </div>

            {/* Headline */}
            <h1 className="fade-up fade-up-1" style={{ fontFamily:'var(--font-display)',fontWeight:800,fontSize:'clamp(2.2rem,8vw,5.25rem)',lineHeight:1.04,color:'#FFFFFF',letterSpacing:'-0.02em',marginBottom:'clamp(16px,3vw,24px)' }}>
              Your family won't
              <br />
              <span className="gradient-text">lose your crypto</span>
            </h1>

            {/* Sub */}
            <p className="fade-up fade-up-2" style={{ fontFamily:'var(--font-body)',fontWeight:300,fontSize:'clamp(0.95rem,2.5vw,1.15rem)',color:'#9CA3AF',maxWidth:'560px',margin:'0 auto',marginBottom:'clamp(8px,2vw,14px)',lineHeight:1.65 }}>
              $140 billion in crypto is permanently lost every year. DotLegacy puts your
              inheritance on-chain — automatic, trustless, unstoppable.
            </p>

            <p className="fade-up fade-up-3" style={{ fontFamily:'var(--font-body)',fontWeight:300,fontSize:'11px',color:'#4B5563',letterSpacing:'0.04em',marginBottom:'clamp(36px,7vw,48px)' }}>
              Powered by Rust PVM · Shamir's Secret Sharing · OpenZeppelin · Polkadot Hub
            </p>

            {/* CTAs */}
            <div className="fade-up fade-up-4" style={{ display:'flex',flexWrap:'wrap',gap:'12px',justifyContent:'center',alignItems:'center' }}>
              <Link href="/dashboard" className="btn-primary" style={{ minWidth:'clamp(160px,40vw,200px)',justifyContent:'center' }}>
                Create Your Will <ArrowRight />
              </Link>
              <Link href="/claim" className="btn-secondary" style={{ minWidth:'clamp(160px,40vw,200px)',justifyContent:'center' }}>
                I'm a Beneficiary <ChevronRight />
              </Link>
            </div>
          </div>
        </section>

        {/* ══ STATS ════════════════════════════════════════ */}
        <section style={{ position:'relative',borderTop:'1px solid #1E1E2E',borderBottom:'1px solid #1E1E2E',padding:'clamp(40px,8vw,56px) 20px' }}>
          <div style={{ position:'absolute',inset:0,background:'linear-gradient(90deg,transparent,rgba(230,0,122,0.04),transparent)',pointerEvents:'none' }} />
          <div style={{ maxWidth:'900px',margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'clamp(32px,6vw,40px)',textAlign:'center',position:'relative' }}>
            {STATS.map(({ value, label }) => (
              <div key={value} style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'8px' }}>
                <p style={{ fontFamily:'var(--font-display)',fontWeight:800,fontSize:'clamp(2.2rem,7vw,3.4rem)',background:'linear-gradient(135deg,#fff 50%,#888 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',lineHeight:1 }}>
                  {value}
                </p>
                <p style={{ fontFamily:'var(--font-body)',fontWeight:300,fontSize:'13px',color:'#6B7280',maxWidth:'160px',whiteSpace:'pre-line',lineHeight:1.5 }}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ══ HOW IT WORKS ════════════════════════════════ */}
        <section style={{ padding:'clamp(60px,12vw,100px) 20px' }}>
          <div style={{ maxWidth:'1100px',margin:'0 auto' }}>
            <div style={{ textAlign:'center',marginBottom:'clamp(40px,8vw,56px)' }}>
              <p style={{ fontFamily:'var(--font-body)',fontWeight:600,fontSize:'11px',letterSpacing:'0.14em',textTransform:'uppercase',color:'rgba(255,109,195,0.75)',marginBottom:'10px',display:'block' }}>The Protocol</p>
              <h2 style={{ fontFamily:'var(--font-display)',fontWeight:700,fontSize:'clamp(1.75rem,4vw,2.5rem)',color:'#FFFFFF',marginBottom:'14px' }}>How it works</h2>
              <p style={{ fontFamily:'var(--font-body)',fontWeight:300,fontSize:'15px',color:'#6B7280',maxWidth:'440px',margin:'0 auto' }}>
                Four steps. All on-chain. No lawyers, no banks, no trust required.
              </p>
            </div>

            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:'clamp(12px,2vw,16px)' }}>
              {STEPS.map(item => (
                <div key={item.n} className="glass glass-hover" style={{ padding:'clamp(20px,3vw,24px)',position:'relative',overflow:'hidden' }}>
                  <div aria-hidden style={{ position:'absolute',top:0,left:0,right:0,height:'2px',background:`linear-gradient(90deg,${item.color}50,${item.color}18,transparent)` }} />
                  <p style={{ fontFamily:'var(--font-display)',fontWeight:800,fontSize:'clamp(1.8rem,5vw,2.25rem)',color:item.color,lineHeight:1,marginBottom:'16px' }}>{item.n}</p>
                  <h3 style={{ fontFamily:'var(--font-display)',fontWeight:600,fontSize:'clamp(0.875rem,2vw,0.9375rem)',color:'#FFFFFF',marginBottom:'8px' }}>{item.title}</h3>
                  <p style={{ fontFamily:'var(--font-body)',fontWeight:300,fontSize:'13px',color:'#6B7280',lineHeight:1.6 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ FEATURES ════════════════════════════════════ */}
        <section style={{ padding:'clamp(60px,10vw,80px) 20px',borderTop:'1px solid #1E1E2E' }}>
          <div style={{ maxWidth:'1000px',margin:'0 auto' }}>
            <div style={{ textAlign:'center',marginBottom:'clamp(40px,7vw,48px)' }}>
              <p style={{ fontFamily:'var(--font-body)',fontWeight:600,fontSize:'11px',letterSpacing:'0.14em',textTransform:'uppercase',color:'rgba(255,109,195,0.75)',marginBottom:'10px',display:'block' }}>Why DotLegacy</p>
              <h2 style={{ fontFamily:'var(--font-display)',fontWeight:700,fontSize:'clamp(1.6rem,4vw,2.2rem)',color:'#FFFFFF' }}>Built different</h2>
            </div>

            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:'clamp(12px,2vw,16px)' }}>
              {FEATURES.map(({ icon, title, desc }) => (
                <div key={title} style={{ padding:'clamp(20px,3vw,24px)',borderRadius:'18px',background:'rgba(17,17,24,0.7)',border:'1px solid #1E1E2E',transition:'border-color 0.25s,box-shadow 0.25s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor='rgba(230,0,122,0.25)'; (e.currentTarget as HTMLDivElement).style.boxShadow='0 8px 32px rgba(230,0,122,0.07)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor='#1E1E2E'; (e.currentTarget as HTMLDivElement).style.boxShadow='none' }}
                >
                  <div style={{ width:'44px',height:'44px',borderRadius:'12px',background:'rgba(230,0,122,0.08)',border:'1px solid rgba(230,0,122,0.15)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:'16px' }}>
                    {icon}
                  </div>
                  <h3 style={{ fontFamily:'var(--font-display)',fontWeight:600,fontSize:'clamp(0.875rem,2vw,0.9375rem)',color:'#FFFFFF',marginBottom:'8px' }}>{title}</h3>
                  <p style={{ fontFamily:'var(--font-body)',fontWeight:300,fontSize:'13px',color:'#6B7280',lineHeight:1.6 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ CTA BANNER ══════════════════════════════════ */}
        <section style={{ padding:'clamp(60px,10vw,80px) 20px' }}>
          <div style={{ maxWidth:'700px',margin:'0 auto',textAlign:'center',padding:'clamp(40px,6vw,56px) clamp(24px,5vw,48px)',borderRadius:'24px',background:'rgba(230,0,122,0.06)',border:'1px solid rgba(230,0,122,0.18)',position:'relative',overflow:'hidden' }}>
            <div aria-hidden style={{ position:'absolute',inset:0,background:'radial-gradient(ellipse 80% 80% at 50% 50%,rgba(230,0,122,0.08) 0%,transparent 70%)',pointerEvents:'none' }} />
            <h2 style={{ fontFamily:'var(--font-display)',fontWeight:800,fontSize:'clamp(1.6rem,5vw,2.4rem)',color:'#FFFFFF',lineHeight:1.1,marginBottom:'16px',position:'relative' }}>
              Don't let your crypto<br />
              <span className="gradient-text">die with you</span>
            </h2>
            <p style={{ fontFamily:'var(--font-body)',fontWeight:300,fontSize:'clamp(0.875rem,2.5vw,1rem)',color:'#9CA3AF',marginBottom:'32px',lineHeight:1.65,position:'relative' }}>
              Set up your on-chain will in minutes. Your family will thank you.
            </p>
            <Link href="/dashboard" className="btn-primary" style={{ position:'relative' }}>
              Create Your Will Free → <ArrowRight />
            </Link>
          </div>
        </section>

        {/* ══ TECH STACK ══════════════════════════════════ */}
        <section style={{ padding:'clamp(50px,8vw,72px) 20px',borderTop:'1px solid #1E1E2E' }}>
          <div style={{ maxWidth:'800px',margin:'0 auto',textAlign:'center' }}>
            <p style={{ fontFamily:'var(--font-body)',fontWeight:600,fontSize:'11px',letterSpacing:'0.14em',textTransform:'uppercase',color:'rgba(255,109,195,0.75)',marginBottom:'10px',display:'block' }}>Architecture</p>
            <h2 style={{ fontFamily:'var(--font-display)',fontWeight:700,fontSize:'clamp(1.3rem,3.5vw,1.9rem)',color:'#FFFFFF',marginBottom:'8px' }}>Dual-VM Architecture</h2>
            <p style={{ fontFamily:'var(--font-body)',fontWeight:300,fontSize:'14px',color:'#6B7280',marginBottom:'clamp(28px,5vw,36px)' }}>
              The only inheritance protocol using both EVM + PVM on Polkadot Hub
            </p>
            <div style={{ display:'flex',flexWrap:'wrap',justifyContent:'center',gap:'10px' }}>
              {BADGES.map(({ label, style }) => (
                <span key={label} style={{ fontFamily:'var(--font-body)',fontWeight:500,fontSize:'12px',letterSpacing:'0.02em',padding:'7px 16px',borderRadius:'999px',background:style.background,border:`1px solid ${style.border}`,color:style.color }}>
                  {label}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ══ FOOTER ══════════════════════════════════════ */}
        <footer style={{ padding:'clamp(32px,6vw,44px) 20px',borderTop:'1px solid #1E1E2E',textAlign:'center' }}>
          <div style={{ maxWidth:'800px',margin:'0 auto' }}>
            {/* Logo row */}
            <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',marginBottom:'16px' }}>
              <div style={{ width:'28px',height:'28px',borderRadius:'8px',background:'linear-gradient(135deg,#E6007A,#C4006A)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                <span style={{ fontFamily:'var(--font-display)',fontWeight:800,fontSize:'12px',color:'#fff' }}>D</span>
              </div>
              <span style={{ fontFamily:'var(--font-display)',fontWeight:700,fontSize:'0.95rem',color:'#6B7280' }}>DotLegacy</span>
            </div>
            <p style={{ fontFamily:'var(--font-body)',fontWeight:300,fontSize:'13px',color:'#4B5563',marginBottom:'10px' }}>
              Polkadot Solidity Hackathon 2026 · Track 2 PVM + OpenZeppelin
            </p>
            <div style={{ display:'flex',flexWrap:'wrap',alignItems:'center',justifyContent:'center',gap:'6px',fontFamily:'var(--font-body)',fontSize:'12px',color:'#374151' }}>
              <span>Vault</span>
              <a href="https://blockscout-testnet.polkadot.io/address/0x327052a9B195A1a3F78e411f5fe78e76b81Cf86b" target="_blank" rel="noopener noreferrer" style={{ fontFamily:'monospace',fontSize:'11px',color:'rgba(230,0,122,0.5)',transition:'color 0.15s' }}
                onMouseEnter={e=>{(e.currentTarget as HTMLAnchorElement).style.color='#E6007A'}}
                onMouseLeave={e=>{(e.currentTarget as HTMLAnchorElement).style.color='rgba(230,0,122,0.5)'}}>
                0x3270…Cf86b
              </a>
              <span>·</span>
              <span>PVM</span>
              <a href="https://blockscout-testnet.polkadot.io/address/0x37E33fAA9148980EC76aAF1179bE02B648e036Ed" target="_blank" rel="noopener noreferrer" style={{ fontFamily:'monospace',fontSize:'11px',color:'rgba(230,0,122,0.5)',transition:'color 0.15s' }}
                onMouseEnter={e=>{(e.currentTarget as HTMLAnchorElement).style.color='#E6007A'}}
                onMouseLeave={e=>{(e.currentTarget as HTMLAnchorElement).style.color='rgba(230,0,122,0.5)'}}>
                0x37E3…36Ed
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}