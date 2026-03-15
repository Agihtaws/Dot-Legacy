import type { Metadata } from 'next'
import { Inter }         from 'next/font/google'
import './globals.css'
import { Providers }     from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title:       'DotLegacy — On-Chain Crypto Inheritance',
  description: 'Your family won\'t lose your crypto. Set beneficiaries, check in regularly, and if you stop — your assets automatically go to the people you chose.',
  keywords:    ['crypto inheritance', 'polkadot', 'blockchain', 'defi', 'will'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-gray-950 text-white antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}