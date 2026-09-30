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
 * Column priority: the column is hidden while the content column (the
 * `@container/main` of `AppShell`, not the viewport) is narrower than
 *   sm 576 px · md 672 px · lg 896 px · xl 1024 px
 * (≈ viewport 640 / 768 / 1280 / 1360 with the menu open, 640 / 768 without it… minus
 * the page margins). Literal strings: Tailwind cannot see interpolated classes.
 */
export type HideBelow = 'sm' | 'md' | 'lg' | 'xl'

const HIDE_BELOW_CLASS: Record<HideBelow, string> = {
  sm: 'hidden @xl/main:table-cell',
  md: 'hidden @2xl/main:table-cell',
  lg: 'hidden @4xl/main:table-cell',
  xl: 'hidden @5xl/main:table-cell',
}

/** Classes that hide a table cell (head or body) below the given content width. */
export function hideBelowClass(hideBelow?: HideBelow) {
  return hideBelow ? HIDE_BELOW_CLASS[hideBelow] : undefined
}

/**
 * Sticky columns. `left` = identifier column (first), `right` = action column.
 * The edge shadow only shows while the table is scrolled (data-shadow-*,
 * set on the card by `useScrollShadow`). `data-sticky` lets `styles.css`
 * keep the row hover / selected colour on the sticky cell.
 */
export type StickySide = 'left' | 'right'

const STICKY_CELL_CLASS: Record<StickySide, string> = {
  left: 'sticky left-0 z-[1] bg-card in-data-[shadow-left=true]:shadow-[6px_0_8px_-6px_rgba(15,27,51,0.18)]',
  right:
    'sticky right-0 z-[1] bg-card in-data-[shadow-right=true]:shadow-[-6px_0_8px_-6px_rgba(15,27,51,0.18)]',
}

const STICKY_HEAD_CLASS: Record<StickySide, string> = {
  left: 'sticky left-0 z-[2] bg-[#fafbfc] in-data-[shadow-left=true]:shadow-[6px_0_8px_-6px_rgba(15,27,51,0.18)]',
  right:
    'sticky right-0 z-[2] bg-[#fafbfc] in-data-[shadow-right=true]:shadow-[-6px_0_8px_-6px_rgba(15,27,51,0.18)]',
}

/**
 * Same, but only once the content column is ≥ 576 px (`stickyFrom="sm"`):
 * below that, two sticky columns would not fit together in ≈ 326 px (L-007).
 */
const STICKY_CELL_FROM_SM_CLASS: Record<StickySide, string> = {
  left: '@xl/main:sticky @xl/main:left-0 @xl/main:z-[1] @xl/main:bg-card @xl/main:in-data-[shadow-left=true]:shadow-[6px_0_8px_-6px_rgba(15,27,51,0.18)]',
  right:
    '@xl/main:sticky @xl/main:right-0 @xl/main:z-[1] @xl/main:bg-card @xl/main:in-data-[shadow-right=true]:shadow-[-6px_0_8px_-6px_rgba(15,27,51,0.18)]',
}

const STICKY_HEAD_FROM_SM_CLASS: Record<StickySide, string> = {
  left: '@xl/main:sticky @xl/main:left-0 @xl/main:z-[2] @xl/main:bg-[#fafbfc] @xl/main:in-data-[shadow-left=true]:shadow-[6px_0_8px_-6px_rgba(15,27,51,0.18)]',
  right:
    '@xl/main:sticky @xl/main:right-0 @xl/main:z-[2] @xl/main:bg-[#fafbfc] @xl/main:in-data-[shadow-right=true]:shadow-[-6px_0_8px_-6px_rgba(15,27,51,0.18)]',
}

/** Content width from which a `sticky` column sticks (default: always). */
export type StickyFrom = 'sm'

/** Class of a sticky body cell (for raw `TableCell`s). */
export function stickyCellClass(side?: StickySide) {
  return side ? STICKY_CELL_CLASS[side] : undefined
}

/**
 * Card wrapping a `<Table>` (no padding, horizontal scroll). Build the table
 * with the shadcn `Table*` parts, `DataTableHead` for header cells and
 * `ClickableRow` / `TableRow` for body rows.
 */
export function DataTableCard({
  className,
  mobileCards,
  children,
}: {
  className?: string
  /**
   * List of cards (`MobileCardList`) shown INSTEAD of the table while the
   * content column is narrower than 672 px (`md`); the table is hidden then.
   */
  mobileCards?: ReactNode
  children: ReactNode
}) {
  const ref = useScrollShadow<HTMLDivElement>('[data-slot="table-container"]')
  return (
    <>
      {mobileCards && <div className="@2xl/main:hidden">{mobileCards}</div>}
      <Card
        ref={ref}
        className={cn(
          'gap-0 py-0',
          SCROLL_SHADOW_CLASS,
          mobileCards && 'hidden @2xl/main:flex',
          className,
        )}
      >
        {children}
      </Card>
    </>
  )
}

