import type { AppData, Deck } from './types'

export type LogParticipant =
  | { type: 'existing'; deckId: string; playedByPlayerId?: string }
  | { type: 'new'; playerName: string; deckName: string; playedByPlayerId?: string }

export function resolveParticipantDeckIds(
  prev: AppData,
  participants: LogParticipant[],
): { data: AppData; deckIds: string[]; playedByPlayerIds: string[] } {
  let players = prev.players
  let decks = prev.decks
  const deckIds: string[] = []
  const playedByPlayerIds: string[] = []

  for (const participant of participants) {
    if (participant.type === 'existing') {
      const deck = decks.find((d) => d.id === participant.deckId)
      if (!deck) continue
      deckIds.push(participant.deckId)
      playedByPlayerIds.push(participant.playedByPlayerId ?? deck.playerId)
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
      playedByPlayerIds.push(participant.playedByPlayerId ?? existingDeck.playerId)
      continue
    }

    const deck: Deck = {
      id: crypto.randomUUID(),
      playerId: player.id,
      name: deckTrimmed,
    }
    decks = [...decks, deck]
    deckIds.push(deck.id)
    playedByPlayerIds.push(participant.playedByPlayerId ?? player.id)
  }

  return {
    data: { ...prev, players, decks },
    deckIds,
    playedByPlayerIds,
  }
}

export type GameLogValidation =
  | {
      ok: true
      filled: LogParticipant[]
      winnerIndices: number[]
    }
  | { ok: false; reason: string }

export function validateGameLog(
  participants: LogParticipant[],
  winnerIndices: number[],
): GameLogValidation {
  const filled = participants.filter((p) => {
    if (p.type === 'existing') return Boolean(p.deckId)
    return Boolean(p.deckName.trim())
  })

  if (filled.length < 2) {
    return { ok: false, reason: 'Add at least 2 participating decks.' }
  }

  if (winnerIndices.length === 0) {
    return { ok: false, reason: 'Select at least one winner.' }
  }

  const uniqueWinnerIndices = [...new Set(winnerIndices)]
  if (uniqueWinnerIndices.some((i) => i < 0 || i >= filled.length)) {
    return { ok: false, reason: 'Select winners from the participating decks.' }
  }

  const deckIdsInForm = filled.map((p) =>
    p.type === 'existing'
      ? p.deckId
      : `${(p.playerName.trim() || 'Random').toLowerCase()}|${p.deckName.trim().toLowerCase()}`,
  )
  if (new Set(deckIdsInForm).size !== deckIdsInForm.length) {
    return { ok: false, reason: 'Each deck can only be selected once.' }
  }

  return { ok: true, filled, winnerIndices: uniqueWinnerIndices }
}
