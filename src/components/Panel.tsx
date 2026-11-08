import type { ReactNode } from 'react'
import styles from './Panel.module.css'

/**
 * The white card used for every section of the rebalancer: a title bar with
 * optional buttons on the right, and a body. Pass `id` so the heading labels
 * the section for screen readers.
 */
export function Panel({ title, actions, children, id }: { title: string; actions?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section className={styles.panel} aria-labelledby={id}>
      <header className={styles.header}>
        <h2 id={id}>{title}</h2>
        {actions && <div className={styles.actions}>{actions}</div>}
      </header>
      <div className={styles.body}>{children}</div>
    </section>
  )
}
