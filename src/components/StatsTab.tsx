import { useEffect, useMemo, useRef, useState } from 'react'
import { useData } from '../context/DataContext'
import { computeDeckStats, computePlayerStats } from '../stats'
import type {
  DeckSortField,
  DeckStat,
  PlayerSortField,
  PlayerStat,
  SortDirection,
  StatsMinGamesFilter,
  StatsViewMode,
} from '../types'
import { OTHERS_PLAYER_NAME } from '../types'

function isOthersPlayer(name: string): boolean {
  return name.trim().toLowerCase() === OTHERS_PLAYER_NAME.toLowerCase()
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
  const { data } = useData()
  const [viewMode, setViewMode] = useState<StatsViewMode>('deck')
  const [search, setSearch] = useState('')
  const [excludeOthers, setExcludeOthers] = useState(true)
  const [exclude1v1, setExclude1v1] = useState(false)
  const [excludeTeamGames, setExcludeTeamGames] = useState(false)
  const [excludeMenuOpen, setExcludeMenuOpen] = useState(false)
  const excludeMenuRef = useRef<HTMLDivElement>(null)
  const [minGames, setMinGames] = useState<StatsMinGamesFilter>(5)
  const [deckSortField, setDeckSortField] = useState<DeckSortField>('winRate')
  const [playerSortField, setPlayerSortField] = useState<PlayerSortField>('winRate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  useEffect(() => {
    if (!excludeMenuOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!excludeMenuRef.current?.contains(event.target as Node)) {
        setExcludeMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [excludeMenuOpen])

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

  const statsOptions = useMemo(() => {
    if (!exclude1v1 && !excludeTeamGames) return undefined
    return {
      ...(exclude1v1 ? { exclude1v1: true as const } : {}),
      ...(excludeTeamGames ? { excludeTeamGames: true as const } : {}),
    }
  }, [exclude1v1, excludeTeamGames])

  const deckStats = useMemo(
    () => computeDeckStats(data, statsOptions),
    [data, statsOptions],
  )

  const playerStats = useMemo(
    () => computePlayerStats(data, statsOptions),
    [data, statsOptions],
  )

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

    if (excludeOthers) {
      rows = rows.filter((s) => !isOthersPlayer(s.playerName))
    }

    rows = rows.filter((s) => passesMinGamesFilter(s.gamesPlayed, minGames))

    return [...rows].sort((a, b) =>
      compareDeckStats(a, b, deckSortField, sortDirection),
    )
  }, [deckStats, search, excludeOthers, minGames, deckSortField, sortDirection])

  const filteredPlayerStats = useMemo(() => {
    const q = search.trim().toLowerCase()
    let rows = playerStats

    if (q) {
      rows = rows.filter((s) => s.playerName.toLowerCase().includes(q))
    }

    if (excludeOthers) {
      rows = rows.filter((s) => !isOthersPlayer(s.playerName))
    }

    rows = rows.filter((s) => passesMinGamesFilter(s.gamesPlayed, minGames))

    return [...rows].sort((a, b) =>
      comparePlayerStats(a, b, playerSortField, sortDirection),
    )
  }, [playerStats, search, excludeOthers, minGames, playerSortField, sortDirection])

  const isEmpty = viewMode === 'deck' ? deckStats.length === 0 : playerStats.length === 0
  const hasActiveExcludeOptions = !excludeOthers || exclude1v1 || excludeTeamGames
  const hasActiveFilters =
    search.trim() !== '' ||
    hasActiveExcludeOptions ||
    minGames !== 'all'
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
        <div className="stats-toolbar-row">
          <div className="stats-view-group">
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

            <label className="stats-filter stats-min-games-filter">
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
          </div>

          <div className="stats-filters">
            <div className="stats-exclude-menu" ref={excludeMenuRef}>
              <button
                type="button"
                className={`btn btn-sm btn-secondary stats-exclude-menu-btn ${
                  excludeMenuOpen ? 'stats-exclude-menu-btn-open' : ''
                } ${hasActiveExcludeOptions ? 'stats-exclude-menu-btn-active' : ''}`}
                aria-expanded={excludeMenuOpen}
                aria-haspopup="menu"
                onClick={() => setExcludeMenuOpen((open) => !open)}
              >
                Exclude options
              </button>

              {excludeMenuOpen && (
                <div className="stats-exclude-menu-panel" role="menu" aria-label="Exclude options">
                  <label className="stats-exclude-menu-item checkbox-label" role="menuitemcheckbox">
                    <input
                      type="checkbox"
                      checked={excludeOthers}
                      onChange={(e) => setExcludeOthers(e.target.checked)}
                    />
                    <span>Exclude Others</span>
                  </label>

                  <label className="stats-exclude-menu-item checkbox-label" role="menuitemcheckbox">
                    <input
                      type="checkbox"
                      checked={exclude1v1}
                      onChange={(e) => setExclude1v1(e.target.checked)}
                    />
                    <span>Exclude 1v1s</span>
                  </label>

                  <label className="stats-exclude-menu-item checkbox-label" role="menuitemcheckbox">
                    <input
                      type="checkbox"
                      checked={excludeTeamGames}
                      onChange={(e) => setExcludeTeamGames(e.target.checked)}
                    />
                    <span>Exclude team games</span>
                  </label>
                </div>
              )}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                className="btn btn-sm btn-secondary stats-clear-filters"
                onClick={() => {
                  setSearch('')
                  setExcludeOthers(true)
                  setExcludeMenuOpen(false)
                  setExclude1v1(false)
                  setExcludeTeamGames(false)
                  setMinGames(5)
                }}
              >
                Clear filters
              </button>
            )}
          </div>
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
