import { useCallback, useRef } from 'react'

const HOLD_DELAY_MS = 400
const HOLD_REPEAT_MS = 120

export function useHoldAdjust(onAdjust: (amount: number) => void) {
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const repeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isHoldingRef = useRef(false)
  const deltaRef = useRef(1)

  const clearTimers = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
    if (repeatTimerRef.current) {
      clearInterval(repeatTimerRef.current)
      repeatTimerRef.current = null
    }
    isHoldingRef.current = false
  }, [])

  const startHold = useCallback(
    (delta: number) => {
      clearTimers()
      deltaRef.current = delta

      holdTimerRef.current = setTimeout(() => {
        isHoldingRef.current = true
        onAdjust(delta * 10)
        repeatTimerRef.current = setInterval(() => onAdjust(delta * 10), HOLD_REPEAT_MS)
      }, HOLD_DELAY_MS)
    },
    [clearTimers, onAdjust],
  )

  const endHold = useCallback(() => {
    if (!isHoldingRef.current) {
      onAdjust(deltaRef.current)
    }
    clearTimers()
  }, [clearTimers, onAdjust])

  return { startHold, endHold, clearTimers }
}
