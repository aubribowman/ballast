import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'
import { PortfolioProvider } from './state/PortfolioProvider'
import { samplePortfolio } from './state/samplePortfolio'

function renderApp() {
  render(
    <PortfolioProvider initial={samplePortfolio()}>
      <App />
    </PortfolioProvider>,
  )
  return userEvent.setup()
}

const tradesTable = () => within(screen.getByRole('region', { name: 'Suggested trades' })).queryByRole('table')

describe('App', () => {
  it('suggests sells and buys for the drifted sample portfolio', () => {
    renderApp()
    const table = tradesTable()!
    expect(within(table).getAllByText('Sell').length).toBeGreaterThan(0)
    expect(within(table).getAllByText('Buy').length).toBeGreaterThan(0)
  })

  it('switches to buys only when new-cash mode is chosen', async () => {
    const user = renderApp()
    await user.type(screen.getByLabelText('New cash to invest'), '5000')
    await user.click(screen.getByLabelText(/Invest new cash only/))
    const table = tradesTable()!
    expect(within(table).queryByText('Sell')).not.toBeInTheDocument()
    expect(within(table).getAllByText('Buy').length).toBeGreaterThan(0)
  })

  it('explains what to fix when targets stop adding up to 100%', async () => {
    const user = renderApp()
    const bonds = screen.getByLabelText('Bonds')
    await user.clear(bonds)
    await user.type(bonds, '10')
    expect(screen.getByText('Targets add up to 93%. Adjust them to total 100%.')).toBeInTheDocument()
    expect(tradesTable()).toBeNull()
  })
})
