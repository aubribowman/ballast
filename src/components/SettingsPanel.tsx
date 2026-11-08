import type { RebalanceMode } from '../domain/types'
import { usePortfolio } from '../state/usePortfolio'
import { NumberInput } from './NumberInput'
import { Panel } from './Panel'
import styles from './SettingsPanel.module.css'

const modes: { value: RebalanceMode; label: string; description: string }[] = [
  { value: 'full', label: 'Full rebalance', description: 'Buy and sell to get back to target.' },
  { value: 'buyOnly', label: 'Invest new cash only', description: 'Buy what’s underweight. Nothing is sold, so no gains are realized.' },
]

export function SettingsPanel() {
  const { portfolio, dispatch } = usePortfolio()
  const { settings } = portfolio
  const update = (changes: Partial<typeof settings>) => dispatch({ type: 'updateSettings', changes })

  return (
    <Panel title="Rebalancing rules" id="settings-title">
      <fieldset className={styles.modes}>
        <legend className="visually-hidden">Rebalancing method</legend>
        {modes.map(m => (
          <label key={m.value} className={styles.mode}>
            <input
              type="radio"
              name="mode"
              value={m.value}
              checked={settings.mode === m.value}
              onChange={() => update({ mode: m.value })}
            />
            <span>
              <strong>{m.label}</strong>
              <span>{m.description}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className={styles.field}>
        <label htmlFor="cash-to-invest">New cash to invest</label>
        <span className={styles.money}>
          <span aria-hidden="true">$</span>
          <NumberInput id="cash-to-invest" value={settings.cashToInvest} placeholder="0"
            onValueChange={cashToInvest => update({ cashToInvest })} />
        </span>
      </div>

      <label className={styles.field}>
        <span className={styles.rangeLabel}>
          <span>Tolerance band</span>
          <output>±{settings.bandPct} pts</output>
        </span>
        <input
          type="range"
          min={0}
          max={10}
          step={0.5}
          value={settings.bandPct}
          onChange={e => update({ bandPct: Number(e.target.value) })}
        />
        <span className={styles.help}>Classes this close to target are left alone unless there’s new cash.</span>
      </label>

      <label className={styles.check}>
        <input type="checkbox" checked={settings.wholeShares} onChange={e => update({ wholeShares: e.target.checked })} />
        <span>Whole shares only</span>
      </label>
    </Panel>
  )
}
