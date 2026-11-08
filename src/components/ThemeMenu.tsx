import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTheme, type Theme } from '../state/useTheme'
import styles from './ThemeMenu.module.css'

const icon = (path: ReactNode) => (
  <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    {path}
  </svg>
)

const options: { value: Theme; label: string; icon: ReactNode }[] = [
  {
    value: 'system',
    label: 'Match system',
    icon: icon(<><rect x="2.5" y="3.5" width="15" height="10" rx="1.5" /><path d="M7 16.5h6M10 13.5v3" /></>),
  },
  {
    value: 'light',
    label: 'Light',
    icon: icon(<><circle cx="10" cy="10" r="3.5" /><path d="M10 1.75v2M10 16.25v2M1.75 10h2M16.25 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4" /></>),
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: icon(<path d="M16.5 12.2A7 7 0 0 1 7.8 3.5a7 7 0 1 0 8.7 8.7Z" />),
  },
]

/** Masthead button that opens a menu to pick the light, dark or system theme. */
export function ThemeMenu() {
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const current = options.find(o => o.value === theme)!

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        button.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    // Move focus to the chosen option so arrow keys work straight away.
    root.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus()
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function onMenuKey(e: React.KeyboardEvent) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const items = [...(root.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? [])]
    const i = items.indexOf(document.activeElement as HTMLElement)
    items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus()
  }

  return (
    <div className={styles.wrap} ref={root}>
      <button
        ref={button}
        type="button"
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Theme: ${current.label}`}
        title="Theme"
        onClick={() => setOpen(o => !o)}
      >
        {current.icon}
      </button>
      {open && (
        <div className={styles.menu} role="menu" aria-label="Theme" onKeyDown={onMenuKey}>
          <p className={styles.heading} aria-hidden="true">Theme</p>
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              role="menuitemradio"
              aria-checked={theme === o.value}
              className={styles.item}
              onClick={() => {
                setTheme(o.value)
                setOpen(false)
                button.current?.focus()
              }}
            >
              {o.icon}
              <span>{o.label}</span>
              {theme === o.value && (
                <svg className={styles.check} viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                  <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
