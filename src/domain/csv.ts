import { assetClassLabels } from './assetClasses'
import type { Trade } from './rebalance'

export function tradesToCsv(trades: Trade[]): string {
  const rows = [
    ['Action', 'Ticker', 'Asset class', 'Shares', 'Estimated amount'],
    ...trades.map(t => [t.action, t.ticker, assetClassLabels[t.assetClass], String(t.shares), t.amount.toFixed(2)]),
  ]
  return rows.map(r => r.map(escape).join(',')).join('\n')
}

function escape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}
