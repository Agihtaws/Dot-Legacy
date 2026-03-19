import type { Metadata, Viewport } from 'next'
import { Syne, DM_Sans }           from 'next/font/google'
import './globals.css'
import { Providers }                from './providers'

/* ── Display font — Syne ─────────────────────────────────── */
const syne = Syne({
  subsets:  ['latin'],
  variable: '--font-display',
  weight:   ['400', '500', '600', '700', '800'],
  display:  'swap',
})

/* ── Body font — DM Sans ─────────────────────────────────── */
const dmSans = DM_Sans({
  subsets:  ['latin'],
  variable: '--font-body',
  weight:   ['300', '400', '500', '600'],
  style:    ['normal', 'italic'],
  display:  'swap',
})

export const metadata: Metadata = {
  title:       'DotLegacy — On-Chain Crypto Inheritance',
  description: "Your family won't lose your crypto. Set beneficiaries, check in regularly, and if you stop — your assets automatically go to the people you chose.",
  keywords:    ['crypto inheritance', 'polkadot', 'blockchain', 'defi', 'on-chain will'],
  authors:     [{ name: 'DotLegacy' }],
  openGraph: {
    title:       'DotLegacy — On-Chain Crypto Inheritance',
    description: 'Automatic, trustless, unstoppable crypto inheritance on Polkadot Hub.',
    type:        'website',
  },
}

export const viewport: Viewport = {
  themeColor:    '#0A0A0F',
  width:         'device-width',
  initialScale:  1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${dmSans.variable}`}
      style={{ height: '100%' }}
    >
      <body
        style={{
          margin:          0,
          padding:         0,
          backgroundColor: '#0A0A0F',
          color:           '#F1F1F1',
          fontFamily:      'var(--font-body)',
          minHeight:       '100%',
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}