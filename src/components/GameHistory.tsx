import { useMemo, useState } from 'react'
import type { Game } from '../types'

interface GameHistoryProps {
  games: Game[]
  getGameDeckLabel: (deckId: string, playedByPlayerId?: string) => string
  onEdit: (game: Game) => void
  onDelete: (gameId: string) => void
}

function gameMatchesSearch(
  game: Game,
  query: string,
  getGameDeckLabel: GameHistoryProps['getGameDeckLabel'],
): boolean {
  if (!query) return true
  return game.deckIds.some((deckId, index) => {
    const label = getGameDeckLabel(deckId, game.playedByPlayerIds[index] || undefined)
    return label.toLowerCase().includes(query)
  })
}

export function GameHistory({ games, getGameDeckLabel, onEdit, onDelete }: GameHistoryProps) {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(false)

  const sortedGames = useMemo(
    () => [...games].sort((a, b) => b.playedAt.localeCompare(a.playedAt)),
    [games],
  )

  const filteredGames = useMemo(() => {
    const q = search.trim().toLowerCase()
    return sortedGames.filter((game) => {
      if (dateFrom && game.playedAt < dateFrom) return false
      if (dateTo && game.playedAt > dateTo) return false
      if (!gameMatchesSearch(game, q, getGameDeckLabel)) return false
      return true
    })
  }, [sortedGames, dateFrom, dateTo, search, getGameDeckLabel])

  const hasActiveFilters = dateFrom !== '' || dateTo !== '' || search.trim() !== ''

  const visibleGames = expanded ? filteredGames : filteredGames.slice(0, 5)

  if (games.length === 0) return null

  return (
    <section className="game-history">
      <div className="game-history-header">
        <h3>Game History</h3>
        <span className="muted game-count">
          {filteredGames.length} game{filteredGames.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="history-filters">
        <input
          type="search"
          placeholder="Search by player or deck..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search game history"
          className="search-input"
        />
        <label className="history-filter">
          <span>From</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            aria-label="Filter from date"
          />
        </label>
        <label className="history-filter">
          <span>To</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            aria-label="Filter to date"
          />
        </label>
        {hasActiveFilters && (
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => {
              setDateFrom('')
              setDateTo('')
              setSearch('')
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {filteredGames.length === 0 ? (
        <p className="muted history-empty">No games match your filters.</p>
      ) : (
        <>
          <ul className="game-list">
            {visibleGames.map((game) => (
              <li key={game.id} className="game-row">
                <div className="game-info">
                  <span className="game-date">{game.playedAt}</span>
                  <span className="game-decks">
                    {game.deckIds
                      .map((id, index) =>
                        getGameDeckLabel(id, game.playedByPlayerIds[index] || undefined),
                      )
                      .join(', ')}
                  </span>
                  <span className="game-winner">
                    {game.winnerDeckIds.length === 1 ? 'Winner' : 'Winners'}:{' '}
                    {game.winnerDeckIds
                      .map((id) => {
                        const index = game.deckIds.indexOf(id)
                        return getGameDeckLabel(
                          id,
                          index >= 0 ? game.playedByPlayerIds[index] || undefined : undefined,
                        )
                      })
                      .join(', ')}
                  </span>
                </div>
                <div className="row-actions">
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => onEdit(game)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => onDelete(game.id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {filteredGames.length > 5 && (
            <button
              type="button"
              className="btn btn-secondary btn-sm history-toggle"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded
                ? 'Show less'
                : `View full history (${filteredGames.length} games)`}
            </button>
          )}
        </>
      )}
    </section>
  )
}
