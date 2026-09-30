import type { ElementType, ReactNode } from 'react'
import { ChevronRight, TriangleAlert } from 'lucide-react'
import { Skeleton } from '#/components/ui/skeleton'
import { clickableRow } from '#/lib/dashboard-theme'
import { cn } from '#/lib/utils'
import { EmptyState } from './EmptyState'

/**
 * List of tappable cards that replaces a table on narrow content (pass it to
 * `DataTableCard mobileCards`). Same four states as the table: loading
 * (skeleton cards), error, 403 (`forbidden`), empty.
 */
export function MobileCardList<T>({
  items,
  getKey,
  renderCard,
  onActivate,
  isLoading,
  skeletonCount = 6,
  error,
  forbidden,
  errorTitle = 'Impossible de charger les données.',
  errorDescription = 'Vérifiez votre connexion ou vos droits d’accès, puis rechargez la page.',
  errorAction,
  empty,
}: {
  items: readonly T[]
  getKey: (item: T) => string | number
  /** Card body — usually a `MobileCardContent`. */
  renderCard: (item: T) => ReactNode
  /** Makes each card a button (click, Enter, Space) with a trailing chevron. */
  onActivate?: (item: T) => void
  isLoading?: boolean
  skeletonCount?: number
  error?: boolean
  /** With `error`: 403 wording (« Accès refusé. »). */
  forbidden?: boolean
  errorTitle?: string
  errorDescription?: string
  /** e.g. a « Réessayer » button. */
  errorAction?: ReactNode
  /** Shown when there is nothing to list (same content as `TableEmptyState`). */
  empty: {
    icon?: ElementType<{ className?: string }>
    title: string
    description?: string
    action?: ReactNode
  }
}) {
  if (isLoading) {
    return (
      <ul className="flex flex-col gap-2.5" aria-busy="true">
        {Array.from({ length: skeletonCount }, (_, i) => (
          <li key={i} className={CARD_CLASS}>
            <div className="flex items-start gap-3">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          </li>
        ))}
      </ul>
    )
  }
  if (error) {
    return (
      <EmptyState
        variant="card"
        icon={TriangleAlert}
        tone="error"
        title={forbidden ? 'Accès refusé.' : errorTitle}
        description={
          forbidden
            ? 'Vous n’avez pas les droits nécessaires pour consulter ces données.'
            : errorDescription
        }
        action={errorAction}
      />
    )
  }
  if (items.length === 0) {
    return <EmptyState variant="card" {...empty} />
  }
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => (
        <li key={getKey(item)}>
          <div
            className={cn(
              CARD_CLASS,
              'flex items-center gap-2',
              onActivate &&
                'group cursor-pointer outline-none hover:bg-[#f6f8fc] focus-visible:bg-[#f6f8fc] focus-visible:ring-[3px] focus-visible:ring-ring/40',
            )}
            {...(onActivate ? clickableRow(() => onActivate(item)) : {})}
          >
            <div className="min-w-0 flex-1">{renderCard(item)}</div>
            {onActivate && (
              <ChevronRight className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" />
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}

const CARD_CLASS =
  'rounded-xl border bg-card p-3.5 text-card-foreground shadow-sm'

/**
 * Standard body of a mobile card: optional `leading` (avatar/icon), bold
 * `title` + muted `subtitle` (both truncated), a `status` pill top-right, an
 * amount/`value` right-aligned under it, and a free `meta` line (dates, ids).
 */
export function MobileCardContent({
  leading,
  title,
  subtitle,
  status,
  value,
  meta,
}: {
  leading?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  status?: ReactNode
  /** Amount or main figure, e.g. « 75 805 FCFA ». */
  value?: ReactNode
  /** Secondary facts (« Créé le… · Émis par… »), wraps. */
  meta?: ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 truncate text-[14px] font-semibold">{title}</p>
          {status && <div className="shrink-0">{status}</div>}
        </div>
        {subtitle && (
          <p className="truncate text-[12px] text-muted-foreground">
            {subtitle}
          </p>
        )}
        {(value || meta) && (
          <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            {meta && (
              <div className="min-w-0 text-[12px] text-muted-foreground">
                {meta}
              </div>
            )}
            {value && (
              <div className="ml-auto text-[13.5px] font-bold whitespace-nowrap tabular-nums">
                {value}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
