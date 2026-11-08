import type { AssetClass, Targets } from './types'

// The order here is the order asset classes appear everywhere in the UI.
export const assetClasses: AssetClass[] = ['usEquity', 'intlEquity', 'bonds', 'realEstate', 'cash']

export const assetClassLabels: Record<AssetClass, string> = {
  usEquity: 'US stocks',
  intlEquity: 'International stocks',
  bonds: 'Bonds',
  realEstate: 'Real estate',
  cash: 'Cash',
}

/** CSS custom properties defined in index.css, so colors follow light/dark mode. */
export const assetClassColors: Record<AssetClass, string> = {
  usEquity: 'var(--class-us)',
  intlEquity: 'var(--class-intl)',
  bonds: 'var(--class-bonds)',
  realEstate: 'var(--class-re)',
  cash: 'var(--class-cash)',
}

export interface ModelPortfolio {
  name: string
  description: string
  targets: Targets
}

// Preset target mixes offered in the Targets panel. Each must add up to 100.
export const modelPortfolios: ModelPortfolio[] = [
  {
    name: 'Conservative',
    description: 'Mostly bonds and cash',
    targets: { usEquity: 20, intlEquity: 10, bonds: 55, realEstate: 5, cash: 10 },
  },
  {
    name: 'Moderate',
    description: 'Even split of stocks and bonds',
    targets: { usEquity: 35, intlEquity: 15, bonds: 40, realEstate: 5, cash: 5 },
  },
  {
    name: 'Growth',
    description: 'Stock-heavy with some bonds',
    targets: { usEquity: 50, intlEquity: 25, bonds: 17, realEstate: 5, cash: 3 },
  },
  {
    name: 'Aggressive',
    description: 'Nearly all stocks',
    targets: { usEquity: 60, intlEquity: 30, bonds: 5, realEstate: 5, cash: 0 },
  },
]
