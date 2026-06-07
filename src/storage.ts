import { normalizeGamePilots } from './gamePilots'
import type { AppData, Deck, Game, Player } from './types'

const EMPTY_DATA: AppData = {
  players: [],
  decks: [],
  games: [],
}

type ParseResult = { ok: true; data: AppData } | { ok: false; reason: string }

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function parsePlayers(raw: unknown): Player[] | null {
  if (!Array.isArray(raw)) return null
  const players: Player[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null
    const { id, name } = item as Player
    if (!isNonEmptyString(id) || !isNonEmptyString(name)) return null
    players.push({ id, name: name.trim() })
  }
  return players
}

function parseDecks(raw: unknown): Deck[] | null {
  if (!Array.isArray(raw)) return null
  const decks: Deck[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null
    const { id, playerId, name } = item as Deck
    if (!isNonEmptyString(id) || !isNonEmptyString(playerId) || !isNonEmptyString(name)) {
      return null
    }
    decks.push({ id, playerId, name: name.trim() })
  }
  return decks
}

function parseGames(raw: unknown): Game[] | null {
  if (!Array.isArray(raw)) return null
  const games: Game[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null
    const game = item as Game & { winnerDeckId?: string }
    if (!isNonEmptyString(game.id) || !isNonEmptyString(game.playedAt)) return null
    if (!Array.isArray(game.deckIds) || game.deckIds.some((id) => !isNonEmptyString(id))) {
      return null
    }
    const winnerDeckIds = Array.isArray(game.winnerDeckIds)
      ? game.winnerDeckIds.filter(isNonEmptyString)
      : game.winnerDeckId
        ? [game.winnerDeckId]
        : []
    const playedByPlayerIds = Array.isArray(game.playedByPlayerIds)
      ? game.playedByPlayerIds.filter(isNonEmptyString)
      : []
    games.push({
      id: game.id,
      playedAt: game.playedAt,
      deckIds: game.deckIds,
      playedByPlayerIds,
      winnerDeckIds,
    })
  }
  return games
}

export function parseAppData(raw: unknown): ParseResult {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, reason: 'Invalid backup file format.' }
  }

  const parsed = raw as Record<string, unknown>
  const players = parsePlayers(parsed.players)
  if (!players) return { ok: false, reason: 'Backup has invalid players data.' }

  const decks = parseDecks(parsed.decks)
  if (!decks) return { ok: false, reason: 'Backup has invalid decks data.' }

  const games = parseGames(parsed.games)
  if (!games) return { ok: false, reason: 'Backup has invalid games data.' }

  const normalizedGames = games.map((game) => normalizeGamePilots(game, decks))

  return {
    ok: true,
    data: { players, decks, games: normalizedGames },
  }
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem('mtg-tracker-data')
    if (!raw) return { ...EMPTY_DATA }
    const parsed = JSON.parse(raw) as unknown
    const result = parseAppData(parsed)
    return result.ok ? result.data : { ...EMPTY_DATA }
  } catch {
    return { ...EMPTY_DATA }
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem('mtg-tracker-data', JSON.stringify(data))
}
