import { useMemo, useRef, useState } from 'react'
import { useData } from '../context/DataContext'
import { getLastLoggedGame } from '../gameOrder'
import { ConfirmDialog } from './ConfirmDialog'
import { GameHistory } from './GameHistory'
import type { Game } from '../types'
import { OTHERS_PLAYER_NAME } from '../types'

function todayString() {
  return new Date().toISOString().slice(0, 10)
}

const NEW_DECK_VALUE = '__new__'

type ParticipantSlot = {
  id: string
  selectValue: string
  playedByPlayerId: string
  newPlayerName: string
  newDeckName: string
}

function createSlotFromDeck(deckId: string, playedByPlayerId = ''): ParticipantSlot {
  return {
    id: crypto.randomUUID(),
    selectValue: deckId,
    playedByPlayerId,
    newPlayerName: '',
    newDeckName: '',
  }
}

function createSlot(): ParticipantSlot {
  return {
    id: crypto.randomUUID(),
    selectValue: '',
    playedByPlayerId: '',
    newPlayerName: '',
    newDeckName: '',
  }
}

function defaultPilotForSlot(
  slot: ParticipantSlot,
  decks: { id: string; playerId: string }[],
  players: { id: string; name: string }[],
): string {
  if (slot.selectValue === NEW_DECK_VALUE) {
    const name = slot.newPlayerName.trim() || OTHERS_PLAYER_NAME
    return players.find((p) => p.name.toLowerCase() === name.toLowerCase())?.id ?? ''
  }
  return decks.find((d) => d.id === slot.selectValue)?.playerId ?? ''
}

function slotLabel(
  slot: ParticipantSlot,
  getGameDeckLabel: (deckId: string, playedByPlayerId?: string) => string,
  decks: { id: string; playerId: string }[],
  players: { id: string; name: string }[],
): string {
  if (slot.selectValue === NEW_DECK_VALUE) {
    const player = slot.newPlayerName.trim() || OTHERS_PLAYER_NAME
    const deck = slot.newDeckName.trim()
    if (!deck) return 'New deck (incomplete)'
    const owner = players.find((p) => p.name.toLowerCase() === player.toLowerCase())
    const pilotId = slot.playedByPlayerId || owner?.id
    if (pilotId && owner && pilotId !== owner.id) {
      const pilot = players.find((p) => p.id === pilotId)
      return `${player} — ${deck} (played by ${pilot?.name ?? 'Unknown'})`
    }
    return `${player} — ${deck}`
  }
  if (slot.selectValue) {
    const pilotId = slot.playedByPlayerId || defaultPilotForSlot(slot, decks, players)
    return getGameDeckLabel(slot.selectValue, pilotId || undefined)
  }
  return 'Unselected'
}

function slotToParticipant(
  slot: ParticipantSlot,
  decks: { id: string; playerId: string }[],
  players: { id: string; name: string }[],
) {
  const defaultPilot = defaultPilotForSlot(slot, decks, players)
  const playedByPlayerId =
    slot.playedByPlayerId && slot.playedByPlayerId !== defaultPilot
      ? slot.playedByPlayerId
      : undefined

  if (slot.selectValue === NEW_DECK_VALUE) {
    return {
      type: 'new' as const,
      playerName: slot.newPlayerName,
      deckName: slot.newDeckName,
      playedByPlayerId,
    }
  }
  return { type: 'existing' as const, deckId: slot.selectValue, playedByPlayerId }
}

function slotsFromGame(game: Game): { slots: ParticipantSlot[]; winnerSlotIds: Set<string> } {
  const slots = game.deckIds.map((deckId, index) =>
    createSlotFromDeck(deckId, game.playedByPlayerIds[index] ?? ''),
  )
  const winnerSlotIds = new Set(
    slots
      .filter((slot) => game.winnerDeckIds.includes(slot.selectValue))
      .map((slot) => slot.id),
  )
  return { slots, winnerSlotIds }
}

