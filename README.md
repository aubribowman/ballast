# Ballast: portfolio rebalancer

Ballast shows how far a portfolio has drifted from its target asset mix and suggests the trades that would bring it back. It can do a full rebalance with buys and sells, or invest only new cash so nothing is sold and no capital gains are realized.

Built with **React 19**, **TypeScript** and **Vite**, with charts from Recharts and tests in Vitest and Testing Library.

<!-- Add a screenshot or GIF here, and a link to the live demo once deployed -->

## Features

- **Drift chart.** Each asset class shows where it sits relative to its target, with the tolerance band shaded. A second marker shows where the suggested trades would leave it.
- **Two rebalancing methods.** *Full rebalance* buys and sells to hit target exactly. *Invest new cash only* spends a contribution on whatever is underweight, in proportion to how far behind each class is, and sells nothing.
- **Tolerance band.** Classes within ±N points of target are left alone unless there’s new cash, which avoids lots of tiny trades.
- **Model portfolios.** Conservative, Moderate, Growth and Aggressive presets, or set custom targets.
- **Whole or fractional shares.** Buys round down and sells round up, so a plan never spends more cash than it has.
- **CSV export** of the trade list.
- **Saves in the browser**, so the portfolio is still there after a refresh.

## Running it

You need [Node.js 20+](https://nodejs.org).

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # Vitest in watch mode
npm run build   # production build in dist/
npm run lint
```

## How it’s built

```
src/
  domain/      Pure TypeScript: types, the rebalancing algorithm, formatting, CSV
  state/       Reducer, context provider, usePortfolio hook, sample data
  components/  UI components, each with a CSS module
  test/        Test setup
```

**The algorithm has no React in it.** `domain/rebalance.ts` takes holdings, targets and settings and returns a plan. That keeps the financial logic easy to test on its own (`rebalance.test.ts`) and keeps components focused on display.

**State lives in one reducer, shared through context.** Every change is a typed action (`addHolding`, `setTarget`, `updateSettings` and so on), handled by a pure `portfolioReducer` that returns new objects instead of mutating old ones. The provider exposes the portfolio, the plan and `dispatch` through a `usePortfolio()` hook.

**The plan is derived, never stored.** The rebalancing plan is recalculated from the portfolio with `useMemo`, so it can’t fall out of sync with the inputs, and it only recalculates when the portfolio actually changes.

**Number inputs keep the person’s text while they type.** `NumberInput` shows its own draft while focused and the parent’s number otherwise, derived during render rather than synced with an effect. That lets someone type `0.` or clear the field without the value jumping.

**The chart loads separately.** Recharts is the largest dependency, so the allocation chart is loaded with `React.lazy` and `Suspense`, keeping the first load smaller.

## Testing

- `domain/rebalance.test.ts`: tolerance bands, buy and sell math, buy-only mode, whole-share rounding never overspending, and warnings for classes with nothing to buy
- `state/portfolioReducer.test.ts`: updates are immutable and scoped to the right holding
- `App.test.tsx`: renders the app and drives it the way a person would, through labels and roles

## Roadmap

- Live prices from a market data API
- Tax lots, so sells come from the lots with the smallest gains first
- Several accounts (taxable, IRA, Roth) rebalanced together
- Import holdings from a brokerage CSV

This is a portfolio project, not investment advice. Prices are entered by hand, and the sample prices are illustrative.
