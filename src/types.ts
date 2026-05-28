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
  winnerDeckIds: string[]
}

export interface Pod {
  id: string
  name: string
  deckIds: string[]
}

export interface AppData {
  players: Player[]
  decks: Deck[]
  games: Game[]
  pods: Pod[]
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

export type TabId = 'decks' | 'log' | 'stats'

export type StatsViewMode = 'deck' | 'player'

export type DeckSortField = 'deckName' | 'playerName' | 'gamesPlayed' | 'wins' | 'winRate'
export type PlayerSortField = 'playerName' | 'deckCount' | 'gamesPlayed' | 'wins' | 'winRate'
export type SortDirection = 'asc' | 'desc'
