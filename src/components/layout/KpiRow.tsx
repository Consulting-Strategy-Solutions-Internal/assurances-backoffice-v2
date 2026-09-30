import type { ReactNode } from 'react'
import { cn } from '#/lib/utils'

/**
 * Responsive grid for `KpiCard`s. `cols` = number of cards on wide screens
 * (3 or 4); always 2 columns on small screens (1 for 3 cards on phones).
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
        'mb-[18px] grid gap-4',
        cols === 4 ? 'grid-cols-2 xl:grid-cols-4' : 'sm:grid-cols-3',
        className,
      )}
    >
      {children}
    </div>
  )
}
