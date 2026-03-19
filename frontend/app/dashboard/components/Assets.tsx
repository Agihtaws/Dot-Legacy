'use client'

import { useState }                                                            from 'react'
import { useAccount, useReadContracts, useWriteContract,
         useWaitForTransactionReceipt }                                        from 'wagmi'
import { SUPPORTED_TOKENS, ERC20_ABI }                                        from '@/config/contracts'
import { formatUnits, parseUnits }                                             from 'viem'

const MINT_AMOUNTS = {
  USDT: parseUnits('1000', 6),
  USDC: parseUnits('1000', 6),
  DOT:  parseUnits('100',  10),
}

const TOKEN_COLORS: Record<string, { dot: string; accent: string }> = {
  USDT: { dot: '#26A17B', accent: 'rgba(38,161,123,0.15)'  },
  USDC: { dot: '#2775CA', accent: 'rgba(39,117,202,0.15)'  },
  DOT:  { dot: '#E6007A', accent: 'rgba(230,0,122,0.12)'   },
}

export function Assets() {
  const { address, isConnected }               = useAccount()
  const [minting, setMinting]                  = useState<string | null>(null)
  const [success, setSuccess]                  = useState<string | null>(null)

  const contracts = SUPPORTED_TOKENS.map(token => ({
    address:      token.address,
    abi:          ERC20_ABI,
    functionName: 'balanceOf' as const,
    args:         address ? ([address] as const) : undefined,
  }))

  const { data, isLoading, refetch } = useReadContracts({
    contracts,
    query: { enabled: !!address, refetchInterval: 10_000 },
  })

  const { writeContract, data: txHash, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: txSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  if (txSuccess && minting && success !== minting) {
    setSuccess(minting)
    setMinting(null)
    setTimeout(() => { setSuccess(null); reset(); refetch() }, 4000)
  }

  function handleMint(symbol: string) {
    const token = SUPPORTED_TOKENS.find(t => t.symbol === symbol)
    if (!token || !address) return
    setMinting(symbol)
    setSuccess(null)
    writeContract({
      address:      token.address,
      abi:          ERC20_ABI,
      functionName: 'mint',
      args:         [address, MINT_AMOUNTS[symbol as keyof typeof MINT_AMOUNTS]],
    })
  }

  if (!isConnected) return null

  const isBusy = !!minting || isConfirming

  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{
        background:     'rgba(17,17,24,0.85)',
        border:         '1px solid #1E1E2E',
        backdropFilter: 'blur(10px)',
      }}
    >
      {/* top accent line */}
      <div
        aria-hidden
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(230,0,122,0.3), transparent)' }}
      />

      <div className="p-5">
        {/* header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <p
              className="text-white"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '13px' }}
            >
              Your Assets
            </p>
            <p
              className="text-gray-500 mt-0.5"
              style={{ fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: '12px' }}
            >
              Balances &amp; testnet faucet
            </p>
          </div>
          <span
            style={{
              fontFamily:    'var(--font-body)',
              fontWeight:    600,
              fontSize:      '11px',
              letterSpacing: '0.03em',
              padding:       '4px 10px',
              borderRadius:  '999px',
              background:    'rgba(230,0,122,0.08)',
              border:        '1px solid rgba(230,0,122,0.2)',
              color:         '#FF6DC3',
            }}
          >
            Testnet
          </span>
        </div>

        {/* success banner */}
        {success && (
          <div
            className="mb-4 px-4 py-2.5 rounded-xl text-center"
            style={{
              fontFamily:  'var(--font-body)',
              fontWeight:  500,
              fontSize:    '13px',
              background:  'rgba(16,185,129,0.08)',
              border:      '1px solid rgba(16,185,129,0.25)',
              color:       '#6EE7B7',
            }}
          >
            ✓ {success} minted to your wallet
          </div>
        )}

        {/* token cards */}
        <div className="grid grid-cols-3 gap-3">
          {SUPPORTED_TOKENS.map((token, i) => {
            const balance      = data?.[i]?.result as bigint | undefined
            const formatted    = balance !== undefined ? formatUnits(balance, token.decimals) : '0'
            const showSkeleton = isLoading && balance === undefined
            const isThisMinting = minting === token.symbol || (isConfirming && minting === token.symbol)
            const colors        = TOKEN_COLORS[token.symbol] ?? TOKEN_COLORS.DOT
            const mintLabel     = token.symbol === 'DOT' ? '+ 100' : '+ 1,000'

            return (
              <div
                key={token.symbol}
                className="rounded-xl p-4 flex flex-col gap-3"
                style={{ background: 'rgba(15,15,26,0.95)', border: '1px solid #1E1E2E' }}
              >
                {/* token name + dot */}
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: colors.dot }}
                  />
                  <p
                    className="text-gray-400"
                    style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '11px', letterSpacing: '0.04em' }}
                  >
                    {token.symbol}
                  </p>
                </div>

                {/* balance */}
                {showSkeleton ? (
                  <div className="h-7 rounded-lg animate-pulse" style={{ background: '#1E1E2E' }} />
                ) : (
                  <p
                    className="text-white leading-none"
                    style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.4rem' }}
                  >
                    {Number(formatted).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                )}

                {/* mint button */}
                <button
                  onClick={() => handleMint(token.symbol)}
                  disabled={isBusy}
                  className="w-full rounded-lg py-2 text-[11px] font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    fontFamily:   'var(--font-body)',
                    background:   isThisMinting ? colors.accent : 'rgba(15,15,26,0.9)',
                    border:       isThisMinting ? `1px solid ${colors.dot}40` : '1px solid #252538',
                    color:        isThisMinting ? colors.dot : '#6B7280',
                    letterSpacing: '0.02em',
                  }}
                  onMouseEnter={e => {
                    if (!isBusy) {
                      e.currentTarget.style.borderColor = `${colors.dot}60`
                      e.currentTarget.style.color       = '#fff'
                      e.currentTarget.style.background  = colors.accent
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isThisMinting) {
                      e.currentTarget.style.borderColor = '#252538'
                      e.currentTarget.style.color       = '#6B7280'
                      e.currentTarget.style.background  = 'rgba(15,15,26,0.9)'
                    }
                  }}
                >
                  {isThisMinting ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <span
                        className="w-3 h-3 rounded-full border-2 animate-spin"
                        style={{ borderColor: `${colors.dot}30`, borderTopColor: colors.dot }}
                      />
                      Minting…
                    </span>
                  ) : (
                    mintLabel
                  )}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}