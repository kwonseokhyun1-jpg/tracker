import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import type {
  DeckSortField,
  DeckStat,
  PlayerSortField,
  PlayerStat,
  SortDirection,
  StatsMinGamesFilter,
  StatsViewMode,
} from '../types'

const RANDOM_PLAYER_NAME = 'random'

function isRandomPlayer(name: string): boolean {
  return name.trim().toLowerCase() === RANDOM_PLAYER_NAME
}

function passesMinGamesFilter(gamesPlayed: number, minGames: StatsMinGamesFilter): boolean {
  return minGames === 'all' || gamesPlayed >= minGames
}

function SortHeader<T extends string>({
  label,
  field,
  sortField,
  sortDirection,
  onSort,
}: {
  label: string
  field: T
  sortField: T
  sortDirection: SortDirection
  onSort: (field: T) => void
}) {
  const isActive = sortField === field
  const arrow = isActive ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''

  return (
    <th>
      <button type="button" className="sort-btn" onClick={() => onSort(field)}>
        {label}
        {arrow}
      </button>
    </th>
  )
}

function compareValues(
  av: string | number,
  bv: string | number,
  sortDirection: SortDirection,
): number {
  const dir = sortDirection === 'asc' ? 1 : -1
  if (typeof av === 'string' && typeof bv === 'string') {
    return av.localeCompare(bv) * dir
  }
  return ((av as number) - (bv as number)) * dir
}

function compareDeckStats(
  a: DeckStat,
  b: DeckStat,
  sortField: DeckSortField,
  sortDirection: SortDirection,
): number {
  const primary = compareValues(a[sortField], b[sortField], sortDirection)
  if (primary !== 0) return primary
  return a.deckName.localeCompare(b.deckName)
}

function comparePlayerStats(
  a: PlayerStat,
  b: PlayerStat,
  sortField: PlayerSortField,
  sortDirection: SortDirection,
): number {
  const primary = compareValues(a[sortField], b[sortField], sortDirection)
  if (primary !== 0) return primary
  return a.playerName.localeCompare(b.playerName)
}

