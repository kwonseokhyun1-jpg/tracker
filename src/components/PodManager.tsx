import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import { ConfirmDialog } from './ConfirmDialog'

export function PodManager() {
  const { data, addPod, updatePod, deletePod, getDeckLabel } = useData()
  const [podName, setPodName] = useState('')
  const [podDeckIds, setPodDeckIds] = useState<string[]>([])
  const [addDeckSelect, setAddDeckSelect] = useState('')
  const [editingPodId, setEditingPodId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deletePodId, setDeletePodId] = useState<string | null>(null)

  const decksByPlayer = useMemo(() => {
    return [...data.players]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((player) => ({
        player,
        decks: data.decks
          .filter((d) => d.playerId === player.id)
          .sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .filter((group) => group.decks.length > 0)
  }, [data.players, data.decks])

  const resetForm = () => {
    setPodName('')
    setPodDeckIds([])
    setAddDeckSelect('')
    setEditingPodId(null)
    setError(null)
  }

  const startEdit = (podId: string) => {
    const pod = data.pods.find((p) => p.id === podId)
    if (!pod) return
    setEditingPodId(podId)
    setPodName(pod.name)
    setPodDeckIds([...pod.deckIds])
    setAddDeckSelect('')
    setError(null)
  }

  const handleAddDeckToPod = () => {
    if (!addDeckSelect || podDeckIds.includes(addDeckSelect)) return
    setPodDeckIds((prev) => [...prev, addDeckSelect])
    setAddDeckSelect('')
    setError(null)
  }

  const handleRemoveDeckFromPod = (deckId: string) => {
    setPodDeckIds((prev) => prev.filter((id) => id !== deckId))
  }

  const handleSavePod = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const result = editingPodId
      ? updatePod(editingPodId, podName, podDeckIds)
      : addPod(podName, podDeckIds)

    if (!result.ok) {
      setError(result.reason)
      return
    }

    resetForm()
  }

  return (
    <section className="pods-section">
      <header className="section-header">
        <h3>Pods</h3>
        <p className="panel-desc">
          Save groups you usually play with for quick loading on the Log tab.
        </p>
      </header>

      <form className="pod-form" onSubmit={handleSavePod}>
        <input
          type="text"
          placeholder="Pod name (e.g. Tuesday Night)"
          value={podName}
          onChange={(e) => setPodName(e.target.value)}
          aria-label="Pod name"
        />

        <div className="pod-deck-picker">
          <select
            value={addDeckSelect}
            onChange={(e) => setAddDeckSelect(e.target.value)}
            aria-label="Add deck to pod"
          >
            <option value="">Add deck to pod...</option>
            {decksByPlayer.map(({ player, decks }) => (
              <optgroup key={player.id} label={player.name}>
                {decks.map((deck) => (
                  <option
                    key={deck.id}
                    value={deck.id}
                    disabled={podDeckIds.includes(deck.id)}
                  >
                    {deck.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleAddDeckToPod}
            disabled={!addDeckSelect}
          >
            Add
          </button>
        </div>

        {podDeckIds.length > 0 && (
          <ul className="pod-deck-list">
            {podDeckIds.map((deckId) => (
              <li key={deckId} className="pod-deck-row">
                <span>{getDeckLabel(deckId)}</span>
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={() => handleRemoveDeckFromPod(deckId)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        {error && <p className="error-msg">{error}</p>}

        <div className="pod-form-actions">
          <button type="submit" className="btn btn-primary btn-sm">
            {editingPodId ? 'Update Pod' : 'Create Pod'}
          </button>
          {editingPodId && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {data.pods.length === 0 ? (
        <p className="muted pods-empty">No pods yet. Create one above.</p>
      ) : (
        <ul className="pod-list">
          {data.pods.map((pod) => {
            const validDecks = pod.deckIds.filter((id) =>
              data.decks.some((d) => d.id === id),
            )
            return (
              <li key={pod.id} className="pod-card">
                <div className="pod-card-header">
                  <span className="pod-name">{pod.name}</span>
                  <span className="deck-count">{validDecks.length} decks</span>
                </div>
                <p className="pod-members">
                  {validDecks.length > 0
                    ? validDecks.map((id) => getDeckLabel(id)).join(' · ')
                    : 'No valid decks (some may have been removed)'}
                </p>
                <div className="row-actions">
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => startEdit(pod.id)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => setDeletePodId(pod.id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <ConfirmDialog
        open={deletePodId !== null}
        title="Delete pod?"
        message="Remove this pod? Your game history is not affected."
        onConfirm={() => {
          if (deletePodId) deletePod(deletePodId)
          if (editingPodId === deletePodId) resetForm()
          setDeletePodId(null)
        }}
        onCancel={() => setDeletePodId(null)}
      />
    </section>
  )
}
