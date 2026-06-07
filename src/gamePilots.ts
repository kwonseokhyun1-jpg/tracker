import type { AppData, Deck, Game } from './types'

export function getDeckOwnerId(decks: Deck[], deckId: string): string | null {
  return decks.find((d) => d.id === deckId)?.playerId ?? null
}

export function getPlayedByPlayerId(
  game: Game,
  deckIndex: number,
  decks: Deck[],
): string | null {
  const deckId = game.deckIds[deckIndex]
  if (!deckId) return null
  return game.playedByPlayerIds[deckIndex] ?? getDeckOwnerId(decks, deckId)
}

export function normalizeGamePilots(game: Game, decks: Deck[]): Game {
  const playedByPlayerIds = game.deckIds.map((deckId, index) => {
    const stored = game.playedByPlayerIds?.[index]
    if (stored) return stored
    return getDeckOwnerId(decks, deckId) ?? ''
  })
  return { ...game, playedByPlayerIds }
}

export function gameDeckLabel(
  deckId: string,
  playedByPlayerId: string | null | undefined,
  data: Pick<AppData, 'decks' | 'players'>,
): string {
  const deck = data.decks.find((d) => d.id === deckId)
  if (!deck) return 'Unknown deck'
  const owner = data.players.find((p) => p.id === deck.playerId)
  const base = `${owner?.name ?? 'Unknown'} — ${deck.name}`
  const pilotId = playedByPlayerId ?? deck.playerId
  if (pilotId === deck.playerId) return base
  const pilot = data.players.find((p) => p.id === pilotId)
  return `${base} (played by ${pilot?.name ?? 'Unknown'})`
}
