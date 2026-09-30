import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { cn } from '#/lib/utils'

/**
 * Classes for a `relative overflow-hidden` wrapper: a soft edge shadow shows
 * on the side(s) where the scrollable child still has content out of view
 * (driven by `data-shadow-left/right`, set by `useScrollShadow`).
 */
export const SCROLL_SHADOW_CLASS = cn(
  'relative overflow-hidden',
  'before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:z-10 before:w-6 before:bg-gradient-to-r before:from-black/[0.09] before:to-transparent before:opacity-0 before:transition-opacity',
  'after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:z-10 after:w-6 after:bg-gradient-to-l after:from-black/[0.09] after:to-transparent after:opacity-0 after:transition-opacity',
  'data-[shadow-left=true]:before:opacity-100 data-[shadow-right=true]:after:opacity-100',
)

/**
 * Tracks the horizontal scroll state of the element matching `selector`
 * inside the returned ref's element and mirrors it in `data-shadow-left/right`.
 */
export function useScrollShadow<T extends HTMLElement>(selector: string) {
  const ref = useRef<T>(null)
  useEffect(() => {
    const host = ref.current
    const el = host?.querySelector<HTMLElement>(selector)
    if (!host || !el) return
    const update = () => {
      host.dataset.shadowLeft = String(el.scrollLeft > 1)
      host.dataset.shadowRight = String(
        el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
      )
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    // Absent in some test environments (jsdom).
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    observer?.observe(el)
    for (const child of Array.from(el.children)) observer?.observe(child)
    return () => {
      el.removeEventListener('scroll', update)
      observer?.disconnect()
    }
  }, [selector])
  return ref
}

/** Horizontally scrollable strip (tabs, chips) with edge shadows as scroll hint. */
export function ScrollShadow({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  const ref = useScrollShadow<HTMLDivElement>('[data-scroll]')
  return (
    <div ref={ref} className={cn(SCROLL_SHADOW_CLASS, className)}>
      <div data-scroll className="max-w-full overflow-x-auto">
        {children}
      </div>
    </div>
  )
}
