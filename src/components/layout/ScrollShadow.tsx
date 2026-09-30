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
      // Visible width of the scroller: lets sticky children (table empty/error
      // states) size themselves to what the user actually sees.
      host.style.setProperty('--table-viewport', `${el.clientWidth}px`)
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

/** Selector of the « current » element of a strip (Radix tab, `aria-current` link). */
export const ACTIVE_ITEM_SELECTOR = '[data-state="active"], [aria-current]'

/**
 * Horizontal scroll (px, positive = to the right) needed to bring an item
 * fully into the visible part of its scroller, 0 when it already is.
 */
export function scrollDeltaToReveal(
  scroller: { left: number; right: number },
  item: { left: number; right: number },
  padding = 12,
) {
  if (item.left < scroller.left) return item.left - scroller.left - padding
  if (item.right > scroller.right) return item.right - scroller.right + padding
  return 0
}

/** Scrolls the scroller horizontally (never the page) so the active item is visible. */
export function scrollActiveIntoView(scroller: HTMLElement) {
  const active = scroller.querySelector<HTMLElement>(ACTIVE_ITEM_SELECTOR)
  if (!active) return
  const delta = scrollDeltaToReveal(
    scroller.getBoundingClientRect(),
    active.getBoundingClientRect(),
  )
  if (delta !== 0) scroller.scrollLeft += delta
}

/**
 * Horizontally scrollable strip (tabs, chips) with edge shadows as scroll
 * hint. The active item (`[data-state=active]`, `[aria-current]`) is scrolled
 * into view on mount and whenever it changes, so the current tab is never
 * hidden off-screen on a phone.
 */
export function ScrollShadow({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  const ref = useScrollShadow<HTMLDivElement>('[data-scroll]')
  useEffect(() => {
    const scroller = ref.current?.querySelector<HTMLElement>('[data-scroll]')
    if (!scroller) return
    scrollActiveIntoView(scroller)
    if (typeof MutationObserver === 'undefined') return
    // Only react to the active item itself (or an item that just lost/gained
    // `data-state=active` / `aria-current`), not to any descendant's data-state
    // (a Radix tooltip/popover inside the strip would re-scroll it).
    const observer = new MutationObserver((mutations) => {
      const relevant = mutations.some((mutation) => {
        const target = mutation.target as Element
        if (target.matches(ACTIVE_ITEM_SELECTOR)) return true
        // Item that stopped being active: its previous value was the active one.
        return (
          mutation.attributeName === 'data-state' &&
          mutation.oldValue === 'active'
        )
      })
      if (relevant) scrollActiveIntoView(scroller)
    })
    observer.observe(scroller, {
      subtree: true,
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ['data-state', 'aria-current'],
    })
    return () => observer.disconnect()
  }, [ref])
  return (
    <div ref={ref} className={cn(SCROLL_SHADOW_CLASS, className)}>
      <div data-scroll className="max-w-full overflow-x-auto">
        {children}
      </div>
    </div>
  )
}
