'use client'

import Link            from 'next/link'
import { ConnectWallet } from './ConnectWallet'

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#1E1E2E] bg-[#0A0A0F]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#E6007A] flex items-center justify-center shadow-lg shadow-[#E6007A]/30">
            <span className="text-white font-bold text-sm">D</span>
          </div>
          <span className="font-bold text-white text-lg tracking-tight">DotLegacy</span>
        </Link>

        <div className="hidden sm:flex items-center gap-8">
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors font-medium">Dashboard</Link>
          <Link href="/claim"     className="text-sm text-gray-400 hover:text-white transition-colors font-medium">Claim</Link>
        </div>

        <ConnectWallet />
      </div>
    </nav>
  )
}