import { describe, expect, it } from 'vitest'
import { portfolioGain, realizedOnSale, unrealizedGain } from './gains'
import type { Holding } from './types'

const h = (over: Partial<Holding>): Holding => ({
  id: 'x', ticker: 'X', name: '', assetClass: 'usEquity', shares: 10, price: 120, costBasis: 100, ...over,
})

describe('gains', () => {
  it('computes unrealized gain in dollars and percent of cost', () => {
    expect(unrealizedGain(h({}))).toEqual({ amount: 200, pct: 20 })
  })

  it('has no gain when the cost is unknown', () => {
    expect(unrealizedGain(h({ costBasis: 0 }))).toBeUndefined()
    expect(unrealizedGain(h({ costBasis: undefined }))).toBeUndefined()
  })

  it('totals only holdings with a known cost and counts the rest', () => {
    const total = portfolioGain([h({}), h({ id: 'y', price: 90 }), h({ id: 'z', costBasis: 0 })])
    expect(total).toEqual({ amount: 100, pct: 5, missing: 1 })
  })

  it('estimates the gain or loss from selling some shares', () => {
    expect(realizedOnSale(h({}), 4)).toBe(80)
    expect(realizedOnSale(h({ price: 90 }), 4)).toBe(-40)
    expect(realizedOnSale(h({ costBasis: 0 }), 4)).toBeUndefined()
  })
})
