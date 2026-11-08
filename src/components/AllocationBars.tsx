import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { assetClassColors, assetClasses, assetClassLabels } from '../domain/assetClasses'
import { formatPct } from '../domain/format'
import type { AssetClass } from '../domain/types'
import { usePortfolio } from '../state/usePortfolio'
import { Panel } from './Panel'

type Row = { name: string } & Record<AssetClass, number>

export function AllocationBars() {
  const { plan } = usePortfolio()
  if (!plan.ok) return null

  const row = (name: string, pick: (i: number) => number): Row =>
    ({ name, ...Object.fromEntries(assetClasses.map((c, i) => [c, pick(i)])) }) as Row

  const data: Row[] = [
    row('Now', i => plan.current[i].pct),
    row('Target', i => plan.current[i].targetPct),
    ...(plan.trades.length ? [row('After', i => plan.projected[i].pct)] : []),
  ]

  return (
    <Panel title="Mix at a glance" id="mix-title">
      <div style={{ height: data.length * 44 + 8 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 4, bottom: 0, left: 0 }} barCategoryGap={10}>
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis
              type="category"
              dataKey="name"
              width={52}
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--ink-muted)', fontSize: 13 }}
            />
            <Tooltip
              cursor={{ fill: 'var(--bg)' }}
              formatter={(value, key) => [formatPct(Number(value)), assetClassLabels[key as AssetClass]]}
              contentStyle={{
                background: 'var(--surface)',
                border: '1px solid var(--rule)',
                borderRadius: 8,
                fontSize: 13,
              }}
            />
            {assetClasses.map((c, i) => (
              <Bar
                key={c}
                dataKey={c}
                stackId="mix"
                fill={assetClassColors[c]}
                isAnimationActive={false}
                radius={i === 0 ? [4, 0, 0, 4] : i === assetClasses.length - 1 ? [0, 4, 4, 0] : 0}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  )
}
