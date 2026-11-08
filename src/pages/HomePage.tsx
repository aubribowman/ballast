import { assetClassColors, assetClasses, assetClassLabels, modelPortfolios } from '../domain/assetClasses'
import { formatDrift, formatPct, formatUsd } from '../domain/format'
import { planRebalance } from '../domain/rebalance'
import type { Targets } from '../domain/types'
import { samplePortfolio } from '../state/samplePortfolio'
import { usePortfolio } from '../state/usePortfolio'
import { hrefFor, navigate } from '../useRoute'
import styles from './HomePage.module.css'

const steps = [
  { title: 'Enter your holdings', body: 'Add each fund or stock with its share count and current price.' },
  { title: 'Set a target mix', body: 'Start from a model portfolio or choose your own percentages.' },
  { title: 'Review the trades', body: 'See what to buy and sell, then export the list as a CSV.' },
]

const features = [
  { title: 'Drift at a glance', body: 'Every asset class is plotted against its target, with your tolerance band shaded, so it’s clear what needs attention.' },
  { title: 'Two ways to rebalance', body: 'Buy and sell to hit target exactly, or put new cash into what’s underweight and sell nothing, so no gains are realized.' },
  { title: 'A tolerance band', body: 'Classes close to target are left alone. That avoids a stream of small trades that don’t change much.' },
  { title: 'Plans you can place', body: 'Whole or fractional shares. Buys round down and sells round up, so a plan never spends more cash than it has.' },
]

function MixBar({ targets, label }: { targets: Targets; label: string }) {
  return (
    <div className={styles.mixBar} role="img" aria-label={label}>
      {assetClasses.map(c => targets[c] > 0 && (
        <span key={c} style={{ flexGrow: targets[c], background: assetClassColors[c] }} />
      ))}
    </div>
  )
}

export function HomePage() {
  const { plan: ownPlan, portfolio, dispatch } = usePortfolio()

  // Preview the person's own portfolio when there is one, otherwise the sample.
  const hasOwn = ownPlan.ok && ownPlan.totalValue > 0
  const sample = samplePortfolio()
  const plan = hasOwn ? ownPlan : planRebalance(sample.holdings, sample.targets, sample.settings)
  const band = hasOwn ? portfolio.settings.bandPct : sample.settings.bandPct

  const openWithSample = () => {
    dispatch({ type: 'loadSample' })
    navigate('rebalancer')
  }

  const startFromModel = (targets: Targets) => {
    dispatch({ type: 'applyModel', targets })
    navigate('rebalancer')
  }

  return (
    <main>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Portfolio rebalancing</p>
            <h1>Keep your portfolio on course.</h1>
            <p className={styles.lede}>
              Markets move and a portfolio drifts away from the mix you chose. Ballast shows how far each part
              has moved and lists the trades that bring it back.
            </p>
            <div className={styles.heroActions}>
              <a className={styles.primary} href={hrefFor('rebalancer')}>Open the rebalancer</a>
              <button type="button" className={styles.ghost} onClick={openWithSample}>Try a sample portfolio</button>
            </div>
            <p className={styles.heroNote}>No account needed. Your data stays in this browser.</p>
          </div>

          {plan.ok && (
            <a className={styles.preview} href={hrefFor('rebalancer')} aria-label="Open the rebalancer">
              <div className={styles.previewHead}>
                <span>{hasOwn ? 'Your portfolio' : 'Sample portfolio'}</span>
                <span className={styles.previewTag}>±{band} pt band</span>
              </div>
              <p className={styles.previewValue}>{formatUsd(plan.totalValue)}</p>

              <div className={styles.previewBars}>
                <span>Now</span>
                <MixBar label="Current mix" targets={Object.fromEntries(plan.current.map(c => [c.assetClass, c.pct])) as Targets} />
                <span>Target</span>
                <MixBar label="Target mix" targets={Object.fromEntries(plan.current.map(c => [c.assetClass, c.targetPct])) as Targets} />
              </div>

              <ul className={styles.previewList}>
                {plan.current.map(c => (
                  <li key={c.assetClass} data-off={c.outsideBand || undefined}>
                    <span>
                      <i style={{ background: assetClassColors[c.assetClass] }} />
                      {assetClassLabels[c.assetClass]}
                    </span>
                    <span>{formatPct(c.pct)}</span>
                    <span>{formatDrift(c.driftPct)}</span>
                  </li>
                ))}
              </ul>

              <p className={styles.previewFoot}>
                {plan.trades.length === 0
                  ? 'On target. No trades needed.'
                  : `${plan.trades.length} suggested ${plan.trades.length === 1 ? 'trade' : 'trades'}`}
                <span aria-hidden="true">→</span>
              </p>
            </a>
          )}
        </div>
      </section>

      <div className={styles.content}>
        <section className={styles.section} aria-labelledby="how-title">
          <h2 id="how-title" className={styles.sectionTitle}>How it works</h2>
          <ol className={styles.steps}>
            {steps.map((s, i) => (
              <li key={s.title}>
                <span className={styles.stepNum}>{String(i + 1).padStart(2, '0')}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.section} aria-labelledby="features-title">
          <h2 id="features-title" className={styles.sectionTitle}>What it does</h2>
          <div className={styles.features}>
            {features.map(f => (
              <article key={f.title}>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="models-title">
          <div className={styles.sectionHead}>
            <h2 id="models-title" className={styles.sectionTitle}>Model portfolios</h2>
            <p>Pick a starting point. You can adjust every percentage afterwards.</p>
          </div>
          <div className={styles.models}>
            {modelPortfolios.map(m => {
              const stocks = m.targets.usEquity + m.targets.intlEquity
              return (
                <article key={m.name} className={styles.model}>
                  <h3>{m.name}</h3>
                  <p className={styles.modelDesc}>{m.description}</p>
                  <MixBar label={`${m.name} mix`} targets={m.targets} />
                  <dl className={styles.modelSplit}>
                    <div><dt>Stocks</dt><dd>{stocks}%</dd></div>
                    <div><dt>Bonds</dt><dd>{m.targets.bonds}%</dd></div>
                    <div><dt>Other</dt><dd>{100 - stocks - m.targets.bonds}%</dd></div>
                  </dl>
                  <button type="button" className="button secondary" onClick={() => startFromModel(m.targets)}>
                    Use this mix
                  </button>
                </article>
              )
            })}
          </div>
          <ul className={styles.legend} aria-label="Asset class colors">
            {assetClasses.map(c => (
              <li key={c}><i style={{ background: assetClassColors[c] }} />{assetClassLabels[c]}</li>
            ))}
          </ul>
        </section>

        <section className={styles.band}>
          <div>
            <h2>See where your portfolio stands.</h2>
            <p>It takes a few minutes to enter your holdings. Prices are entered by hand.</p>
          </div>
          <a className={styles.primary} href={hrefFor('rebalancer')}>Open the rebalancer</a>
        </section>
      </div>
    </main>
  )
}
