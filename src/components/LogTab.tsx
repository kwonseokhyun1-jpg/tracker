import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import { ConfirmDialog } from './ConfirmDialog'

function todayString() {
  return new Date().toISOString().slice(0, 10)
}

const NEW_DECK_VALUE = '__new__'

type ParticipantSlot = {
  id: string
  selectValue: string
  newPlayerName: string
  newDeckName: string
}

function createSlotFromDeck(deckId: string): ParticipantSlot {
  return {
    id: crypto.randomUUID(),
    selectValue: deckId,
    newPlayerName: '',
    newDeckName: '',
  }
}

function createSlot(): ParticipantSlot {
  return {
    id: crypto.randomUUID(),
    selectValue: '',
    newPlayerName: '',
    newDeckName: '',
  }
}

function slotLabel(
  slot: ParticipantSlot,
  getDeckLabel: (deckId: string) => string,
): string {
  if (slot.selectValue === NEW_DECK_VALUE) {
    const player = slot.newPlayerName.trim() || 'Random'
    const deck = slot.newDeckName.trim()
    return deck ? `${player} — ${deck}` : 'New deck (incomplete)'
  }
  if (slot.selectValue) return getDeckLabel(slot.selectValue)
  return 'Unselected'
}

function slotToParticipant(slot: ParticipantSlot) {
  if (slot.selectValue === NEW_DECK_VALUE) {
    return {
      type: 'new' as const,
      playerName: slot.newPlayerName,
      deckName: slot.newDeckName,
    }
  }
  return { type: 'existing' as const, deckId: slot.selectValue }
}

