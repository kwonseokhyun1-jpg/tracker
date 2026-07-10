export interface Player {
  id: string
  name: string
}

export interface Deck {
  id: string
  playerId: string
  name: string
}

export interface Game {
  id: string
  playedAt: string
  deckIds: string[]
  /** Who piloted each deck; index-aligned with deckIds. Defaults to deck owner when omitted. */
  playedByPlayerIds: string[]
  winnerDeckIds: string[]
}

export interface AppData {
  players: Player[]
  decks: Deck[]
  games: Game[]
}

export interface DeckStat {
  deckId: string
  deckName: string
  playerName: string
  gamesPlayed: number
  wins: number
  winRate: number
}

export interface PlayerStat {
  playerId: string
  playerName: string
  deckCount: number
  gamesPlayed: number
  wins: number
  winRate: number
}

/** Default owner when logging a new deck without specifying a player name. */
export const OTHERS_PLAYER_NAME = 'Others'

export type TabId = 'decks' | 'log' | 'stats'

export type StatsViewMode = 'deck' | 'player'

/** Minimum games played for a deck/player to appear in stats. `all` shows every row. */
export type StatsMinGamesFilter = 'all' | 3 | 5 | 10 | 20

export type DeckSortField = 'deckName' | 'playerName' | 'gamesPlayed' | 'wins' | 'winRate'
export type PlayerSortField = 'playerName' | 'gamesPlayed' | 'wins' | 'winRate'
export type SortDirection = 'asc' | 'desc'
