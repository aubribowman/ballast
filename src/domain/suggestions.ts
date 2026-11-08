import { lookupTicker, type KnownTicker } from './tickers'
import type { AssetClass } from './types'

/**
 * Widely held, low-cost index funds for each asset class, from three
 * different fund companies. They're examples to start from, not advice:
 * the right fund depends on where the account is and what it charges.
 */
const examples: Record<AssetClass, string[]> = {
  usEquity: ['VTI', 'ITOT', 'SCHB'],
  intlEquity: ['VXUS', 'IXUS', 'SCHF'],
  bonds: ['BND', 'AGG', 'SCHZ'],
  realEstate: ['VNQ', 'SCHH', 'XLRE'],
  // Money market funds usually only make sense at their own brokerage.
  cash: ['VMFXX', 'SPAXX', 'SWVXX'],
}

export type FundSuggestion = KnownTicker & { ticker: string }

export function exampleFunds(assetClass: AssetClass): FundSuggestion[] {
  return examples[assetClass].map(ticker => ({ ticker, ...lookupTicker(ticker)! }))
}
