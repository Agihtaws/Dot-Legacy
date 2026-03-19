'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider }                     from 'wagmi'
import { RainbowKitProvider, darkTheme }     from '@rainbow-me/rainbowkit'
import { wagmiConfig }                       from '@/lib/wagmi'
import { useState }                          from 'react'

import '@rainbow-me/rainbowkit/styles.css'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          staleTime:            30_000,
          gcTime:               5 * 60_000,
          retry:                2,
          refetchOnWindowFocus: false,
          refetchOnReconnect:   true,
        },
        mutations: { retry: 0 },
      },
    }),
  )

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor:           '#E6007A',
            accentColorForeground: '#ffffff',
            borderRadius:          'medium',
            fontStack:             'system',
            overlayBlur:           'small',
          })}
          modalSize="compact"
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}