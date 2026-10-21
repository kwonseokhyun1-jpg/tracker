/**
 * Card market price history via I Want My MTG (anonymous, CORS-enabled).
 * Points are retail market prices aligned with TCGPlayer paper pricing.
 * @see https://iwantmymtg.net/api/openapi.json
 */

const IWMM_API = 'https://iwantmymtg.net/api/v1'

export interface PriceHistoryPoint {
  date: string
  normal: number | null
  foil: number | null
}

interface HistoryResponse {
  success: boolean
  data?: PriceHistoryPoint[]
  error?: string
}

export async function fetchPriceHistory(
  setCode: string,
  collectorNumber: string,
  days = 90,
): Promise<PriceHistoryPoint[]> {
  const code = setCode.trim().toLowerCase()
  const number = encodeURIComponent(collectorNumber.trim())
  if (!code || !collectorNumber.trim()) {
    throw new Error('Missing set or collector number.')
  }

  const url = `${IWMM_API}/cards/${encodeURIComponent(code)}/${number}/price-history?days=${days}`
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('No price history found for this printing.')
    }
    throw new Error(`Price history request failed (${res.status})`)
  }

  const body = (await res.json()) as HistoryResponse
  if (!body.success || !Array.isArray(body.data)) {
    throw new Error(body.error || 'Could not load price history.')
  }

  return body.data
    .filter((p) => p && typeof p.date === 'string')
    .sort((a, b) => a.date.localeCompare(b.date))
}
