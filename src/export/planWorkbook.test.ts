import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import { planRebalance } from '../domain/rebalance'
import { samplePortfolio } from '../state/samplePortfolio'
import { buildPlanWorkbook } from './planWorkbook'

function samplePlan() {
  const portfolio = samplePortfolio()
  const plan = planRebalance(portfolio.holdings, portfolio.targets, portfolio.settings)
  if (!plan.ok) throw new Error(plan.error)
  return { plan, portfolio, date: new Date('2026-11-08T12:00:00Z') }
}

/** Round-trips through a real .xlsx file, so this checks what Excel would open. */
async function reopen(input: ReturnType<typeof samplePlan>) {
  const buffer = await (await buildPlanWorkbook(input)).xlsx.writeBuffer()
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer as ArrayBuffer)
  return wb
}

const findRow = (ws: ExcelJS.Worksheet, col: number, value: string) => {
  for (let r = 1; r <= ws.rowCount; r++) if (ws.getCell(r, col).value === value) return r
  throw new Error(`No row with ${value} in column ${col}`)
}

describe('buildPlanWorkbook', () => {
  it('has the plan, holdings and allocation sheets with the brand masthead', async () => {
    const wb = await reopen(samplePlan())
    expect(wb.worksheets.map(ws => ws.name)).toEqual(['Rebalancing plan', 'Holdings', 'Allocation'])
    for (const ws of wb.worksheets) {
      expect(ws.getCell('A1').value).toBe('Ballast')
      expect(ws.getCell('A1').fill).toMatchObject({ fgColor: { argb: 'FF0C1E3A' } })
      expect(ws.views[0].showGridLines).toBe(false)
      const images = ws.getImages()
      expect(images).toHaveLength(1)
      // Anchored a fixed 14px in from the masthead's left edge (9525 EMU per px).
      expect(images[0].range.tl.nativeColOff).toBe(14 * 9525)
    }
    expect(wb.model.media).toHaveLength(1) // one logo file, shared by every sheet
  })

  it('lists sells before buys with styled action tags and estimated gains', async () => {
    const input = samplePlan()
    const ws = (await reopen(input)).getWorksheet('Rebalancing plan')!
    const header = findRow(ws, 1, 'ACTION')
    const actions = input.plan.trades.map((_, i) => ws.getCell(header + 1 + i, 1).value)
    expect(actions.indexOf('BUY')).toBeGreaterThan(actions.lastIndexOf('SELL'))

    const sellRow = header + 1
    expect(ws.getCell(sellRow, 1).font.color?.argb).toBe('FFB3261E')
    expect(typeof ws.getCell(sellRow, 8).value).toBe('number') // sample holdings have costs
    expect(ws.getCell(sellRow, 7).numFmt).toBe('$#,##0.00;-$#,##0.00')
  })

  it('totals holdings with a formula and shows gains', async () => {
    const input = samplePlan()
    const ws = (await reopen(input)).getWorksheet('Holdings')!
    const total = findRow(ws, 1, 'TOTAL')
    expect(ws.getCell(total, 7).value).toMatchObject({ formula: expect.stringMatching(/^SUM\(G\d+:G\d+\)$/) })
    const vti = findRow(ws, 1, 'VTI')
    expect(ws.getCell(vti, 8).value).toBeGreaterThan(0)
  })

  it('shows allocation as percentages with a color swatch per class', async () => {
    const ws = (await reopen(samplePlan())).getWorksheet('Allocation')!
    const us = findRow(ws, 2, 'US stocks')
    expect(ws.getCell(us, 3).numFmt).toBe('0.0%')
    expect(ws.getCell(us, 1).fill).toMatchObject({ fgColor: { argb: 'FF1D4079' } })
  })
})
