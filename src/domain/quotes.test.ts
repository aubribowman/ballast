import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchPrices, parsePriceResponse } from './quotes'

describe('parsePriceResponse', () => {
  it('reads a single-symbol answer', () => {
    expect(parsePriceResponse({ price: '286.41000' }, ['VTI'])).toEqual({ prices: { VTI: 286.41 }, missing: [] })
  })

  it('reads a multi-symbol answer and lists symbols with no price', () => {
    const json = {
      VTI: { price: '286.41' },
      BND: { price: '72.85' },
      VTSAX: { code: 404, status: 'error', message: 'not found' },
    }
    expect(parsePriceResponse(json, ['VTI', 'BND', 'VTSAX'])).toEqual({
      prices: { VTI: 286.41, BND: 72.85 },
      missing: ['VTSAX'],
    })
  })

  it('reports an error for the whole request, such as a bad key', () => {
    const result = parsePriceResponse({ code: 401, status: 'error', message: 'Invalid API key' }, ['VTI', 'BND'])
    expect(result).toEqual({ prices: {}, missing: ['VTI', 'BND'], error: 'Invalid API key' })
  })
})

describe('fetchPrices', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('asks for at most 8 symbols per request', async () => {
    const fetch = vi.fn(async (url: string) => {
      const symbols = decodeURIComponent(new URL(url).searchParams.get('symbol')!).split(',')
      const body = Object.fromEntries(symbols.map(s => [s, { price: '10' }]))
      return new Response(JSON.stringify(symbols.length === 1 ? { price: '10' } : body))
    })
    vi.stubGlobal('fetch', fetch)

    const symbols = 'A B C D E F G H I'.split(' ')
    const result = await fetchPrices(symbols, 'key')
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(Object.keys(result.prices)).toEqual(symbols)
  })

  it('stops after an error that would fail every request', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ status: 'error', message: 'Rate limit' })))
    vi.stubGlobal('fetch', fetch)

    const result = await fetchPrices('A B C D E F G H I'.split(' '), 'key')
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(result.error).toBe('Rate limit')
    expect(result.missing).toHaveLength(9)
  })
})
