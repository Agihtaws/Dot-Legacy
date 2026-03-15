import { createConfig, http } from 'wagmi'
import { injected, metaMask } from 'wagmi/connectors'
import { polkadotHubTestnet } from '@/config/chain'

export const wagmiConfig = createConfig({
  chains:     [polkadotHubTestnet],
  connectors: [
    metaMask(),
    injected(),
  ],
  transports: {
    [polkadotHubTestnet.id]: http('https://services.polkadothub-rpc.com/testnet'),
  },
  ssr: true,
})

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig
  }
}