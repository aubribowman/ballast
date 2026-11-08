import { describe, expect, it } from 'vitest'
import { planRebalance } from './rebalance'
import type { Holding, Settings, Targets } from './types'

const holdings: Holding[] = [
  { id: 'us', ticker: 'US', name: '', assetClass: 'usEquity', shares: 70, price: 100 }, // $7,000
  { id: 'bd', ticker: 'BD', name: '', assetClass: 'bonds', shares: 30, price: 100 }, //    $3,000
]
const sixtyForty: Targets = { usEquity: 60, intlEquity: 0, bonds: 40, realEstate: 0, cash: 0 }
const settings: Settings = { cashToInvest: 0, mode: 'full', bandPct: 5, wholeShares: true }

function plan(overrides: Partial<Settings> = {}, h = holdings, t = sixtyForty) {
  const result = planRebalance(h, t, { ...settings, ...overrides })
  if (!result.ok) throw new Error(result.error)
  return result
}

describe('planRebalance', () => {
  it('rejects targets that do not add up to 100%', () => {
    const result = planRebalance(holdings, { ...sixtyForty, bonds: 30 }, settings)
    expect(result).toEqual({ ok: false, error: 'Targets add up to 90%. Adjust them to total 100%.' })
  })

  it('leaves the portfolio alone when every class is inside the band', () => {
    const result = plan({ bandPct: 10 }) // 70/30 vs 60/40 is 10 pts off: inside a 10 pt band
    expect(result.needsRebalance).toBe(false)
    expect(result.trades).toEqual([])
  })

  it('sells what is overweight and buys what is underweight', () => {
    const result = plan()
    expect(result.trades).toEqual([
      { holdingId: 'us', ticker: 'US', assetClass: 'usEquity', action: 'Sell', shares: 10, amount: 1000 },
      { holdingId: 'bd', ticker: 'BD', assetClass: 'bonds', action: 'Buy', shares: 10, amount: 1000 },
    ])
    expect(result.projected.map(c => Math.round(c.pct))).toEqual([60, 0, 40, 0, 0])
  })

  it('never sells in buy-only mode and spends the new cash on what is underweight', () => {
    const result = plan({ mode: 'buyOnly', cashToInvest: 2000 })
    expect(result.trades.every(t => t.action === 'Buy')).toBe(true)
    // $12,000 total → targets $7,200 / $4,800, so US is $200 short and bonds $1,800 short.
    expect(result.trades.map(t => [t.ticker, t.shares])).toEqual([
      ['US', 2],
      ['BD', 18],
    ])
    expect(result.leftoverCash).toBe(0)
  })

  it('never plans to spend more cash than it has when rounding to whole shares', () => {
    const odd: Holding[] = [
      { id: 'a', ticker: 'A', name: '', assetClass: 'usEquity', shares: 10, price: 333.33 },
      { id: 'b', ticker: 'B', name: '', assetClass: 'bonds', shares: 10, price: 77.77 },
    ]
    const result = plan({ cashToInvest: 1234.56 }, odd)
    expect(result.leftoverCash).toBeGreaterThanOrEqual(0)
    expect(result.trades.every(t => Number.isInteger(t.shares))).toBe(true)
  })

  it('allows fractional shares when whole shares are turned off', () => {
    const result = plan({ wholeShares: false, cashToInvest: 150 }, holdings, { ...sixtyForty, usEquity: 70, bonds: 30 })
    expect(result.trades.some(t => !Number.isInteger(t.shares))).toBe(true)
  })

  it('warns when a class has a target but nothing to buy', () => {
    const result = plan({}, holdings, { usEquity: 50, intlEquity: 20, bonds: 30, realEstate: 0, cash: 0 })
    expect(result.warnings).toEqual([
      'There’s no international stocks holding to buy. Add one to reach its target.',
    ])
  })

  it('keeps cash uninvested when the cash target has no money-market holding', () => {
    const result = plan({ cashToInvest: 1000 }, holdings, { usEquity: 55, intlEquity: 0, bonds: 36, realEstate: 0, cash: 9 })
    expect(result.warnings).toEqual([])
    expect(result.leftoverCash).toBeGreaterThan(900)
  })
})