function resetLogForm() {
  return {
    slots: [createSlot(), createSlot()] as ParticipantSlot[],
    winnerSlotIds: new Set<string>(),
    playedAt: todayString(),
    editingGameId: null as string | null,
  }
}

export function LogTab() {
  const { data, addGameFromLog, updateGameFromLog, deleteGame, getGameDeckLabel } = useData()
  const formRef = useRef<HTMLFormElement>(null)
  const [playedAt, setPlayedAt] = useState(todayString)
  const [slots, setSlots] = useState<ParticipantSlot[]>(() => [createSlot(), createSlot()])
  const [winnerSlotIds, setWinnerSlotIds] = useState<Set<string>>(() => new Set())
  const [error, setError] = useState<string | null>(null)
  const [deleteGameId, setDeleteGameId] = useState<string | null>(null)
  const [editingGameId, setEditingGameId] = useState<string | null>(null)

  const lastGame = useMemo(
    () => getLastLoggedGame(data.games, editingGameId),
    [data.games, editingGameId],
  )

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

  const clearForm = () => {
    const next = resetLogForm()
    setSlots(next.slots)
    setWinnerSlotIds(next.winnerSlotIds)
    setPlayedAt(next.playedAt)
    setEditingGameId(next.editingGameId)
    setError(null)
  }

  const startEditGame = (game: Game) => {
    const { slots: nextSlots, winnerSlotIds: nextWinners } = slotsFromGame(game)
    setEditingGameId(game.id)
    setPlayedAt(game.playedAt)
    setSlots(nextSlots)
    setWinnerSlotIds(nextWinners)
    setError(null)
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const participants = filledSlots.map((slot) => slotToParticipant(slot, data.decks, data.players))
    const winnerIndices = filledSlots
      .map((slot, index) => (winnerSlotIds.has(slot.id) ? index : -1))
      .filter((index) => index >= 0)

    const result = editingGameId
      ? updateGameFromLog(editingGameId, playedAt, participants, winnerIndices)
      : addGameFromLog(playedAt, participants, winnerIndices)

    if (!result.ok) {
      setError(result.reason)
      return
    }

    clearForm()
  }

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
    setError(null)
  }

  const addSlot = () => {
    setSlots((prev) => [...prev, createSlot()])
  }

  const copyDecksFromLastGame = () => {
    if (!lastGame) return

    const validDeckIds = lastGame.deckIds.filter((id) =>
      data.decks.some((deck) => deck.id === id),
    )
    if (validDeckIds.length < 2) {
      setError('The last game does not have enough valid decks to copy.')
      return
    }

    setSlots(
      validDeckIds.map((deckId, index) =>
        createSlotFromDeck(deckId, lastGame.playedByPlayerIds[index] ?? ''),
      ),
    )
    setWinnerSlotIds(new Set())
    setError(null)
  }

  const removeSlot = (id: string) => {
    setSlots((prev) => {
      if (prev.length <= 2) return prev
      return prev.filter((s) => s.id !== id)
    })
    clearWinnersForSlot(id)
  }

  return (
    <div className="tab-panel">
      <header className="panel-header">
        <h2>Log Game</h2>
        <p className="panel-desc">
          Select a deck for each seat and optionally who played it. Defaults to the deck owner.
        </p>
      </header>

      {editingGameId && (
        <p className="edit-banner">Editing a logged game. Changes update stats when saved.</p>
      )}

      <form ref={formRef} className="log-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Date</span>
          <input
            type="date"
            value={playedAt}
            onChange={(e) => setPlayedAt(e.target.value)}
            required
          />
        </label>

        {!editingGameId && (
          <div className="copy-last-game">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={copyDecksFromLastGame}
              disabled={!lastGame}
            >
              Copy decks from last game
            </button>
            <span className="muted copy-last-game-hint">
              {lastGame
                ? `Uses decks from your last logged game (${lastGame.playedAt}). Pick winners again.`
                : 'Log your first game to unlock quick deck copy for the next one.'}
            </span>
          </div>
        )}

        <fieldset className="deck-select-fieldset">
          <legend>Participating decks</legend>

          <ul className="participant-list">
            {slots.map((slot, index) => {
              const defaultPilot = defaultPilotForSlot(slot, data.decks, data.players)
              const pilotValue = slot.playedByPlayerId || defaultPilot
              const showPilotSelect =
                Boolean(slot.selectValue) &&
                (slot.selectValue !== NEW_DECK_VALUE || Boolean(slot.newDeckName.trim()))

              return (
              <li key={slot.id} className="participant-row">
                <label className="participant-label">
                  <span>Seat {index + 1}</span>
                  <select
                    value={slot.selectValue}
                    onChange={(e) => {
                      const value = e.target.value
                      const deck = data.decks.find((d) => d.id === value)
                      updateSlot(slot.id, {
                        selectValue: value,
                        playedByPlayerId: deck?.playerId ?? '',
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
                      placeholder={`Owner name (optional, defaults to ${OTHERS_PLAYER_NAME})`}
                      value={slot.newPlayerName}
                      onChange={(e) => {
                        const name = e.target.value
                        const owner = data.players.find(
                          (p) => p.name.toLowerCase() === (name.trim() || OTHERS_PLAYER_NAME).toLowerCase(),
                        )
                        updateSlot(slot.id, {
                          newPlayerName: name,
                          playedByPlayerId:
                            !slot.playedByPlayerId || slot.playedByPlayerId === defaultPilot
                              ? owner?.id ?? ''
                              : slot.playedByPlayerId,
                        })
                      }}
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

                {showPilotSelect && (
                  <label className="participant-label">
                    <span>Played by</span>
                    <select
                      value={pilotValue}
                      onChange={(e) => {
                        const nextPilot = e.target.value
                        updateSlot(slot.id, {
                          playedByPlayerId: nextPilot === defaultPilot ? '' : nextPilot,
                        })
                      }}
                    >
                      {data.players
                        .slice()
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((player) => (
                          <option key={player.id} value={player.id}>
                            {player.name}
                            {player.id === defaultPilot ? ' (owner)' : ''}
                          </option>
                        ))}
                    </select>
                  </label>
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
            )})}
          </ul>

          <button type="button" className="btn btn-secondary btn-sm add-participant-btn" onClick={addSlot}>
            + Add player
          </button>
        </fieldset>

        {filledSlots.length > 0 && (
          <fieldset className="winner-fieldset">
            <legend>Winners</legend>
            <p className="muted winner-hint">
              Select one or more winners (e.g. team games or draws), or leave all unchecked if nobody won.
            </p>
            <ul className="checkbox-list">
              {filledSlots.map((slot) => (
                <li key={slot.id}>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={winnerSlotIds.has(slot.id)}
                      onChange={() => toggleWinner(slot.id)}
                    />
                    {slotLabel(slot, getGameDeckLabel, data.decks, data.players)}
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        )}

        {error && <p className="error-msg">{error}</p>}

        <div className="log-form-actions">
          <button type="submit" className="btn btn-primary">
            {editingGameId ? 'Update Game' : 'Save Game'}
          </button>
          {editingGameId && (
            <button type="button" className="btn btn-secondary" onClick={clearForm}>
              Cancel edit
            </button>
          )}
        </div>
      </form>

      <GameHistory
        games={data.games}
        getGameDeckLabel={getGameDeckLabel}
        onEdit={startEditGame}
        onDelete={setDeleteGameId}
      />

      <ConfirmDialog
        open={deleteGameId !== null}
        title="Delete game?"
        message="Remove this game from the log? Stats will be updated."
        onConfirm={() => {
          if (deleteGameId) {
            deleteGame(deleteGameId)
            if (editingGameId === deleteGameId) clearForm()
          }
          setDeleteGameId(null)
        }}
        onCancel={() => setDeleteGameId(null)}
      />
    </div>
  )
}
