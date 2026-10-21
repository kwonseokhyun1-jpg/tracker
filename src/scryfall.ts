/**
 * Scryfall card helpers. Market USD prices on Scryfall come from TCGPlayer.
 * @see https://scryfall.com/docs/api/cards
 */

const SCRYFALL_API = 'https://api.scryfall.com'
const REQUEST_GAP_MS = 100

let lastRequestAt = 0

async function throttle(): Promise<void> {
  const wait = Math.max(0, REQUEST_GAP_MS - (Date.now() - lastRequestAt))
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  lastRequestAt = Date.now()
}

async function scryfallFetch<T>(path: string, init?: RequestInit): Promise<T> {
  await throttle()
  const res = await fetch(`${SCRYFALL_API}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = (await res.json()) as { details?: string }
      if (body.details) detail = body.details
    } catch {
      /* ignore */
    }
    throw new Error(detail || `Scryfall request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

export interface ScryfallPrices {
  usd: string | null
  usd_foil: string | null
  usd_etched: string | null
}

export interface ScryfallCard {
  id: string
  name: string
  set: string
  set_name: string
  collector_number: string
  tcgplayer_id?: number
  image_uris?: { small?: string; normal?: string }
  card_faces?: Array<{ image_uris?: { small?: string; normal?: string } }>
  prices: ScryfallPrices
  purchase_uris?: { tcgplayer?: string }
}

interface AutocompleteResponse {
  data: string[]
}

interface SearchResponse {
  object: string
  data: ScryfallCard[]
  has_more?: boolean
  next_page?: string
}

interface CollectionResponse {
  data: ScryfallCard[]
  not_found: unknown[]
}

export function cardImageUri(card: ScryfallCard): string | undefined {
  return card.image_uris?.small ?? card.card_faces?.[0]?.image_uris?.small
}

export function tcgplayerUrl(card: Pick<ScryfallCard, 'tcgplayer_id' | 'purchase_uris'>): string | undefined {
  if (card.purchase_uris?.tcgplayer) return card.purchase_uris.tcgplayer
  if (card.tcgplayer_id) {
    return `https://www.tcgplayer.com/product/${card.tcgplayer_id}`
  }
  return undefined
}

export function formatUsd(value: string | null | undefined): string {
  if (value == null || value === '') return '—'
  const n = Number(value)
  if (Number.isNaN(n)) return '—'
  return `$${n.toFixed(2)}`
}

export async function autocompleteCardNames(query: string): Promise<string[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const data = await scryfallFetch<AutocompleteResponse>(
    `/cards/autocomplete?q=${encodeURIComponent(q)}`,
  )
  return data.data
}

/** Search printings for a card name; ordered by TCGPlayer USD (cheapest first). */
export async function searchCardPrintings(name: string): Promise<ScryfallCard[]> {
  const trimmed = name.trim()
  if (!trimmed) return []
  const q = `!"${trimmed.replace(/"/g, '')}"`
  const path =
    `/cards/search?q=${encodeURIComponent(q)}` +
    `&unique=prints&order=usd&dir=asc`
  try {
    const page = await scryfallFetch<SearchResponse>(path)
    return page.data
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.toLowerCase().includes('not found') || message.includes('0 cards')) {
      return []
    }
    throw err
  }
}

/** Refresh TCGPlayer market prices for known Scryfall ids (batches of 75). */
export async function fetchCardsByIds(ids: string[]): Promise<Map<string, ScryfallCard>> {
  const unique = [...new Set(ids.filter(Boolean))]
  const byId = new Map<string, ScryfallCard>()
  for (let i = 0; i < unique.length; i += 75) {
    const chunk = unique.slice(i, i + 75)
    const body = {
      identifiers: chunk.map((id) => ({ id })),
    }
    const page = await scryfallFetch<CollectionResponse>('/cards/collection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    for (const card of page.data) {
      byId.set(card.id, card)
    }
  }
  return byId
}
