import { parseAppData } from './storage'
import type { AppData } from './types'

export function downloadBackupJson(data: AppData): void {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const date = new Date().toISOString().slice(0, 10)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `mtg-tracker-backup-${date}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function readBackupJsonFile(file: File): Promise<{ ok: true; data: AppData } | { ok: false; reason: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as unknown
        resolve(parseAppData(parsed))
      } catch {
        resolve({ ok: false, reason: 'Could not read backup file. Make sure it is valid JSON.' })
      }
    }
    reader.onerror = () => {
      resolve({ ok: false, reason: 'Failed to read the selected file.' })
    }
    reader.readAsText(file)
  })
}
