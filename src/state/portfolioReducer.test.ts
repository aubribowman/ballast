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
