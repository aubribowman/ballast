import { assetClassColors, assetClassLabels } from '../domain/assetClasses'
import { formatDrift, formatPct } from '../domain/format'
import { usePortfolio } from '../state/usePortfolio'
import styles from './DriftChart.module.css'

/**
 * One row per asset class. The center line is the target, the shaded
 * area is the tolerance band, the dot is where the class sits now and
 * the ring is where the suggested trades would leave it.
 */
export function DriftChart() {
  const { plan, portfolio } = usePortfolio()
  if (!plan.ok) return <p className={styles.blocked}>{plan.error}</p>

  const band = portfolio.settings.bandPct
  const largest = Math.max(...plan.current.map(c => Math.abs(c.driftPct)), band)
  const range = Math.max(10, Math.ceil(largest + 2))
  const position = (drift: number) => `${50 + (Math.max(-range, Math.min(range, drift)) / range) * 50}%`
  const showAfter = plan.trades.length > 0

  return (
    <section className={styles.drift} aria-labelledby="drift-title">
      <div className={styles.heading}>
        <h2 id="drift-title">Drift from target</h2>
        <p>
          Shaded area is your ±{band} pt tolerance.{' '}
          {showAfter && (
            <>
              <span className={styles.keyDot} aria-hidden="true" /> now,{' '}
              <span className={styles.keyRing} aria-hidden="true" /> after suggested trades.
            </>
          )}
        </p>
      </div>

      <div className={styles.axis} aria-hidden="true">
        <span>Underweight</span>
        <span>Target</span>
        <span>Overweight</span>
      </div>

      <ol className={styles.rows}>
        {plan.current.map((c, i) => {
          const after = plan.projected[i]
          return (
            <li key={c.assetClass} className={styles.row} data-off={c.outsideBand || undefined}>
              <div className={styles.label}>
                <span className={styles.swatch} style={{ background: assetClassColors[c.assetClass] }} />
                <span>{assetClassLabels[c.assetClass]}</span>
              </div>
              <div className={styles.numbers}>
                {formatPct(c.pct)} <span className={styles.of}>of {formatPct(c.targetPct, 0)}</span>
              </div>
              <div
                className={styles.track}
                role="img"
                aria-label={`${assetClassLabels[c.assetClass]}: ${formatDrift(c.driftPct)} from target${
                  showAfter ? `, ${formatDrift(after.driftPct)} after trades` : ''
                }`}
              >
                <div
                  className={styles.band}
                  style={{ left: position(-band), right: `calc(100% - ${position(band)})` }}
                />
                <div className={styles.center} />
                {showAfter && <div className={styles.ring} style={{ left: position(after.driftPct) }} />}
                <div className={styles.dot} style={{ left: position(c.driftPct) }} />
              </div>
              <div className={styles.value}>{formatDrift(c.driftPct)}</div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
