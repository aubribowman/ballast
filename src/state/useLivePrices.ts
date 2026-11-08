import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchPrices } from '../domain/quotes'
import { lookupTicker } from '../domain/tickers'
import { usePortfolio } from './usePortfolio'

// The person's own API key, kept only in this browser. Never commit a key to the repo.
const KEY_STORAGE = 'ballast:quote-api-key'
/** Wait for typing to settle so "V", "VT", "VTI" doesn't cost three lookups. */
const TYPING_DELAY_MS = 900

/** What the price controls show: loading, last update, and any problems. */
export interface PriceStatus {
  loading: boolean
  updatedAt?: Date
  /** Tickers the provider had no price for. */
  missing: string[]
  /** A problem with the whole request, such as a bad key. */
  error?: string
}

function readKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? ''
  } catch {
    return ''
  }
}

/** Tickers that need a market quote: not blank and not a $1.00 money market fund. */
function quotedTickers(tickers: string[]): string[] {
  return [...new Set(tickers.map(t => t.trim().toUpperCase()))]
    .filter(t => t && !lookupTicker(t)?.fixedPrice)
    .sort()
}

/**
 * Keeps holding prices up to date from the quote API (domain/quotes.ts) once
 * the person adds a key. Prices are written into the portfolio with the
 * `setPrices` action, so the rest of the app doesn't know where they came from.
 *
 * Returns the key, a setter for it, the current status, and `refresh` for
 * the "Update prices" button.
 */
export function useLivePrices() {
  const { portfolio, dispatch } = usePortfolio()
  const [apiKey, setKeyState] = useState(readKey)
  const [status, setStatus] = useState<PriceStatus>({ loading: false, missing: [] })
  // Tickers already priced this visit, so the automatic pass skips them.
  const priced = useRef(new Set<string>())

  // A string, so the effect below only re-runs when the set of tickers changes.
  const tickers = quotedTickers(portfolio.holdings.map(h => h.ticker))
  const tickersKey = tickers.join(',')

  const load = useCallback(
    async (symbols: string[], signal?: AbortSignal) => {
      if (!apiKey || symbols.length === 0) return
      setStatus(s => ({ ...s, loading: true }))
      try {
        const result = await fetchPrices(symbols, apiKey, signal)
        dispatch({ type: 'setPrices', prices: result.prices })
        for (const s of Object.keys(result.prices)) priced.current.add(s)
        setStatus(s => ({
          loading: false,
          updatedAt: Object.keys(result.prices).length ? new Date() : s.updatedAt,
          missing: result.missing,
          error: result.error,
        }))
      } catch {
        // Aborted because the tickers changed again; the next pass takes over.
        setStatus(s => ({ ...s, loading: false }))
      }
    },
    [apiKey, dispatch],
  )

  // Price any ticker we haven't priced yet: everything on first load, then
  // each new ticker shortly after someone finishes typing it.
  useEffect(() => {
    const fresh = tickersKey ? tickersKey.split(',').filter(t => !priced.current.has(t)) : []
    if (!apiKey || fresh.length === 0) return
    const controller = new AbortController()
    const timer = setTimeout(() => load(fresh, controller.signal), TYPING_DELAY_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [tickersKey, apiKey, load])

  // Manual refresh re-prices everything, not just new tickers.
  const refresh = useCallback(() => load(tickersKey ? tickersKey.split(',') : []), [load, tickersKey])

  const setApiKey = useCallback((key: string) => {
    const trimmed = key.trim()
    try {
      if (trimmed) localStorage.setItem(KEY_STORAGE, trimmed)
      else localStorage.removeItem(KEY_STORAGE)
    } catch {
      // Without storage the key lasts until the page is closed.
    }
    // A new key starts fresh: price everything again.
    priced.current.clear()
    setStatus({ loading: false, missing: [] })
    setKeyState(trimmed)
  }, [])

  return { apiKey, setApiKey, status, refresh, hasTickers: tickers.length > 0 }
}

export type LivePrices = ReturnType<typeof useLivePrices>
