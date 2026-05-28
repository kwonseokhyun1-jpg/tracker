import { useRef, useState } from 'react'
import { useData } from '../context/DataContext'
import { downloadBackupJson, readBackupJsonFile } from '../exportJson'
import type { AppData } from '../types'
import { ConfirmDialog } from './ConfirmDialog'

export function BackupButton() {
  const { data, importData } = useData()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingImport, setPendingImport] = useState<AppData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleImportClick = () => {
    setError(null)
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const result = await readBackupJsonFile(file)
    if (!result.ok) {
      setError(result.reason)
      return
    }

    setPendingImport(result.data)
  }

  const confirmImport = () => {
    if (pendingImport) importData(pendingImport)
    setPendingImport(null)
    setError(null)
  }

  return (
    <div className="backup-controls">
      <div className="backup-actions">
        <button
          type="button"
          className="btn btn-secondary btn-sm backup-btn"
          onClick={() => downloadBackupJson(data)}
        >
          Download JSON backup
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm backup-btn"
          onClick={handleImportClick}
        >
          Import JSON backup
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={handleFileChange}
          aria-hidden
          tabIndex={-1}
        />
      </div>
      {error && <p className="backup-error">{error}</p>}

      <ConfirmDialog
        open={pendingImport !== null}
        title="Import backup?"
        message="This replaces all current players, decks, and games with the backup file."
        confirmLabel="Import"
        onConfirm={confirmImport}
        onCancel={() => setPendingImport(null)}
      />
    </div>
  )
}
