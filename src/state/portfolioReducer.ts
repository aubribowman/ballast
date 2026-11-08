import type { AssetClass, Holding, Portfolio, Settings, Targets } from '../domain/types'
import { samplePortfolio } from './samplePortfolio'

export type PortfolioAction =
  | { type: 'addHolding' }
  | { type: 'updateHolding'; id: string; changes: Partial<Omit<Holding, 'id'>> }
  | { type: 'removeHolding'; id: string }
  | { type: 'setTarget'; assetClass: AssetClass; pct: number }
  | { type: 'applyModel'; targets: Targets }
  | { type: 'updateSettings'; changes: Partial<Settings> }
  | { type: 'loadSample' }
  | { type: 'clear' }

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
          { id: newId(), ticker: '', name: '', assetClass: 'usEquity', shares: 0, price: 0 },
        ],
      }
    case 'updateHolding':
      return {
        ...state,
        holdings: state.holdings.map(h => (h.id === action.id ? { ...h, ...action.changes } : h)),
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
      return {
        holdings: [],
        targets: { usEquity: 0, intlEquity: 0, bonds: 0, realEstate: 0, cash: 0 },
        settings: state.settings,
      }
  }
}
