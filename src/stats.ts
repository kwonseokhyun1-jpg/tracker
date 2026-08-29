import { getPlayedByPlayerId } from './gamePilots'
import type { AppData, DeckStat, Game, PlayerStat } from './types'

export interface ComputeStatsOptions {
  exclude1v1?: boolean
  excludeTeamGames?: boolean
  excludeNon4Player?: boolean
}

export function is1v1Game(game: Game): boolean {
  return game.deckIds.length === 2
}

export function isTeamGame(game: Game): boolean {
  return game.winnerDeckIds.length > 1
}

export function is4PlayerGame(game: Game): boolean {
  return game.deckIds.length === 4
}

function gamesForStats(games: Game[], options?: ComputeStatsOptions): Game[] {
  let result = games
  if (options?.exclude1v1) {
    result = result.filter((g) => !is1v1Game(g))
  }
  if (options?.excludeTeamGames) {
    result = result.filter((g) => !isTeamGame(g))
  }
  if (options?.excludeNon4Player) {
    result = result.filter((g) => is4PlayerGame(g))
  }
  return result
}

export function computeDeckStats(data: AppData, options?: ComputeStatsOptions): DeckStat[] {
  const { decks, players } = data
  const games = gamesForStats(data.games, options)

  return decks.map((deck) => {
    const participated = games.filter((g) => g.deckIds.includes(deck.id))
    const wins = participated.filter((g) => g.winnerDeckIds.includes(deck.id))
    const player = players.find((p) => p.id === deck.playerId)

    return {
      deckId: deck.id,
      deckName: deck.name,
      playerName: player?.name ?? 'Unknown',
      gamesPlayed: participated.length,
      wins: wins.length,
      winRate: participated.length ? wins.length / participated.length : 0,
    }
  })
}

function playerParticipatedInGame(
  playerId: string,
  game: AppData['games'][number],
  decks: AppData['decks'],
): boolean {
  return game.deckIds.some(
    (_, index) => getPlayedByPlayerId(game, index, decks) === playerId,
  )
}

function playerWonGame(
  playerId: string,
  game: AppData['games'][number],
  decks: AppData['decks'],
): boolean {
  return game.winnerDeckIds.some((winnerDeckId) => {
    const deckIndex = game.deckIds.indexOf(winnerDeckId)
    if (deckIndex < 0) return false
    return getPlayedByPlayerId(game, deckIndex, decks) === playerId
  })
}

export function computePlayerStats(data: AppData, options?: ComputeStatsOptions): PlayerStat[] {
  const { players, decks } = data
  const games = gamesForStats(data.games, options)

  return players
    .map((player) => {
      const playerDeckIds = decks
        .filter((d) => d.playerId === player.id)
        .map((d) => d.id)

      const participated = games.filter((g) => playerParticipatedInGame(player.id, g, decks))
      const wins = participated.filter((g) => playerWonGame(player.id, g, decks))

      return {
        playerId: player.id,
        playerName: player.name,
        deckCount: playerDeckIds.length,
        gamesPlayed: participated.length,
        wins: wins.length,
        winRate: participated.length ? wins.length / participated.length : 0,
      }
    })
    .filter((stat) => stat.deckCount > 0 || stat.gamesPlayed > 0)
}

export function deckHasGameHistory(deckId: string, games: AppData['games']): boolean {
  return games.some((g) => g.deckIds.includes(deckId))
}

export function playerHasGameHistory(playerId: string, data: AppData): boolean {
  const playerDeckIds = data.decks.filter((d) => d.playerId === playerId).map((d) => d.id)
  if (data.games.some((g) => g.deckIds.some((id) => playerDeckIds.includes(id)))) {
    return true
  }
  return data.games.some((g) =>
    g.deckIds.some((_, index) => getPlayedByPlayerId(g, index, data.decks) === playerId),
  )
}
