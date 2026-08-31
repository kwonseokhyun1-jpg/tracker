import { useMemo, useState } from 'react'
import {
  COLOR_LABELS,
  MANA_COLORS,
  type ManaColor,
  type UnoCard,
  type UnoGameState,
  callUno,
  cardLabel,
  canPlayCard,
  chooseWildColor,
  drawOne,
  playCard,
  playableCards,
  startMagicUnoGame,
  topOfGraveyard,
} from '../magicUno'

const MIN_PLAYERS = 2
const MAX_PLAYERS = 4
const DEFAULT_PLAYER_COUNT = 2

interface MagicUnoProps {
  open: boolean
  onClose: () => void
}

type MagicUnoView = 'settings' | 'game'

function createDefaultNames(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `Planeswalker ${index + 1}`)
}

function CardFace({
  card,
  selected,
  disabled,
  onClick,
}: {
  card: UnoCard
  selected?: boolean
  disabled?: boolean
  onClick?: () => void
}) {
  const colorClass = card.color ? `magic-uno-card-${card.color}` : 'magic-uno-card-wild'
  const className = `magic-uno-card ${colorClass}${selected ? ' magic-uno-card-selected' : ''}${
    disabled ? ' magic-uno-card-disabled' : ''
  }`

  if (onClick) {
    return (
      <button
        type="button"
        className={className}
        onClick={onClick}
        disabled={disabled}
        aria-label={cardLabel(card)}
      >
        <span className="magic-uno-card-value">{cardLabel(card)}</span>
        {card.color && <span className="magic-uno-card-color">{COLOR_LABELS[card.color]}</span>}
        {!card.color && <span className="magic-uno-card-color">Any color</span>}
      </button>
    )
  }

  return (
    <div className={className} aria-label={cardLabel(card)}>
      <span className="magic-uno-card-value">{cardLabel(card)}</span>
      {card.color && <span className="magic-uno-card-color">{COLOR_LABELS[card.color]}</span>}
      {!card.color && <span className="magic-uno-card-color">Any color</span>}
    </div>
  )
}

