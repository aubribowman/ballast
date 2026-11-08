import { describe, expect, it } from 'vitest'
import { portfolioReducer } from './portfolioReducer'
import { samplePortfolio } from './samplePortfolio'

describe('portfolioReducer', () => {
  it('updates one holding without touching the others', () => {
    const before = samplePortfolio()
    const after = portfolioReducer(before, { type: 'updateHolding', id: 'h1', changes: { shares: 999 } })
    expect(after.holdings[0].shares).toBe(999)
    expect(after.holdings[1]).toBe(before.holdings[1])
    expect(before.holdings[0].shares).toBe(120) // the old state wasn't mutated
  })

  it('applies prices to holdings by ticker', () => {
    const after = portfolioReducer(samplePortfolio(), { type: 'setPrices', prices: { VTI: 300, BND: 70 } })
    expect(after.holdings.find(h => h.ticker === 'VTI')!.price).toBe(300)
    expect(after.holdings.find(h => h.ticker === 'BND')!.price).toBe(70)
    expect(after.holdings.find(h => h.ticker === 'VNQ')!.price).toBe(88.2)
  })

  it('imports holdings by replacing or adding, combining matching tickers', () => {
    const incoming = [
      { ticker: 'VTI', name: '', assetClass: 'usEquity' as const, shares: 30, price: 300, costBasis: 250 },
      { ticker: 'AAPL', name: 'Apple Inc.', assetClass: 'usEquity' as const, shares: 5, price: 200, costBasis: 150 },
    ]
    const replaced = portfolioReducer(samplePortfolio(), { type: 'importHoldings', holdings: incoming, mode: 'replace' })
    expect(replaced.holdings.map(h => h.ticker)).toEqual(['VTI', 'AAPL'])

    const added = portfolioReducer(samplePortfolio(), { type: 'importHoldings', holdings: incoming, mode: 'add' })
    expect(added.holdings).toHaveLength(6)
    expect(added.holdings.find(h => h.ticker === 'VTI')).toMatchObject({ shares: 150, price: 300 })
  })

  it('adds and removes holdings', () => {
    const added = portfolioReducer(samplePortfolio(), { type: 'addHolding' })
    expect(added.holdings).toHaveLength(6)
    const newId = added.holdings[5].id
    const removed = portfolioReducer(added, { type: 'removeHolding', id: newId })
    expect(removed.holdings.map(h => h.id)).not.toContain(newId)
  })

  it('applies a model portfolio as a copy', () => {
    const targets = { usEquity: 60, intlEquity: 30, bonds: 5, realEstate: 5, cash: 0 }
    const after = portfolioReducer(samplePortfolio(), { type: 'applyModel', targets })
    expect(after.targets).toEqual(targets)
    expect(after.targets).not.toBe(targets)
  })
})
