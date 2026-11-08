import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

// Recharts' ResponsiveContainer measures its parent; jsdom has no layout engine.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// jsdom has no scrolling; the router scrolls to the top on page changes,
// and adding a suggested fund scrolls to its price.
window.scrollTo = () => {}
Element.prototype.scrollIntoView ??= () => {}
