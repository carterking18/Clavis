'use client'
import { useLayoutEffect, useRef } from 'react'

// The one animation in Clavis: when a ranked list changes order (new merchant
// or category), each row slides from where it was to where it is now.
// Usage: const ref = useReorder(ids); <li ref={ref(id)}>…</li>
export function useReorder(keys) {
  const nodes = useRef(new Map())
  const lastTops = useRef(new Map())
  const order = keys.join('|')

  useLayoutEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const tops = new Map()
    nodes.current.forEach((el, key) => tops.set(key, el.getBoundingClientRect().top))
    if (!reduce) {
      tops.forEach((top, key) => {
        const before = lastTops.current.get(key)
        const dy = before == null ? 0 : before - top
        if (Math.abs(dy) < 1) return
        nodes.current.get(key).animate(
          [{ transform: `translateY(${dy}px)` }, { transform: 'none' }],
          { duration: 220, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }
        )
      })
    }
    lastTops.current = tops
  }, [order])

  return key => el => {
    if (el) nodes.current.set(key, el)
    else nodes.current.delete(key)
  }
}
