import { useCallback, useEffect, useMemo, useState } from 'react'
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

function HexagonButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" className="life-counter-hex-btn" onClick={onClick} aria-label={label}>
      <svg viewBox="0 0 100 100" className="life-counter-hex-icon" aria-hidden="true">
        <polygon points="50,4 96,27 96,73 50,96 4,73 4,27" />
      </svg>
      <span className="life-counter-hex-label">Settings</span>
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

function LifeCounterGame({
  players,
  lives,
  commanderDamage,
  activePlayerId,
  commanderMode,
  commanderTargetId,
  commanderPickerOpen,
  onActivePlayerChange,
  onLifeChange,
  onCommanderDamageChange,
  onCommanderModeChange,
  onCommanderTargetChange,
  onCommanderPickerOpenChange,
  onBackToSettings,
}: {
  players: CounterPlayer[]
  lives: Record<string, number>
  commanderDamage: Record<string, Record<string, number>>
  activePlayerId: string
  commanderMode: boolean
  commanderTargetId: string | null
  commanderPickerOpen: boolean
  onActivePlayerChange: (id: string) => void
  onLifeChange: (playerId: string, delta: number) => void
  onCommanderDamageChange: (fromId: string, toId: string, delta: number) => void
  onCommanderModeChange: (enabled: boolean) => void
  onCommanderTargetChange: (id: string | null) => void
  onCommanderPickerOpenChange: (open: boolean) => void
  onBackToSettings: () => void
}) {
  const activePlayer = players.find((player) => player.id === activePlayerId) ?? players[0]
  const activeIndex = players.findIndex((player) => player.id === activePlayer.id)

  const applyChange = useCallback(
    (delta: number) => {
      if (commanderMode && commanderTargetId) {
        onCommanderDamageChange(activePlayer.id, commanderTargetId, delta)
        return
      }
      onLifeChange(activePlayer.id, delta)
    },
    [
      activePlayer.id,
      commanderMode,
      commanderTargetId,
      onCommanderDamageChange,
      onLifeChange,
    ],
  )

  const { startHold, endHold, clearTimers } = useHoldAdjust(applyChange)

  useEffect(() => () => clearTimers(), [clearTimers])

  const displayValue = useMemo(() => {
    if (commanderMode && commanderTargetId) {
      return commanderDamage[activePlayer.id]?.[commanderTargetId] ?? 0
    }
    return lives[activePlayer.id] ?? 0
  }, [activePlayer.id, commanderDamage, commanderMode, commanderTargetId, lives])

  const commanderTarget = players.find((player) => player.id === commanderTargetId)

  const handleCommanderClick = () => {
    if (commanderMode) {
      onCommanderModeChange(false)
      onCommanderPickerOpenChange(false)
      return
    }
    if (commanderPickerOpen) {
      onCommanderPickerOpenChange(false)
      return
    }
    onCommanderPickerOpenChange(true)
  }

  const handleSelectCommanderTarget = (targetId: string) => {
    onCommanderTargetChange(targetId)
    onCommanderModeChange(true)
    onCommanderPickerOpenChange(false)
  }

  const zoneProps = (delta: number) => ({
    onPointerDown: (event: React.PointerEvent) => {
      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      startHold(delta)
    },
    onPointerUp: (event: React.PointerEvent) => {
      event.preventDefault()
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      endHold()
    },
    onPointerCancel: () => {
      clearTimers()
    },
  })

  return (
    <div className="life-counter-game">
      <div className="life-counter-player-tabs" role="tablist" aria-label="Players">
        {players.map((player) => (
          <button
            key={player.id}
            type="button"
            role="tab"
            aria-selected={player.id === activePlayer.id}
            className={`life-counter-player-tab ${
              player.id === activePlayer.id ? 'life-counter-player-tab-active' : ''
            }`}
            onClick={() => {
              onActivePlayerChange(player.id)
              onCommanderPickerOpenChange(false)
            }}
          >
            {player.name.trim() || 'Unnamed'}
          </button>
        ))}
      </div>

      <div className="life-counter-game-body">
        <p className="life-counter-active-name">{activePlayer.name.trim() || 'Unnamed'}</p>

        <div className="life-counter-adjust-surface">
          <button
            type="button"
            className="life-counter-zone life-counter-zone-minus"
            aria-label={commanderMode ? 'Decrease commander damage' : 'Decrease life'}
            {...zoneProps(-1)}
          />

          <div className="life-counter-center">
            <p
              className={`life-counter-value ${
                commanderMode ? 'life-counter-value-commander' : ''
              }`}
            >
              {displayValue}
            </p>
            <HexagonButton onClick={onBackToSettings} label="Back to settings" />
          </div>

          <button
            type="button"
            className="life-counter-zone life-counter-zone-plus"
            aria-label={commanderMode ? 'Increase commander damage' : 'Increase life'}
            {...zoneProps(1)}
          />
        </div>

        <div className="life-counter-commander-wrap">
          <button
            type="button"
            className={`life-counter-commander-btn ${
              commanderMode ? 'life-counter-commander-btn-active' : ''
            }`}
            onClick={handleCommanderClick}
            aria-pressed={commanderMode}
          >
            Commander
            {commanderMode && commanderTarget
              ? ` → ${commanderTarget.name.trim() || 'Unnamed'}`
              : ''}
          </button>

          {commanderPickerOpen && (
            <div className="life-counter-commander-picker" role="menu">
              <p className="life-counter-commander-picker-title">
                Commander damage from {activePlayer.name.trim() || 'Unnamed'}
              </p>
              <ul>
                {players
                  .filter((player) => player.id !== activePlayer.id)
                  .map((player) => {
                    const dealt = commanderDamage[activePlayer.id]?.[player.id] ?? 0
                    return (
                      <li key={player.id}>
                        <button
                          type="button"
                          role="menuitem"
                          className="life-counter-commander-option"
                          onClick={() => handleSelectCommanderTarget(player.id)}
                        >
                          <span>{player.name.trim() || 'Unnamed'}</span>
                          <span className="life-counter-commander-dealt">{dealt} dealt</span>
                        </button>
                      </li>
                    )
                  })}
              </ul>
            </div>
          )}
        </div>

        {!commanderMode && (
          <p className="life-counter-hint">
            Tap sides to adjust · hold for ±10
            {activeIndex >= 0 ? ` · Player ${activeIndex + 1} of ${players.length}` : ''}
          </p>
        )}
        {commanderMode && commanderTarget && (
          <p className="life-counter-hint life-counter-hint-commander">
            Commander damage to {commanderTarget.name.trim() || 'Unnamed'} · tap sides to adjust ·
            hold for ±10
          </p>
        )}
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
  const [commanderMode, setCommanderMode] = useState(false)
  const [commanderTargetId, setCommanderTargetId] = useState<string | null>(null)
  const [commanderPickerOpen, setCommanderPickerOpen] = useState(false)

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
    if (commanderTargetId && !playerIds.includes(commanderTargetId)) {
      setCommanderTargetId(null)
      setCommanderMode(false)
    }
  }

  const handleStartGame = () => {
    const playerIds = players.map((player) => player.id)
    setLives(createInitialLives(players, startingLife))
    setCommanderDamage(createEmptyCommanderDamage(playerIds))
    setActivePlayerId(players[0]?.id ?? '')
    setCommanderMode(false)
    setCommanderTargetId(null)
    setCommanderPickerOpen(false)
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
          commanderMode={commanderMode}
          commanderTargetId={commanderTargetId}
          commanderPickerOpen={commanderPickerOpen}
          onActivePlayerChange={setActivePlayerId}
          onLifeChange={handleLifeChange}
          onCommanderDamageChange={handleCommanderDamageChange}
          onCommanderModeChange={setCommanderMode}
          onCommanderTargetChange={setCommanderTargetId}
          onCommanderPickerOpenChange={setCommanderPickerOpen}
          onBackToSettings={() => {
            setCommanderPickerOpen(false)
            setView('settings')
          }}
        />
      )}
    </div>
  )
}
