import { useCallback, useRef } from 'react'

const HOLD_BULK_MS = 2000

export function useHoldAdjust(onAdjust: (amount: number) => void) {
  const bulkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const repeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasBulkedRef = useRef(false)
  const deltaRef = useRef(1)

  const clearTimers = useCallback(() => {
    if (bulkTimerRef.current) {
      clearTimeout(bulkTimerRef.current)
      bulkTimerRef.current = null
    }
    if (repeatTimerRef.current) {
      clearInterval(repeatTimerRef.current)
      repeatTimerRef.current = null
    }
    hasBulkedRef.current = false
  }, [])

  const startHold = useCallback(
    (delta: number) => {
      clearTimers()
      deltaRef.current = delta
      hasBulkedRef.current = false

      bulkTimerRef.current = setTimeout(() => {
        hasBulkedRef.current = true
        onAdjust(delta * 10)
        repeatTimerRef.current = setInterval(() => onAdjust(delta * 10), HOLD_BULK_MS)
      }, HOLD_BULK_MS)
    },
    [clearTimers, onAdjust],
  )

  const endHold = useCallback(() => {
    if (!hasBulkedRef.current) {
      onAdjust(deltaRef.current)
    }
    clearTimers()
  }, [clearTimers, onAdjust])

  return { startHold, endHold, clearTimers }
}
