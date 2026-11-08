/**
 * Latest prices from Twelve Data (twelvedata.com). It allows requests from
 * a browser, and its free key covers US stocks and ETFs. Each symbol costs
 * one credit, and the free plan allows 8 credits a minute, so requests go
 * out in batches of that size.
 */
export const QUOTE_PROVIDER = { name: 'Twelve Data', signupUrl: 'https://twelvedata.com/pricing' }

const BATCH_SIZE = 8 // symbols per request, matching the free plan's per-minute limit

export interface QuoteResult {
  prices: Record<string, number>
  /** Symbols the provider had no price for. */
  missing: string[]
  /** A problem with the whole request, such as a bad key or the rate limit. */
  error?: string
}

type PriceEntry = { price?: string; status?: string; code?: number; message?: string }

/**
 * Twelve Data answers one symbol with `{ price }` and several with
 * `{ SYMBOL: { price } }`. Failures come back as `{ status: 'error', message }`,
 * either for the whole request or per symbol.
 */
export function parsePriceResponse(json: unknown, symbols: string[]): QuoteResult {
  const result: QuoteResult = { prices: {}, missing: [] }
  const body = (json ?? {}) as Record<string, unknown> & PriceEntry

  if (body.status === 'error') {
    return { ...result, missing: [...symbols], error: body.message ?? 'The price service returned an error.' }
  }

  const entries: [string, PriceEntry][] =
    symbols.length === 1 && 'price' in body
      ? [[symbols[0], body]]
      : symbols.map(s => [s, (body[s] ?? {}) as PriceEntry])

  for (const [symbol, entry] of entries) {
    const price = Number(entry.price)
    if (entry.status !== 'error' && Number.isFinite(price) && price > 0) result.prices[symbol] = price
    else result.missing.push(symbol)
  }
  return result
}

/**
 * Fetches prices for any number of symbols, a batch at a time. Never throws
 * for network or API problems: they come back in `error`, with the affected
 * symbols in `missing`. It only throws if `signal` cancels the request.
 */
export async function fetchPrices(symbols: string[], apiKey: string, signal?: AbortSignal): Promise<QuoteResult> {
  const unique = [...new Set(symbols.map(s => s.trim().toUpperCase()).filter(Boolean))]
  const combined: QuoteResult = { prices: {}, missing: [] }

  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    const batch = unique.slice(i, i + BATCH_SIZE)
    const url = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(batch.join(','))}&apikey=${encodeURIComponent(apiKey)}`
    let part: QuoteResult
    try {
      const response = await fetch(url, { signal })
      part = parsePriceResponse(await response.json(), batch)
    } catch (e) {
      if (signal?.aborted) throw e
      part = { prices: {}, missing: batch, error: 'Couldn’t reach the price service. Check your connection.' }
    }
    Object.assign(combined.prices, part.prices)
    combined.missing.push(...part.missing)
    combined.error ??= part.error
    // A bad key or the rate limit will fail every later batch too.
    if (part.error) {
      combined.missing.push(...unique.slice(i + BATCH_SIZE))
      break
    }
  }
  return combined
}
