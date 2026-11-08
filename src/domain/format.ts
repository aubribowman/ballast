// Display formatting for the UI. Formatters are created once and reused,
// since building an Intl.NumberFormat is slow compared with using one.
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const usdCents = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
const sharesFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 })

export const formatUsd = (n: number) => usd.format(n)
export const formatUsdCents = (n: number) => usdCents.format(n)
export const formatShares = (n: number) => sharesFmt.format(n)
/** A plain percent such as "41.6%". Input is already 0–100, not a fraction. */
export const formatPct = (n: number, digits = 1) => `${n.toFixed(digits)}%`

/** "+2.4 pts" / "−1.1 pts", with a real minus sign. */
export function formatDrift(n: number): string {
  const abs = Math.abs(n).toFixed(1)
  if (Number(abs) === 0) return '0.0 pts'
  return `${n > 0 ? '+' : '−'}${abs} pts`
}

/** A dollar change with an explicit sign: +$1,234 or −$560. */
export function formatSignedUsd(n: number): string {
  const rounded = Math.round(n)
  if (rounded === 0) return '$0'
  return `${rounded > 0 ? '+' : '−'}${usd.format(Math.abs(rounded))}`
}

/** A percent change with an explicit sign: +12.3% or −4.0%. */
export function formatSignedPct(n: number): string {
  // Values that would round to 0.0 show as "0.0%" rather than "−0.0%".
  const v = Math.abs(n) < 0.05 ? 0 : n
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}%`
}
