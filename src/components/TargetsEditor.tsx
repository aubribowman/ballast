import { assetClassColors, assetClasses, assetClassLabels, modelPortfolios } from '../domain/assetClasses'
import { formatPct } from '../domain/format'
import { targetsTotal } from '../domain/rebalance'
import { usePortfolio } from '../state/usePortfolio'
import { NumberInput } from './NumberInput'
import { Panel } from './Panel'
import styles from './TargetsEditor.module.css'

export function TargetsEditor() {
  const { portfolio, dispatch } = usePortfolio()
  const { targets } = portfolio
  const total = targetsTotal(targets)
  const balanced = Math.abs(total - 100) <= 0.01
  const activeModel = modelPortfolios.find(m => assetClasses.every(c => m.targets[c] === targets[c]))

  return (
    <Panel title="Target mix" id="targets-title">
      <div className={styles.models} role="group" aria-label="Start from a model portfolio">
        {modelPortfolios.map(m => (
          <button
            key={m.name}
            type="button"
            aria-pressed={activeModel?.name === m.name}
            title={m.description}
            onClick={() => dispatch({ type: 'applyModel', targets: m.targets })}
          >
            {m.name}
          </button>
        ))}
      </div>

      <ul className={styles.list}>
        {assetClasses.map(c => (
          <li key={c}>
            <label htmlFor={`target-${c}`}>
              <span className={styles.swatch} style={{ background: assetClassColors[c] }} />
              {assetClassLabels[c]}
            </label>
            <div className={styles.pct}>
              <NumberInput
                id={`target-${c}`}
                value={targets[c]}
                placeholder="0"
                onValueChange={pct => dispatch({ type: 'setTarget', assetClass: c, pct: Math.min(100, pct) })}
              />
              <span aria-hidden="true">%</span>
            </div>
          </li>
        ))}
      </ul>

      <p className={styles.total} data-off={!balanced || undefined} aria-live="polite">
        <span>Total</span>
        <span>{formatPct(total, total % 1 === 0 ? 0 : 1)}</span>
      </p>
      {!balanced && (
        <p className={styles.hint}>
          {total > 100 ? `Remove ${formatPct(total - 100)}` : `Add ${formatPct(100 - total)}`} to reach 100%.
        </p>
      )}
    </Panel>
  )
}
