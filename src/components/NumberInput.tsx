import { useState, type InputHTMLAttributes } from 'react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: number
  onValueChange: (value: number) => void
}

/**
 * A number input that lets people type freely ("0.", "", "12.50") without
 * the parent's numeric state fighting them. While focused it shows the
 * person's own text; otherwise it shows the parent's value. That's derived
 * during render, so there's no effect keeping two pieces of state in sync.
 */
export function NumberInput({ value, onValueChange, onBlur, onFocus, ...rest }: Props) {
  const [draft, setDraft] = useState<string | null>(null)

  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      value={draft ?? format(value)}
      onFocus={e => {
        setDraft(format(value))
        onFocus?.(e)
      }}
      onChange={e => {
        const next = e.target.value.replace(/[^0-9.]/g, '')
        setDraft(next)
        const parsed = Number(next)
        if (!Number.isNaN(parsed)) onValueChange(next === '' ? 0 : parsed)
      }}
      onBlur={e => {
        setDraft(null)
        onBlur?.(e)
      }}
    />
  )
}

const format = (n: number) => (n === 0 ? '' : String(n))
