'use client'

import { useState }  from 'react'
import { Input }     from '@/components/ui/Input'
import { Button }    from '@/components/ui/Button'

interface Props {
  onSearch: (willId: bigint) => void
  loading:  boolean
}

export function WillLookup({ onSearch, loading }: Props) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  function handleSearch() {
    setError('')
    const num = Number(value)
    if (!value || isNaN(num) || num < 1) {
      setError('Enter a valid will ID (e.g. 1)')
      return
    }
    onSearch(BigInt(num))
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-400">
        Enter the will ID you want to claim or check status for.
      </p>
      <div className="flex gap-3">
        <Input
          placeholder="Will ID (e.g. 1)"
          value={value}
          onChange={setValue}
          type="number"
          error={error}
          className="flex-1"
        />
        <Button onClick={handleSearch} loading={loading} disabled={!value}>
          Look Up
        </Button>
      </div>
    </div>
  )
}