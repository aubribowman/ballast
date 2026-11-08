import type { Borders, Cell, Fill, Font, Workbook, Worksheet } from 'exceljs'
import { assetClasses, assetClassLabels } from '../domain/assetClasses'
import { portfolioGain, realizedOnSale, unrealizedGain } from '../domain/gains'
import { holdingValue, type RebalancePlan } from '../domain/rebalance'
import { exampleFunds } from '../domain/suggestions'
import { LOGO } from './logo'
import type { AssetClass, Portfolio } from '../domain/types'

type Plan = Extract<RebalancePlan, { ok: true }>

/**
 * Brand colors from the site's light theme, as Excel ARGB. Spreadsheets are
 * printed and shared, so they always use the light palette.
 */
const brand = {
  navy: 'FF0C1E3A',
  gold: 'FFB08D4F',
  ink: 'FF0F1B2D',
  muted: 'FF5A6577',
  faint: 'FF8A93A3',
  rule: 'FFDDE1E7',
  ruleStrong: 'FFC4CAD4',
  surfaceAlt: 'FFF8F9FB',
  accent: 'FF1D4079',
  accentWash: 'FFE9EEF7',
  gain: 'FF13744A',
  gainWash: 'FFE5F3EC',
  loss: 'FFB3261E',
  lossWash: 'FFFBECEB',
  white: 'FFFFFFFF',
}

const classColor: Record<AssetClass, string> = {
  usEquity: 'FF1D4079',
  intlEquity: 'FF2F8A86',
  bonds: 'FFB08D4F',
  realEstate: 'FF8A5274',
  cash: 'FF9BA4B3',
}

// Excel can't embed web fonts: Georgia stands in for the serif, Calibri for the sans.
const SERIF = 'Georgia'
const SANS = 'Calibri'

const fmt = {
  usd: '$#,##0;-$#,##0',
  usdCents: '$#,##0.00;-$#,##0.00',
  signedUsd: '+$#,##0;-$#,##0;$0',
  shares: '#,##0',
  fractionalShares: '#,##0.####',
  pct: '0.0%',
  signedPct: '+0.0%;-0.0%;0.0%',
  signedPts: '+0.0" pts";-0.0" pts";0.0" pts"',
}

const solid = (argb: string): Fill => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } })
const font = (over: Partial<Font> = {}): Partial<Font> => ({ name: SANS, size: 10, color: { argb: brand.ink }, ...over })
const line = (argb: string, style: 'thin' | 'medium' = 'thin') => ({ style, color: { argb } })

const modeLabel = { full: 'Full rebalance', buyOnly: 'Invest new cash only' }

export interface PlanWorkbookInput {
  plan: Plan
  portfolio: Portfolio
  date?: Date
}

/** Builds the branded workbook: the plan, the holdings and the allocation. */
export async function buildPlanWorkbook({ plan, portfolio, date = new Date() }: PlanWorkbookInput): Promise<Workbook> {
  const { default: ExcelJS } = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Ballast'
  wb.title = 'Portfolio rebalancing plan'
  wb.created = date

  const logo = wb.addImage({ base64: LOGO.base64, extension: 'png' })

  const planWs = wb.addWorksheet('Rebalancing plan', sheetOptions('Rebalancing plan'))
  planSheet(planWs, plan, portfolio, date)
  const holdingsWs = wb.addWorksheet('Holdings', sheetOptions('Holdings'))
  holdingsSheet(holdingsWs, portfolio, date)
  const allocationWs = wb.addWorksheet('Allocation', sheetOptions('Allocation'))
  allocationSheet(allocationWs, plan, date)
  // After the sheets are built, so column widths are known.
  for (const ws of [planWs, holdingsWs, allocationWs]) placeLogo(ws, logo)
  return wb
}