export function StatsTab() {
  const { deckStats, playerStats } = useData()
  const [viewMode, setViewMode] = useState<StatsViewMode>('deck')
  const [search, setSearch] = useState('')
  const [excludeRandoms, setExcludeRandoms] = useState(false)
  const [minGames, setMinGames] = useState<StatsMinGamesFilter>(3)
  const [deckSortField, setDeckSortField] = useState<DeckSortField>('winRate')
  const [playerSortField, setPlayerSortField] = useState<PlayerSortField>('winRate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const handleDeckSort = (field: DeckSortField) => {
    if (deckSortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setDeckSortField(field)
      setSortDirection(field === 'deckName' || field === 'playerName' ? 'asc' : 'desc')
    }
  }

  const handlePlayerSort = (field: PlayerSortField) => {
    if (playerSortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setPlayerSortField(field)
      setSortDirection(field === 'playerName' ? 'asc' : 'desc')
    }
  }

  const filteredDeckStats = useMemo(() => {
    const q = search.trim().toLowerCase()
    let rows = deckStats

    if (q) {
      rows = rows.filter(
        (s) =>
          s.playerName.toLowerCase().includes(q) ||
          s.deckName.toLowerCase().includes(q),
      )
    }

    if (excludeRandoms) {
      rows = rows.filter((s) => !isRandomPlayer(s.playerName))
    }

    rows = rows.filter((s) => passesMinGamesFilter(s.gamesPlayed, minGames))

    return [...rows].sort((a, b) =>
      compareDeckStats(a, b, deckSortField, sortDirection),
    )
  }, [deckStats, search, excludeRandoms, minGames, deckSortField, sortDirection])

  const filteredPlayerStats = useMemo(() => {
    const q = search.trim().toLowerCase()
    let rows = playerStats

    if (q) {
      rows = rows.filter((s) => s.playerName.toLowerCase().includes(q))
    }

    if (excludeRandoms) {
      rows = rows.filter((s) => !isRandomPlayer(s.playerName))
    }

    rows = rows.filter((s) => passesMinGamesFilter(s.gamesPlayed, minGames))

    return [...rows].sort((a, b) =>
      comparePlayerStats(a, b, playerSortField, sortDirection),
    )
  }, [playerStats, search, excludeRandoms, minGames, playerSortField, sortDirection])

  const isEmpty = viewMode === 'deck' ? deckStats.length === 0 : playerStats.length === 0
  const hasActiveFilters =
    search.trim() !== '' || excludeRandoms || minGames !== 'all'
  const isFilteredEmpty =
    viewMode === 'deck' ? filteredDeckStats.length === 0 : filteredPlayerStats.length === 0

  return (
    <div className="tab-panel">
      <header className="panel-header">
        <h2>Stats</h2>
        <p className="panel-desc">
          {viewMode === 'deck'
            ? 'Win rates and games played per deck.'
            : 'Overall stats by who played, including borrowed decks.'}
        </p>
      </header>

      <div className="stats-toolbar">
        <div className="view-toggle" role="group" aria-label="Stats view">
          <button
            type="button"
            className={`view-toggle-btn ${viewMode === 'deck' ? 'view-toggle-active' : ''}`}
            onClick={() => {
              setViewMode('deck')
              setDeckSortField('winRate')
              setSortDirection('desc')
            }}
          >
            By Deck
          </button>
          <button
            type="button"
            className={`view-toggle-btn ${viewMode === 'player' ? 'view-toggle-active' : ''}`}
            onClick={() => {
              setViewMode('player')
              setPlayerSortField('winRate')
              setSortDirection('desc')
            }}
          >
            By Player
          </button>
        </div>

        <input
          type="search"
          placeholder={viewMode === 'deck' ? 'Search by player or deck...' : 'Search by player...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search stats"
          className="search-input"
        />
      </div>

      <div className="stats-filters">
        <label className="stats-filter checkbox-label">
          <input
            type="checkbox"
            checked={excludeRandoms}
            onChange={(e) => setExcludeRandoms(e.target.checked)}
          />
          <span>Exclude Random</span>
        </label>

        <label className="stats-filter">
          <span>Min games</span>
          <select
            value={minGames}
            onChange={(e) =>
              setMinGames(
                e.target.value === 'all' ? 'all' : (Number(e.target.value) as StatsMinGamesFilter),
              )
            }
            aria-label="Minimum games played"
          >
            <option value="all">All decks</option>
            <option value="3">3+ games</option>
            <option value="5">5+ games</option>
            <option value="10">10+ games</option>
            <option value="20">20+ games</option>
          </select>
        </label>

        {hasActiveFilters && (
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => {
              setSearch('')
              setExcludeRandoms(false)
              setMinGames(3)
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {isEmpty ? (
        <div className="empty-state">
          <p>No decks yet. Add players and decks on the Decks tab.</p>
        </div>
      ) : isFilteredEmpty ? (
        <div className="empty-state">
          <p>No results match your filters.</p>
        </div>
      ) : viewMode === 'deck' ? (
        <div className="table-wrap">
          <table className="stats-table">
            <thead>
              <tr>
                <SortHeader
                  label="Deck"
                  field="deckName"
                  sortField={deckSortField}
                  sortDirection={sortDirection}
                  onSort={handleDeckSort}
                />
                <SortHeader
                  label="Player"
                  field="playerName"
                  sortField={deckSortField}
                  sortDirection={sortDirection}
                  onSort={handleDeckSort}
                />
                <SortHeader
                  label="Games"
                  field="gamesPlayed"
                  sortField={deckSortField}
                  sortDirection={sortDirection}
                  onSort={handleDeckSort}
                />
                <SortHeader
                  label="Wins"
                  field="wins"
                  sortField={deckSortField}
                  sortDirection={sortDirection}
                  onSort={handleDeckSort}
                />
                <SortHeader
                  label="Win Rate"
                  field="winRate"
                  sortField={deckSortField}
                  sortDirection={sortDirection}
                  onSort={handleDeckSort}
                />
              </tr>
            </thead>
            <tbody>
              {filteredDeckStats.map((stat) => (
                <tr key={stat.deckId}>
                  <td>{stat.deckName}</td>
                  <td>{stat.playerName}</td>
                  <td>{stat.gamesPlayed}</td>
                  <td>{stat.wins}</td>
                  <td>
                    {stat.gamesPlayed === 0
                      ? '—'
                      : `${(stat.winRate * 100).toFixed(1)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="stats-table">
            <thead>
              <tr>
                <SortHeader
                  label="Player"
                  field="playerName"
                  sortField={playerSortField}
                  sortDirection={sortDirection}
                  onSort={handlePlayerSort}
                />
                <SortHeader
                  label="Decks"
                  field="deckCount"
                  sortField={playerSortField}
                  sortDirection={sortDirection}
                  onSort={handlePlayerSort}
                />
                <SortHeader
                  label="Games"
                  field="gamesPlayed"
                  sortField={playerSortField}
                  sortDirection={sortDirection}
                  onSort={handlePlayerSort}
                />
                <SortHeader
                  label="Wins"
                  field="wins"
                  sortField={playerSortField}
                  sortDirection={sortDirection}
                  onSort={handlePlayerSort}
                />
                <SortHeader
                  label="Win Rate"
                  field="winRate"
                  sortField={playerSortField}
                  sortDirection={sortDirection}
                  onSort={handlePlayerSort}
                />
              </tr>
            </thead>
            <tbody>
              {filteredPlayerStats.map((stat) => (
                <tr key={stat.playerId}>
                  <td>{stat.playerName}</td>
                  <td>{stat.deckCount}</td>
                  <td>{stat.gamesPlayed}</td>
                  <td>{stat.wins}</td>
                  <td>
                    {stat.gamesPlayed === 0
                      ? '—'
                      : `${(stat.winRate * 100).toFixed(1)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
