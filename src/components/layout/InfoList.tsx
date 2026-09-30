import type { ReactNode } from 'react'
import { cn } from '#/lib/utils'

/**
 * Definition list for read-only details. `columns` = 1 (default, stacked) or 2;
 * two columns only when the list itself is at least 384 px wide (container
 * query on the list, so a half-width card or a drawer stays on one column).
 * Put `InfoRow`s inside; typically wrapped in a `SectionCard`.
 */
export function InfoList({
  columns = 1,
  className,
  children,
}: {
  columns?: 1 | 2
  className?: string
  children: ReactNode
}) {
  return (
    <div className="@container">
      <dl
        className={cn(
          'grid gap-4',
          columns === 2 && '@sm:grid-cols-2 @sm:gap-x-6',
          className,
        )}
      >
        {children}
      </dl>
    </div>
  )
}

/**
 * Label (optional icon) + value. Empty values (`null`, `undefined`, `''`)
 * render a muted « — » (or `placeholder`).
 */
export function InfoRow({
  icon,
  label,
  children,
  placeholder = '—',
}: {
  icon?: ReactNode
  label: string
  children?: ReactNode
  /** Shown muted when `children` is empty, e.g. « Non renseignée ». */
  placeholder?: string
}) {
  const empty = children == null || children === '' || children === false
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground [&>svg]:size-3.5">
        {icon}
        {label}
      </dt>
      <dd
        className={cn(
          'mt-[3px] text-[13.5px] break-words',
          empty ? 'text-muted-foreground' : 'font-semibold',
        )}
      >
        {empty ? placeholder : children}
      </dd>
    </div>
  )
}
