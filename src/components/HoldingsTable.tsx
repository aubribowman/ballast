import { useRef, useState } from 'react'
import { assetClasses, assetClassLabels } from '../domain/assetClasses'
import { importHoldingsCsv, IMPORT_TEMPLATE, type ImportResult } from '../domain/csvImport'
import { formatSignedPct, formatSignedUsd, formatUsd } from '../domain/format'
import { portfolioGain, unrealizedGain } from '../domain/gains'
import { holdingValue } from '../domain/rebalance'
import { knownTickers, tickerChanges } from '../domain/tickers'
import type { AssetClass, Holding } from '../domain/types'
import type { LivePrices } from '../state/useLivePrices'
import { usePortfolio } from '../state/usePortfolio'
import { NumberInput } from './NumberInput'
import { downloadText } from './download'
import { ImportPreview } from './ImportPreview'
import { Panel } from './Panel'
import { PriceSource } from './PriceSource'
import styles from './HoldingsTable.module.css'

type HoldingChanges = Partial<Omit<Holding, 'id'>>

/**
 * The editable list of holdings. Every edit is sent straight to the shared
 * portfolio, so the plan and charts update as you type.
 *
 * Also hosts CSV import (file picker → ImportPreview → importHoldings action)
 * and the live price controls, which RebalancerPage passes in as `prices`.
 */
