import type { AppData, Deck } from './types'

export type LogParticipant =
  | { type: 'existing'; deckId: string }
  | { type: 'new'; playerName: string; deckName: string }

export function resolveParticipantDeckIds(
  prev: AppData,
  participants: LogParticipant[],
): { data: AppData; deckIds: string[] } {
  let players = prev.players
  let decks = prev.decks
  const deckIds: string[] = []

  for (const participant of participants) {
    if (participant.type === 'existing') {
      deckIds.push(participant.deckId)
      continue
    }

    const deckTrimmed = participant.deckName.trim()
    const playerTrimmed = participant.playerName.trim() || 'Random'
    if (!deckTrimmed) continue

    let player =
      players.find((p) => p.name.toLowerCase() === playerTrimmed.toLowerCase()) ?? null

    if (!player) {
      player = { id: crypto.randomUUID(), name: playerTrimmed }
      players = [...players, player]
    }

    const existingDeck = decks.find(
      (d) =>
        d.playerId === player!.id &&
        d.name.toLowerCase() === deckTrimmed.toLowerCase(),
    )

    if (existingDeck) {
      deckIds.push(existingDeck.id)
      continue
    }

    const deck: Deck = {
      id: crypto.randomUUID(),
      playerId: player.id,
      name: deckTrimmed,
    }
    decks = [...decks, deck]
    deckIds.push(deck.id)
  }

  return {
    data: { ...prev, players, decks },
    deckIds,
  }
}
