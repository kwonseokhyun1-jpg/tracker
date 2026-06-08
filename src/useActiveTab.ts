import { useCallback, useState } from 'react'
import type { TabId } from './types'

export const DEFAULT_TAB: TabId = 'decks'

const TAB_IDS = new Set<TabId>(['decks', 'log', 'stats'])

const LEGACY_TAB_STORAGE_KEYS = ['mtg-tracker-tab', 'mtg-tracker-active-tab'] as const

function clearStoredTab(): void {
  for (const key of LEGACY_TAB_STORAGE_KEYS) {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  }
}

function clearTabHash(): void {
  const url = new URL(window.location.href)
  if (!url.hash) return
  url.hash = ''
  window.history.replaceState(null, '', url)
}

function readInitialTab(): TabId {
  clearStoredTab()
  clearTabHash()
  return DEFAULT_TAB
}

export function useActiveTab(): [TabId, (tab: TabId) => void] {
  const [activeTab, setActiveTab] = useState<TabId>(readInitialTab)

  const setTab = useCallback((tab: TabId) => {
    if (!TAB_IDS.has(tab)) return
    setActiveTab(tab)
  }, [])

  return [activeTab, setTab]
}
