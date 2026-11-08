export type AssetClass = 'usEquity' | 'intlEquity' | 'bonds' | 'realEstate' | 'cash'

export interface Holding {
  id: string
  ticker: string
  name: string
  assetClass: AssetClass
  shares: number
  price: number
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
  cashToInvest: number
  mode: RebalanceMode
  /** Drift tolerance in percentage points. Classes inside it count as on target. */
  bandPct: number
  wholeShares: boolean
}

export interface Portfolio {
  holdings: Holding[]
  targets: Targets
  settings: Settings
}
