import { useLayoutEffect, useRef, useState } from 'react'

const MIN_GAIN = 24 // don't move the panel for a few pixels; avoids flip-flopping

/**
 * Picks which column a movable panel goes in so the two columns come out as
 * close in height as possible. Whatever difference is left is taken up by
 * stretching each column's last panel (see the page styles).
 *
 * `measuringClass` must turn that stretching off, so panels can be measured
 * at their natural height. It's added and removed within one frame, so it
 * never shows.
 */
export function useBalancedColumns(singleColumnQuery: string, measuringClass: string) {
  const gridRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLDivElement>(null)
  const sideRef = useRef<HTMLElement>(null)
  const movableRef = useRef<HTMLDivElement>(null)
  const [inSide, setInSide] = useState(false)

  useLayoutEffect(() => {
    const grid = gridRef.current
    const main = mainRef.current
    const side = sideRef.current
    const movable = movableRef.current
    if (!grid || !main || !side || !movable) return

    let retry: number | undefined

    const measure = () => {
      window.clearTimeout(retry)
      if (window.matchMedia?.(singleColumnQuery).matches) {
        setInSide(false)
        return
      }
      grid.classList.add(measuringClass)
      const gap = parseFloat(getComputedStyle(main).rowGap) || 0
      const height = (column: HTMLElement) => {
        const panels = [...column.children].filter(el => el !== movable && el.getBoundingClientRect().height > 0)
        return panels.reduce((sum, el) => sum + el.getBoundingClientRect().height, 0) + gap * Math.max(0, panels.length - 1)
      }
      const movableHeight = movable.getBoundingClientRect().height
      const m = height(main)
      const s = height(side)
      grid.classList.remove(measuringClass)
      if (movableHeight === 0) {
        // The chart loads separately; check again once it's had time to arrive.
        retry = window.setTimeout(measure, 250)
        return
      }

      const x = movableHeight + gap
      const diffInMain = Math.abs(m + x - s)
      const diffInSide = Math.abs(m - (s + x))
      setInSide(current => {
        const better = diffInSide < diffInMain
        return better !== current && Math.abs(diffInMain - diffInSide) > MIN_GAIN ? better : current
      })
    }

    measure()
    // Re-measure when any panel's content changes size, e.g. more trades.
    const observer = new ResizeObserver(() => measure())
    for (const column of [main, side]) for (const child of column.children) observer.observe(child)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.clearTimeout(retry)
      window.removeEventListener('resize', measure)
    }
  }, [inSide, singleColumnQuery, measuringClass])

  return { gridRef, mainRef, sideRef, movableRef, inSide }
}
