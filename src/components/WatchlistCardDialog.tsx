import { useEffect, useState } from 'react'
import { fetchPriceHistory, type PriceHistoryPoint } from '../priceHistory'
import { formatUsd } from '../scryfall'
import type { WatchlistCard } from '../types'
import { PriceChart } from './PriceChart'

interface WatchlistCardDialogProps {
  card: WatchlistCard | null
  marketPrice?: string | null
  foilPrice?: string | null
  imageUri?: string
  tcgplayerUrl?: string
  onClose: () => void
}

const RANGE_OPTIONS = [
  { days: 30, label: '30d' },
  { days: 90, label: '90d' },
  { days: 365, label: '1y' },
] as const

export function WatchlistCardDialog({
  card,
  marketPrice,
  foilPrice,
  imageUri,
  tcgplayerUrl,
  onClose,
}: WatchlistCardDialogProps) {
  const [days, setDays] = useState<number>(90)
  const [points, setPoints] = useState<PriceHistoryPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!card) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [card, onClose])

  useEffect(() => {
    if (!card) return

    let cancelled = false
    const genCard = card.scryfallId
    const genDays = days

    queueMicrotask(() => {
      if (!cancelled) {
        setLoading(true)
        setError(null)
      }
    })

    void (async () => {
      try {
        const history = await fetchPriceHistory(card.setCode, card.collectorNumber, days)
        if (cancelled || genCard !== card.scryfallId || genDays !== days) return
        setPoints(history)
        if (history.length === 0) {
          setError('No price history available for this printing.')
        }
      } catch (err) {
        if (cancelled || genCard !== card.scryfallId || genDays !== days) return
        setPoints([])
        setError(err instanceof Error ? err.message : 'Could not load price history.')
      } finally {
        if (!cancelled && genCard === card.scryfallId && genDays === days) {
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [card, days])

  if (!card) return null

  const image = imageUri ?? card.imageUri

  return (
    <div
      className="dialog-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="watchlist-card-dialog-title"
      onClick={onClose}
    >
      <div
        className="dialog watchlist-card-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dialog-header">
          <div className="dialog-header-text">
            <h3 id="watchlist-card-dialog-title">{card.name}</h3>
            <p className="dialog-subtitle">
              {card.setName} ({card.setCode.toUpperCase()}) #{card.collectorNumber}
            </p>
          </div>
          <button type="button" className="dialog-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="watchlist-card-dialog-body">
          <div className="watchlist-card-dialog-meta">
            {image ? (
              <img src={image} alt="" className="watchlist-card-dialog-art" />
            ) : (
              <div className="watchlist-card-dialog-art watchlist-thumb-empty" aria-hidden />
            )}
            <div className="watchlist-card-dialog-prices">
              <div>
                Current market <strong>{formatUsd(marketPrice)}</strong>
              </div>
              {foilPrice && (
                <div>
                  Current foil <strong>{formatUsd(foilPrice)}</strong>
                </div>
              )}
              {tcgplayerUrl && (
                <a href={tcgplayerUrl} target="_blank" rel="noopener noreferrer">
                  Open on TCGPlayer
                </a>
              )}
            </div>
          </div>

          <div className="watchlist-card-dialog-chart">
            <div className="watchlist-card-dialog-chart-header">
              <h4>Price history</h4>
              <div className="watchlist-range-toggle" role="group" aria-label="History range">
                {RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.days}
                    type="button"
                    className={`btn btn-sm ${days === opt.days ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setDays(opt.days)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="muted watchlist-chart-source">TCGPlayer market · via I Want My MTG</p>
            {loading && <p className="muted">Loading chart…</p>}
            {error && !loading && <p className="error-msg">{error}</p>}
            {!loading && !error && points.length > 0 && <PriceChart points={points} />}
          </div>
        </div>
      </div>
    </div>
  )
}
