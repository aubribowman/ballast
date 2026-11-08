import type { AssetClass, Holding } from './types'

/** What we know about a ticker without looking it up online. */
export interface KnownTicker {
  name: string
  assetClass: AssetClass
  /** Money market funds hold their price at $1.00, so they need no quote. */
  fixedPrice?: number
}

/**
 * Common funds and stocks, so typing a ticker can fill in its name and
 * asset class. Built in rather than fetched: no API key, works offline,
 * and nothing about the portfolio leaves the browser. Prices come from
 * quotes.ts or are typed in; they aren't stored here.
 *
 * To add a fund, add it to the right `add(...)` call below.
 */
const directory: Record<string, KnownTicker> = {}

/** Adds a group of tickers that share an asset class (and a fixed price, for money market funds). */
function add(assetClass: AssetClass, entries: Record<string, string>, fixedPrice?: number) {
  for (const [ticker, name] of Object.entries(entries)) {
    directory[ticker] = fixedPrice ? { name, assetClass, fixedPrice } : { name, assetClass }
  }
}

add('usEquity', {
  VTI: 'Vanguard Total Stock Market ETF',
  VOO: 'Vanguard S&P 500 ETF',
  SPY: 'SPDR S&P 500 ETF Trust',
  IVV: 'iShares Core S&P 500 ETF',
  ITOT: 'iShares Core S&P Total U.S. Stock Market ETF',
  SCHB: 'Schwab U.S. Broad Market ETF',
  SCHX: 'Schwab U.S. Large-Cap ETF',
  SCHD: 'Schwab U.S. Dividend Equity ETF',
  QQQ: 'Invesco QQQ Trust',
  VUG: 'Vanguard Growth ETF',
  VTV: 'Vanguard Value ETF',
  VO: 'Vanguard Mid-Cap ETF',
  VB: 'Vanguard Small-Cap ETF',
  VIG: 'Vanguard Dividend Appreciation ETF',
  VYM: 'Vanguard High Dividend Yield ETF',
  IJH: 'iShares Core S&P Mid-Cap ETF',
  IJR: 'iShares Core S&P Small-Cap ETF',
  IWM: 'iShares Russell 2000 ETF',
  DIA: 'SPDR Dow Jones Industrial Average ETF Trust',
  RSP: 'Invesco S&P 500 Equal Weight ETF',
  VTSAX: 'Vanguard Total Stock Market Index Fund Admiral Shares',
  VFIAX: 'Vanguard 500 Index Fund Admiral Shares',
  FXAIX: 'Fidelity 500 Index Fund',
  FSKAX: 'Fidelity Total Market Index Fund',
  FZROX: 'Fidelity ZERO Total Market Index Fund',
  SWTSX: 'Schwab Total Stock Market Index Fund',
  SWPPX: 'Schwab S&P 500 Index Fund',
  AAPL: 'Apple Inc.',
  MSFT: 'Microsoft Corporation',
  NVDA: 'NVIDIA Corporation',
  AMZN: 'Amazon.com, Inc.',
  GOOGL: 'Alphabet Inc. Class A',
  GOOG: 'Alphabet Inc. Class C',
  META: 'Meta Platforms, Inc.',
  TSLA: 'Tesla, Inc.',
  'BRK.B': 'Berkshire Hathaway Inc. Class B',
  AVGO: 'Broadcom Inc.',
  JPM: 'JPMorgan Chase & Co.',
  V: 'Visa Inc.',
  JNJ: 'Johnson & Johnson',
  WMT: 'Walmart Inc.',
  PG: 'Procter & Gamble Co.',
  UNH: 'UnitedHealth Group Inc.',
  HD: 'The Home Depot, Inc.',
  KO: 'The Coca-Cola Company',
  COST: 'Costco Wholesale Corporation',
  XOM: 'Exxon Mobil Corporation',
})

add('intlEquity', {
  VXUS: 'Vanguard Total International Stock ETF',
  VEA: 'Vanguard FTSE Developed Markets ETF',
  VWO: 'Vanguard FTSE Emerging Markets ETF',
  IXUS: 'iShares Core MSCI Total International Stock ETF',
  IEFA: 'iShares Core MSCI EAFE ETF',
  IEMG: 'iShares Core MSCI Emerging Markets ETF',
  EFA: 'iShares MSCI EAFE ETF',
  EEM: 'iShares MSCI Emerging Markets ETF',
  SCHF: 'Schwab International Equity ETF',
  VTIAX: 'Vanguard Total International Stock Index Fund Admiral Shares',
  FTIHX: 'Fidelity Total International Index Fund',
  FZILX: 'Fidelity ZERO International Index Fund',
})

