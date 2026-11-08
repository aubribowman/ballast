import { combine } from '../domain/csvImport'
import type { AssetClass, Holding, Portfolio, Settings, Targets } from '../domain/types'
import { samplePortfolio } from './samplePortfolio'

/** Every change the app can make to the portfolio. Components send these through `dispatch`. */
export type PortfolioAction =
  | { type: 'addHolding'; holding?: Partial<Omit<Holding, 'id'>> }
  | { type: 'updateHolding'; id: string; changes: Partial<Omit<Holding, 'id'>> }
  | { type: 'removeHolding'; id: string }
  /** Holdings from an import: replace the list, or add to it (same tickers are combined). */
  | { type: 'importHoldings'; holdings: Omit<Holding, 'id'>[]; mode: 'replace' | 'add' }
  /** Latest prices by ticker, applied to every holding with that ticker. */
  | { type: 'setPrices'; prices: Record<string, number> }
  | { type: 'setTarget'; assetClass: AssetClass; pct: number }
  | { type: 'applyModel'; targets: Targets }
  | { type: 'updateSettings'; changes: Partial<Settings> }
  | { type: 'loadSample' }
  | { type: 'clear' }

// Ids only need to be unique within this browser: time plus a counter.
let nextId = 0
const newId = () => `h${Date.now().toString(36)}${(nextId++).toString(36)}`

// Every update returns a new object instead of changing the old one.
// React compares references to decide what to re-render.
export function portfolioReducer(state: Portfolio, action: PortfolioAction): Portfolio {
  switch (action.type) {
    case 'addHolding':
      return {
        ...state,
        holdings: [
          ...state.holdings,
          { id: newId(), ticker: '', name: '', assetClass: 'usEquity', shares: 0, price: 0, ...action.holding },
        ],
      }
    case 'updateHolding':
      return {
        ...state,
        holdings: state.holdings.map(h => (h.id === action.id ? { ...h, ...action.changes } : h)),
      }
    // Only holdings whose price changed get a new object, so unchanged rows don't re-render.
    case 'setPrices':
      return {
        ...state,
        holdings: state.holdings.map(h => {
          const price = action.prices[h.ticker.toUpperCase()]
          return price && price !== h.price ? { ...h, price } : h
        }),
      }
    case 'importHoldings': {
      const incoming = action.holdings.map(h => ({ ...h, id: newId() }))
      // 'add' merges a fund you already hold into one row, averaging the cost.
      if (action.mode === 'replace') return { ...state, holdings: incoming }
      const holdings = [...state.holdings]
      for (const h of incoming) {
        const i = holdings.findIndex(x => x.ticker && x.ticker === h.ticker)
        if (i === -1) holdings.push(h)
        else holdings[i] = combine(holdings[i], h)
      }
      return { ...state, holdings }
    }
    case 'removeHolding':
      return { ...state, holdings: state.holdings.filter(h => h.id !== action.id) }
    case 'setTarget':
      return { ...state, targets: { ...state.targets, [action.assetClass]: action.pct } }
    case 'applyModel':
      return { ...state, targets: { ...action.targets } }
    case 'updateSettings':
      return { ...state, settings: { ...state.settings, ...action.changes } }
    case 'loadSample':
      return samplePortfolio()
    case 'clear':
      // Keeps settings (method, band, whole shares) so starting over doesn't reset preferences.
      return {
        holdings: [],
        targets: { usEquity: 0, intlEquity: 0, bonds: 0, realEstate: 0, cash: 0 },
        settings: state.settings,
      }
  }
}
