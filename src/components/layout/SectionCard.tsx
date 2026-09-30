import type { ReactNode } from 'react'
import { Card } from '#/components/ui/card'
import { cn } from '#/lib/utils'

/**
 * Titled card with a padded body: the standard container for any block of a
 * detail/settings page (never put content directly in a bare `Card`, which has
 * no horizontal padding). With `flush`, the body has no padding, for tables.
 */
export function SectionCard({
  title,
  description,
  action,
  flush,
  className,
  bodyClassName,
  children,
}: {
  title?: string
  description?: string
  /** Button/link aligned right of the title. */
  action?: ReactNode
  /** Remove body padding (tables); header keeps its padding and a bottom border. */
  flush?: boolean
  className?: string
  bodyClassName?: string
  children?: ReactNode
}) {
  const hasHeader = !!(title || description || action)
  return (
    <Card className={cn('gap-0 py-0', flush && 'overflow-hidden', className)}>
      {hasHeader && (
        <div
          className={cn(
            'flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 pt-5 sm:px-6',
            flush || !children ? 'pb-4' : 'pb-0',
            flush && children && 'border-b',
          )}
        >
          <div className="min-w-0 flex-1 basis-48">
            {title && (
              <h2 className="text-[16px] font-bold tracking-[-0.01em]">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-[13px] text-muted-foreground">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children != null && (
        <div
          className={cn(
            flush ? '' : cn('px-4 pb-6 sm:px-6', hasHeader ? 'pt-4' : 'pt-6'),
            bodyClassName,
          )}
        >
          {children}
        </div>
      )}
    </Card>
  )
}