add('bonds', {
  BND: 'Vanguard Total Bond Market ETF',
  BNDX: 'Vanguard Total International Bond ETF',
  AGG: 'iShares Core U.S. Aggregate Bond ETF',
  SCHZ: 'Schwab U.S. Aggregate Bond ETF',
  BSV: 'Vanguard Short-Term Bond ETF',
  BIV: 'Vanguard Intermediate-Term Bond ETF',
  VGSH: 'Vanguard Short-Term Treasury ETF',
  VGIT: 'Vanguard Intermediate-Term Treasury ETF',
  SHY: 'iShares 1-3 Year Treasury Bond ETF',
  IEF: 'iShares 7-10 Year Treasury Bond ETF',
  TLT: 'iShares 20+ Year Treasury Bond ETF',
  TIP: 'iShares TIPS Bond ETF',
  VTIP: 'Vanguard Short-Term Inflation-Protected Securities ETF',
  VTEB: 'Vanguard Tax-Exempt Bond ETF',
  MUB: 'iShares National Muni Bond ETF',
  LQD: 'iShares iBoxx $ Investment Grade Corporate Bond ETF',
  HYG: 'iShares iBoxx $ High Yield Corporate Bond ETF',
  VBTLX: 'Vanguard Total Bond Market Index Fund Admiral Shares',
  FXNAX: 'Fidelity U.S. Bond Index Fund',
})

add('realEstate', {
  VNQ: 'Vanguard Real Estate ETF',
  VNQI: 'Vanguard Global ex-U.S. Real Estate ETF',
  SCHH: 'Schwab U.S. REIT ETF',
  IYR: 'iShares U.S. Real Estate ETF',
  XLRE: 'Real Estate Select Sector SPDR Fund',
  VGSLX: 'Vanguard Real Estate Index Fund Admiral Shares',
  FSRNX: 'Fidelity Real Estate Index Fund',
  O: 'Realty Income Corporation',
})

add('cash', {
  VMFXX: 'Vanguard Federal Money Market Fund',
  VUSXX: 'Vanguard Treasury Money Market Fund',
  SPAXX: 'Fidelity Government Money Market Fund',
  FDRXX: 'Fidelity Government Cash Reserves',
  SWVXX: 'Schwab Value Advantage Money Fund',
}, 1)

// Treasury-bill ETFs trade like cash but their price moves, so they get quotes.
add('cash', {
  SGOV: 'iShares 0-3 Month Treasury Bond ETF',
  BIL: 'SPDR Bloomberg 1-3 Month T-Bill ETF',
  USFR: 'WisdomTree Floating Rate Treasury Fund',
})

/** Every known ticker, A–Z. Feeds the ticker autocomplete list. */
export const knownTickers = Object.entries(directory)
  .map(([ticker, info]) => ({ ticker, ...info }))
  .sort((a, b) => a.ticker.localeCompare(b.ticker))

/** Finds a ticker, ignoring case and spaces. */
export function lookupTicker(ticker: string): KnownTicker | undefined {
  return directory[ticker.trim().toUpperCase()]
}

/**
 * The changes to make when someone edits a holding's ticker. The name and
 * asset class follow the ticker only while the name is blank or still the
 * one we filled in, so a name the person typed is never overwritten.
 */
export function tickerChanges(holding: Holding, ticker: string): Partial<Omit<Holding, 'id'>> {
  const previous = lookupTicker(holding.ticker)
  const nameIsOurs = holding.name.trim() === '' || holding.name === previous?.name
  if (!nameIsOurs) return { ticker }

  const match = lookupTicker(ticker)
  if (match) {
    const changes = { ticker, name: match.name, assetClass: match.assetClass }
    // Money market funds: fill in the $1.00 price and cost too.
    return match.fixedPrice ? { ...changes, price: match.fixedPrice, costBasis: match.fixedPrice } : changes
  }
  // Typed past a match (VT -> VTX): clear the name we filled in.
  return { ticker, name: '' }
}