const HEAD_CLASS =
  'h-auto bg-[#fafbfc] px-3 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-muted-foreground'

/**
 * Standard header cell. `first` on the first column (extra left padding),
 * `hideBelow` to drop a secondary column on narrow content, `sticky` to pin
 * the column (`left` = identifier, `right` = actions). Give the matching body
 * cells the same `hideBelow` / `sticky` (`DataTableCell`).
 */
export function DataTableHead({
  first,
  hideBelow,
  sticky,
  stickyFrom,
  className,
  ...props
}: ComponentProps<typeof TableHead> & {
  first?: boolean
  hideBelow?: HideBelow
  sticky?: StickySide
  stickyFrom?: StickyFrom
}) {
  return (
    <TableHead
      data-sticky={sticky ? '' : undefined}
      className={cn(
        HEAD_CLASS,
        first && 'pl-[22px]',
        sticky &&
          (stickyFrom ? STICKY_HEAD_FROM_SM_CLASS : STICKY_HEAD_CLASS)[sticky],
        hideBelowClass(hideBelow),
        className,
      )}
      {...props}
    />
  )
}

/**
 * Body cell twin of `DataTableHead`: `first` (aligns with the first header
 * cell), `hideBelow`, `sticky`. Plain `TableCell` keeps working for cells
 * that need none of these.
 */
export function DataTableCell({
  first,
  hideBelow,
  sticky,
  stickyFrom,
  className,
  ...props
}: ComponentProps<typeof TableCell> & {
  first?: boolean
  hideBelow?: HideBelow
  sticky?: StickySide
  stickyFrom?: StickyFrom
}) {
  return (
    <TableCell
      data-sticky={sticky ? '' : undefined}
      className={cn(
        first && FIRST_CELL_CLASS,
        sticky &&
          (stickyFrom ? STICKY_CELL_FROM_SM_CLASS : STICKY_CELL_CLASS)[sticky],
        hideBelowClass(hideBelow),
        className,
      )}
      {...props}
    />
  )
}

/** Class for the first body cell so it lines up with the first header cell. */
export const FIRST_CELL_CLASS = 'pl-[22px]'

/** Trailing chevron cell for clickable rows (pair with `DataTableHead className="w-10"`). */
export function RowChevron() {
  return (
    // Sticky right: the « open » cue stays visible while the row scrolls.
    <TableCell
      data-sticky=""
      className={cn('pr-4 text-right', STICKY_CELL_CLASS.right)}
    >
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
  selected,
  className,
  ...props
}: Omit<ComponentProps<typeof TableRow>, 'onClick'> & {
  onActivate: () => void
  /**
   * Row whose detail is open. Tints the row AND its sticky cells (via
   * `data-selected`, see `styles.css`) — never tint a row with a `bg-*` class,
   * the opaque sticky cells would not follow.
   */
  selected?: boolean
}) {
  return (
    <TableRow
      data-selected={selected ? '' : undefined}
      className={cn(
        'group cursor-pointer outline-none data-[selected]:bg-primary/5 hover:bg-[#f6f8fc] focus-visible:bg-[#f6f8fc] focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:ring-inset',
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
  hideBelow,
}: {
  rows?: number
  /** Widths of each column in px-quarter units (e.g. [36, 28, 32]). */
  columns: number[]
  leading?: 'avatar' | 'text'
  /** Adds an empty trailing cell (for the chevron column). */
  trailing?: boolean
  /** Same priority as the real columns (index-aligned with `columns`). */
  hideBelow?: (HideBelow | undefined)[]
}) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <TableRow key={i} className="hover:bg-transparent">
          {columns.map((w, j) => (
            <TableCell
              key={j}
              className={cn(
                j === 0 && FIRST_CELL_CLASS,
                hideBelowClass(hideBelow?.[j]),
              )}
            >
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

/**
 * Keeps a full-width table state centred on the VISIBLE part of a horizontally
 * scrolling table (width = `--table-viewport`, set by `DataTableCard`), not on
 * the whole scrollable width where the text ends up cut off.
 */
function StickyToViewport({ children }: { children: ReactNode }) {
  return (
    <div className="sticky left-0 w-[var(--table-viewport,100%)] max-w-full">
      {children}
    </div>
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
        <StickyToViewport>
          <EmptyState
            icon={icon}
            title={title}
            description={description}
            action={action}
          />
        </StickyToViewport>
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
        <StickyToViewport>
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
        </StickyToViewport>
      </TableCell>
    </TableRow>
  )
}
