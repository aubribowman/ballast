import { describe, expect, it } from 'vitest'
import { combine, importHoldingsCsv, IMPORT_TEMPLATE, parseCsv, parseNumber } from './csvImport'

describe('parseCsv', () => {
  it('handles quoted cells, escaped quotes, CRLF and a byte-order mark', () => {
    expect(parseCsv('﻿a,"b, c","say ""hi"""\r\n1,2,3')).toEqual([
      ['a', 'b, c', 'say "hi"'],
      ['1', '2', '3'],
    ])
  })
})

describe('parseNumber', () => {
  it('reads brokerage-style numbers', () => {
    expect(parseNumber('$1,234.56')).toBe(1234.56)
    expect(parseNumber('(12.30)')).toBe(-12.3)
    expect(parseNumber('-$5.00')).toBe(-5)
    expect(parseNumber('--')).toBeNaN()
    expect(parseNumber('')).toBeNaN()
  })
})

describe('importHoldingsCsv', () => {
  it('reads the template', () => {
    const { holdings, error } = importHoldingsCsv(IMPORT_TEMPLATE)
    expect(error).toBeUndefined()
    expect(holdings).toHaveLength(3)
    expect(holdings[0]).toMatchObject({ ticker: 'VTI', shares: 120, costBasis: 214.6, price: 286.4, assetClass: 'usEquity' })
  })

  it('reads a Fidelity-style export with a total cost column and footer', () => {
    const csv = [
      'Account Number,Account Name,Symbol,Description,Quantity,Last Price,Current Value,Cost Basis Total',
      'X1,Individual,SPAXX**,HELD IN MONEY MARKET,,,"$2,500.00",',
      'X1,Individual,VXUS,VANGUARD TOTAL INTL STOCK ETF,150,$64.10,"$9,615.00","$8,445.00"',
      'X1,Individual,Pending Activity,,,,-$100.00,',
      '',
      '"The data and information in this spreadsheet is provided to you solely for your use."',
    ].join('\n')
    const { holdings, skipped } = importHoldingsCsv(csv)
    expect(holdings).toEqual([
      {
        ticker: 'SPAXX',
        name: 'Fidelity Government Money Market Fund',
        assetClass: 'cash',
        shares: 2500,
        price: 1,
        costBasis: 1,
        classGuessed: false,
      },
      {
        ticker: 'VXUS',
        name: 'Vanguard Total International Stock ETF',
        assetClass: 'intlEquity',
        shares: 150,
        price: 64.1,
        costBasis: 56.3,
        classGuessed: false,
      },
    ])
    expect(skipped).toBe(1) // pending activity isn't a holding
  })

  it('reads a Schwab-style export with a title line, cash row and totals', () => {
    const csv = [
      '"Positions for account Individual ...123 as of 10:00 AM ET, 11/07/2026"',
      '',
      '"Symbol","Description","Qty (Quantity)","Price","Mkt Val (Market Value)","Cost Basis"',
      '"BND","VANGUARD TOTAL BOND MARKET ETF","400","$72.85","$29,140.00","$30,480.00"',
      '"ZZTOP","ACME SHORT TERM TREASURY FUND","10","$50.00","$500.00","N/A"',
      '"Cash & Cash Investments","--","--","--","$1,200.00","--"',
      '"Account Total","--","--","--","$30,840.00","--"',
    ].join('\n')
    const { holdings, skipped } = importHoldingsCsv(csv)
    expect(holdings.map(h => h.ticker)).toEqual(['BND', 'ZZTOP', 'CASH'])
    expect(holdings[0]).toMatchObject({ costBasis: 76.2, assetClass: 'bonds' })
    expect(holdings[1]).toMatchObject({ assetClass: 'bonds', classGuessed: true, costBasis: 0 })
    expect(holdings[2]).toMatchObject({ assetClass: 'cash', shares: 1200, price: 1 })
    expect(skipped).toBe(1)
  })

  it('combines the same fund held in two accounts and stops at the next section', () => {
    const csv = [
      'Account Number,Investment Name,Symbol,Shares,Share Price,Total Value',
      '111,Vanguard Total Stock Market ETF,VTI,100,286.40,28640',
      '222,Vanguard Total Stock Market ETF,VTI,20,286.40,5728',
      '',
      'Account Number,Trade Date,Symbol,Shares,Share Price',
      '111,2026-01-02,VTI,5,250.00',
    ].join('\n')
    const { holdings } = importHoldingsCsv(csv)
    expect(holdings).toHaveLength(1)
    expect(holdings[0]).toMatchObject({ ticker: 'VTI', shares: 120 })
  })

  it('explains what is missing when the columns are not found', () => {
    expect(importHoldingsCsv('Date,Amount\n2026-01-01,100').error).toMatch(/Symbol/)
  })
})

describe('combine', () => {
  const base = { ticker: 'VTI', name: '', assetClass: 'usEquity' as const, price: 300 }

  it('averages cost weighted by shares', () => {
    const merged = combine({ ...base, shares: 100, costBasis: 200 }, { ...base, shares: 50, costBasis: 260 })
    expect(merged).toMatchObject({ shares: 150, costBasis: 220 })
  })

  it('drops the cost when either side is unknown', () => {
    expect(combine({ ...base, shares: 10, costBasis: 200 }, { ...base, shares: 5 }).costBasis).toBe(0)
  })
})
