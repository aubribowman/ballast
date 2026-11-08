import { lazy, Suspense } from 'react'
import { DriftChart } from './components/DriftChart'
import { HoldingsTable } from './components/HoldingsTable'
import { SettingsPanel } from './components/SettingsPanel'
import { SummaryStrip } from './components/SummaryStrip'
import { TargetsEditor } from './components/TargetsEditor'
import { TradeList } from './components/TradeList'
import { usePortfolio } from './state/usePortfolio'
import styles from './App.module.css'

// Recharts is the largest dependency, so the chart loads as its own file
// after the rest of the page is usable.
const AllocationBars = lazy(() =>
  import('./components/AllocationBars').then(m => ({ default: m.AllocationBars })),
)

export default function App() {
  const { dispatch } = usePortfolio()

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.brand}>Ballast</p>
          <p className={styles.tagline}>Bring a portfolio back to its target mix.</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className="button quiet" onClick={() => dispatch({ type: 'loadSample' })}>
            Load sample portfolio
          </button>
          <button type="button" className="button quiet" onClick={() => dispatch({ type: 'clear' })}>
            Clear
          </button>
        </div>
      </header>

      <main>
        <SummaryStrip />
        <DriftChart />

        <div className={styles.grid}>
          <div className={styles.main}>
            <TradeList />
          </div>
          <aside className={styles.side}>
            <SettingsPanel />
            <TargetsEditor />
            <Suspense fallback={null}>
              <AllocationBars />
            </Suspense>
          </aside>
        </div>

        <div className={styles.full}>
          <HoldingsTable />
        </div>
      </main>

      <footer className={styles.footer}>
        A portfolio project. Not investment advice, and prices are entered by hand.
      </footer>
    </div>
  )
}
