import { formatSignedPct, formatSignedUsd, formatUsd } from '../domain/format'
import { portfolioGain } from '../domain/gains'
import { usePortfolio } from '../state/usePortfolio'
import styles from './SummaryStrip.module.css'

export function SummaryStrip() {
  const { plan, portfolio } = usePortfolio()
  if (!plan.ok) return null

  const outside = plan.current.filter(c => c.outsideBand).length
  const band = portfolio.settings.bandPct
  const gain = portfolioGain(portfolio.holdings)

  let status: string
  if (outside === 0 && !plan.needsRebalance) status = 'On target'
  else if (outside === 0) status = 'On target, new cash to invest'
  else status = `${outside} ${outside === 1 ? 'class' : 'classes'} off by more than ${band} pts`

  return (
    <dl className={styles.strip}>
      <div>
        <dt>Portfolio value</dt>
        <dd className={styles.big}>{formatUsd(plan.totalValue)}</dd>
      </div>
      <div>
        <dt>Unrealized gain/loss</dt>
        <dd className={styles.gain} data-sign={gain ? Math.sign(Math.round(gain.amount)) : undefined}>
          {gain ? (
            <>
              {formatSignedUsd(gain.amount)} <small>{formatSignedPct(gain.pct)}</small>
            </>
          ) : (
            <span className={styles.muted}>Add average costs</span>
          )}
        </dd>
        {gain && gain.missing > 0 && (
          <p className={styles.footnote}>Leaves out {gain.missing} without a cost</p>
        )}
      </div>
      <div>
        <dt>Status</dt>
        <dd className={styles.status} data-alert={outside > 0 || undefined}>
          <span className={styles.statusDot} aria-hidden="true" />
          {status}
        </dd>
      </div>
      <div>
        <dt>Suggested trades</dt>
        <dd>{plan.trades.length}</dd>
      </div>
      <div>
        <dt>Cash left after trades</dt>
        <dd>{formatUsd(plan.leftoverCash)}</dd>
      </div>
    </dl>
  )
}
