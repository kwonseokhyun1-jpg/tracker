import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import { ConfirmDialog } from './ConfirmDialog'

export function DecksTab() {
  const { data, addPlayer, updatePlayer, deletePlayer, addDeck, updateDeck, deleteDeck } =
    useData()
  const [newPlayerName, setNewPlayerName] = useState('')
  const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(new Set())
  const [newDeckNames, setNewDeckNames] = useState<Record<string, string>>({})
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null)
  const [editingDeck, setEditingDeck] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<
    | { type: 'player'; id: string; name: string }
    | { type: 'deck'; id: string; name: string }
    | null
  >(null)

  const sortedPlayers = useMemo(
    () => [...data.players].sort((a, b) => a.name.localeCompare(b.name)),
    [data.players],
  )

  const getPlayerDecks = (playerId: string) =>
    data.decks
      .filter((d) => d.playerId === playerId)
      .sort((a, b) => a.name.localeCompare(b.name))

  const toggleExpanded = (playerId: string) => {
    setExpandedPlayers((prev) => {
      const next = new Set(prev)
      if (next.has(playerId)) next.delete(playerId)
      else next.add(playerId)
      return next
    })
  }

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPlayerName.trim()) return
    addPlayer(newPlayerName)
    setNewPlayerName('')
  }

  const handleAddDeck = (playerId: string) => {
    const name = newDeckNames[playerId]?.trim()
    if (!name) return
    addDeck(playerId, name)
    setNewDeckNames((prev) => ({ ...prev, [playerId]: '' }))
    setExpandedPlayers((prev) => new Set(prev).add(playerId))
  }

  const startEditPlayer = (id: string, name: string) => {
    setEditingPlayer(id)
    setEditValue(name)
  }

  const startEditDeck = (id: string, name: string) => {
    setEditingDeck(id)
    setEditValue(name)
  }

  const saveEditPlayer = () => {
    if (editingPlayer) updatePlayer(editingPlayer, editValue)
    setEditingPlayer(null)
    setEditValue('')
  }

  const saveEditDeck = () => {
    if (editingDeck) updateDeck(editingDeck, editValue)
    setEditingDeck(null)
    setEditValue('')
  }

  const handleConfirmDelete = () => {
    if (!confirm) return
    setError(null)
    if (confirm.type === 'player') {
      const result = deletePlayer(confirm.id)
      if (!result.ok) setError(result.reason)
    } else {
      const result = deleteDeck(confirm.id)
      if (!result.ok) setError(result.reason)
    }
    setConfirm(null)
  }

  return (
    <div className="tab-panel">
      <header className="panel-header">
        <h2>Players & Decks</h2>
        <p className="panel-desc">Add players and their deck names for game logging.</p>
      </header>

      <form className="add-form" onSubmit={handleAddPlayer}>
        <input
          type="text"
          placeholder="New player name"
          value={newPlayerName}
          onChange={(e) => setNewPlayerName(e.target.value)}
          aria-label="New player name"
        />
        <button type="submit" className="btn btn-primary">
          Add Player
        </button>
      </form>

      {error && <p className="error-msg">{error}</p>}

      {sortedPlayers.length === 0 ? (
        <div className="empty-state">
          <p>No players yet. Add your first player above.</p>
        </div>
      ) : (
        <ul className="player-list">
          {sortedPlayers.map((player) => {
            const playerDecks = getPlayerDecks(player.id)
            const isExpanded = expandedPlayers.has(player.id)

            return (
              <li key={player.id} className="player-card">
                <div className="player-header">
                  <button
                    type="button"
                    className="expand-btn"
                    onClick={() => toggleExpanded(player.id)}
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? '▼' : '▶'}
                  </button>

                  {editingPlayer === player.id ? (
                    <div className="inline-edit">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditPlayer()
                          if (e.key === 'Escape') setEditingPlayer(null)
                        }}
                        autoFocus
                      />
                      <button type="button" className="btn btn-sm" onClick={saveEditPlayer}>
                        Save
                      </button>
                    </div>
                  ) : (
                    <span className="player-name">
                      {player.name}
                      <span className="deck-count">({playerDecks.length} decks)</span>
                    </span>
                  )}

                  <div className="row-actions">
                    {editingPlayer !== player.id && (
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() => startEditPlayer(player.id, player.name)}
                      >
                        Rename
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() =>
                        setConfirm({ type: 'player', id: player.id, name: player.name })
                      }
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="deck-section">
                    {playerDecks.length === 0 ? (
                      <p className="muted">No decks yet.</p>
                    ) : (
                      <ul className="deck-list">
                        {playerDecks.map((deck) => (
                          <li key={deck.id} className="deck-row">
                            {editingDeck === deck.id ? (
                              <div className="inline-edit">
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveEditDeck()
                                    if (e.key === 'Escape') setEditingDeck(null)
                                  }}
                                  autoFocus
                                />
                                <button type="button" className="btn btn-sm" onClick={saveEditDeck}>
                                  Save
                                </button>
                              </div>
                            ) : (
                              <span>{deck.name}</span>
                            )}
                            <div className="row-actions">
                              {editingDeck !== deck.id && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-secondary"
                                  onClick={() => startEditDeck(deck.id, deck.name)}
                                >
                                  Rename
                                </button>
                              )}
                              <button
                                type="button"
                                className="btn btn-sm btn-danger"
                                onClick={() =>
                                  setConfirm({ type: 'deck', id: deck.id, name: deck.name })
                                }
                              >
                                Delete
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="add-deck-form">
                      <input
                        type="text"
                        placeholder="New deck name"
                        value={newDeckNames[player.id] ?? ''}
                        onChange={(e) =>
                          setNewDeckNames((prev) => ({
                            ...prev,
                            [player.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddDeck(player.id)
                          }
                        }}
                        aria-label={`New deck for ${player.name}`}
                      />
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => handleAddDeck(player.id)}
                      >
                        Add Deck
                      </button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.type === 'player' ? 'Delete player?' : 'Delete deck?'}
        message={
          confirm
            ? confirm.type === 'player'
              ? `Remove "${confirm.name}" and all their decks? This is blocked if any deck has game history.`
              : `Remove deck "${confirm.name}"? This is blocked if it appears in logged games.`
            : ''
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