export async function downloadPlanWorkbook(input: PlanWorkbookInput) {
  const wb = await buildPlanWorkbook(input)
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ballast-rebalancing-plan-${isoDate(input.date ?? new Date())}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

function sheetOptions(title: string) {
  return {
    views: [{ showGridLines: false }],
    pageSetup: {
      orientation: 'landscape' as const,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
    },
    headerFooter: { oddFooter: `&L&8Ballast · ${title}&R&8Page &P of &N` },
  }
}

// Excel shows "208." for a whole number in a format with optional decimals.
const sharesFmt = (n: number) => (Number.isInteger(n) ? fmt.shares : fmt.fractionalShares)

const isoDate = (d: Date) => d.toISOString().slice(0, 10)
const longDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

const LOGO_LEFT_PX = 14
const MASTHEAD_PX = 75 // rows 1 and 2: 34pt + 22pt
const TITLE_INDENT = 7 // indent levels (~9.4px each in Excel) to clear the 54px-wide logo area

const EMU_PER_PX = 9525 // Excel's drawing unit

/** Puts the logo at the left of the masthead, centered vertically. */
function placeLogo(ws: Worksheet, imageId: number) {
  // Exact offsets from the top-left of A1. ExcelJS also takes fractions of a
  // cell, but converts them with its own units, which puts the logo in the
  // wrong place; its types just don't list this form.
  const tl = {
    nativeCol: 0,
    nativeColOff: Math.round(LOGO_LEFT_PX * EMU_PER_PX),
    nativeRow: 0,
    nativeRowOff: Math.round(((MASTHEAD_PX - LOGO.height) / 2) * EMU_PER_PX),
  } as unknown as { col: number; row: number }
  ws.addImage(imageId, { tl, ext: { width: LOGO.width, height: LOGO.height }, editAs: 'absolute' })
}

/** The navy masthead with its gold rule, across `width` columns. Returns the next free row. */
function masthead(ws: Worksheet, width: number, subtitle: string, date: Date): number {
  const last = String.fromCharCode(64 + width)
  ws.mergeCells(`A1:${last}1`)
  ws.mergeCells(`A2:${last}2`)
  const title = ws.getCell('A1')
  title.value = 'Ballast'
  title.font = { name: SERIF, size: 20, color: { argb: brand.white } }
  // Indented past the logo, which floats over the left of the masthead.
  title.alignment = { vertical: 'bottom', indent: TITLE_INDENT }
  const sub = ws.getCell('A2')
  sub.value = `${subtitle.toUpperCase()}   ·   ${longDate(date)}`
  sub.font = font({ size: 9, bold: true, color: { argb: brand.gold } })
  sub.alignment = { vertical: 'top', indent: TITLE_INDENT }
  for (let c = 1; c <= width; c++) {
    ws.getCell(1, c).fill = solid(brand.navy)
    ws.getCell(2, c).fill = solid(brand.navy)
    ws.getCell(2, c).border = { bottom: line(brand.gold, 'medium') }
  }
  ws.getRow(1).height = 34
  ws.getRow(2).height = 22
  ws.getRow(3).height = 10
  return 4
}

function sectionTitle(ws: Worksheet, row: number, width: number, text: string): number {
  ws.getRow(row).height = 26
  for (let c = 1; c <= width; c++) ws.getCell(row, c).border = { bottom: line(brand.ruleStrong) }
  const cell = ws.getCell(row, 1)
  cell.value = text.toUpperCase()
  cell.font = font({ size: 9, bold: true, color: { argb: brand.navy } })
  cell.alignment = { vertical: 'bottom' }
  return row + 1
}

function tableHeader(ws: Worksheet, row: number, headers: string[], numericFrom: number) {
  headers.forEach((h, i) => {
    const cell = ws.getCell(row, i + 1)
    cell.value = h.toUpperCase()
    cell.font = font({ size: 9, bold: true, color: { argb: brand.white } })
    cell.fill = solid(brand.navy)
    cell.alignment = { vertical: 'middle', horizontal: i + 1 >= numericFrom ? 'right' : 'left', indent: 1 }
  })
  ws.getRow(row).height = 22
}

function bodyRow(ws: Worksheet, row: number, width: number, striped: boolean) {
  ws.getRow(row).height = 20
  for (let c = 1; c <= width; c++) {
    const cell = ws.getCell(row, c)
    cell.font = cell.font ?? font()
    cell.border = { bottom: line(brand.rule) }
    if (striped) cell.fill = solid(brand.surfaceAlt)
    cell.alignment = { vertical: 'middle', indent: 1, ...cell.alignment }
  }
}

function signed(cell: Cell, value: number | undefined, format: string) {
  if (value === undefined) {
    cell.value = '—'
    cell.font = font({ color: { argb: brand.faint } })
    cell.alignment = { horizontal: 'right', indent: 1 }
    return
  }
  cell.value = value
  cell.numFmt = format
  const color = Math.round(value) > 0 ? brand.gain : Math.round(value) < 0 ? brand.loss : brand.ink
  cell.font = font({ bold: true, color: { argb: color } })
}

function disclosure(ws: Worksheet, row: number, width: number) {
  const last = String.fromCharCode(64 + width)
  ws.mergeCells(`A${row}:${last}${row + 1}`)
  const cell = ws.getCell(`A${row}`)
  cell.value =
    'Ballast is a portfolio project. This is not investment advice, and prices may have been entered by hand. ' +
    'Gain estimates use an average cost per share; your brokerage’s tax lots may differ. Review every trade before placing it.'
  cell.font = font({ size: 8, italic: true, color: { argb: brand.muted } })
  cell.alignment = { wrapText: true, vertical: 'top' }
}

function planSheet(ws: Worksheet, plan: Plan, portfolio: Portfolio, date: Date) {
  const W = 8
  ws.columns = [
    { width: 11 }, { width: 10 }, { width: 40 }, { width: 20 }, { width: 12 }, { width: 13 }, { width: 16 }, { width: 15 },
  ]
  let r = masthead(ws, W, 'Portfolio rebalancing plan', date)

  // Summary: label/value pairs in two blocks, like the site's summary strip.
  const gain = portfolioGain(portfolio.holdings)
  const { settings } = portfolio
  const summary: [string, string | number, string?][] = [
    ['Portfolio value', plan.totalValue, fmt.usd],
    ['Method', modeLabel[settings.mode]],
    ['Unrealized gain/loss', gain ? gain.amount : '—', gain ? fmt.signedUsd : undefined],
    ['Tolerance band', `±${settings.bandPct} pts`],
    ['New cash to invest', settings.cashToInvest, fmt.usd],
    ['Shares', settings.wholeShares ? 'Whole shares only' : 'Fractional allowed'],
    ['Cash left after trades', plan.leftoverCash, fmt.usd],
    ['Suggested trades', plan.trades.length],
  ]
  for (let i = 0; i < summary.length; i += 2) {
    ;[summary[i], summary[i + 1]].forEach(([label, value, numFmt], j) => {
      const col = j === 0 ? 1 : 5
      const l = ws.getCell(r, col)
      l.value = label.toUpperCase()
      l.font = font({ size: 8, bold: true, color: { argb: brand.muted } })
      ws.mergeCells(r, col, r, col + 1)
      const v = ws.getCell(r, col + 2)
      v.value = value
      if (numFmt) v.numFmt = numFmt
      const isGain = label.startsWith('Unrealized') && typeof value === 'number'
      v.font = font({
        name: typeof value === 'number' ? SERIF : SANS,
        size: typeof value === 'number' ? 12 : 10,
        bold: typeof value !== 'number',
        color: { argb: isGain ? (value > 0 ? brand.gain : value < 0 ? brand.loss : brand.ink) : brand.ink },
      })
      v.alignment = { horizontal: 'left' }
    })
    ws.getRow(r).height = 20
    r++
  }

  r = sectionTitle(ws, r + 1, W, 'Suggested trades')
  r++
  const sells = plan.trades.filter(t => t.action === 'Sell')
  const buys = plan.trades.filter(t => t.action === 'Buy')
  const byId = new Map(portfolio.holdings.map(h => [h.id, h]))

  if (plan.trades.length === 0) {
    const cell = ws.getCell(r, 1)
    cell.value = plan.needsRebalance
      ? 'No trades are large enough to place.'
      : `Every asset class is within ±${settings.bandPct} pts of its target. No trades needed.`
    cell.font = font({ color: { argb: brand.muted } })
    r += 2
  } else {
    tableHeader(ws, r, ['Action', 'Ticker', 'Fund', 'Asset class', 'Shares', 'Price', 'Est. amount', 'Est. gain'], 5)
    r++
    ;[...sells, ...buys].forEach((t, i) => {
      const h = byId.get(t.holdingId)
      const values: (string | number)[] = [t.action.toUpperCase(), t.ticker, h?.name ?? '', assetClassLabels[t.assetClass], t.shares, h?.price ?? 0, t.amount]
      values.forEach((v, c) => (ws.getCell(r, c + 1).value = v))
      ws.getCell(r, 5).numFmt = sharesFmt(t.shares)
      ws.getCell(r, 6).numFmt = fmt.usdCents
      ws.getCell(r, 7).numFmt = fmt.usdCents
      ws.getCell(r, 2).font = font({ bold: true })
      ws.getCell(r, 4).font = font({ color: { argb: brand.muted } })
      if (t.action === 'Sell' && h) signed(ws.getCell(r, 8), realizedOnSale(h, t.shares), fmt.signedUsd)
      else {
        ws.getCell(r, 8).value = '—'
        ws.getCell(r, 8).font = font({ color: { argb: brand.faint } })
        ws.getCell(r, 8).alignment = { horizontal: 'right' }
      }
      bodyRow(ws, r, 8, i % 2 === 1)
      // The action tag, like the site's Buy/Sell pills.
      const action = ws.getCell(r, 1)
      const isBuy = t.action === 'Buy'
      action.fill = solid(isBuy ? brand.gainWash : brand.lossWash)
      action.font = font({ size: 9, bold: true, color: { argb: isBuy ? brand.gain : brand.loss } })
      action.alignment = { horizontal: 'center', vertical: 'middle' }
      ws.getCell(r, 3).alignment = { vertical: 'middle', indent: 1, shrinkToFit: true }
      r++
    })

    // Totals, in a shaded block under the table.
    const sold = sells.reduce((s, t) => s + t.amount, 0)
    const bought = buys.reduce((s, t) => s + t.amount, 0)
    const gains = sells.map(t => byId.get(t.holdingId)).map((h, i) => (h ? realizedOnSale(h, sells[i].shares) : undefined))
    const known = gains.filter((g): g is number => g !== undefined)
    const totals: [string, number | undefined, string][] = [
      ...(sells.length ? ([['Raised from sales', sold, fmt.usdCents]] as [string, number, string][]) : []),
      ...(sells.length ? ([['Estimated realized gain', known.length ? known.reduce((a, b) => a + b, 0) : undefined, fmt.signedUsd]] as [string, number | undefined, string][]) : []),
      ['Spent on purchases', bought, fmt.usdCents],
      ['Cash left over', plan.leftoverCash, fmt.usdCents],
    ]
    totals.forEach(([label, value, numFmt], i) => {
      for (let c = 1; c <= W; c++) ws.getCell(r, c).fill = solid(brand.surfaceAlt)
      if (i === 0) for (let c = 1; c <= W; c++) ws.getCell(r, c).border = { top: line(brand.ruleStrong) }
      ws.mergeCells(r, 5, r, 6)
      const l = ws.getCell(r, 5)
      l.value = label
      l.font = font({ color: { argb: brand.muted }, bold: i === totals.length - 1 })
      l.alignment = { horizontal: 'right' }
      const v = ws.getCell(r, 7)
      if (label.startsWith('Estimated')) signed(v, value, numFmt)
      else {
        v.value = value
        v.numFmt = numFmt
        v.font = font({ bold: true, size: i === totals.length - 1 ? 11 : 10 })
      }
      ws.getRow(r).height = 18
      r++
    })
    r++
  }

  if (plan.unfilled.length) {
    r = sectionTitle(ws, r, W, 'Funds to consider') + 1
    for (const gap of plan.unfilled) {
      const head = ws.getCell(r, 1)
      head.value = `${assetClassLabels[gap.assetClass]}: nothing held yet`
      head.font = font({ bold: true })
      const amt = ws.getCell(r, 7)
      amt.value = gap.amount
      amt.numFmt = fmt.usd
      amt.font = font({ bold: true, color: { argb: brand.accent } })
      ws.getCell(r, 8).value = 'to invest'
      ws.getCell(r, 8).font = font({ color: { argb: brand.muted } })
      r++
      for (const f of exampleFunds(gap.assetClass)) {
        ws.getCell(r, 2).value = f.ticker
        ws.getCell(r, 2).font = font({ bold: true })
        ws.getCell(r, 3).value = f.name
        ws.getCell(r, 3).font = font({ color: { argb: brand.muted } })
        r++
      }
      r++
    }
    const note = ws.getCell(r - 1, 1)
    note.value = 'Example funds, not recommendations. Compare fees and check what your brokerage offers.'
    note.font = font({ size: 8, italic: true, color: { argb: brand.faint } })
    r++
  }

  disclosure(ws, r, W)
}

function holdingsSheet(ws: Worksheet, portfolio: Portfolio, date: Date) {
  const W = 9
  ws.columns = [
    { width: 10 }, { width: 40 }, { width: 20 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 14 }, { width: 14 }, { width: 10 },
  ]
  let r = masthead(ws, W, 'Holdings', date)
  tableHeader(ws, r, ['Ticker', 'Fund', 'Asset class', 'Shares', 'Avg. cost', 'Price', 'Value', 'Gain/loss', 'Gain %'], 4)
  const headerRow = r
  r++
  portfolio.holdings.forEach((h, i) => {
    const g = unrealizedGain(h)
    ws.getCell(r, 1).value = h.ticker
    ws.getCell(r, 1).font = font({ bold: true })
    ws.getCell(r, 2).value = h.name
    ws.getCell(r, 3).value = assetClassLabels[h.assetClass]
    ws.getCell(r, 3).font = font({ color: { argb: brand.muted } })
    ws.getCell(r, 4).value = h.shares
    ws.getCell(r, 4).numFmt = sharesFmt(h.shares)
    if (h.costBasis) {
      ws.getCell(r, 5).value = h.costBasis
      ws.getCell(r, 5).numFmt = fmt.usdCents
    } else {
      ws.getCell(r, 5).value = '—'
      ws.getCell(r, 5).font = font({ color: { argb: brand.faint } })
      ws.getCell(r, 5).alignment = { horizontal: 'right' }
    }
    ws.getCell(r, 6).value = h.price
    ws.getCell(r, 6).numFmt = fmt.usdCents
    ws.getCell(r, 7).value = holdingValue(h)
    ws.getCell(r, 7).numFmt = fmt.usd
    ws.getCell(r, 7).font = font({ bold: true })
    signed(ws.getCell(r, 8), g?.amount, fmt.signedUsd)
    signed(ws.getCell(r, 9), g ? g.pct / 100 : undefined, fmt.signedPct)
    bodyRow(ws, r, W, i % 2 === 1)
    r++
  })

  // Totals row with live formulas, so edits in Excel still add up.
  const first = headerRow + 1
  const lastRow = r - 1
  const gain = portfolioGain(portfolio.holdings)
  for (let c = 1; c <= W; c++) {
    const cell = ws.getCell(r, c)
    cell.fill = solid(brand.surfaceAlt)
    cell.border = { top: line(brand.ruleStrong, 'medium') }
  }
  ws.getCell(r, 1).value = 'TOTAL'
  ws.getCell(r, 1).font = font({ size: 9, bold: true, color: { argb: brand.muted } })
  if (portfolio.holdings.length) {
    ws.getCell(r, 7).value = { formula: `SUM(G${first}:G${lastRow})` }
    ws.getCell(r, 7).numFmt = fmt.usd
    ws.getCell(r, 7).font = font({ bold: true, size: 11 })
  }
  signed(ws.getCell(r, 8), gain?.amount, fmt.signedUsd)
  signed(ws.getCell(r, 9), gain ? gain.pct / 100 : undefined, fmt.signedPct)
  ws.getRow(r).height = 22
  if (portfolio.holdings.length) ws.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: lastRow, column: W } }

  disclosure(ws, r + 2, W)
}

