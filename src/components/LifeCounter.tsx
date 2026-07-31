import { useCallback, useEffect, useState } from 'react'
import { useHoldAdjust } from '../useHoldAdjust'

const DEFAULT_PLAYER_COUNT = 4
const DEFAULT_STARTING_LIFE = 40
const MIN_PLAYERS = 1
const MAX_PLAYERS = 8

interface CounterPlayer {
  id: string
  name: string
}

type LifeCounterView = 'settings' | 'game'

interface LifeCounterProps {
  open: boolean
  onClose: () => void
}

function createDefaultPlayers(): CounterPlayer[] {
  return Array.from({ length: DEFAULT_PLAYER_COUNT }, (_, index) => ({
    id: crypto.randomUUID(),
    name: `Player ${index + 1}`,
  }))
}

function createInitialLives(players: CounterPlayer[], startingLife: number): Record<string, number> {
  return Object.fromEntries(players.map((player) => [player.id, startingLife]))
}

function createEmptyCommanderDamage(playerIds: string[]): Record<string, Record<string, number>> {
  const damage: Record<string, Record<string, number>> = {}
  for (const fromId of playerIds) {
    damage[fromId] = {}
    for (const toId of playerIds) {
      if (fromId !== toId) damage[fromId][toId] = 0
    }
  }
  return damage
}

function syncCommanderDamage(
  damage: Record<string, Record<string, number>>,
  playerIds: string[],
): Record<string, Record<string, number>> {
  const next = createEmptyCommanderDamage(playerIds)
  for (const fromId of playerIds) {
    for (const toId of playerIds) {
      if (fromId === toId) continue
      next[fromId][toId] = damage[fromId]?.[toId] ?? 0
    }
  }
  return next
}

type PanelOrientation = 'left' | 'right' | 'neutral'

interface TableSeat {
  row: number
  col: number
  orientation: PanelOrientation
}

function getTableSeats(playerCount: number): TableSeat[] {
  const columns = playerCount === 1 ? 1 : 2

  return Array.from({ length: playerCount }, (_, index) => {
    const row = Math.floor(index / columns) + 1
    const col = (index % columns) + 1

    if (playerCount === 1) {
      return { row, col, orientation: 'neutral' as const }
    }

    return {
      row,
      col,
      orientation: col === 1 ? ('left' as const) : ('right' as const),
    }
  })
}

function HexagonButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" className="life-counter-hex-btn" onClick={onClick} aria-label={label}>
      <svg viewBox="0 0 100 100" className="life-counter-hex-icon" aria-hidden="true">
        <polygon points="50,4 96,27 96,73 50,96 4,73 4,27" />
      </svg>
    </button>
  )
}

