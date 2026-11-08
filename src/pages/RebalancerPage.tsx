import { lazy, Suspense } from 'react'
import { DriftChart } from '../components/DriftChart'
import { HoldingsTable } from '../components/HoldingsTable'
import { SettingsPanel } from '../components/SettingsPanel'
import { SummaryStrip } from '../components/SummaryStrip'
import { TargetsEditor } from '../components/TargetsEditor'
import { TradeList } from '../components/TradeList'
import { useLivePrices } from '../state/useLivePrices'
import { usePortfolio } from '../state/usePortfolio'
import styles from './RebalancerPage.module.css'
import { useBalancedColumns } from './useBalancedColumns'

// Recharts is the largest dependency, so the chart loads as its own file
// after the rest of the page is usable.
const AllocationBars = lazy(() =>
  import('../components/AllocationBars').then(m => ({ default: m.AllocationBars })),
)

export function RebalancerPage() {
  const { dispatch } = usePortfolio()
  const prices = useLivePrices()
  const { status } = prices
  const { gridRef, mainRef, sideRef, movableRef, inSide } = useBalancedColumns('(max-width: 960px)', styles.measuring)

  const mix = (
    <div className={styles.slot} ref={movableRef}>
      <Suspense fallback={null}>
        <AllocationBars />
      </Suspense>
    </div>
  )

  return (
    <div className={styles.page}>
      <div className={styles.titleBar}>
        <div>
          <p className={styles.eyebrow}>Account overview</p>
          <h1 className={styles.title}>Bring your portfolio back to its target mix</h1>
        </div>
        <div className={styles.titleActions}>
          <span className={styles.asOf}>
            <span className={styles.liveDot} data-live={(prices.apiKey && !status.error) || undefined} aria-hidden="true" />
            {!prices.apiKey
              ? 'Prices entered manually'
              : status.loading
                ? 'Updating prices…'
                : status.updatedAt
                  ? `Prices as of ${status.updatedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
                  : 'Live prices on'}
          </span>
          <button type="button" className="button secondary" onClick={() => dispatch({ type: 'loadSample' })}>
            Load sample portfolio
          </button>
          <button type="button" className="button secondary" onClick={() => dispatch({ type: 'clear' })}>
            Clear
          </button>
        </div>
      </div>

      <main>
        <SummaryStrip />

        {/* Drift and trades fill the wide column, the rules the narrow one.
            The mix chart goes in whichever column is shorter, and the last
            panel in each column stretches so both end on the same line. */}
        <div className={styles.grid} ref={gridRef}>
          <div className={styles.main} ref={mainRef}>
            <DriftChart />
            <TradeList livePrices={Boolean(prices.apiKey)} />
            {!inSide && mix}
          </div>
          <aside className={styles.side} ref={sideRef}>
            <SettingsPanel />
            <TargetsEditor />
            {inSide && mix}
          </aside>
        </div>

        <div className={styles.full}>
          <HoldingsTable prices={prices} />
        </div>
      </main>
    </div>
  )
}
