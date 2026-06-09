import type { Game } from './types'

function gameOrderIndex(games: Game[]): Map<string, number> {
  return new Map(games.map((game, index) => [game.id, index]))
}

/** Newest first: later playedAt wins; same day uses log order (later entries are newer). */
export function compareGamesNewestFirst(a: Game, b: Game, order: Map<string, number>): number {
  const byDate = b.playedAt.localeCompare(a.playedAt)
  if (byDate !== 0) return byDate
  return (order.get(b.id) ?? 0) - (order.get(a.id) ?? 0)
}

export function getLastLoggedGame(games: Game[], excludeGameId?: string | null): Game | null {
  const order = gameOrderIndex(games)
  return (
    [...games]
      .filter((game) => game.id !== excludeGameId)
      .sort((a, b) => compareGamesNewestFirst(a, b, order))[0] ?? null
  )
}

export function sortGamesNewestFirst(games: Game[]): Game[] {
  const order = gameOrderIndex(games)
  return [...games].sort((a, b) => compareGamesNewestFirst(a, b, order))
}
