import { assetClassColors, assetClassLabels } from '../domain/assetClasses'
import { formatUsd } from '../domain/format'
import { exampleFunds, type FundSuggestion } from '../domain/suggestions'
import type { AssetClass } from '../domain/types'
import { usePortfolio } from '../state/usePortfolio'
import styles from './FundSuggestions.module.css'

interface Props {
  gaps: { assetClass: AssetClass; amount: number }[]
  /** Live prices are on, so an added fund gets its price without help. */
  livePrices: boolean
}

/**
 * For each asset class the plan wants to buy but nothing is held in,
 * offer a few example funds that can be added in one click.
 */
export function FundSuggestions({ gaps, livePrices }: Props) {
  const { dispatch } = usePortfolio()
  if (gaps.length === 0) return null

  function add(fund: FundSuggestion) {
    dispatch({
      type: 'addHolding',
      holding: {
        ticker: fund.ticker,
        name: fund.name,
        assetClass: fund.assetClass,
        price: fund.fixedPrice ?? 0,
        costBasis: fund.fixedPrice,
      },
    })
    // Without a live price, the plan waits on one, so take the person to it.
    if (!fund.fixedPrice && !livePrices) {
      requestAnimationFrame(() => {
        const input = document.querySelector<HTMLInputElement>(`input[aria-label="Price of ${fund.ticker}"]`)
        input?.scrollIntoView({ block: 'center', behavior: 'smooth' })
        input?.focus({ preventScroll: true })
      })
    }
  }

  return (
    <section className={styles.suggestions} aria-labelledby="suggestions-title">
      <h3 id="suggestions-title">Funds to consider</h3>
      {gaps.map(({ assetClass, amount }) => {
        const label = assetClassLabels[assetClass]
        return (
          <div key={assetClass} className={styles.gap}>
            <p className={styles.gapHead}>
              <span className={styles.swatch} style={{ background: assetClassColors[assetClass] }} aria-hidden="true" />
              <strong>{label}</strong>
              <span className={styles.amount}>{formatUsd(amount)} to invest</span>
            </p>
            <p className={styles.why}>
              Your target includes {label.toLowerCase()}, but nothing in this portfolio holds it. Add a fund and the
              plan will buy it.
            </p>
            <ul className={styles.funds}>
              {exampleFunds(assetClass).map(f => (
                <li key={f.ticker}>
                  <span className={styles.ticker}>{f.ticker}</span>
                  <span className={styles.name}>{f.name}</span>
                  <button type="button" className="button secondary" onClick={() => add(f)} aria-label={`Add ${f.ticker}, ${f.name}`}>
                    Add
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
      <p className={styles.disclaimer}>
        Widely held, low-cost index funds from different fund companies, shown as examples. They aren’t
        recommendations: compare fees and check what your brokerage offers before buying.
      </p>
    </section>
  )
}
