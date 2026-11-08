import { useEffect, useMemo, useReducer, type ReactNode } from 'react'
import { planRebalance } from '../domain/rebalance'
import type { Portfolio } from '../domain/types'
import { PortfolioContext } from './portfolioContext'
import { portfolioReducer } from './portfolioReducer'
import { samplePortfolio } from './samplePortfolio'

// Bump the version if the saved shape changes in a way old data can't load.
const STORAGE_KEY = 'ballast:portfolio:v1'

/** The portfolio saved in this browser, or the sample on a first visit. */
function loadSaved(): Portfolio {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved) as Portfolio
  } catch {
    // Corrupt or blocked storage: fall back to the sample.
  }
  return samplePortfolio()
}

/**
 * Holds the portfolio for the whole app, saves it to localStorage on every
 * change, and works out the rebalancing plan. Tests pass `initial` to start
 * from a known portfolio instead of whatever is saved.
 */
export function PortfolioProvider({ children, initial }: { children: ReactNode; initial?: Portfolio }) {
  // Lazy initializer: reads storage once on mount, not on every render.
  const [portfolio, dispatch] = useReducer(portfolioReducer, initial, init => init ?? loadSaved())

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio))
    } catch {
      // Saving is a convenience; the app works without it.
    }
  }, [portfolio])

  // The plan is derived from the portfolio, not stored next to it, so the
  // two can never disagree. useMemo skips recalculating on unrelated renders.
  const plan = useMemo(
    () => planRebalance(portfolio.holdings, portfolio.targets, portfolio.settings),
    [portfolio],
  )

  // A stable object, so components only re-render when the portfolio changes.
  const value = useMemo(() => ({ portfolio, plan, dispatch }), [portfolio, plan])

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>
}
