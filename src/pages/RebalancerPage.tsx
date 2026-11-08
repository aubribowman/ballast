import { lazy, Suspense } from 'react'
import { DriftChart } from '../components/DriftChart'
import { HoldingsTable } from '../components/HoldingsTable'
import { SettingsPanel } from '../components/SettingsPanel'
import { SummaryStrip } from '../components/SummaryStrip'
import { TargetsEditor } from '../components/TargetsEditor'
import { TradeList } from '../components/TradeList'
import { usePortfolio } from '../state/usePortfolio'
import styles from './RebalancerPage.module.css'

// Recharts is the largest dependency, so the chart loads as its own file
// after the rest of the page is usable.
const AllocationBars = lazy(() =>
  import('../components/AllocationBars').then(m => ({ default: m.AllocationBars })),
)

export function RebalancerPage() {
  const { dispatch } = usePortfolio()

  return (
    <div className={styles.page}>
      <div className={styles.titleBar}>
        <div>
          <p className={styles.eyebrow}>Account overview</p>
          <h1 className={styles.title}>Bring your portfolio back to its target mix</h1>
        </div>
        <div className={styles.titleActions}>
          <span className={styles.asOf}>
            <span className={styles.liveDot} aria-hidden="true" />
            Prices entered manually
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
        <DriftChart />

        {/* Trades and holdings share the wide column so it fills alongside the sidebar. */}
        <div className={styles.grid}>
          <div className={styles.main}>
            <TradeList />
            <Suspense fallback={null}>
              <AllocationBars />
            </Suspense>
            <HoldingsTable />
          </div>
          <aside className={styles.side}>
            <SettingsPanel />
            <TargetsEditor />
          </aside>
        </div>
      </main>
    </div>
  )
}