export function HoldingsTable({ prices }: { prices: LivePrices }) {
  const { portfolio, dispatch } = usePortfolio()
  const { holdings } = portfolio
  const fileInput = useRef<HTMLInputElement>(null)
  // A parsed import waiting for the person to confirm it in ImportPreview.
  const [pending, setPending] = useState<{ fileName: string; result: ImportResult } | null>(null)
  const total = holdings.reduce((sum, h) => sum + holdingValue(h), 0)
  const gain = portfolioGain(holdings)

  async function readFile(file: File) {
    const text = await file.text()
    setPending({ fileName: file.name, result: importHoldingsCsv(text) })
  }

  function confirmImport(mode: 'replace' | 'add') {
    if (!pending) return
    // Drop import-only fields (like classGuessed) before saving.
    const imported = pending.result.holdings.map(h => ({
      ticker: h.ticker, name: h.name, assetClass: h.assetClass, shares: h.shares, price: h.price, costBasis: h.costBasis,
    }))
    dispatch({ type: 'importHoldings', holdings: imported, mode })
    setPending(null)
  }

  return (
    <Panel
      title="Holdings"
      id="holdings-title"
      actions={
        <>
          {prices.apiKey && prices.hasTickers && (
            <button type="button" className="button secondary" disabled={prices.status.loading} onClick={prices.refresh}>
              {prices.status.loading ? 'Updating…' : 'Update prices'}
            </button>
          )}
          <button type="button" className="button secondary" onClick={() => fileInput.current?.click()}>
            Import CSV
          </button>
          <button type="button" className="button" onClick={() => dispatch({ type: 'addHolding' })}>
            Add holding
          </button>
        </>
      }
    >
      {/* Hidden file picker, opened by the "Import CSV" button. */}
      <input
        ref={fileInput}
        type="file"
        accept=".csv,text/csv"
        className="visually-hidden"
        tabIndex={-1}
        aria-label="Choose a CSV file to import"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) void readFile(file)
          e.target.value = '' // so choosing the same file again still triggers onChange
        }}
      />

      {pending && (
        <ImportPreview
          fileName={pending.fileName}
          result={pending.result}
          hasHoldings={holdings.length > 0}
          onConfirm={confirmImport}
          onCancel={() => setPending(null)}
        />
      )}

      {holdings.length === 0 ? (
        <p className={styles.empty}>
          Add the funds or stocks in this portfolio, or import the positions file from your brokerage, to see how it
          compares to its targets.
        </p>
      ) : (
        <div className={styles.wrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Ticker</th>
                <th scope="col">Name</th>
                <th scope="col">Asset class</th>
                <th scope="col" className={styles.num}>Shares</th>
                <th scope="col" className={styles.num}>Avg. cost</th>
                <th scope="col" className={styles.num}>Price</th>
                <th scope="col" className={styles.num}>Value</th>
                <th scope="col" className={styles.num}>Gain/loss</th>
                <th scope="col"><span className="visually-hidden">Remove</span></th>
              </tr>
            </thead>
            <tbody>
              {holdings.map(h => {
                const update = (changes: HoldingChanges) => dispatch({ type: 'updateHolding', id: h.id, changes })
                const label = h.ticker || 'new holding'
                const g = unrealizedGain(h)
                return (
                  <tr key={h.id}>
                    <td>
                      <input
                        className={styles.ticker}
                        value={h.ticker}
                        aria-label="Ticker"
                        placeholder="VTI"
                        list="ticker-directory"
                        autoComplete="off"
                        // tickerChanges also fills in the name and asset class for known tickers.
                        onChange={e => update(tickerChanges(h, e.target.value.toUpperCase().slice(0, 8)))}
                      />
                    </td>
                    <td>
                      <input value={h.name} aria-label={`Name of ${label}`} placeholder="Fund name"
                        onChange={e => update({ name: e.target.value })} />
                    </td>
                    <td>
                      <select value={h.assetClass} aria-label={`Asset class of ${label}`}
                        onChange={e => update({ assetClass: e.target.value as AssetClass })}>
                        {assetClasses.map(c => (
                          <option key={c} value={c}>{assetClassLabels[c]}</option>
                        ))}
                      </select>
                    </td>
                    <td className={styles.num}>
                      <NumberInput value={h.shares} aria-label={`Shares of ${label}`} placeholder="0"
                        onValueChange={shares => update({ shares })} />
                    </td>
                    <td className={styles.num}>
                      <NumberInput value={h.costBasis ?? 0} aria-label={`Average cost of ${label}`} placeholder="—"
                        onValueChange={costBasis => update({ costBasis })} />
                    </td>
                    <td className={styles.num}>
                      <NumberInput value={h.price} aria-label={`Price of ${label}`} placeholder="0.00"
                        aria-invalid={!(h.price > 0) || undefined}
                        onValueChange={price => update({ price })} />
                    </td>
                    <td className={`${styles.num} ${styles.value}`}>{formatUsd(holdingValue(h))}</td>
                    <td className={`${styles.num} ${styles.gain}`} data-sign={g ? Math.sign(Math.round(g.amount)) : undefined}>
                      {g ? (
                        <>
                          <span>{formatSignedUsd(g.amount)}</span>
                          <small>{formatSignedPct(g.pct)}</small>
                        </>
                      ) : (
                        <span className={styles.unknown} title="Enter an average cost to see the gain or loss">—</span>
                      )}
                    </td>
                    <td>
                      <button type="button" className={styles.remove} aria-label={`Remove ${label}`}
                        onClick={() => dispatch({ type: 'removeHolding', id: h.id })}>
                        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" colSpan={6}>Total</th>
                <td className={`${styles.num} ${styles.value}`}>{formatUsd(total)}</td>
                <td className={`${styles.num} ${styles.gain}`} data-sign={gain ? Math.sign(Math.round(gain.amount)) : undefined}>
                  {gain ? (
                    <>
                      <span>{formatSignedUsd(gain.amount)}</span>
                      <small>{formatSignedPct(gain.pct)}</small>
                    </>
                  ) : (
                    <span className={styles.unknown}>—</span>
                  )}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      {/* Autocomplete suggestions for the ticker fields. */}
      <datalist id="ticker-directory">
        {knownTickers.map(t => (
          <option key={t.ticker} value={t.ticker}>{t.name}</option>
        ))}
      </datalist>
      <p className={styles.note}>
        Import the positions CSV from your brokerage, or{' '}
        <button type="button" className={styles.link} onClick={() => downloadText(IMPORT_TEMPLATE, 'ballast-holdings-template.csv')}>
          download a template
        </button>
        . Average cost is per share. Common fund and stock tickers fill in their name and asset class.
        {!prices.apiKey && ' Prices don’t update on their own, so enter current prices before placing trades.'}
      </p>
      <PriceSource prices={prices} />
    </Panel>
  )
}
