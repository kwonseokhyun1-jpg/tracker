import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { resolveParticipantDeckIds, validateGameLog, type LogParticipant } from '../logParticipants'
import { computeDeckStats, computePlayerStats } from '../stats'
import { loadData, saveData } from '../storage'
import type { AppData, Deck, DeckStat, Game, Player, PlayerStat } from '../types'
import { deckHasGameHistory, playerHasGameHistory } from '../stats'

interface DataContextValue {
  data: AppData
  deckStats: DeckStat[]
  playerStats: PlayerStat[]
  addPlayer: (name: string) => void
  updatePlayer: (id: string, name: string) => void
  deletePlayer: (id: string) => { ok: true } | { ok: false; reason: string }
  addDeck: (playerId: string, name: string) => void
  updateDeck: (id: string, name: string) => void
  deleteDeck: (id: string) => { ok: true } | { ok: false; reason: string }
  addGameFromLog: (
    playedAt: string,
    participants: LogParticipant[],
    winnerIndices: number[],
  ) => { ok: true } | { ok: false; reason: string }
  updateGameFromLog: (
    gameId: string,
    playedAt: string,
    participants: LogParticipant[],
    winnerIndices: number[],
  ) => { ok: true } | { ok: false; reason: string }
  deleteGame: (id: string) => void
  getDeckLabel: (deckId: string) => string
  importData: (data: AppData) => void
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadData())
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveData(data), 300)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [data])

  const deckStats = useMemo(() => computeDeckStats(data), [data])
  const playerStats = useMemo(() => computePlayerStats(data), [data])

  const getDeckLabel = useCallback(
    (deckId: string) => {
      const deck = data.decks.find((d) => d.id === deckId)
      if (!deck) return 'Unknown deck'
      const player = data.players.find((p) => p.id === deck.playerId)
      return `${player?.name ?? 'Unknown'} — ${deck.name}`
    },
    [data.decks, data.players],
  )

  const addPlayer = useCallback((name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const player: Player = { id: crypto.randomUUID(), name: trimmed }
    setData((prev) => ({ ...prev, players: [...prev.players, player] }))
  }, [])

  const updatePlayer = useCallback((id: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setData((prev) => ({
      ...prev,
      players: prev.players.map((p) => (p.id === id ? { ...p, name: trimmed } : p)),
    }))
  }, [])

  const deletePlayer = useCallback((id: string) => {
    if (playerHasGameHistory(id, data)) {
      return {
        ok: false as const,
        reason: 'Cannot delete a player whose decks appear in logged games.',
      }
    }
    setData((prev) => ({
      ...prev,
      players: prev.players.filter((p) => p.id !== id),
      decks: prev.decks.filter((d) => d.playerId !== id),
    }))
    return { ok: true as const }
  }, [data])

  const addDeck = useCallback((playerId: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const deck: Deck = { id: crypto.randomUUID(), playerId, name: trimmed }
    setData((prev) => ({ ...prev, decks: [...prev.decks, deck] }))
  }, [])

  const updateDeck = useCallback((id: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setData((prev) => ({
      ...prev,
      decks: prev.decks.map((d) => (d.id === id ? { ...d, name: trimmed } : d)),
    }))
  }, [])

  const deleteDeck = useCallback(
    (id: string) => {
      if (deckHasGameHistory(id, data.games)) {
        return {
          ok: false as const,
          reason: 'Cannot delete a deck that appears in logged games.',
        }
      }
      setData((prev) => ({
        ...prev,
        decks: prev.decks.filter((d) => d.id !== id),
      }))
      return { ok: true as const }
    },
    [data.games],
  )

  const addGameFromLog = useCallback(
    (playedAt: string, participants: LogParticipant[], winnerIndices: number[]) => {
      const validation = validateGameLog(participants, winnerIndices)
      if (!validation.ok) return validation

      const { filled, winnerIndices: uniqueWinnerIndices } = validation

      setData((prev) => {
        const { data: nextData, deckIds } = resolveParticipantDeckIds(prev, filled)
        const winnerDeckIds = uniqueWinnerIndices.map((i) => deckIds[i])
        const entry: Game = {
          id: crypto.randomUUID(),
          playedAt,
          deckIds,
          winnerDeckIds,
        }
        return { ...nextData, games: [...nextData.games, entry] }
      })

      return { ok: true as const }
    },
    [],
  )

  const updateGameFromLog = useCallback(
    (gameId: string, playedAt: string, participants: LogParticipant[], winnerIndices: number[]) => {
      const validation = validateGameLog(participants, winnerIndices)
      if (!validation.ok) return validation

      const { filled, winnerIndices: uniqueWinnerIndices } = validation

      setData((prev) => {
        const { data: nextData, deckIds } = resolveParticipantDeckIds(prev, filled)
        const winnerDeckIds = uniqueWinnerIndices.map((i) => deckIds[i])
        return {
          ...nextData,
          games: nextData.games.map((g) =>
            g.id === gameId ? { ...g, playedAt, deckIds, winnerDeckIds } : g,
          ),
        }
      })

      return { ok: true as const }
    },
    [],
  )

  const deleteGame = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      games: prev.games.filter((g) => g.id !== id),
    }))
  }, [])

  const importData = useCallback((next: AppData) => {
    setData(next)
    saveData(next)
  }, [])

  const value: DataContextValue = {
    data,
    deckStats,
    playerStats,
    addPlayer,
    updatePlayer,
    deletePlayer,
    addDeck,
    updateDeck,
    deleteDeck,
    addGameFromLog,
    updateGameFromLog,
    deleteGame,
    getDeckLabel,
    importData,
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
