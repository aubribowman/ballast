// Core data shapes shared by the domain logic, state and UI.

export type AssetClass = 'usEquity' | 'intlEquity' | 'bonds' | 'realEstate' | 'cash'

/** One fund or stock the person owns. */
export interface Holding {
  /** Generated locally; not a brokerage identifier. */
  id: string
  ticker: string
  name: string
  assetClass: AssetClass
  shares: number
  /** Latest price per share, typed in or fetched automatically. */
  price: number
  /** Average cost per share. 0 or missing means unknown. */
  costBasis?: number
}

/** Target weight for each asset class, in percent (0–100). */
export type Targets = Record<AssetClass, number>

/**
 * full: buy and sell to get back to target.
 * buyOnly: put new cash into whatever is underweight and sell nothing,
 * which avoids realizing capital gains in a taxable account.
 */
export type RebalanceMode = 'full' | 'buyOnly'

export interface Settings {
  /** New money to invest as part of this rebalance, in dollars. Negative values are treated as 0. */
  cashToInvest: number
  mode: RebalanceMode
  /** Drift tolerance in percentage points. Classes inside it count as on target. */
  bandPct: number
  /** Round trades to whole shares (for brokerages without fractional shares). */
  wholeShares: boolean
}

/** Everything the app saves: what you own, what you want, and how to rebalance. */
export interface Portfolio {
  holdings: Holding[]
  targets: Targets
  settings: Settings
}
