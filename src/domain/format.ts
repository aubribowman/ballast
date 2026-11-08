const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const usdCents = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
const sharesFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 })

export const formatUsd = (n: number) => usd.format(n)
export const formatUsdCents = (n: number) => usdCents.format(n)
export const formatShares = (n: number) => sharesFmt.format(n)
export const formatPct = (n: number, digits = 1) => `${n.toFixed(digits)}%`

/** "+2.4 pts" / "−1.1 pts", with a real minus sign. */
export function formatDrift(n: number): string {
  const abs = Math.abs(n).toFixed(1)
  if (Number(abs) === 0) return '0.0 pts'
  return `${n > 0 ? '+' : '−'}${abs} pts`
}
