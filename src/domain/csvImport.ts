import { lookupTicker } from './tickers'
import type { AssetClass, Holding } from './types'

export type ImportedHolding = Omit<Holding, 'id'> & {
  /** The asset class was guessed from the name, not known from the ticker. */
  classGuessed: boolean
}

export interface ImportResult {
  holdings: ImportedHolding[]
  /** Rows that weren't holdings: totals, pending activity, blank symbols. */
  skipped: number
  error?: string
}

type Field = 'ticker' | 'name' | 'shares' | 'price' | 'costPerShare' | 'costTotal' | 'value'

/**
 * Column names used by common brokerage exports (Fidelity, Schwab, Vanguard
 * and others), compared after lowercasing and dropping everything but
 * letters and digits, so "Qty (Quantity)" becomes "qtyquantity".
 */
const columnNames: Record<Field, string[]> = {
  ticker: ['symbol', 'ticker', 'tickersymbol', 'symbolcusip'],
  name: ['description', 'name', 'securityname', 'investmentname', 'securitydescription', 'fundname', 'holding'],
  shares: ['quantity', 'shares', 'qty', 'qtyquantity', 'sharesquantity', 'units', 'shareqty'],
  price: ['price', 'lastprice', 'shareprice', 'currentprice', 'last', 'pricepershare', 'marketprice', 'closingprice', 'lastpriceusd', 'priceusd'],
  costPerShare: [
    'avgcost', 'averagecost', 'averagecostbasis', 'avgcostbasis', 'costpershare', 'costbasispershare',
    'avgcostpershare', 'unitcost', 'averageprice', 'avgprice', 'purchaseprice', 'pricepaid', 'averagecostpershare',
  ],
  costTotal: ['costbasis', 'costbasistotal', 'totalcost', 'totalcostbasis', 'cost', 'costbasisusd'],
  value: ['marketvalue', 'value', 'totalvalue', 'currentvalue', 'mktval', 'mktvalmarketvalue', 'marketvalueusd'],
}

const normalize = (header: string) => header.toLowerCase().replace(/[^a-z0-9]/g, '')

/** Splits CSV text into rows of cells, handling quoted cells, escaped quotes and CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  const src = text.replace(/^﻿/, '')

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++ }
      else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') { row.push(cell); cell = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += ch
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row) }
  return rows
}

/** Reads "$1,234.56", "(12.30)", "+5%" and similar. Blank, "--" and "n/a" give NaN. */
export function parseNumber(raw: string | undefined): number {
  if (raw === undefined) return NaN
  const s = raw.trim()
  if (!s || /^(--|n\/?a|-)$/i.test(s)) return NaN
  const negative = /^\(.*\)$/.test(s) || s.startsWith('-')
  const n = Number(s.replace(/[^0-9.]/g, ''))
  return negative ? -n : n
}

function findColumns(header: string[]): Partial<Record<Field, number>> {
  const normalized = header.map(normalize)
  const found: Partial<Record<Field, number>> = {}
  for (const field of Object.keys(columnNames) as Field[]) {
    for (const name of columnNames[field]) {
      const index = normalized.indexOf(name)
      if (index !== -1 && !Object.values(found).includes(index)) {
        found[field] = index
        break
      }
    }
  }
  return found
}

function guessClass(name: string): AssetClass {
  const n = name.toLowerCase()
  if (/money market|cash reserve|government cash/.test(n)) return 'cash'
  if (/real estate|reit/.test(n)) return 'realEstate'
  if (/bond|treasury|fixed income|municipal|muni|aggregate|t-bill|income fund/.test(n)) return 'bonds'
  if (/international|intl|emerging|developed|ex-us|ex us|foreign|global ex|eafe|world ex/.test(n)) return 'intlEquity'
  return 'usEquity'
}

const isBlank = (row: string[]) => row.every(c => c.trim() === '')

