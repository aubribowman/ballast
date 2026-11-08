import { assetClasses } from './assetClasses'
import type { AssetClass, Holding, Settings, Targets } from './types'

/*
 * The rebalancing algorithm. Plain TypeScript with no React, so it can be
 * tested on its own (rebalance.test.ts).
 *
 * In short:
 *   1. Work out each asset class's share of the portfolio (plus any new cash).
 *   2. If any class is outside the tolerance band, or there's new cash, work
 *      out how many dollars each class should gain or lose.
 *   3. Split each class's amount across the funds held in it, in proportion
 *      to their size, and turn dollars into shares.
 *   4. Recalculate the mix as it would be after those trades.
 */

/** One asset class's slice of the portfolio, compared with its target. */
export interface ClassAllocation {
  assetClass: AssetClass
  value: number
  pct: number
  targetPct: number
  /** Current minus target, in percentage points. Positive means overweight. */
  driftPct: number
  /** True when drift is larger than the tolerance band, so it needs trades. */
  outsideBand: boolean
}

/** One suggested order. `amount` is shares × current price, so it's an estimate. */
export interface Trade {
  holdingId: string
  ticker: string
  assetClass: AssetClass
  action: 'Buy' | 'Sell'
  shares: number
  amount: number
}

/**
 * The result of planRebalance. When `ok` is false the inputs can't be planned
 * (targets don't add to 100%, or a price is missing) and `error` says why.
 */
export type RebalancePlan =
  | {
      ok: true
      totalValue: number
      /** The mix now. */
      current: ClassAllocation[]
      /** The mix after the suggested trades. */
      projected: ClassAllocation[]
      trades: Trade[]
      /** New cash plus sale proceeds minus purchases. Never negative. */
      leftoverCash: number
      /** False when everything is within the band and there's no new cash. */
      needsRebalance: boolean
      warnings: string[]
      /** Money a class should get but can't, because nothing in it is held. */
      unfilled: { assetClass: AssetClass; amount: number }[]
    }
  | { ok: false; error: string }

/** Trades smaller than this aren't worth placing. */
export const MIN_TRADE = 1

export const holdingValue = (h: Holding) => h.shares * h.price

/** Sum of the target percentages. The plan only runs when this is 100. */
export function targetsTotal(targets: Targets): number {
  return assetClasses.reduce((sum, c) => sum + (targets[c] || 0), 0)
}

/**
 * Current mix by asset class. Uninvested cash counts toward the cash class,
 * because that's what it is until it's spent.
 */
export function allocate(
  holdings: Holding[],
  targets: Targets,
  uninvestedCash: number,
  bandPct: number,
): ClassAllocation[] {
  const byClass = Object.fromEntries(assetClasses.map(c => [c, 0])) as Record<AssetClass, number>
  for (const h of holdings) byClass[h.assetClass] += holdingValue(h)
  byClass.cash += uninvestedCash

  const total = assetClasses.reduce((sum, c) => sum + byClass[c], 0)

  return assetClasses.map(assetClass => {
    const value = byClass[assetClass]
    const pct = total > 0 ? (value / total) * 100 : 0
    const targetPct = targets[assetClass] || 0
    const driftPct = pct - targetPct
    return { assetClass, value, pct, targetPct, driftPct, outsideBand: Math.abs(driftPct) > bandPct + 1e-9 }
  })
}

/** Splits a dollar amount across holdings, in proportion to what each holds now. */
function splitAcross(holdings: Holding[], amount: number): Map<string, number> {
  const values = holdings.map(holdingValue)
  const total = values.reduce((a, b) => a + b, 0)
  return new Map(
    holdings.map((h, i) => [h.id, total > 0 ? (amount * values[i]) / total : amount / holdings.length]),
  )
}

/** Converts dollars to shares: whole shares, or up to 4 decimal places. */
function toShares(amount: number, price: number, action: 'Buy' | 'Sell', wholeShares: boolean): number {
  const raw = amount / price
  // Round buys down and sells up, so the plan never spends cash it doesn't have.
  if (wholeShares) return action === 'Buy' ? Math.floor(raw) : Math.ceil(raw)
  const factor = 10_000
  return action === 'Buy' ? Math.floor(raw * factor) / factor : Math.ceil(raw * factor) / factor
}

/**
 * Works out the trades that bring `holdings` back to `targets`.
 * Called by PortfolioProvider whenever the portfolio changes.
 */
