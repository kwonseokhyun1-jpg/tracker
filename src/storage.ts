import type { AppData } from './types'

const STORAGE_KEY = 'mtg-tracker-data'

const EMPTY_DATA: AppData = {
  players: [],
  decks: [],
  games: [],
  pods: [],
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...EMPTY_DATA }
    const parsed = JSON.parse(raw) as {
      players?: AppData['players']
      decks?: AppData['decks']
      games?: (Omit<AppData['games'][number], 'winnerDeckIds'> & {
        winnerDeckIds?: string[]
        winnerDeckId?: string
      })[]
      pods?: AppData['pods']
    }
    return {
      players: parsed.players ?? [],
      decks: parsed.decks ?? [],
      games: (parsed.games ?? []).map((game) => ({
        id: game.id,
        playedAt: game.playedAt,
        deckIds: game.deckIds ?? [],
        winnerDeckIds:
          game.winnerDeckIds ??
          (game.winnerDeckId ? [game.winnerDeckId] : []),
      })),
      pods: parsed.pods ?? [],
    }
  } catch {
    return { ...EMPTY_DATA }
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}
