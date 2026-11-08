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
        // Digits and a decimal point only. Negative numbers aren't needed anywhere.
        const next = e.target.value.replace(/[^0-9.]/g, '')
        setDraft(next)
        const parsed = Number(next)
        // "1.2.3" isn't a number: keep the text but don't send it up.
        if (!Number.isNaN(parsed)) onValueChange(next === '' ? 0 : parsed)
      }}
      onBlur={e => {
        setDraft(null)
        onBlur?.(e)
      }}
    />
  )
}

// 0 shows as an empty field, so the placeholder appears instead.
const format = (n: number) => (n === 0 ? '' : String(n))
