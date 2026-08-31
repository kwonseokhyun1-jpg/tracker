import { useEffect } from 'react'

/**
 * Keeps the screen awake while `enabled` is true (Screen Wake Lock API).
 * Re-requests the lock when the page becomes visible again after being hidden.
 */
export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return

    let active = true
    let sentinel: WakeLockSentinel | null = null

    const requestLock = async () => {
      try {
        const next = await navigator.wakeLock.request('screen')
        if (!active) {
          await next.release()
          return
        }
        sentinel = next
      } catch {
        // Unsupported, denied, or blocked by power settings — ignore.
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void requestLock()
      }
    }

    void requestLock()
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      active = false
      document.removeEventListener('visibilitychange', onVisibilityChange)
      if (sentinel) {
        void sentinel.release()
        sentinel = null
      }
    }
  }, [enabled])
}