function allocationSheet(ws: Worksheet, plan: Plan, date: Date) {
  const W = 6
  ws.columns = [{ width: 3 }, { width: 26 }, { width: 13 }, { width: 13 }, { width: 14 }, { width: 13 }]
  let r = masthead(ws, W, 'Asset allocation', date)
  tableHeader(ws, r, ['', 'Asset class', 'Now', 'Target', 'Drift', 'After trades'], 3)
  r++
  assetClasses.forEach((c, i) => {
    const now = plan.current[i]
    const after = plan.projected[i]
    ws.getCell(r, 2).value = assetClassLabels[c]
    ws.getCell(r, 3).value = now.pct / 100
    ws.getCell(r, 4).value = now.targetPct / 100
    ws.getCell(r, 5).value = now.driftPct
    ws.getCell(r, 6).value = after.pct / 100
    for (const col of [3, 4, 6]) ws.getCell(r, col).numFmt = fmt.pct
    ws.getCell(r, 5).numFmt = fmt.signedPts
    ws.getCell(r, 5).font = font({ bold: now.outsideBand, color: { argb: now.outsideBand ? 'FF9A5B06' : brand.muted } })
    bodyRow(ws, r, W, false)
    // A color swatch matching the site's charts.
    ws.getCell(r, 1).fill = solid(classColor[c])
    ws.getCell(r, 1).border = { bottom: line(brand.white, 'medium') } as Partial<Borders>
    r++
  })
  const note = ws.getCell(r + 1, 2)
  note.value = 'Drift is now minus target, in percentage points. Amber marks classes outside the tolerance band.'
  note.font = font({ size: 8, italic: true, color: { argb: brand.muted } })
  disclosure(ws, r + 3, W)
}
