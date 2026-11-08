import type { ReactNode } from 'react'
import styles from './Panel.module.css'

export function Panel({ title, actions, children, id }: { title: string; actions?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section className={styles.panel} aria-labelledby={id}>
      <header className={styles.header}>
        <h2 id={id}>{title}</h2>
        {actions && <div className={styles.actions}>{actions}</div>}
      </header>
      {children}
    </section>
  )
}