export function importHoldingsCsv(text: string): ImportResult {
  const rows = parseCsv(text)
  // Exports often start with a title or account lines, so look for the header.
  const headerIndex = rows.findIndex(r => {
    const cols = findColumns(r)
    return cols.ticker !== undefined && (cols.shares !== undefined || cols.value !== undefined)
  })
  if (headerIndex === -1) {
    return {
      holdings: [],
      skipped: 0,
      error: 'Couldn’t find a Symbol (or Ticker) column and a Quantity (or Shares) column in this file.',
    }
  }

  const cols = findColumns(rows[headerIndex])
  const byTicker = new Map<string, ImportedHolding>()
  let skipped = 0
  let started = false

  for (const row of rows.slice(headerIndex + 1)) {
    // A blank line after the data ends the positions section; what follows
    // is usually disclaimers or a separate transactions table.
    if (isBlank(row)) {
      if (started) break
      continue
    }
    const cell = (f: Field) => (cols[f] === undefined ? undefined : row[cols[f]!]?.trim())
    const rawTicker = cell('ticker') ?? ''
    const value = parseNumber(cell('value'))

    let holding: ImportedHolding | undefined

    if (/^cash\b|cash & cash|cash and cash/i.test(rawTicker) && value > 0) {
      // Schwab-style cash line: a dollar amount with no shares.
      holding = { ticker: 'CASH', name: 'Cash', assetClass: 'cash', shares: value, price: 1, costBasis: 1, classGuessed: false }
    } else {
      const ticker = rawTicker.toUpperCase().replace(/[^A-Z0-9.]/g, '')
      // Real symbols have no spaces: "Account Total" and "Pending Activity" aren't holdings.
      const looksLikeSymbol = ticker.length > 0 && ticker.length <= 8 && !/\s/.test(rawTicker.replace(/\*+$/, ''))
      const known = lookupTicker(ticker)
      let shares = parseNumber(cell('shares'))
      // Core money market positions (like Fidelity's SPAXX) list only a dollar
      // value. At $1.00 a share, the value is the share count.
      const moneyMarket = known?.fixedPrice ?? (/money market/i.test(cell('name') ?? '') ? 1 : undefined)
      if (!(shares > 0) && moneyMarket && value > 0) shares = value / moneyMarket
      if (looksLikeSymbol && shares > 0) {
        const name = cell('name') || known?.name || ''
        let price = parseNumber(cell('price'))
        if (!(price > 0) && value > 0) price = value / shares
        if (!(price > 0)) price = known?.fixedPrice ?? 0
        let costBasis = parseNumber(cell('costPerShare'))
        if (!(costBasis > 0)) costBasis = parseNumber(cell('costTotal')) / shares
        if (!(costBasis > 0) && moneyMarket) costBasis = moneyMarket
        holding = {
          ticker,
          name: known?.name ?? name,
          assetClass: known?.assetClass ?? guessClass(name),
          shares,
          price: round(price, 4),
          costBasis: costBasis > 0 ? round(costBasis, 4) : 0,
          classGuessed: !known,
        }
      }
    }

    if (!holding) {
      skipped++
      continue
    }
    started = true
    const existing = byTicker.get(holding.ticker)
    byTicker.set(holding.ticker, existing ? combine(existing, holding) : holding)
  }

  const holdings = [...byTicker.values()]
  if (holdings.length === 0) {
    return { holdings, skipped, error: 'The file has the right columns but no rows with a symbol and a share count.' }
  }
  return { holdings, skipped }
}

/**
 * Two positions in the same fund, for example in two accounts: add the
 * shares and average the cost, weighted by shares. If either cost is
 * unknown the combined cost is too.
 */
export function combine<T extends Omit<Holding, 'id'>>(a: T, b: Omit<Holding, 'id'>): T {
  const shares = a.shares + b.shares
  const bothCosts = (a.costBasis ?? 0) > 0 && (b.costBasis ?? 0) > 0
  return {
    ...a,
    shares: round(shares, 6),
    price: b.price > 0 ? b.price : a.price,
    costBasis: bothCosts && shares > 0 ? round((a.shares * a.costBasis! + b.shares * b.costBasis!) / shares, 4) : 0,
  }
}

const round = (n: number, digits: number) => Math.round(n * 10 ** digits) / 10 ** digits

export const IMPORT_TEMPLATE = [
  'Symbol,Description,Quantity,Average Cost,Price',
  'VTI,Vanguard Total Stock Market ETF,120,214.60,286.40',
  'BND,Vanguard Total Bond Market ETF,400,76.20,72.85',
  'VMFXX,Vanguard Federal Money Market Fund,6000,1.00,1.00',
].join('\n')
