import { describe, expect, it } from 'vitest'
import { lookupTicker, tickerChanges } from './tickers'
import type { Holding } from './types'

const blank: Holding = { id: 'h', ticker: '', name: '', assetClass: 'usEquity', shares: 0, price: 0 }

describe('lookupTicker', () => {
  it('finds a known ticker regardless of case or spaces', () => {
    expect(lookupTicker(' bnd ')).toEqual({ name: 'Vanguard Total Bond Market ETF', assetClass: 'bonds' })
  })

  it('returns nothing for an unknown ticker', () => {
    expect(lookupTicker('ZZZZ')).toBeUndefined()
  })
})

describe('tickerChanges', () => {
  it('fills in the name and asset class when the name is blank', () => {
    expect(tickerChanges(blank, 'VXUS')).toEqual({
      ticker: 'VXUS',
      name: 'Vanguard Total International Stock ETF',
      assetClass: 'intlEquity',
    })
  })

  it('replaces a name it filled in when the ticker changes', () => {
    const filled = { ...blank, ...tickerChanges(blank, 'V') } as Holding
    expect(filled.name).toBe('Visa Inc.')
    expect(tickerChanges(filled, 'VNQ')).toMatchObject({ name: 'Vanguard Real Estate ETF', assetClass: 'realEstate' })
  })

  it('clears a name it filled in when the ticker stops matching', () => {
    const filled = { ...blank, ...tickerChanges(blank, 'BND') } as Holding
    expect(tickerChanges(filled, 'BNDZ')).toEqual({ ticker: 'BNDZ', name: '' })
  })

  it('never overwrites a name the person typed', () => {
    const typed = { ...blank, name: 'My bond fund', assetClass: 'cash' as const }
    expect(tickerChanges(typed, 'BND')).toEqual({ ticker: 'BND' })
  })

  it('sets money market funds to $1.00', () => {
    expect(tickerChanges(blank, 'SPAXX')).toMatchObject({ assetClass: 'cash', price: 1 })
  })

  it('leaves the price alone for funds that need a quote', () => {
    expect(tickerChanges(blank, 'SGOV')).not.toHaveProperty('price')
  })

  it('leaves the name alone for an unknown ticker', () => {
    expect(tickerChanges(blank, 'XYZ')).toEqual({ ticker: 'XYZ', name: '' })
  })
})
