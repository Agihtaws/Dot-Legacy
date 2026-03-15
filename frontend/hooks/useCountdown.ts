'use client'

import { useState, useEffect } from 'react'
import { secondsUntil } from '@/lib/utils'

export function useCountdown(deadlineTimestamp?: number) {
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
  const isUrgent  = daysLeft <= 3 && !isExpired
  const isWarning = daysLeft <= 15 && !isUrgent && !isExpired

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