import { assetClassColors } from '../domain/assetClasses'
import { tradesToCsv } from '../domain/csv'
import { formatShares, formatUsd, formatUsdCents } from '../domain/format'
import { usePortfolio } from '../state/usePortfolio'
import { Panel } from './Panel'
import styles from './TradeList.module.css'

function downloadCsv(csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `rebalance-trades-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function TradeList() {
  const { plan, portfolio } = usePortfolio()

  if (!plan.ok) {
    return (
      <Panel title="Suggested trades" id="trades-title">
        <p className={styles.message}>Trades will appear once the problem above is fixed.</p>
      </Panel>
    )
  }

  const sells = plan.trades.filter(t => t.action === 'Sell')
  const buys = plan.trades.filter(t => t.action === 'Buy')
  const sold = sells.reduce((s, t) => s + t.amount, 0)
  const bought = buys.reduce((s, t) => s + t.amount, 0)

  return (
    <Panel
      title="Suggested trades"
      id="trades-title"
      actions={
        plan.trades.length > 0 && (
          <button type="button" className="button secondary" onClick={() => downloadCsv(tradesToCsv(plan.trades))}>
            Export CSV
          </button>
        )
      }
    >
      {!plan.needsRebalance ? (
        <p className={styles.message}>
          Every asset class is within ±{portfolio.settings.bandPct} pts of its target. No trades needed.
        </p>
      ) : plan.trades.length === 0 ? (
        <p className={styles.message}>No trades are large enough to place. Each would be under $1.</p>
      ) : (
        <>
          {/* Sells first: they raise the cash the buys spend. */}
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Action</th>
                <th scope="col">Ticker</th>
                <th scope="col" className={styles.num}>Shares</th>
                <th scope="col" className={styles.num}>Est. amount</th>
              </tr>
            </thead>
            <tbody>
              {[...sells, ...buys].map(t => (
                <tr key={t.holdingId}>
                  <td>
                    <span className={styles.action} data-action={t.action}>{t.action}</span>
                  </td>
                  <td>
                    <span className={styles.swatch} style={{ background: assetClassColors[t.assetClass] }} />
                    {t.ticker}
                  </td>
                  <td className={styles.num}>{formatShares(t.shares)}</td>
                  <td className={styles.num}>{formatUsdCents(t.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <dl className={styles.totals}>
            {sells.length > 0 && (
              <div><dt>Raised from sales</dt><dd>{formatUsd(sold)}</dd></div>
            )}
            <div><dt>Spent on purchases</dt><dd>{formatUsd(bought)}</dd></div>
            <div><dt>Cash left over</dt><dd>{formatUsd(plan.leftoverCash)}</dd></div>
          </dl>
        </>
      )}

      {plan.warnings.map(w => (
        <p key={w} className={styles.warning} role="status">{w}</p>
      ))}
    </Panel>
  )
}
