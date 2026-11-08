import { HomePage } from './pages/HomePage'
import { RebalancerPage } from './pages/RebalancerPage'
import { hrefFor, useRoute, type Route } from './useRoute'
import styles from './App.module.css'

const nav: { route: Route; label: string }[] = [
  { route: 'home', label: 'Overview' },
  { route: 'rebalancer', label: 'Rebalancer' },
]

export default function App() {
  const route = useRoute()

  return (
    <>
      <header className={styles.masthead}>
        <div className={styles.mastheadInner}>
          <a className={styles.brand} href={hrefFor('home')}>
            <svg className={styles.mark} viewBox="0 0 32 32" aria-hidden="true">
              <rect x="6" y="7" width="20" height="3" fill="var(--gold)" />
              <rect x="6" y="14.5" width="14" height="3" fill="currentColor" />
              <rect x="6" y="22" width="17" height="3" fill="currentColor" opacity="0.6" />
            </svg>
            <span className={styles.wordmark}>Ballast</span>
          </a>
          <nav className={styles.nav} aria-label="Main">
            {nav.map(n => (
              <a key={n.route} href={hrefFor(n.route)} aria-current={route === n.route ? 'page' : undefined}>
                {n.label}
              </a>
            ))}
          </nav>
          {route === 'home' && (
            <a className={styles.cta} href={hrefFor('rebalancer')}>Open rebalancer</a>
          )}
        </div>
      </header>

      {route === 'home' ? <HomePage /> : <RebalancerPage />}

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <p className={styles.disclosure}>Important information</p>
          <p>
            Ballast is a portfolio project. It is not investment advice, and prices are entered by hand.
            Review every trade with your brokerage before placing it. Your portfolio is saved only in this browser.
          </p>
        </div>
      </footer>
    </>
  )
}
