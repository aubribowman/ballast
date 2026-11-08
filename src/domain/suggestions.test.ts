import { describe, expect, it } from 'vitest'
import { assetClasses } from './assetClasses'
import { exampleFunds } from './suggestions'

describe('exampleFunds', () => {
  it('offers three known funds in the right class for every asset class', () => {
    for (const c of assetClasses) {
      const funds = exampleFunds(c)
      expect(funds).toHaveLength(3)
      for (const f of funds) {
        expect(f.name).toBeTruthy()
        expect(f.assetClass).toBe(c)
      }
    }
  })
})
