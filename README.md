# Ballast: portfolio rebalancer

Ballast shows how far a portfolio has drifted from its target asset mix and suggests the trades that would bring it back. It can do a full rebalance with buys and sells, or invest only new cash so nothing is sold and no capital gains are realized.

Built with **React 19**, **TypeScript** and **Vite**, with charts from Recharts, Excel export from ExcelJS, and tests in Vitest and Testing Library.

<!-- Add a screenshot or GIF here, and a link to the live demo once deployed -->

## Features

- **Drift chart.** Each asset class shows where it sits relative to its target, with the tolerance band shaded. A second marker shows where the suggested trades would leave it.
- **Two rebalancing methods.** *Full rebalance* buys and sells to hit target exactly. *Invest new cash only* spends a contribution on whatever is underweight, in proportion to how far behind each class is, and sells nothing.
- **Tolerance band.** Classes within ±N points of target are left alone unless there’s new cash, which avoids lots of tiny trades.
- **Model portfolios.** Conservative, Moderate, Growth and Aggressive presets, or set custom targets.
- **Ticker lookup.** Typing a common ticker fills in the fund name and asset class from a built-in list.
- **Live prices (optional).** With a free [Twelve Data](https://twelvedata.com) API key, prices fill in automatically. Money market funds are always $1.00.
- **Import from a brokerage.** Read the positions CSV from Fidelity, Schwab, Vanguard and others, including what you paid per share. A preview shows what will change before anything is saved.
- **Gains and taxes.** Unrealized gain/loss per holding, and the estimated realized gain from each suggested sale.
- **Fund suggestions.** When the target includes an asset class you don’t hold, it offers example index funds you can add in one click.
- **Whole or fractional shares.** Buys round down and sells round up, so a plan never spends more cash than it has.
- **Branded Excel export** with the plan, holdings and allocation on separate sheets, plus a plain CSV of the trades.
- **Light and dark themes**, following the system setting or a choice in the header menu.
- **Saves in the browser**, so the portfolio is still there after a refresh. There’s no server or account.

## Running it

You need [Node.js 20+](https://nodejs.org).

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # Vitest in watch mode
npm run build   # production build in dist/
npm run lint    # oxlint
```

Live prices are optional. To try them, get a free key from Twelve Data and paste it into the form under the Holdings table. The key is saved only in your browser’s localStorage. There are no environment variables or secrets to set up.

## Where things are

```
src/
  main.tsx       Entry point: wraps the app in PortfolioProvider
  App.tsx        Page shell: header, current page, footer
  useRoute.ts    Two-page hash router (#/ and #/rebalancer)
  index.css      Design tokens (colors, fonts) for light and dark themes
  domain/        Pure TypeScript, no React: types, the rebalancing algorithm,
                 gains, formatting, ticker list, CSV import, price API client
  state/         Portfolio reducer and context, live prices, theme
  pages/         HomePage, RebalancerPage, and the column-balancing hook
  components/    UI panels, each with a CSS module
  export/        The Excel workbook and the logo image it uses
  test/          Test setup (stubs for browser APIs jsdom lacks)
```

Good places to start reading:

1. `domain/types.ts`: the data shapes everything else uses.
2. `domain/rebalance.ts`: the algorithm, with the steps explained at the top.
3. `state/portfolioReducer.ts`: every change the app can make, as a list of actions.
4. `pages/RebalancerPage.tsx`: how the panels fit together.

## How it’s built

**The algorithm has no React in it.** `domain/rebalance.ts` takes holdings, targets and settings and returns a plan. That keeps the financial logic easy to test on its own and keeps components focused on display. The same goes for CSV import, gains and price parsing.

**State lives in one reducer, shared through context.** Every change is a typed action (`addHolding`, `importHoldings`, `setPrices`, `updateSettings` and so on), handled by a pure `portfolioReducer` that returns new objects instead of mutating old ones. Components read and change it through the `usePortfolio()` hook.

**The plan is derived, never stored.** The rebalancing plan is recalculated from the portfolio with `useMemo`, so it can’t fall out of sync with the inputs.

**Live prices go through the same reducer.** `useLivePrices` fetches quotes and sends a `setPrices` action, so nothing else in the app needs to know whether a price was typed or fetched. New tickers are priced shortly after someone stops typing, in batches that fit the free plan’s rate limit.

**Number inputs keep the person’s text while they type.** `NumberInput` shows its own draft while focused and the parent’s number otherwise, so someone can type `0.` or clear the field without the value jumping.

**Large libraries load only when needed.** Recharts (the mix chart) loads with `React.lazy`, and ExcelJS loads when someone clicks *Export to Excel*. The first page load stays small.

**Columns balance themselves.** On wide screens, `useBalancedColumns` measures both columns and puts the mix chart in whichever is shorter, so the page doesn’t end in a gap.

**Themes switch on one attribute.** `index.css` defines color tokens, with dark values under `prefers-color-scheme` and `data-theme`. A small inline script in `index.html` applies a saved choice before the first paint, so there’s no flash.

## Testing

```bash
npm test -- --run   # run once instead of watching
```

- `domain/rebalance.test.ts`: tolerance bands, buy and sell math, buy-only mode, whole-share rounding never overspending
- `domain/csvImport.test.ts`: Fidelity-, Schwab- and Vanguard-style exports, money market rows, combining accounts
- `domain/gains.test.ts`, `quotes.test.ts`, `tickers.test.ts`, `suggestions.test.ts`: the smaller helpers
- `state/portfolioReducer.test.ts`: updates are immutable and scoped to the right holding
- `export/planWorkbook.test.ts`: writes a real `.xlsx`, reopens it and checks sheets, formats, formulas and the logo
- `App.test.tsx`: renders the app and drives it the way a person would, through labels and roles

Tests never call the real price API; they use mocked responses.

## Roadmap

- Tax lots, so sells come from the lots with the smallest gains first
- Several accounts (taxable, IRA, Roth) rebalanced together

---

This is a portfolio project, not investment advice. Prices may be delayed or entered by hand, and the sample prices are illustrative.
