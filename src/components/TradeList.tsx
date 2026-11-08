import { useState } from 'react'
import { assetClassColors } from '../domain/assetClasses'
import { tradesToCsv } from '../domain/csv'
import { formatShares, formatSignedUsd, formatUsd, formatUsdCents } from '../domain/format'
import { realizedOnSale } from '../domain/gains'
import { usePortfolio } from '../state/usePortfolio'
import { downloadText } from './download'
import { FundSuggestions } from './FundSuggestions'
import { Panel } from './Panel'
import styles from './TradeList.module.css'

export function TradeList({ livePrices = false }: { livePrices?: boolean }) {
  const { plan, portfolio } = usePortfolio()
  const [exporting, setExporting] = useState(false)

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
  const holdingFor = (id: string) => portfolio.holdings.find(h => h.id === id)
  const realized = new Map(
    sells.map(t => {
      const h = holdingFor(t.holdingId)
      return [t.holdingId, h ? realizedOnSale(h, t.shares) : undefined] as const
    }),
  )
  const knownGains = [...realized.values()].filter((g): g is number => g !== undefined)
  const realizedTotal = knownGains.reduce((s, g) => s + g, 0)
  const unknownCosts = realized.size - knownGains.length
  const showGains = sells.length > 0
  const bought = buys.reduce((s, t) => s + t.amount, 0)

  return (
    <Panel
      title="Suggested trades"
      id="trades-title"
      actions={
        plan.trades.length > 0 && (
          <>
            <button
              type="button"
              className="button secondary"
              disabled={exporting}
              onClick={async () => {
                setExporting(true)
                try {
                  // Loaded on demand: the spreadsheet library is large.
                  const { downloadPlanWorkbook } = await import('../export/planWorkbook')
                  await downloadPlanWorkbook({ plan, portfolio })
                } finally {
                  setExporting(false)
                }
              }}
            >
              {exporting ? 'Preparing…' : 'Export to Excel'}
            </button>
            <button
              type="button"
              className={styles.csv}
              onClick={() => downloadText(tradesToCsv(plan.trades), `rebalance-trades-${new Date().toISOString().slice(0, 10)}.csv`)}
            >
              CSV
            </button>
          </>
        )
      }
    >
      {!plan.needsRebalance ? (
        <p className={styles.message}>
          Every asset class is within ±{portfolio.settings.bandPct} pts of its target. No trades needed.
        </p>
      ) : plan.trades.length === 0 && plan.unfilled.length > 0 ? (
        <p className={styles.message}>Nothing you already hold needs to change. Add a fund below to fill the gap.</p>
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
                {showGains && <th scope="col" className={styles.num}>Est. gain</th>}
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
                  {showGains && (
                    <GainCell action={t.action} gain={realized.get(t.holdingId)} />
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          <dl className={styles.totals}>
            {sells.length > 0 && (
              <div><dt>Raised from sales</dt><dd>{formatUsd(sold)}</dd></div>
            )}
            {sells.length > 0 && (
              <div>
                <dt>Estimated realized gain{unknownCosts > 0 ? ` (${unknownCosts} without a cost)` : ''}</dt>
                <dd className={styles.gainTotal} data-sign={Math.sign(Math.round(realizedTotal))}>
                  {knownGains.length ? formatSignedUsd(realizedTotal) : '—'}
                </dd>
              </div>
            )}
            <div><dt>Spent on purchases</dt><dd>{formatUsd(bought)}</dd></div>
            <div><dt>Cash left over</dt><dd>{formatUsd(plan.leftoverCash)}</dd></div>
          </dl>
        </>
      )}

      {portfolio.settings.mode === 'full' && realizedTotal >= 1 && (
        <p className={styles.tax} role="status">
          These sales would realize about {formatUsd(realizedTotal)} in gains, which may be taxable in a taxable
          account. <strong>Invest new cash only</strong> rebalances without selling. Estimates use your average cost;
          your brokerage’s tax lots may differ.
        </p>
      )}

      <FundSuggestions gaps={plan.unfilled} livePrices={livePrices} />

      {plan.warnings.map(w => (
        <p key={w} className={styles.warning} role="status">{w}</p>
      ))}
    </Panel>
  )
}

function GainCell({ action, gain }: { action: string; gain: number | undefined }) {
  if (action !== 'Sell') return <td className={`${styles.num} ${styles.muted}`}>—</td>
  if (gain === undefined) return <td className={`${styles.num} ${styles.muted}`} title="Add an average cost to estimate">No cost</td>
  return (
    <td className={`${styles.num} ${styles.gainCell}`} data-sign={Math.sign(Math.round(gain))}>
      {formatSignedUsd(gain)}
    </td>
  )
}
