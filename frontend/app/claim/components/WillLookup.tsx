'use client'

import { useState }       from 'react'
import { Input }          from '@/components/ui/Input'
import { Button }         from '@/components/ui/Button'

interface Props {
  onSearch: (id: bigint) => void
  loading:  boolean
}

export function WillLookup({ onSearch, loading }: Props) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  function handleSearch() {
    setError('')
    const num = Number(value)
    if (!value || isNaN(num) || num < 1) { setError('Enter a valid will ID (e.g. 1)'); return }
    onSearch(BigInt(num))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <p style={{ fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: '13px', color: '#9CA3AF' }}>
        Enter the will ID you want to claim or check status for.
      </p>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <Input
            placeholder="Will ID (e.g. 1)"
            value={value}
            onChange={v => { setValue(v); setError('') }}
            type="number"
            error={error}
          />
        </div>
        <Button onClick={handleSearch} loading={loading} disabled={!value}>
          Look Up
        </Button>
      </div>
    </div>
  )
}