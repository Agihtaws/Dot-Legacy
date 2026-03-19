'use client'

import { useState, useEffect } from 'react'
import { secondsUntil } from '@/lib/utils'

export function useCountdown(deadlineTimestamp?: number, status?: number) {
  const [secondsLeft, setSecondsLeft] = useState<number>(0)

  useEffect(() => {
    if (!deadlineTimestamp) return
    const update = () => setSecondsLeft(secondsUntil(deadlineTimestamp))
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [deadlineTimestamp])

  const daysLeft  = Math.floor(secondsLeft / 86400)
  const isExpired = secondsLeft <= 0

  // Derive warning/urgent from contract status if available
  let isWarning = false
  let isUrgent = false

  if (status !== undefined) {
    // Status codes: 0=Active, 1=Warning, 2=Claimable, 3=Executing, 4=Executed, 5=Revoked
    isWarning = status === 1
    isUrgent = status === 2
  } else {
    // Fallback to day-based thresholds (for backward compatibility)
    isWarning = daysLeft <= 15 && daysLeft > 3 && !isExpired
    isUrgent = daysLeft <= 3 && !isExpired
  }

  function buildDisplay(s: number): string {
    if (s <= 0) return 'Expired'
    const d  = Math.floor(s / 86400)
    const h  = Math.floor((s % 86400) / 3600)
    const m  = Math.floor((s % 3600) / 60)
    const sc = s % 60
    if (d > 0) return `${d}d ${h}h ${m}m ${sc}s`
    if (h > 0) return `${h}h ${m}m ${sc}s`
    return `${m}m ${sc}s`
  }

  return {
    secondsLeft,
    daysLeft,
    display:   buildDisplay(secondsLeft),
    isExpired,
    isUrgent,
    isWarning,
  }
}