import { createContext, type Dispatch } from 'react'
import type { RebalancePlan } from '../domain/rebalance'
import type { Portfolio } from '../domain/types'
import type { PortfolioAction } from './portfolioReducer'

// Kept in its own file (separate from the provider component) so React's fast
// refresh keeps working: a file that exports a component should export only components.

/** What `usePortfolio()` hands to components. */
export interface PortfolioContextValue {
  portfolio: Portfolio
  /** Recalculated from `portfolio` on every change; never edited directly. */
  plan: RebalancePlan
  dispatch: Dispatch<PortfolioAction>
}

// null outside a provider, so usePortfolio can give a clear error.
export const PortfolioContext = createContext<PortfolioContextValue | null>(null)