export function LogTab() {
  const { data, addGameFromLog, deleteGame, getDeckLabel } = useData()
  const [playedAt, setPlayedAt] = useState(todayString)
  const [slots, setSlots] = useState<ParticipantSlot[]>(() => [createSlot(), createSlot()])
  const [winnerSlotIds, setWinnerSlotIds] = useState<Set<string>>(() => new Set())
  const [error, setError] = useState<string | null>(null)
  const [deleteGameId, setDeleteGameId] = useState<string | null>(null)
  const [loadedPodId, setLoadedPodId] = useState<string | null>(null)

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

  const selectedDeckIds = useMemo(
    () =>
      new Set(
        slots
          .filter((s) => s.selectValue && s.selectValue !== NEW_DECK_VALUE)
          .map((s) => s.selectValue),
      ),
    [slots],
  )

  const filledSlots = useMemo(
    () =>
      slots.filter((slot) => {
        if (slot.selectValue === NEW_DECK_VALUE) return Boolean(slot.newDeckName.trim())
        return Boolean(slot.selectValue)
      }),
    [slots],
  )

  const recentGames = useMemo(
    () =>
      [...data.games]
        .sort((a, b) => b.playedAt.localeCompare(a.playedAt))
        .slice(0, 10),
    [data.games],
  )

  const toggleWinner = (slotId: string) => {
    setWinnerSlotIds((prev) => {
      const next = new Set(prev)
      if (next.has(slotId)) next.delete(slotId)
      else next.add(slotId)
      return next
    })
    setError(null)
  }

  const clearWinnersForSlot = (slotId: string) => {
    setWinnerSlotIds((prev) => {
      if (!prev.has(slotId)) return prev
      const next = new Set(prev)
      next.delete(slotId)
      return next
    })
  }

  const updateSlot = (id: string, patch: Partial<ParticipantSlot>) => {
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
    setLoadedPodId(null)
    setError(null)
  }

  const addSlot = () => {
    setSlots((prev) => [...prev, createSlot()])
    setLoadedPodId(null)
  }

  const loadPod = (podId: string) => {
    const pod = data.pods.find((p) => p.id === podId)
    if (!pod) return

    const validDeckIds = pod.deckIds.filter((id) => data.decks.some((d) => d.id === id))
    if (validDeckIds.length < 2) {
      setError('This pod needs at least 2 valid decks. Edit it on the Decks tab.')
      return
    }

    setSlots(validDeckIds.map(createSlotFromDeck))
    setWinnerSlotIds(new Set())
    setLoadedPodId(podId)
    setError(null)
  }

  const clearPodLoad = () => {
    setSlots([createSlot(), createSlot()])
    setWinnerSlotIds(new Set())
    setLoadedPodId(null)
    setError(null)
  }

  const removeSlot = (id: string) => {
    setSlots((prev) => {
      if (prev.length <= 2) return prev
      return prev.filter((s) => s.id !== id)
    })
    clearWinnersForSlot(id)
    setLoadedPodId(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const participants = filledSlots.map(slotToParticipant)
    const winnerIndices = filledSlots
      .map((slot, index) => (winnerSlotIds.has(slot.id) ? index : -1))
      .filter((index) => index >= 0)

    const result = addGameFromLog(playedAt, participants, winnerIndices)

    if (!result.ok) {
      setError(result.reason)
      return
    }

    setSlots([createSlot(), createSlot()])
    setWinnerSlotIds(new Set())
    setLoadedPodId(null)
    setPlayedAt(todayString())
  }

  return (
    <div className="tab-panel">
      <header className="panel-header">
        <h2>Log Game</h2>
        <p className="panel-desc">
          Select a deck for each player, or add a new one for randoms.
        </p>
      </header>

      <form className="log-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Date</span>
          <input
            type="date"
            value={playedAt}
            onChange={(e) => setPlayedAt(e.target.value)}
            required
          />
        </label>

        {data.pods.length > 0 && (
          <fieldset className="pod-load-fieldset">
            <legend>Load pod</legend>
            <p className="muted pod-load-hint">
              Pick a saved group to fill in participating decks. You can still change individual slots.
            </p>
            <div className="pod-load-actions">
              {data.pods.map((pod) => (
                <button
                  key={pod.id}
                  type="button"
                  className={`btn btn-sm ${loadedPodId === pod.id ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => loadPod(pod.id)}
                >
                  {pod.name}
                </button>
              ))}
              {loadedPodId && (
                <button type="button" className="btn btn-sm btn-secondary" onClick={clearPodLoad}>
                  Clear
                </button>
              )}
            </div>
          </fieldset>
        )}

        <fieldset className="deck-select-fieldset">
          <legend>Participating decks</legend>

          <ul className="participant-list">
            {slots.map((slot, index) => (
              <li key={slot.id} className="participant-row">
                <label className="participant-label">
                  <span>Player {index + 1}</span>
                  <select
                    value={slot.selectValue}
                    onChange={(e) => {
                      const value = e.target.value
                      updateSlot(slot.id, {
                        selectValue: value,
                        newPlayerName: value === NEW_DECK_VALUE ? slot.newPlayerName : '',
                        newDeckName: value === NEW_DECK_VALUE ? slot.newDeckName : '',
                      })
                      clearWinnersForSlot(slot.id)
                    }}
                  >
                    <option value="">Select from deck...</option>
                    {decksByPlayer.map(({ player, decks }) => (
                      <optgroup key={player.id} label={player.name}>
                        {decks.map((deck) => (
                          <option
                            key={deck.id}
                            value={deck.id}
                            disabled={
                              selectedDeckIds.has(deck.id) && slot.selectValue !== deck.id
                            }
                          >
                            {deck.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    <option value={NEW_DECK_VALUE}>New deck...</option>
                  </select>
                </label>

                {slot.selectValue === NEW_DECK_VALUE && (
                  <div className="new-deck-fields">
                    <input
                      type="text"
                      placeholder="Player name (optional, defaults to Random)"
                      value={slot.newPlayerName}
                      onChange={(e) => updateSlot(slot.id, { newPlayerName: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="Deck name"
                      value={slot.newDeckName}
                      onChange={(e) => updateSlot(slot.id, { newDeckName: e.target.value })}
                      required
                    />
                  </div>
                )}

                {slots.length > 2 && (
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => removeSlot(slot.id)}
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>

          <button type="button" className="btn btn-secondary btn-sm add-participant-btn" onClick={addSlot}>
            + Add player
          </button>
        </fieldset>

        {filledSlots.length > 0 && (
          <fieldset className="winner-fieldset">
            <legend>Winners</legend>
            <p className="muted winner-hint">Select one or more winners (e.g. team games or draws).</p>
            <ul className="checkbox-list">
              {filledSlots.map((slot) => (
                <li key={slot.id}>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={winnerSlotIds.has(slot.id)}
                      onChange={() => toggleWinner(slot.id)}
                    />
                    {slotLabel(slot, getDeckLabel)}
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        )}

        {error && <p className="error-msg">{error}</p>}

        <button type="submit" className="btn btn-primary">
          Save Game
        </button>
      </form>

      {recentGames.length > 0 && (
        <section className="recent-games">
          <h3>Recent Games</h3>
          <ul className="game-list">
            {recentGames.map((game) => (
              <li key={game.id} className="game-row">
                <div className="game-info">
                  <span className="game-date">{game.playedAt}</span>
                  <span className="game-decks">
                    {game.deckIds.map((id) => getDeckLabel(id)).join(', ')}
                  </span>
                  <span className="game-winner">
                    {game.winnerDeckIds.length === 1 ? 'Winner' : 'Winners'}:{' '}
                    {game.winnerDeckIds.map((id) => getDeckLabel(id)).join(', ')}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={() => setDeleteGameId(game.id)}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ConfirmDialog
        open={deleteGameId !== null}
        title="Delete game?"
        message="Remove this game from the log? Stats will be updated."
        onConfirm={() => {
          if (deleteGameId) deleteGame(deleteGameId)
          setDeleteGameId(null)
        }}
        onCancel={() => setDeleteGameId(null)}
      />
    </div>
  )
}
