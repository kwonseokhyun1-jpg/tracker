import type { AppData, DeckStat, PlayerStat } from './types'

export function computeDeckStats(data: AppData): DeckStat[] {
  const { decks, games, players } = data

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

export function computePlayerStats(data: AppData): PlayerStat[] {
  const { players, decks, games } = data

  return players
    .map((player) => {
      const playerDeckIds = decks
        .filter((d) => d.playerId === player.id)
        .map((d) => d.id)

      const participated = games.filter((g) =>
        g.deckIds.some((id) => playerDeckIds.includes(id)),
      )
      const wins = participated.filter((g) =>
        g.winnerDeckIds.some((id) => playerDeckIds.includes(id)),
      )

      return {
        playerId: player.id,
        playerName: player.name,
        deckCount: playerDeckIds.length,
        gamesPlayed: participated.length,
        wins: wins.length,
        winRate: participated.length ? wins.length / participated.length : 0,
      }
    })
    .filter((stat) => stat.deckCount > 0)
}

export function deckHasGameHistory(deckId: string, games: AppData['games']): boolean {
  return games.some((g) => g.deckIds.includes(deckId))
}

export function playerHasGameHistory(playerId: string, data: AppData): boolean {
  const playerDeckIds = data.decks.filter((d) => d.playerId === playerId).map((d) => d.id)
  return data.games.some((g) => g.deckIds.some((id) => playerDeckIds.includes(id)))
}
