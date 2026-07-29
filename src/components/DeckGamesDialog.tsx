import { useEffect, useMemo } from 'react'
import { sortGamesNewestFirst } from '../gameOrder'
import type { Game } from '../types'

interface DeckGamesDialogProps {
  open: boolean
  deckName: string
  playerName: string
  games: Game[]
  deckId: string
  getGameDeckLabel: (deckId: string, playedByPlayerId?: string) => string
  onClose: () => void
}

export function DeckGamesDialog({
  open,
  deckName,
  playerName,
  games,
  deckId,
  getGameDeckLabel,
  onClose,
}: DeckGamesDialogProps) {
  const sortedGames = useMemo(() => sortGamesNewestFirst(games), [games])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="dialog-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deck-games-dialog-title"
      onClick={onClose}
    >
      <div
        className="dialog deck-games-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dialog-header">
          <div className="dialog-header-text">
            <h3 id="deck-games-dialog-title">{deckName}</h3>
            <p className="dialog-subtitle">{playerName}</p>
          </div>
          <button
            type="button"
            className="dialog-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {sortedGames.length === 0 ? (
          <p className="muted history-empty">No games played yet.</p>
        ) : (
          <>
            <p className="muted deck-games-count">
              {sortedGames.length} game{sortedGames.length === 1 ? '' : 's'}
            </p>
            <ul className="game-list deck-games-list">
              {sortedGames.map((game) => {
                const won = game.winnerDeckIds.includes(deckId)
                return (
                  <li key={game.id} className="game-row">
                    <div className="game-info">
                      <span className="game-date">{game.playedAt}</span>
                      <span className="game-decks">
                        {game.deckIds
                          .map((id, index) =>
                            getGameDeckLabel(
                              id,
                              game.playedByPlayerIds[index] || undefined,
                            ),
                          )
                          .join(', ')}
                      </span>
                      <span className="game-winner">
                        {won
                          ? 'Won'
                          : `${game.winnerDeckIds.length === 1 ? 'Winner' : 'Winners'}: ${game.winnerDeckIds
                              .map((id) => {
                                const index = game.deckIds.indexOf(id)
                                return getGameDeckLabel(
                                  id,
                                  index >= 0
                                    ? game.playedByPlayerIds[index] || undefined
                                    : undefined,
                                )
                              })
                              .join(', ')}`}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
