export type ManaColor = 'white' | 'blue' | 'black' | 'red' | 'green'

export type CardKind = 'number' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wildDraw4'

export interface UnoCard {
  id: string
  color: ManaColor | null
  kind: CardKind
  value?: number
}

export interface UnoPlayer {
  id: string
  name: string
  hand: UnoCard[]
}

export type UnoPhase = 'playing' | 'choosingColor' | 'mustCallUno' | 'finished'

export interface UnoGameState {
  players: UnoPlayer[]
  library: UnoCard[]
  graveyard: UnoCard[]
  currentPlayerIndex: number
  direction: 1 | -1
  currentColor: ManaColor
  pendingDraw: number
  winnerId: string | null
  phase: UnoPhase
  lastPlayedById: string | null
  /** After calling UNO, resume play at this seat. */
  resumePlayerIndex: number | null
}

export const MANA_COLORS: ManaColor[] = ['white', 'blue', 'black', 'red', 'green']

export const COLOR_LABELS: Record<ManaColor, string> = {
  white: 'White',
  blue: 'Blue',
  black: 'Black',
  red: 'Red',
  green: 'Green',
}

function shuffle<T>(items: T[]): T[] {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

function createId(): string {
  return crypto.randomUUID()
}

export function createDeck(): UnoCard[] {
  const cards: UnoCard[] = []

  for (const color of MANA_COLORS) {
    cards.push({ id: createId(), color, kind: 'number', value: 0 })
    for (let value = 1; value <= 9; value += 1) {
      cards.push({ id: createId(), color, kind: 'number', value })
      cards.push({ id: createId(), color, kind: 'number', value })
    }
    for (let i = 0; i < 2; i += 1) {
      cards.push({ id: createId(), color, kind: 'skip' })
      cards.push({ id: createId(), color, kind: 'reverse' })
      cards.push({ id: createId(), color, kind: 'draw2' })
    }
  }

  for (let i = 0; i < 4; i += 1) {
    cards.push({ id: createId(), color: null, kind: 'wild' })
    cards.push({ id: createId(), color: null, kind: 'wildDraw4' })
  }

  return shuffle(cards)
}

function isWild(card: UnoCard): boolean {
  return card.kind === 'wild' || card.kind === 'wildDraw4'
}

export function cardLabel(card: UnoCard): string {
  if (card.kind === 'wild') return 'Artifact Wild'
  if (card.kind === 'wildDraw4') return 'Chaos +4'
  if (card.kind === 'skip') return 'Skip'
  if (card.kind === 'reverse') return 'Reverse'
  if (card.kind === 'draw2') return '+2'
  return String(card.value ?? '')
}

export function topOfGraveyard(state: UnoGameState): UnoCard | null {
  return state.graveyard[state.graveyard.length - 1] ?? null
}

export function canPlayCard(card: UnoCard, state: UnoGameState): boolean {
  if (state.phase !== 'playing') return false
  if (state.pendingDraw > 0) return false

  const top = topOfGraveyard(state)
  if (!top) return true
  if (isWild(card)) return true
  if (card.color === state.currentColor) return true
  if (card.kind === 'number' && top.kind === 'number' && card.value === top.value) return true
  if (card.kind !== 'number' && card.kind === top.kind) return true
  return false
}

function drawCards(state: UnoGameState, playerIndex: number, count: number): UnoGameState {
  let library = [...state.library]
  let graveyard = [...state.graveyard]
  const drawn: UnoCard[] = []

  for (let i = 0; i < count; i += 1) {
    if (library.length === 0) {
      if (graveyard.length <= 1) break
      const top = graveyard[graveyard.length - 1]
      library = shuffle(graveyard.slice(0, -1))
      graveyard = [top]
    }
    const next = library[0]
    library = library.slice(1)
    drawn.push(next)
  }

  const players = state.players.map((player, index) =>
    index === playerIndex ? { ...player, hand: [...player.hand, ...drawn] } : player,
  )

  return { ...state, library, graveyard, players }
}

function advanceIndex(state: UnoGameState, fromIndex: number, steps = 1): number {
  const count = state.players.length
  let index = fromIndex
  for (let i = 0; i < steps; i += 1) {
    index = (index + state.direction + count) % count
  }
  return index
}

function finishIfWon(state: UnoGameState, playerIndex: number): UnoGameState {
  const player = state.players[playerIndex]
  if (player.hand.length > 0) return state
  return {
    ...state,
    winnerId: player.id,
    phase: 'finished',
    pendingDraw: 0,
  }
}

export function startMagicUnoGame(playerNames: string[]): UnoGameState {
  const names = playerNames.map((name, index) => name.trim() || `Player ${index + 1}`)
  let library = createDeck()
  const players: UnoPlayer[] = names.map((name) => ({
    id: createId(),
    name,
    hand: [],
  }))

  for (let round = 0; round < 7; round += 1) {
    for (let p = 0; p < players.length; p += 1) {
      const card = library[0]
      library = library.slice(1)
      players[p] = { ...players[p], hand: [...players[p].hand, card] }
    }
  }

  let starter: UnoCard | undefined
  do {
    starter = library[0]
    library = library.slice(1)
    if (!starter) break
    if (isWild(starter) || starter.kind !== 'number') {
      library = [...library, starter]
      starter = undefined
    }
  } while (!starter)

  if (!starter) {
    starter = {
      id: createId(),
      color: 'red',
      kind: 'number',
      value: 0,
    }
  }

  return {
    players,
    library,
    graveyard: [starter],
    currentPlayerIndex: 0,
    direction: 1,
    currentColor: starter.color ?? 'red',
    pendingDraw: 0,
    winnerId: null,
    phase: 'playing',
    lastPlayedById: null,
    resumePlayerIndex: null,
  }
}

export function playCard(state: UnoGameState, cardId: string): UnoGameState {
  if (state.phase !== 'playing') return state

  const playerIndex = state.currentPlayerIndex
  const player = state.players[playerIndex]
  const card = player.hand.find((c) => c.id === cardId)
  if (!card || !canPlayCard(card, state)) return state

  const hand = player.hand.filter((c) => c.id !== cardId)
  let next: UnoGameState = {
    ...state,
    players: state.players.map((p, i) => (i === playerIndex ? { ...p, hand } : p)),
    graveyard: [...state.graveyard, card],
    lastPlayedById: player.id,
    pendingDraw: 0,
  }

  if (isWild(card)) {
    next = {
      ...next,
      pendingDraw: card.kind === 'wildDraw4' ? state.pendingDraw + 4 : 0,
      phase: 'choosingColor',
    }
    return finishIfWon(next, playerIndex)
  }

  next = { ...next, currentColor: card.color ?? next.currentColor }

  if (card.kind === 'reverse') {
    const direction = next.players.length === 2 ? next.direction : ((-next.direction) as 1 | -1)
    next = { ...next, direction }
    if (next.players.length === 2) {
      next = { ...next, currentPlayerIndex: advanceIndex(next, playerIndex, 2) }
    } else {
      next = { ...next, currentPlayerIndex: advanceIndex(next, playerIndex) }
    }
  } else if (card.kind === 'skip') {
    next = { ...next, currentPlayerIndex: advanceIndex(next, playerIndex, 2) }
  } else if (card.kind === 'draw2') {
    const target = advanceIndex(next, playerIndex)
    next = drawCards(next, target, 2)
    next = { ...next, currentPlayerIndex: advanceIndex(next, playerIndex, 2), pendingDraw: 0 }
  } else {
    next = { ...next, currentPlayerIndex: advanceIndex(next, playerIndex) }
  }

  next = finishIfWon(next, playerIndex)
  if (next.phase === 'finished') return next

  if (hand.length === 1) {
    return {
      ...next,
      phase: 'mustCallUno',
      resumePlayerIndex: next.currentPlayerIndex,
      currentPlayerIndex: playerIndex,
    }
  }

  return next
}

export function chooseWildColor(state: UnoGameState, color: ManaColor): UnoGameState {
  if (state.phase !== 'choosingColor') return state

  const playerIndex = state.players.findIndex((p) => p.id === state.lastPlayedById)
  const sourceIndex = playerIndex >= 0 ? playerIndex : state.currentPlayerIndex
  let next: UnoGameState = {
    ...state,
    currentColor: color,
    phase: 'playing',
  }

  const top = topOfGraveyard(next)
  if (top?.kind === 'wildDraw4') {
    const target = advanceIndex(next, sourceIndex)
    next = drawCards(next, target, next.pendingDraw || 4)
    next = {
      ...next,
      pendingDraw: 0,
      currentPlayerIndex: advanceIndex(next, sourceIndex, 2),
    }
  } else {
    next = { ...next, currentPlayerIndex: advanceIndex(next, sourceIndex) }
  }

  next = finishIfWon(next, sourceIndex)
  if (next.phase === 'finished') return next

  const source = next.players[sourceIndex]
  if (source.hand.length === 1) {
    return {
      ...next,
      phase: 'mustCallUno',
      resumePlayerIndex: next.currentPlayerIndex,
      currentPlayerIndex: sourceIndex,
    }
  }

  return next
}

export function callUno(state: UnoGameState): UnoGameState {
  if (state.phase !== 'mustCallUno') return state
  const resume =
    state.resumePlayerIndex ?? advanceIndex(state, state.currentPlayerIndex)
  return {
    ...state,
    phase: 'playing',
    currentPlayerIndex: resume,
    resumePlayerIndex: null,
  }
}

export function drawOne(state: UnoGameState): UnoGameState {
  if (state.phase !== 'playing') return state

  const playerIndex = state.currentPlayerIndex
  let next = drawCards(state, playerIndex, state.pendingDraw > 0 ? state.pendingDraw : 1)
  next = {
    ...next,
    pendingDraw: 0,
    currentPlayerIndex: advanceIndex(next, playerIndex),
  }
  return next
}

export function playableCards(state: UnoGameState): UnoCard[] {
  const player = state.players[state.currentPlayerIndex]
  return player.hand.filter((card) => canPlayCard(card, state))
}
