import { createContext, type Dispatch } from 'react'
import type { RebalancePlan } from '../domain/rebalance'
import type { Portfolio } from '../domain/types'
import type { PortfolioAction } from './portfolioReducer'

export interface PortfolioContextValue {
  portfolio: Portfolio
  plan: RebalancePlan
  dispatch: Dispatch<PortfolioAction>
}

export const PortfolioContext = createContext<PortfolioContextValue | null>(null)
