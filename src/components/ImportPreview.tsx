import { assetClassLabels } from '../domain/assetClasses'
import type { ImportResult } from '../domain/csvImport'
import { formatUsd, formatUsdCents } from '../domain/format'
import styles from './ImportPreview.module.css'

interface Props {
  fileName: string
  result: ImportResult
  hasHoldings: boolean
  onConfirm: (mode: 'replace' | 'add') => void
  onCancel: () => void
}

/** Shows what an imported file contains before it changes the portfolio. */
export function ImportPreview({ fileName, result, hasHoldings, onConfirm, onCancel }: Props) {
  const { holdings, skipped, error } = result
  const guessed = holdings.filter(h => h.classGuessed).length
  const noCost = holdings.filter(h => !h.costBasis).length
  const noPrice = holdings.filter(h => !(h.price > 0)).length

  return (
    <section className={styles.preview} aria-labelledby="import-title" data-error={error ? true : undefined}>
      <div className={styles.head}>
        <h3 id="import-title">
          {error ? `Couldn’t import ${fileName}` : `${holdings.length} ${holdings.length === 1 ? 'holding' : 'holdings'} found in ${fileName}`}
        </h3>
        <button type="button" className={styles.close} onClick={onCancel} aria-label="Cancel import">
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {error ? (
        <p className={styles.message}>{error} Download the template below to see the expected layout.</p>
      ) : (
        <>
          <div className={styles.tableWrap}>
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
                </tr>
              </thead>
              <tbody>
                {holdings.map(h => (
                  <tr key={h.ticker}>
                    <td className={styles.ticker}>{h.ticker}</td>
                    <td className={styles.name}>{h.name || '—'}</td>
                    <td>
                      {assetClassLabels[h.assetClass]}
                      {h.classGuessed && <span className={styles.flag} title="Guessed from the name">check</span>}
                    </td>
                    <td className={styles.num}>{h.shares.toLocaleString('en-US', { maximumFractionDigits: 4 })}</td>
                    <td className={styles.num}>{h.costBasis ? formatUsdCents(h.costBasis) : '—'}</td>
                    <td className={styles.num}>{h.price > 0 ? formatUsdCents(h.price) : '—'}</td>
                    <td className={styles.num}>{h.price > 0 ? formatUsd(h.shares * h.price) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className={styles.notes}>
            {guessed > 0 && (
              <li>Asset class marked <em>check</em> was guessed from the fund name. You can change it after importing.</li>
            )}
            {noCost > 0 && <li>{noCost} with no average cost. Gains for {noCost === 1 ? 'it' : 'them'} won’t be shown until you add one.</li>}
            {noPrice > 0 && <li>{noPrice} with no price. Live prices will fill {noPrice === 1 ? 'it' : 'them'} in if they’re on, or enter {noPrice === 1 ? 'it' : 'them'} by hand.</li>}
            {skipped > 0 && <li>{skipped} {skipped === 1 ? 'row' : 'rows'} skipped, such as totals or pending activity.</li>}
          </ul>

          <div className={styles.actions}>
            <button type="button" className="button" onClick={() => onConfirm('replace')}>
              {hasHoldings ? 'Replace current holdings' : 'Import holdings'}
            </button>
            {hasHoldings && (
              <button type="button" className="button secondary" onClick={() => onConfirm('add')}>
                Add to current holdings
              </button>
            )}
            <button type="button" className="button secondary" onClick={onCancel}>Cancel</button>
          </div>
        </>
      )}
    </section>
  )
}
