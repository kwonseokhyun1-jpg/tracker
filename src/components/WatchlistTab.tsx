import { useEffect, useMemo, useRef, useState } from 'react'
import { useData } from '../context/DataContext'
import {
  autocompleteCardNames,
  cardImageUri,
  fetchCardsByIds,
  formatUsd,
  searchCardPrintings,
  tcgplayerUrl,
  type ScryfallCard,
} from '../scryfall'
import type { WatchlistCard } from '../types'
import { WatchlistCardDialog } from './WatchlistCardDialog'

function toWatchlistCard(card: ScryfallCard): Omit<WatchlistCard, 'addedAt'> {
  return {
    scryfallId: card.id,
    name: card.name,
    setCode: card.set,
    setName: card.set_name,
    collectorNumber: card.collector_number,
    imageUri: cardImageUri(card),
    tcgplayerId: card.tcgplayer_id,
  }
}

export function WatchlistTab() {
  const { data, addWatchlistCard, removeWatchlistCard } = useData()
  const watchlist = useMemo(() => data.watchlist ?? [], [data.watchlist])
  const watchlistKey = useMemo(
    () => watchlist.map((c) => c.scryfallId).join(','),
    [watchlist],
  )

  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [printings, setPrintings] = useState<ScryfallCard[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const [livePrices, setLivePrices] = useState<Map<string, ScryfallCard>>(new Map())
  const [pricesLoading, setPricesLoading] = useState(false)
  const [pricesError, setPricesError] = useState<string | null>(null)
  const [pricesUpdatedAt, setPricesUpdatedAt] = useState<string | null>(null)
  const [selectedCard, setSelectedCard] = useState<WatchlistCard | null>(null)

  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchGen = useRef(0)
  const pricesGen = useRef(0)

  const watchedIds = useMemo(
    () => new Set(watchlist.map((c) => c.scryfallId)),
    [watchlist],
  )

  const loadPrices = async (ids: string[]) => {
    const gen = ++pricesGen.current
    if (ids.length === 0) {
      setLivePrices(new Map())
      setPricesUpdatedAt(null)
      setPricesError(null)
      setPricesLoading(false)
      return
    }
    setPricesLoading(true)
    setPricesError(null)
    try {
      const map = await fetchCardsByIds(ids)
      if (gen !== pricesGen.current) return
      setLivePrices(map)
      setPricesUpdatedAt(new Date().toISOString())
    } catch (err) {
      if (gen !== pricesGen.current) return
      setPricesError(err instanceof Error ? err.message : 'Could not refresh TCGPlayer prices.')
    } finally {
      if (gen === pricesGen.current) setPricesLoading(false)
    }
  }

  useEffect(() => {
    const ids = watchlistKey ? watchlistKey.split(',') : []
    let cancelled = false
    const gen = ++pricesGen.current

    if (ids.length === 0) {
      const clear = () => {
        if (cancelled || gen !== pricesGen.current) return
        setLivePrices(new Map())
        setPricesUpdatedAt(null)
        setPricesError(null)
        setPricesLoading(false)
      }
      queueMicrotask(clear)
      return () => {
        cancelled = true
      }
    }

    void (async () => {
      try {
        const map = await fetchCardsByIds(ids)
        if (cancelled || gen !== pricesGen.current) return
        setLivePrices(map)
        setPricesUpdatedAt(new Date().toISOString())
        setPricesError(null)
      } catch (err) {
        if (cancelled || gen !== pricesGen.current) return
        setPricesError(err instanceof Error ? err.message : 'Could not refresh TCGPlayer prices.')
      } finally {
        if (!cancelled && gen === pricesGen.current) setPricesLoading(false)
      }
    })()

    // Mark loading after the effect schedules work (avoid sync setState in effect body).
    queueMicrotask(() => {
      if (!cancelled && gen === pricesGen.current) setPricesLoading(true)
    })

    return () => {
      cancelled = true
    }
  }, [watchlistKey])

  const scheduleSuggestions = (value: string) => {
    if (suggestTimer.current) clearTimeout(suggestTimer.current)
    const q = value.trim()
    if (q.length < 2) {
      setSuggestions([])
      return
    }
    suggestTimer.current = setTimeout(() => {
      void autocompleteCardNames(q)
        .then(setSuggestions)
        .catch(() => setSuggestions([]))
    }, 250)
  }

  const runSearch = async (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const gen = ++searchGen.current
    setSearching(true)
    setSearchError(null)
    setActionMessage(null)
    setSuggestions([])
    try {
      const results = await searchCardPrintings(trimmed)
      if (gen !== searchGen.current) return
      setPrintings(results)
      if (results.length === 0) {
        setSearchError(`No printings found for “${trimmed}”.`)
      }
    } catch (err) {
      if (gen !== searchGen.current) return
      setPrintings([])
      setSearchError(err instanceof Error ? err.message : 'Search failed.')
    } finally {
      if (gen === searchGen.current) setSearching(false)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void runSearch(query)
  }

  const handleAdd = (card: ScryfallCard) => {
    const result = addWatchlistCard(toWatchlistCard(card))
    if (!result.ok) {
      setActionMessage(result.reason)
      return
    }
    setActionMessage(`Added ${card.name} (${card.set.toUpperCase()} #${card.collector_number}).`)
  }

  const sortedWatchlist = useMemo(
    () =>
      [...watchlist].sort((a, b) => {
        const nameCmp = a.name.localeCompare(b.name)
        if (nameCmp !== 0) return nameCmp
        return a.setCode.localeCompare(b.setCode)
      }),
    [watchlist],
  )

  return (
    <div className="tab-panel">
      <header className="panel-header">
        <h2>Card Watchlist</h2>
        <p className="panel-desc">
          Track MTG printings and live TCGPlayer market prices (via Scryfall).
        </p>
      </header>

      <form className="add-form watchlist-search-form" onSubmit={handleSearchSubmit}>
        <div className="watchlist-search-field">
          <input
            type="search"
            placeholder="Search card name (e.g. Rhystic Study)"
            value={query}
            onChange={(e) => {
              const value = e.target.value
              setQuery(value)
              scheduleSuggestions(value)
            }}
            aria-label="Card name"
            autoComplete="off"
          />
          {suggestions.length > 0 && (
            <ul className="watchlist-suggestions" role="listbox">
              {suggestions.slice(0, 8).map((name) => (
                <li key={name}>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery(name)
                      void runSearch(name)
                    }}
                  >
                    {name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button type="submit" className="btn btn-primary" disabled={searching || !query.trim()}>
          {searching ? 'Searching…' : 'Search'}
        </button>
      </form>

      {searchError && <p className="error-msg">{searchError}</p>}
      {actionMessage && <p className="watchlist-action-msg">{actionMessage}</p>}

      {printings.length > 0 && (
        <section className="watchlist-search-results" aria-label="Search results">
          <h3 className="watchlist-section-title">
            Printings for {printings[0]?.name}
            <span className="muted"> · TCGPlayer USD</span>
          </h3>
          <ul className="watchlist-printings">
            {printings.map((card) => {
              const watched = watchedIds.has(card.id)
              const buyUrl = tcgplayerUrl(card)
              return (
                <li key={card.id} className="watchlist-printing-row">
                  {cardImageUri(card) ? (
                    <img
                      src={cardImageUri(card)}
                      alt=""
                      className="watchlist-thumb"
                      loading="lazy"
                    />
                  ) : (
                    <div className="watchlist-thumb watchlist-thumb-empty" aria-hidden />
                  )}
                  <div className="watchlist-printing-meta">
                    <div className="watchlist-printing-name">{card.name}</div>
                    <div className="muted">
                      {card.set_name} ({card.set.toUpperCase()}) #{card.collector_number}
                    </div>
                    <div className="watchlist-price-line">
                      <span>
                        Market <strong>{formatUsd(card.prices.usd)}</strong>
                      </span>
                      {card.prices.usd_foil && (
                        <span>
                          Foil <strong>{formatUsd(card.prices.usd_foil)}</strong>
                        </span>
                      )}
                      {buyUrl && (
                        <a href={buyUrl} target="_blank" rel="noopener noreferrer">
                          TCGPlayer
                        </a>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={watched}
                    onClick={() => handleAdd(card)}
                  >
                    {watched ? 'Watching' : 'Add'}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section className="watchlist-list-section" aria-label="Your watchlist">
        <div className="watchlist-list-header">
          <h3 className="watchlist-section-title">
            Watching
            {watchlist.length > 0 && <span className="muted"> · {watchlist.length}</span>}
          </h3>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => void loadPrices(watchlist.map((c) => c.scryfallId))}
            disabled={pricesLoading || watchlist.length === 0}
          >
            {pricesLoading ? 'Refreshing…' : 'Refresh prices'}
          </button>
        </div>

        {pricesError && <p className="error-msg">{pricesError}</p>}
        {pricesUpdatedAt && watchlist.length > 0 && (
          <p className="muted watchlist-updated">
            Prices updated {new Date(pricesUpdatedAt).toLocaleString()} · TCGPlayer market via Scryfall
          </p>
        )}

        {sortedWatchlist.length === 0 ? (
          <div className="empty-state">
            <p>No cards on your watchlist yet.</p>
            <p>Search above and add a printing to track its TCGPlayer price.</p>
          </div>
        ) : (
          <ul className="watchlist-cards">
            {sortedWatchlist.map((card) => {
              const live = livePrices.get(card.scryfallId)
              const buyUrl = live
                ? tcgplayerUrl(live)
                : card.tcgplayerId
                  ? `https://www.tcgplayer.com/product/${card.tcgplayerId}`
                  : undefined
              const image = live ? cardImageUri(live) : card.imageUri
              return (
                <li key={card.scryfallId} className="watchlist-card-row">
                  <div
                    className="watchlist-card-open"
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedCard(card)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSelectedCard(card)
                      }
                    }}
                    aria-label={`Open price history for ${card.name}`}
                  >
                    {image ? (
                      <img src={image} alt="" className="watchlist-thumb" loading="lazy" />
                    ) : (
                      <div className="watchlist-thumb watchlist-thumb-empty" aria-hidden />
                    )}
                    <div className="watchlist-printing-meta">
                      <div className="watchlist-printing-name">{card.name}</div>
                      <div className="muted">
                        {card.setName} ({card.setCode.toUpperCase()}) #{card.collectorNumber}
                      </div>
                      <div className="watchlist-price-line">
                        <span>
                          Market{' '}
                          <strong>
                            {live ? formatUsd(live.prices.usd) : pricesLoading ? '…' : '—'}
                          </strong>
                        </span>
                        {live?.prices.usd_foil && (
                          <span>
                            Foil <strong>{formatUsd(live.prices.usd_foil)}</strong>
                          </span>
                        )}
                        {buyUrl && (
                          <a
                            href={buyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            TCGPlayer
                          </a>
                        )}
                      </div>
                      <div className="muted watchlist-chart-hint">Click for price graph</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => removeWatchlistCard(card.scryfallId)}
                  >
                    Remove
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {selectedCard && (
        <WatchlistCardDialog
          card={selectedCard}
          marketPrice={livePrices.get(selectedCard.scryfallId)?.prices.usd ?? null}
          foilPrice={livePrices.get(selectedCard.scryfallId)?.prices.usd_foil ?? null}
          imageUri={
            (() => {
              const live = livePrices.get(selectedCard.scryfallId)
              return (live ? cardImageUri(live) : undefined) ?? selectedCard.imageUri
            })()
          }
          tcgplayerUrl={
            (() => {
              const live = livePrices.get(selectedCard.scryfallId)
              if (live) return tcgplayerUrl(live)
              if (selectedCard.tcgplayerId) {
                return `https://www.tcgplayer.com/product/${selectedCard.tcgplayerId}`
              }
              return undefined
            })()
          }
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  )
}
