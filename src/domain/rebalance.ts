import { assetClasses, assetClassLabels } from './assetClasses'
import type { AssetClass, Holding, Settings, Targets } from './types'

export interface ClassAllocation {
  assetClass: AssetClass
  value: number
  pct: number
  targetPct: number
  /** Current minus target, in percentage points. Positive means overweight. */
  driftPct: number
  outsideBand: boolean
}

export interface Trade {
  holdingId: string
  ticker: string
  assetClass: AssetClass
  action: 'Buy' | 'Sell'
  shares: number
  amount: number
}

export type RebalancePlan =
  | {
      ok: true
      totalValue: number
      current: ClassAllocation[]
      projected: ClassAllocation[]
      trades: Trade[]
      leftoverCash: number
      needsRebalance: boolean
      warnings: string[]
    }
  | { ok: false; error: string }

/** Trades smaller than this aren't worth placing. */
export const MIN_TRADE = 1

export const holdingValue = (h: Holding) => h.shares * h.price

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

function toShares(amount: number, price: number, action: 'Buy' | 'Sell', wholeShares: boolean): number {
  const raw = amount / price
  // Round buys down and sells up, so the plan never spends cash it doesn't have.
  if (wholeShares) return action === 'Buy' ? Math.floor(raw) : Math.ceil(raw)
  const factor = 10_000
  return action === 'Buy' ? Math.floor(raw * factor) / factor : Math.ceil(raw * factor) / factor
}

export function planRebalance(holdings: Holding[], targets: Targets, settings: Settings): RebalancePlan {
  const total = targetsTotal(targets)
  if (Math.abs(total - 100) > 0.01) {
    return { ok: false, error: `Targets add up to ${round(total, 2)}%. Adjust them to total 100%.` }
  }
  if (holdings.some(h => !(h.price > 0))) {
    return { ok: false, error: 'Every holding needs a price above $0.' }
  }

  const cash = Math.max(0, settings.cashToInvest || 0)
  const current = allocate(holdings, targets, cash, settings.bandPct)
  const totalValue = current.reduce((sum, c) => sum + c.value, 0)
  const needsRebalance = cash >= MIN_TRADE || current.some(c => c.outsideBand)

  const warnings: string[] = []
  const amountByHolding = new Map<string, number>()

  if (needsRebalance) {
    // How many dollars each class should gain (+) or lose (−), using only
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

    for (const c of assetClasses) {
      const delta = classDelta.get(c)!
      if (Math.abs(delta) < MIN_TRADE) continue

      const inClass = holdings.filter(h => h.assetClass === c)
      if (inClass.length === 0) {
        // Cash with no money-market holding simply stays as cash.
        if (c !== 'cash' && delta > 0) {
          warnings.push(`There’s no ${assetClassLabels[c].toLowerCase()} holding to buy. Add one to reach its target.`)
        }
        continue
      }
      for (const [id, amount] of splitAcross(inClass, delta)) amountByHolding.set(id, amount)
    }
  }

  const trades: Trade[] = []
  for (const h of holdings) {
    const amount = amountByHolding.get(h.id) ?? 0
    if (Math.abs(amount) < MIN_TRADE) continue
    const action = amount > 0 ? 'Buy' : 'Sell'
    let shares = toShares(Math.abs(amount), h.price, action, settings.wholeShares)
    if (action === 'Sell') shares = Math.min(shares, h.shares)
    const tradeAmount = round(shares * h.price, 2)
    if (shares <= 0 || tradeAmount < MIN_TRADE) continue
    trades.push({ holdingId: h.id, ticker: h.ticker || '—', assetClass: h.assetClass, action, shares, amount: tradeAmount })
  }

  const sold = trades.filter(t => t.action === 'Sell').reduce((s, t) => s + t.amount, 0)
  const bought = trades.filter(t => t.action === 'Buy').reduce((s, t) => s + t.amount, 0)
  const leftoverCash = round(cash + sold - bought, 2)

  const after = holdings.map(h => {
    const t = trades.find(t => t.holdingId === h.id)
    if (!t) return h
    return { ...h, shares: h.shares + (t.action === 'Buy' ? t.shares : -t.shares) }
  })
  const projected = allocate(after, targets, leftoverCash, settings.bandPct)

  return { ok: true, totalValue, current, projected, trades, leftoverCash, needsRebalance, warnings }
}

export function round(n: number, digits: number): number {
  const f = 10 ** digits
  return Math.round(n * f) / f
}
