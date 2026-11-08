import { assetClasses, assetClassLabels } from '../domain/assetClasses'
import { formatUsd } from '../domain/format'
import { holdingValue } from '../domain/rebalance'
import type { AssetClass, Holding } from '../domain/types'
import { usePortfolio } from '../state/usePortfolio'
import { NumberInput } from './NumberInput'
import { Panel } from './Panel'
import styles from './HoldingsTable.module.css'

type HoldingChanges = Partial<Omit<Holding, 'id'>>

export function HoldingsTable() {
  const { portfolio, dispatch } = usePortfolio()
  const { holdings } = portfolio

  return (
    <Panel
      title="Holdings"
      id="holdings-title"
      actions={
        <button type="button" className="button" onClick={() => dispatch({ type: 'addHolding' })}>
          Add holding
        </button>
      }
    >
      {holdings.length === 0 ? (
        <p className={styles.empty}>Add the funds or stocks in this portfolio to see how it compares to its targets.</p>
      ) : (
        <div className={styles.wrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Ticker</th>
                <th scope="col">Name</th>
                <th scope="col">Asset class</th>
                <th scope="col" className={styles.num}>Shares</th>
                <th scope="col" className={styles.num}>Price</th>
                <th scope="col" className={styles.num}>Value</th>
                <th scope="col"><span className="visually-hidden">Remove</span></th>
              </tr>
            </thead>
            <tbody>
              {holdings.map(h => {
                const update = (changes: HoldingChanges) => dispatch({ type: 'updateHolding', id: h.id, changes })
                const label = h.ticker || 'new holding'
                return (
                  <tr key={h.id}>
                    <td>
                      <input
                        className={styles.ticker}
                        value={h.ticker}
                        aria-label="Ticker"
                        placeholder="VTI"
                        onChange={e => update({ ticker: e.target.value.toUpperCase().slice(0, 8) })}
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
                      <NumberInput value={h.price} aria-label={`Price of ${label}`} placeholder="0.00"
                        aria-invalid={!(h.price > 0) || undefined}
                        onValueChange={price => update({ price })} />
                    </td>
                    <td className={`${styles.num} ${styles.value}`}>{formatUsd(holdingValue(h))}</td>
                    <td>
                      <button type="button" className={styles.remove} aria-label={`Remove ${label}`}
                        onClick={() => dispatch({ type: 'removeHolding', id: h.id })}>
                        Remove
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className={styles.note}>Prices don’t update on their own. Enter current prices before placing trades.</p>
    </Panel>
  )
}
