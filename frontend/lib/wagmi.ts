import { getDefaultConfig }   from '@rainbow-me/rainbowkit'
import { http }                from 'wagmi'
import { polkadotHubTestnet }  from '@/config/chain'

export const wagmiConfig = getDefaultConfig({
  appName:   'DotLegacy',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains:    [polkadotHubTestnet],
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