function MagicUnoSettings({
  names,
  onNamesChange,
  onStart,
  onClose,
}: {
  names: string[]
  onNamesChange: (names: string[]) => void
  onStart: () => void
  onClose: () => void
}) {
  const updateName = (index: number, value: string) => {
    onNamesChange(names.map((name, i) => (i === index ? value : name)))
  }

  const addPlayer = () => {
    if (names.length >= MAX_PLAYERS) return
    onNamesChange([...names, `Planeswalker ${names.length + 1}`])
  }

  const removePlayer = (index: number) => {
    if (names.length <= MIN_PLAYERS) return
    onNamesChange(names.filter((_, i) => i !== index))
  }

  return (
    <div className="magic-uno-settings">
      <header className="magic-uno-settings-header">
        <h2>Magic Uno</h2>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
          Close
        </button>
      </header>

      <p className="magic-uno-blurb">
        Hotseat Uno with Magic colors. Match mana color or card type. Library to draw, graveyard to
        discard. Empty your hand to win.
      </p>

      <div className="magic-uno-players-section">
        <div className="magic-uno-players-header">
          <span>Players ({names.length})</span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={addPlayer}
            disabled={names.length >= MAX_PLAYERS}
          >
            Add
          </button>
        </div>
        <ul className="magic-uno-player-list">
          {names.map((name, index) => (
            <li key={index} className="magic-uno-player-row">
              <input
                value={name}
                onChange={(e) => updateName(index, e.target.value)}
                aria-label={`Player ${index + 1} name`}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => removePlayer(index)}
                disabled={names.length <= MIN_PLAYERS}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>

      <button type="button" className="btn btn-primary magic-uno-start-btn" onClick={onStart}>
        Shuffle &amp; Deal
      </button>
    </div>
  )
}

function MagicUnoGameBoard({
  state,
  onStateChange,
  onBackToSettings,
}: {
  state: UnoGameState
  onStateChange: (state: UnoGameState) => void
  onBackToSettings: () => void
}) {
  const current = state.players[state.currentPlayerIndex]
  const top = topOfGraveyard(state)
  const playable = useMemo(() => new Set(playableCards(state).map((c) => c.id)), [state])
  const winner = state.players.find((p) => p.id === state.winnerId)

  const onPlay = (cardId: string) => {
    onStateChange(playCard(state, cardId))
  }

  const onDraw = () => {
    onStateChange(drawOne(state))
  }

  const onCallUno = () => {
    onStateChange(callUno(state))
  }

  const onChooseColor = (color: ManaColor) => {
    onStateChange(chooseWildColor(state, color))
  }

  return (
    <div className="magic-uno-game">
      <header className="magic-uno-game-header">
        <div>
          <h2>Magic Uno</h2>
          <p className="magic-uno-turn-line">
            {state.phase === 'finished'
              ? `${winner?.name ?? 'Someone'} wins!`
              : `${current.name}'s turn · ${COLOR_LABELS[state.currentColor]} mana`}
          </p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onBackToSettings}>
          New game
        </button>
      </header>

      <div className="magic-uno-opponents">
        {state.players.map((player, index) => {
          const isCurrent = index === state.currentPlayerIndex
          return (
            <div
              key={player.id}
              className={`magic-uno-opponent${isCurrent ? ' magic-uno-opponent-active' : ''}`}
            >
              <span className="magic-uno-opponent-name">{player.name}</span>
              <span className="magic-uno-opponent-count">{player.hand.length} cards</span>
            </div>
          )
        })}
      </div>

      <div className="magic-uno-table">
        <div className="magic-uno-pile magic-uno-library">
          <span className="magic-uno-pile-label">Library</span>
          <div className="magic-uno-card magic-uno-card-back">{state.library.length}</div>
          {state.phase === 'playing' && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={onDraw}>
              {state.pendingDraw > 0 ? `Draw ${state.pendingDraw}` : 'Draw'}
            </button>
          )}
        </div>
        <div className="magic-uno-pile magic-uno-graveyard">
          <span className="magic-uno-pile-label">Graveyard</span>
          {top ? <CardFace card={top} /> : <div className="magic-uno-card magic-uno-card-empty">—</div>}
          <span className={`magic-uno-active-color magic-uno-active-color-${state.currentColor}`}>
            Active: {COLOR_LABELS[state.currentColor]}
          </span>
        </div>
      </div>

      {state.phase === 'choosingColor' && (
        <div className="magic-uno-banner">
          <p>Choose the next mana color</p>
          <div className="magic-uno-color-choices">
            {MANA_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={`magic-uno-color-btn magic-uno-card-${color}`}
                onClick={() => onChooseColor(color)}
              >
                {COLOR_LABELS[color]}
              </button>
            ))}
          </div>
        </div>
      )}

      {state.phase === 'mustCallUno' && (
        <div className="magic-uno-banner magic-uno-banner-uno">
          <p>{current.name} is down to one card</p>
          <button type="button" className="btn btn-primary" onClick={onCallUno}>
            Call UNO!
          </button>
        </div>
      )}

      {state.phase === 'finished' && (
        <div className="magic-uno-banner">
          <p>{winner?.name} emptied their hand.</p>
          <button type="button" className="btn btn-primary" onClick={onBackToSettings}>
            Play again
          </button>
        </div>
      )}

      <section className="magic-uno-hand-section" aria-label={`${current.name}'s hand`}>
        <h3>{current.name}&apos;s hand</h3>
        <div className="magic-uno-hand">
          {current.hand.map((card) => {
            const allowed = state.phase === 'playing' && canPlayCard(card, state)
            return (
              <CardFace
                key={card.id}
                card={card}
                disabled={!allowed}
                selected={playable.has(card.id)}
                onClick={allowed ? () => onPlay(card.id) : undefined}
              />
            )
          })}
        </div>
      </section>
    </div>
  )
}

export function MagicUno({ open, onClose }: MagicUnoProps) {
  const [view, setView] = useState<MagicUnoView>('settings')
  const [names, setNames] = useState(() => createDefaultNames(DEFAULT_PLAYER_COUNT))
  const [game, setGame] = useState<UnoGameState | null>(null)

  if (!open) return null

  const startGame = () => {
    setGame(startMagicUnoGame(names))
    setView('game')
  }

  const backToSettings = () => {
    setGame(null)
    setView('settings')
  }

  const handleClose = () => {
    setGame(null)
    setView('settings')
    onClose()
  }

  return (
    <div className="magic-uno-overlay" role="dialog" aria-modal="true" aria-label="Magic Uno">
      {view === 'settings' || !game ? (
        <MagicUnoSettings
          names={names}
          onNamesChange={setNames}
          onStart={startGame}
          onClose={handleClose}
        />
      ) : (
        <MagicUnoGameBoard
          state={game}
          onStateChange={setGame}
          onBackToSettings={backToSettings}
        />
      )}
    </div>
  )
}