function LifeCounterSettings({
  players,
  startingLife,
  onPlayersChange,
  onStartingLifeChange,
  onStartGame,
  onClose,
}: {
  players: CounterPlayer[]
  startingLife: number
  onPlayersChange: (players: CounterPlayer[]) => void
  onStartingLifeChange: (life: number) => void
  onStartGame: () => void
  onClose: () => void
}) {
  const updatePlayerName = (id: string, name: string) => {
    onPlayersChange(players.map((player) => (player.id === id ? { ...player, name } : player)))
  }

  const addPlayer = () => {
    if (players.length >= MAX_PLAYERS) return
    onPlayersChange([
      ...players,
      { id: crypto.randomUUID(), name: `Player ${players.length + 1}` },
    ])
  }

  const removePlayer = (id: string) => {
    if (players.length <= MIN_PLAYERS) return
    onPlayersChange(players.filter((player) => player.id !== id))
  }

  const canStart = players.length >= MIN_PLAYERS && startingLife > 0

  return (
    <div className="life-counter-settings">
      <header className="life-counter-settings-header">
        <h2>Life Counter</h2>
        <button type="button" className="dialog-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </header>

      <label className="life-counter-field">
        <span>Starting life</span>
        <input
          type="number"
          min={1}
          max={999}
          value={startingLife}
          onChange={(e) => onStartingLifeChange(Math.max(1, Number(e.target.value) || 1))}
        />
      </label>

      <div className="life-counter-players-section">
        <div className="life-counter-players-header">
          <span>Players</span>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={addPlayer}
            disabled={players.length >= MAX_PLAYERS}
          >
            Add player
          </button>
        </div>

        <ul className="life-counter-player-list">
          {players.map((player, index) => (
            <li key={player.id} className="life-counter-player-row">
              <input
                type="text"
                value={player.name}
                onChange={(e) => updatePlayerName(player.id, e.target.value)}
                aria-label={`Player ${index + 1} name`}
                placeholder={`Player ${index + 1}`}
              />
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={() => removePlayer(player.id)}
                disabled={players.length <= MIN_PLAYERS}
                aria-label={`Remove ${player.name}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        className="btn btn-primary life-counter-start-btn"
        onClick={onStartGame}
        disabled={!canStart}
      >
        Start game
      </button>
    </div>
  )
}

function useZoneProps(startHold: (delta: number) => void, endHold: () => void, clearTimers: () => void) {
  return (delta: number) => ({
    onPointerDown: (event: React.PointerEvent) => {
      event.preventDefault()
      event.stopPropagation()
      event.currentTarget.setPointerCapture(event.pointerId)
      startHold(delta)
    },
    onPointerUp: (event: React.PointerEvent) => {
      event.preventDefault()
      event.stopPropagation()
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      endHold()
    },
    onPointerCancel: (event: React.PointerEvent) => {
      event.stopPropagation()
      clearTimers()
    },
  })
}

function CommanderDamageRow({
  sourceName,
  damage,
  onAdjust,
}: {
  sourceName: string
  damage: number
  onAdjust: (delta: number) => void
}) {
  const applyChange = useCallback((delta: number) => onAdjust(delta), [onAdjust])
  const { startHold, endHold, clearTimers } = useHoldAdjust(applyChange)

  useEffect(() => () => clearTimers(), [clearTimers])

  const zoneProps = useZoneProps(startHold, endHold, clearTimers)
  const label = sourceName.trim() || 'Unnamed'

  return (
    <li className="life-counter-commander-row">
      <button
        type="button"
        className="life-counter-commander-adjust life-counter-commander-adjust-minus"
        aria-label={`Decrease commander damage from ${label}`}
        {...zoneProps(-1)}
      >
        −
      </button>
      <div className="life-counter-commander-row-info">
        <span className="life-counter-commander-row-name">{label}</span>
        <span className="life-counter-commander-row-damage">{damage}</span>
      </div>
      <button
        type="button"
        className="life-counter-commander-adjust life-counter-commander-adjust-plus"
        aria-label={`Increase commander damage from ${label}`}
        {...zoneProps(1)}
      >
        +
      </button>
    </li>
  )
}

function CommanderDamageView({
  player,
  players,
  commanderDamage,
  orientation,
  onAdjustReceived,
}: {
  player: CounterPlayer
  players: CounterPlayer[]
  commanderDamage: Record<string, Record<string, number>>
  orientation: PanelOrientation
  onAdjustReceived: (fromId: string, delta: number) => void
}) {
  const displayName = player.name.trim() || 'Unnamed'
  const sources = players.filter((other) => other.id !== player.id)

  return (
    <div
      className={`life-counter-commander-view life-counter-panel-content-${orientation}`}
      onClick={(event) => event.stopPropagation()}
    >
      <p className="life-counter-commander-view-title">Commander — {displayName}</p>
      <ul className="life-counter-commander-rows">
        {sources.map((source) => (
          <CommanderDamageRow
            key={source.id}
            sourceName={source.name}
            damage={commanderDamage[source.id]?.[player.id] ?? 0}
            onAdjust={(delta) => onAdjustReceived(source.id, delta)}
          />
        ))}
      </ul>
    </div>
  )
}

function PlayerLifePanel({
  player,
  life,
  isActive,
  commanderViewOpen,
  players,
  commanderDamage,
  onSelect,
  onAdjust,
  onOpenCommanderView,
  onAdjustCommanderReceived,
  orientation,
}: {
  player: CounterPlayer
  life: number
  isActive: boolean
  commanderViewOpen: boolean
  players: CounterPlayer[]
  commanderDamage: Record<string, Record<string, number>>
  onSelect: () => void
  onAdjust: (delta: number) => void
  onOpenCommanderView: () => void
  onAdjustCommanderReceived: (fromId: string, delta: number) => void
  orientation: PanelOrientation
}) {
  const applyChange = useCallback((delta: number) => onAdjust(delta), [onAdjust])
  const { startHold, endHold, clearTimers } = useHoldAdjust(applyChange)

  useEffect(() => () => clearTimers(), [clearTimers])

  const zoneProps = useZoneProps(startHold, endHold, clearTimers)

  const displayName = player.name.trim() || 'Unnamed'

  if (commanderViewOpen) {
    return (
      <div className="life-counter-player-panel life-counter-player-panel-commander-view">
        <CommanderDamageView
          player={player}
          players={players}
          commanderDamage={commanderDamage}
          orientation={orientation}
          onAdjustReceived={onAdjustCommanderReceived}
        />
      </div>
    )
  }

  const minusZone = (
    <button
      type="button"
      className="life-counter-zone life-counter-zone-minus"
      aria-label={`Decrease ${displayName} life`}
      {...zoneProps(-1)}
    >
      <span className="life-counter-zone-label" aria-hidden="true">
        −
      </span>
    </button>
  )

  const plusZone = (
    <button
      type="button"
      className="life-counter-zone life-counter-zone-plus"
      aria-label={`Increase ${displayName} life`}
      {...zoneProps(1)}
    >
      <span className="life-counter-zone-label" aria-hidden="true">
        +
      </span>
    </button>
  )

  return (
    <div
      className={`life-counter-player-panel ${isActive ? 'life-counter-player-panel-active' : ''}`}
    >
      {minusZone}

      <div
        className={`life-counter-panel-content life-counter-panel-content-${orientation}`}
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onSelect()
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`Select ${displayName}`}
      >
        <p className="life-counter-panel-name">{displayName}</p>
        <p className="life-counter-panel-life">{life}</p>

        <div className="life-counter-commander-wrap">
          <button
            type="button"
            className="life-counter-commander-btn"
            onClick={(event) => {
              event.stopPropagation()
              onOpenCommanderView()
            }}
          >
            Commander
          </button>
        </div>
      </div>

      {plusZone}
    </div>
  )
}

function LifeCounterGame({
  players,
  lives,
  commanderDamage,
  activePlayerId,
  commanderViewPlayerId,
  onActivePlayerChange,
  onLifeChange,
  onCommanderDamageChange,
  onCommanderViewPlayerChange,
  onBackToSettings,
}: {
  players: CounterPlayer[]
  lives: Record<string, number>
  commanderDamage: Record<string, Record<string, number>>
  activePlayerId: string
  commanderViewPlayerId: string | null
  onActivePlayerChange: (id: string) => void
  onLifeChange: (playerId: string, delta: number) => void
  onCommanderDamageChange: (fromId: string, toId: string, delta: number) => void
  onCommanderViewPlayerChange: (id: string | null) => void
  onBackToSettings: () => void
}) {
  const tableSeats = getTableSeats(players.length)
  const rowCount = tableSeats.reduce((max, seat) => Math.max(max, seat.row), 0)

  return (
    <div className="life-counter-game life-counter-game-table">
      <div
        className="life-counter-grid"
        style={{
          gridTemplateColumns: players.length === 1 ? '1fr' : '1fr 1fr',
          gridTemplateRows: `repeat(${rowCount}, 1fr)`,
        }}
      >
        {players.map((player, index) => {
          const seat = tableSeats[index]
          const isActive = player.id === activePlayerId
          const commanderViewOpen = commanderViewPlayerId === player.id

          return (
            <div
              key={player.id}
              className="life-counter-grid-cell"
              style={{ gridColumn: seat.col, gridRow: seat.row }}
              onClick={() => {
                if (commanderViewPlayerId && commanderViewPlayerId !== player.id) {
                  onCommanderViewPlayerChange(null)
                }
                onActivePlayerChange(player.id)
              }}
            >
              <PlayerLifePanel
                player={player}
                life={lives[player.id] ?? 0}
                isActive={isActive}
                commanderViewOpen={commanderViewOpen}
                players={players}
                commanderDamage={commanderDamage}
                orientation={seat.orientation}
                onSelect={() => {
                  if (commanderViewPlayerId && commanderViewPlayerId !== player.id) {
                    onCommanderViewPlayerChange(null)
                  }
                  onActivePlayerChange(player.id)
                }}
                onAdjust={(delta) => onLifeChange(player.id, delta)}
                onOpenCommanderView={() => onCommanderViewPlayerChange(player.id)}
                onAdjustCommanderReceived={(fromId, delta) =>
                  onCommanderDamageChange(fromId, player.id, delta)
                }
              />
            </div>
          )
        })}
      </div>

      <div className="life-counter-hex-overlay">
        <HexagonButton onClick={onBackToSettings} label="Back to settings" />
      </div>
    </div>
  )
}

function createInitialCounterState() {
  const players = createDefaultPlayers()
  return {
    players,
    lives: createInitialLives(players, DEFAULT_STARTING_LIFE),
    commanderDamage: createEmptyCommanderDamage(players.map((player) => player.id)),
    activePlayerId: players[0]?.id ?? '',
  }
}

export function LifeCounter({ open, onClose }: LifeCounterProps) {
  const [initialCounterState] = useState(createInitialCounterState)
  const [view, setView] = useState<LifeCounterView>('settings')
  const [players, setPlayers] = useState<CounterPlayer[]>(initialCounterState.players)
  const [startingLife, setStartingLife] = useState(DEFAULT_STARTING_LIFE)
  const [lives, setLives] = useState<Record<string, number>>(initialCounterState.lives)
  const [commanderDamage, setCommanderDamage] = useState<Record<string, Record<string, number>>>(
    initialCounterState.commanderDamage,
  )
  const [activePlayerId, setActivePlayerId] = useState(initialCounterState.activePlayerId)
  const [commanderViewPlayerId, setCommanderViewPlayerId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = ''
      return
    }
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const handlePlayersChange = (nextPlayers: CounterPlayer[]) => {
    const playerIds = nextPlayers.map((player) => player.id)
    setPlayers(nextPlayers)
    setLives((prev) => {
      const next: Record<string, number> = {}
      for (const player of nextPlayers) {
        next[player.id] = prev[player.id] ?? startingLife
      }
      return next
    })
    setCommanderDamage((prev) => syncCommanderDamage(prev, playerIds))
    if (!playerIds.includes(activePlayerId)) {
      setActivePlayerId(playerIds[0] ?? '')
    }
    if (commanderViewPlayerId && !playerIds.includes(commanderViewPlayerId)) {
      setCommanderViewPlayerId(null)
    }
  }

  const handleStartGame = () => {
    const playerIds = players.map((player) => player.id)
    setLives(createInitialLives(players, startingLife))
    setCommanderDamage(createEmptyCommanderDamage(playerIds))
    setActivePlayerId(players[0]?.id ?? '')
    setCommanderViewPlayerId(null)
    setView('game')
  }

  const handleLifeChange = (playerId: string, delta: number) => {
    setLives((prev) => ({
      ...prev,
      [playerId]: Math.max(0, (prev[playerId] ?? 0) + delta),
    }))
  }

  const handleCommanderDamageChange = (fromId: string, toId: string, delta: number) => {
    setCommanderDamage((prev) => ({
      ...prev,
      [fromId]: {
        ...prev[fromId],
        [toId]: Math.max(0, (prev[fromId]?.[toId] ?? 0) + delta),
      },
    }))
    setLives((prev) => ({
      ...prev,
      [toId]: Math.max(0, (prev[toId] ?? 0) - delta),
    }))
  }

  if (!open) return null

  return (
    <div className="life-counter-overlay" role="dialog" aria-modal="true" aria-label="Life counter">
      {view === 'settings' ? (
        <LifeCounterSettings
          players={players}
          startingLife={startingLife}
          onPlayersChange={handlePlayersChange}
          onStartingLifeChange={setStartingLife}
          onStartGame={handleStartGame}
          onClose={onClose}
        />
      ) : (
        <LifeCounterGame
          players={players}
          lives={lives}
          commanderDamage={commanderDamage}
          activePlayerId={activePlayerId}
          commanderViewPlayerId={commanderViewPlayerId}
          onActivePlayerChange={setActivePlayerId}
          onLifeChange={handleLifeChange}
          onCommanderDamageChange={handleCommanderDamageChange}
          onCommanderViewPlayerChange={setCommanderViewPlayerId}
          onBackToSettings={() => {
            setCommanderViewPlayerId(null)
            setView('settings')
          }}
        />
      )}
    </div>
  )
}
