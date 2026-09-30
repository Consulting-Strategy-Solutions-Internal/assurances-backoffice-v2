import type { ReactNode } from 'react'
import { cn } from '#/lib/utils'

/** Grid classes per `cols` (literal strings: Tailwind cannot see interpolated ones). */
export const KPI_ROW_CLASS = {
  // 2 columns until the content column is 896 px wide, then 4.
  4: 'grid-cols-2 @4xl/main:grid-cols-4',
  // 2 columns on phones (the 3rd card spans both), 3 from 576 px of content.
  3: 'grid-cols-2 @xl/main:grid-cols-3 [&>:nth-child(3):last-child]:col-span-2 @xl/main:[&>:nth-child(3):last-child]:col-span-1',
} as const

/**
 * Responsive grid for `KpiCard`s. `cols` = number of cards on wide content
 * (3 or 4). Breakpoints follow the width of the content column
 * (`@container/main`), not the viewport: at 1024 px with the menu open the
 * row behaves like a 700 px layout.
 */
export function KpiRow({
  cols = 4,
  className,
  children,
}: {
  cols?: 3 | 4
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'mb-[18px] grid gap-3 @xl/main:gap-4',
        KPI_ROW_CLASS[cols],
        className,
      )}
    >
      {children}
    </div>
  )
}
