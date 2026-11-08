import type { Holding } from './types'

// Gain and loss estimates from each holding's average cost per share.
// Brokerages track individual tax lots, so their figures can differ.

export interface Gain {
  amount: number
  /** Gain as a percent of what was paid. */
  pct: number
}

/** Whether the person entered (or imported) what they paid for this holding. */
export const hasCost = (h: Holding) => (h.costBasis ?? 0) > 0

/** Unrealized gain or loss on a holding, or undefined when its cost isn't known. */
export function unrealizedGain(h: Holding): Gain | undefined {
  if (!hasCost(h) || !(h.price > 0)) return undefined
  const paid = h.shares * h.costBasis!
  const amount = h.shares * h.price - paid
  return { amount, pct: paid > 0 ? (amount / paid) * 100 : 0 }
}

export interface PortfolioGain extends Gain {
  /** Holdings left out because their cost isn't known. */
  missing: number
}

/** Total unrealized gain across holdings with a known cost. */
export function portfolioGain(holdings: Holding[]): PortfolioGain | undefined {
  const priced = holdings.filter(h => h.shares > 0)
  const known = priced.filter(h => unrealizedGain(h))
  if (known.length === 0) return undefined
  const paid = known.reduce((s, h) => s + h.shares * h.costBasis!, 0)
  const amount = known.reduce((s, h) => s + unrealizedGain(h)!.amount, 0)
  return { amount, pct: paid > 0 ? (amount / paid) * 100 : 0, missing: priced.length - known.length }
}

/** Estimated gain (or loss, if negative) from selling some shares at the current price. */
export function realizedOnSale(h: Holding, shares: number): number | undefined {
  if (!hasCost(h)) return undefined
  return shares * (h.price - h.costBasis!)
}
