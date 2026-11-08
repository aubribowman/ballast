import { useState } from 'react'
import { QUOTE_PROVIDER } from '../domain/quotes'
import type { LivePrices } from '../state/useLivePrices'
import styles from './PriceSource.module.css'

const time = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

/** Where prices come from: a form to add a quote API key, or the latest update status. */
export function PriceSource({ prices }: { prices: LivePrices }) {
  const { apiKey, setApiKey, status } = prices
  const [draft, setDraft] = useState('')

  if (!apiKey) {
    return (
      <form
        className={styles.setup}
        onSubmit={e => {
          e.preventDefault()
          setApiKey(draft)
          setDraft('')
        }}
      >
        <div className={styles.copy}>
          <strong>Fill in prices automatically</strong>
          <span>
            Add a free {QUOTE_PROVIDER.name} API key and prices update when you open this page or enter a ticker.
            Money market funds are set to $1.00 without one.{' '}
            <a href={QUOTE_PROVIDER.signupUrl} target="_blank" rel="noreferrer">Get a free key</a>
          </span>
        </div>
        <div className={styles.keyRow}>
          <label htmlFor="quote-key" className="visually-hidden">{QUOTE_PROVIDER.name} API key</label>
          <input
            id="quote-key"
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder="API key"
            value={draft}
            onChange={e => setDraft(e.target.value)}
          />
          <button type="submit" className="button" disabled={!draft.trim()}>Save key</button>
        </div>
      </form>
    )
  }

  return (
    <div className={styles.status} role="status">
      <p>
        {status.loading
          ? 'Updating prices…'
          : status.updatedAt
            ? `Prices from ${QUOTE_PROVIDER.name}, updated ${time(status.updatedAt)}.`
            : `Prices come from ${QUOTE_PROVIDER.name}.`}{' '}
        <button type="button" className={styles.link} onClick={() => setApiKey('')}>Remove key</button>
      </p>
      {status.error && <p className={styles.problem}>{status.error}</p>}
      {!status.error && status.missing.length > 0 && (
        <p className={styles.problem}>
          No price found for {status.missing.join(', ')}. Enter {status.missing.length === 1 ? 'it' : 'them'} by hand.
        </p>
      )}
    </div>
  )
}
