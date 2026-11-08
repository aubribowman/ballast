import { useContext } from 'react'
import { PortfolioContext } from './portfolioContext'

/**
 * The one way components read and change the portfolio.
 * Returns `{ portfolio, plan, dispatch }`; send changes with `dispatch(action)`,
 * using the actions listed in `portfolioReducer.ts`.
 */
export function usePortfolio() {
  const ctx = useContext(PortfolioContext)
  if (!ctx) throw new Error('usePortfolio must be used inside <PortfolioProvider>')
  return ctx
}
