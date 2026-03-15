import Link       from 'next/link'
import { Navbar } from '@/components/Navbar'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <Navbar />

      {/* Hero */}
      <section className="pt-36 pb-24 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#E6007A]/10 border border-[#E6007A]/20 text-[#FF6DC3] text-xs font-semibold mb-10 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E6007A] animate-pulse" />
            Polkadot Hub · Track 2 PVM + OpenZeppelin · Hackathon 2026
          </div>

          <h1 className="text-6xl sm:text-7xl font-bold text-white leading-[1.05] mb-6 tracking-tight">
            Your family won't
            <br />
            <span className="gradient-text">lose your crypto</span>
          </h1>

          <p className="text-xl text-gray-400 mb-4 leading-relaxed max-w-2xl mx-auto">
            $140 billion in crypto is permanently lost every year. DotLegacy puts your inheritance on-chain — automatic, trustless, unstoppable.
          </p>

          <p className="text-sm text-gray-600 mb-12">
            Powered by Rust PVM · Shamir's Secret Sharing · OpenZeppelin · Polkadot Hub
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/dashboard"
              className="px-10 py-4 rounded-xl bg-[#E6007A] hover:bg-[#FF2D9B] text-white font-bold text-base transition-all shadow-2xl shadow-[#E6007A]/25 w-full sm:w-auto text-center">
              Create Your Will →
            </Link>
            <Link href="/claim"
              className="px-10 py-4 rounded-xl bg-[#111118] hover:bg-[#1A1A2E] text-white font-semibold text-base border border-[#2E2E4E] hover:border-[#E6007A]/30 transition-all w-full sm:w-auto text-center">
              I'm a Beneficiary
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-14 border-y border-[#1E1E2E]">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          {[
            ['$140B+', 'crypto lost to inheritance failures annually'],
            ['20%',    'of all Bitcoin is permanently inaccessible'],
            ['90%',    'of crypto holders have zero inheritance plan'],
          ].map(([num, label]) => (
            <div key={num}>
              <p className="text-5xl font-bold text-white mb-2">{num}</p>
              <p className="text-sm text-gray-500 max-w-48 mx-auto">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">How it works</h2>
            <p className="text-gray-500">Four steps. All on-chain. No lawyers, no banks, no trust required.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { n: '01', color: 'text-[#E6007A]', title: 'Create your will', desc: 'Set beneficiaries with % splits, trusted guardians, check-in period, and tokens to distribute.' },
              { n: '02', color: 'text-[#FF6DC3]', title: 'Check in regularly', desc: 'One transaction every few months proves you\'re alive. Resets the timer. Costs almost nothing.' },
              { n: '03', color: 'text-purple-400', title: 'Guardians verify (PVM)', desc: 'If you stop, guardians submit Shamir shares — verified by a Rust contract running on RISC-V PolkaVM.' },
              { n: '04', color: 'text-pink-300',  title: 'Assets distribute', desc: 'After 48h timelock, tokens go directly to your beneficiaries. Automatic. Permanent. On-chain.' },
            ].map(item => (
              <div key={item.n} className="bg-[#111118] border border-[#1E1E2E] rounded-2xl p-6 hover:border-[#E6007A]/30 transition-colors">
                <p className={`text-4xl font-bold mb-4 ${item.color}`}>{item.n}</p>
                <h3 className="font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech badges */}
      <section className="py-16 px-6 border-t border-[#1E1E2E]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Dual-VM Architecture</h2>
          <p className="text-gray-500 text-sm mb-10">The only inheritance protocol using both EVM + PVM on Polkadot Hub</p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              ['Rust PVM',        'bg-orange-950/80 text-orange-300 border-orange-900/50'],
              ['RISC-V PolkaVM',  'bg-red-950/80 text-red-300 border-red-900/50'],
              ['OpenZeppelin v5', 'bg-blue-950/80 text-blue-300 border-blue-900/50'],
              ['Shamir\'s SSS',   'bg-[#E6007A]/10 text-[#FF6DC3] border-[#E6007A]/30'],
              ['ERC-721 Will NFT','bg-purple-950/80 text-purple-300 border-purple-900/50'],
              ['Solidity 0.8.28', 'bg-[#111118] text-gray-300 border-[#2E2E4E]'],
              ['Foundry',         'bg-[#111118] text-gray-300 border-[#2E2E4E]'],
            ].map(([l, c]) => (
              <span key={l} className={`px-4 py-2 rounded-full text-xs font-semibold border ${c}`}>{l}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-[#1E1E2E] text-center">
        <p className="text-sm text-gray-600">DotLegacy · Polkadot Solidity Hackathon 2026 · Track 2 PVM + OpenZeppelin</p>
        <p className="mt-2 text-xs text-gray-700">
          Vault:{' '}
          <a href="https://blockscout-testnet.polkadot.io/address/0x035D1b3f6647adD510bcf04Faea45258eDb2c1Be"
            target="_blank" rel="noopener noreferrer" className="text-[#E6007A]/60 hover:text-[#E6007A] font-mono transition-colors">
            0x035D...c1Be
          </a>
          {' · '}
          PVM:{' '}
          <a href="https://blockscout-testnet.polkadot.io/address/0x5463626Ca6d5A9BC4cbA6C2D74018eaBB117Dfae"
            target="_blank" rel="noopener noreferrer" className="text-[#E6007A]/60 hover:text-[#E6007A] font-mono transition-colors">
            0x5463...Dfae
          </a>
        </p>
      </footer>
    </div>
  )
}