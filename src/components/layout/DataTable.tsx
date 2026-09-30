import type { ComponentProps, ElementType, ReactNode } from 'react'
import { ChevronRight, TriangleAlert } from 'lucide-react'
import { Card } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { TableCell, TableHead, TableRow } from '#/components/ui/table'
import { clickableRow } from '#/lib/dashboard-theme'
import { cn } from '#/lib/utils'
import { EmptyState } from './EmptyState'
import { SCROLL_SHADOW_CLASS, useScrollShadow } from './ScrollShadow'

/**
 * Card wrapping a `<Table>` (no padding, horizontal scroll). Build the table
 * with the shadcn `Table*` parts, `DataTableHead` for header cells and
 * `ClickableRow` / `TableRow` for body rows.
 */
export function DataTableCard({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  const ref = useScrollShadow<HTMLDivElement>('[data-slot="table-container"]')
  return (
    <Card
      ref={ref}
      className={cn('gap-0 py-0', SCROLL_SHADOW_CLASS, className)}
    >
      {children}
    </Card>
  )
}

const HEAD_CLASS =
  'h-auto bg-[#fafbfc] px-3 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-muted-foreground'

/** Standard header cell. Add `first` on the first column (extra left padding). */
export function DataTableHead({
  first,
  className,
  ...props
}: ComponentProps<typeof TableHead> & { first?: boolean }) {
  return (
    <TableHead
      className={cn(HEAD_CLASS, first && 'pl-[22px]', className)}
      {...props}
    />
  )
}

/** Class for the first body cell so it lines up with the first header cell. */
export const FIRST_CELL_CLASS = 'pl-[22px]'

/** Trailing chevron cell for clickable rows (pair with `DataTableHead className="w-10"`). */
export function RowChevron() {
  return (
    <TableCell className="pr-4 text-right">
      <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </TableCell>
  )
}

/**
 * Table row that navigates/opens on click and on Enter/Space (role=button,
 * focusable, visible focus ring). Use `RowChevron` as its last cell.
 */
export function ClickableRow({
  onActivate,
  className,
  ...props
}: Omit<ComponentProps<typeof TableRow>, 'onClick'> & {
  onActivate: () => void
}) {
  return (
    <TableRow
      className={cn(
        'group cursor-pointer outline-none hover:bg-[#f6f8fc] focus-visible:bg-[#f6f8fc] focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:ring-inset',
        className,
      )}
      {...clickableRow(onActivate)}
      {...props}
    />
  )
}

/**
 * Loading placeholder rows. `columns` = one width (in `w-*` quarter-rem units,
 * i.e. 28 → 112px) per column; use `leading="avatar"` when column 1 shows an avatar + name.
 */
export function TableSkeletonRows({
  rows = 8,
  columns,
  leading = 'text',
  trailing = false,
}: {
  rows?: number
  /** Widths of each column in px-quarter units (e.g. [36, 28, 32]). */
  columns: number[]
  leading?: 'avatar' | 'text'
  /** Adds an empty trailing cell (for the chevron column). */
  trailing?: boolean
}) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <TableRow key={i} className="hover:bg-transparent">
          {columns.map((w, j) => (
            <TableCell key={j} className={cn(j === 0 && FIRST_CELL_CLASS)}>
              {j === 0 && leading === 'avatar' ? (
                <div className="flex items-center gap-3">
                  <Skeleton className="size-9 rounded-full" />
                  <Skeleton className="h-4" style={{ width: `${w * 4}px` }} />
                </div>
              ) : (
                <Skeleton className="h-4" style={{ width: `${w * 4}px` }} />
              )}
            </TableCell>
          ))}
          {trailing && <TableCell />}
        </TableRow>
      ))}
    </>
  )
}

/** Full-width table row showing an `EmptyState` (empty list or no filter match). */
export function TableEmptyState({
  colSpan,
  icon,
  title,
  description,
  action,
}: {
  colSpan: number
  icon?: ElementType<{ className?: string }>
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="p-0">
        <EmptyState
          icon={icon}
          title={title}
          description={description}
          action={action}
        />
      </TableCell>
    </TableRow>
  )
}

/** Full-width table row for a failed fetch. `forbidden` switches to the 403 wording. */
export function TableErrorState({
  colSpan,
  title = 'Impossible de charger les données.',
  description = 'Vérifiez votre connexion ou vos droits d’accès, puis rechargez la page.',
  forbidden,
  action,
}: {
  colSpan: number
  title?: string
  description?: string
  forbidden?: boolean
  /** e.g. a « Réessayer » button calling `refetch`. */
  action?: ReactNode
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="p-0">
        <EmptyState
          icon={TriangleAlert}
          tone="error"
          title={forbidden ? 'Accès refusé.' : title}
          description={
            forbidden
              ? 'Vous n’avez pas les droits nécessaires pour consulter ces données.'
              : description
          }
          action={action}
        />
      </TableCell>
    </TableRow>
  )
}
