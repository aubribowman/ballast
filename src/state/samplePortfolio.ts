import { modelPortfolios } from '../domain/assetClasses'
import type { Portfolio } from '../domain/types'

// Prices and costs are illustrative, not live quotes.
export function samplePortfolio(): Portfolio {
  return {
    holdings: [
      { id: 'h1', ticker: 'VTI', name: 'Total US stock market ETF', assetClass: 'usEquity', shares: 120, price: 286.4, costBasis: 214.6 },
      { id: 'h2', ticker: 'VXUS', name: 'Total international stock ETF', assetClass: 'intlEquity', shares: 150, price: 64.1, costBasis: 56.3 },
      { id: 'h3', ticker: 'BND', name: 'Total bond market ETF', assetClass: 'bonds', shares: 400, price: 72.85, costBasis: 76.2 },
      { id: 'h4', ticker: 'VNQ', name: 'Real estate ETF', assetClass: 'realEstate', shares: 40, price: 88.2, costBasis: 81.5 },
      { id: 'h5', ticker: 'VMFXX', name: 'Money market fund', assetClass: 'cash', shares: 6000, price: 1, costBasis: 1 },
    ],
    targets: { ...modelPortfolios.find(m => m.name === 'Growth')!.targets },
    settings: { cashToInvest: 0, mode: 'full', bandPct: 3, wholeShares: true },
  }
}