export function planRebalance(holdings: Holding[], targets: Targets, settings: Settings): RebalancePlan {
  const total = targetsTotal(targets)
  if (Math.abs(total - 100) > 0.01) {
    return { ok: false, error: `Targets add up to ${round(total, 2)}%. Adjust them to total 100%.` }
  }
  const unpriced = holdings.filter(h => !(h.price > 0))
  if (unpriced.length) {
    const named = unpriced.map(h => h.ticker).filter(Boolean)
    return {
      ok: false,
      error: named.length === unpriced.length
        ? `Enter a price for ${named.join(', ')} in Holdings.`
        : 'Every holding needs a price above $0.',
    }
  }

  // Step 1: the current mix.
  const cash = Math.max(0, settings.cashToInvest || 0)
  const current = allocate(holdings, targets, cash, settings.bandPct)
  const totalValue = current.reduce((sum, c) => sum + c.value, 0)
  const needsRebalance = cash >= MIN_TRADE || current.some(c => c.outsideBand)

  const warnings: string[] = []
  const unfilled: { assetClass: AssetClass; amount: number }[] = []
  const amountByHolding = new Map<string, number>()

  if (needsRebalance) {
    // Step 2: how many dollars each class should gain (+) or lose (−), using only
    // what's held in it. Across all classes these add up to the new cash.
    const classDelta = new Map<AssetClass, number>()
    for (const c of assetClasses) {
      const held = holdings.filter(h => h.assetClass === c).reduce((s, h) => s + holdingValue(h), 0)
      const target = (totalValue * (targets[c] || 0)) / 100
      classDelta.set(c, target - held)
    }

    if (settings.mode === 'buyOnly') {
      // Spend only the new cash, on underweight classes, in proportion to how far behind each one is.
      const shortfalls = assetClasses.map(c => Math.max(0, classDelta.get(c)!))
      const totalShortfall = shortfalls.reduce((a, b) => a + b, 0)
      assetClasses.forEach((c, i) => {
        classDelta.set(c, totalShortfall > 0 ? (cash * shortfalls[i]) / totalShortfall : 0)
      })
    }

    // Step 3: share each class's amount among the funds held in it.
    for (const c of assetClasses) {
      const delta = classDelta.get(c)!
      if (Math.abs(delta) < MIN_TRADE) continue

      const inClass = holdings.filter(h => h.assetClass === c)
      if (inClass.length === 0) {
        // Cash with no money-market holding simply stays as cash.
        if (c !== 'cash' && delta > 0) unfilled.push({ assetClass: c, amount: round(delta, 2) })
        continue
      }
      for (const [id, amount] of splitAcross(inClass, delta)) amountByHolding.set(id, amount)
    }
  }

  // Turn dollar amounts into share orders, dropping any too small to place.
  const trades: Trade[] = []
  for (const h of holdings) {
    const amount = amountByHolding.get(h.id) ?? 0
    if (Math.abs(amount) < MIN_TRADE) continue
    const action = amount > 0 ? 'Buy' : 'Sell'
    let shares = toShares(Math.abs(amount), h.price, action, settings.wholeShares)
    if (action === 'Sell') shares = Math.min(shares, h.shares) // can't sell more than you own
    const tradeAmount = round(shares * h.price, 2)
    if (shares <= 0 || tradeAmount < MIN_TRADE) continue
    trades.push({ holdingId: h.id, ticker: h.ticker || '—', assetClass: h.assetClass, action, shares, amount: tradeAmount })
  }

  const sold = trades.filter(t => t.action === 'Sell').reduce((s, t) => s + t.amount, 0)
  const bought = trades.filter(t => t.action === 'Buy').reduce((s, t) => s + t.amount, 0)
  const leftoverCash = round(cash + sold - bought, 2)

  // Step 4: the mix after the trades, for the "after" markers in the charts.
  const after = holdings.map(h => {
    const t = trades.find(t => t.holdingId === h.id)
    if (!t) return h
    return { ...h, shares: h.shares + (t.action === 'Buy' ? t.shares : -t.shares) }
  })
  const projected = allocate(after, targets, leftoverCash, settings.bandPct)

  return { ok: true, totalValue, current, projected, trades, leftoverCash, needsRebalance, warnings, unfilled }
}

/** Rounds to a number of decimal places, e.g. round(1.005, 2) for cents. */
export function round(n: number, digits: number): number {
  const f = 10 ** digits
  return Math.round(n * f) / f
}
