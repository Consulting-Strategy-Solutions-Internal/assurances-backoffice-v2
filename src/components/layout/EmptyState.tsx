import type { ElementType, ReactNode } from 'react'
import { Inbox } from 'lucide-react'
import { Card } from '#/components/ui/card'
import { cn } from '#/lib/utils'

interface EmptyStateProps {
  icon?: ElementType<{ className?: string }>
  title: string
  description?: string
  /** Button or link shown under the text. */
  action?: ReactNode
  /** `error` tints the icon red. */
  tone?: 'muted' | 'error'
  /** `card` wraps in a Card (standalone pages); `plain` is for use inside a card/cell. */
  variant?: 'card' | 'plain'
  className?: string
}

/**
 * Centered icon + title + description + action. Used for empty lists, errors
 * (tone="error"), 403 and 404 states. Titles are sentences ending with a period.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  tone = 'muted',
  variant = 'plain',
  className,
}: EmptyStateProps) {
  const body = (
    <div
      className={cn(
        'flex flex-col items-center px-6 py-12 text-center',
        className,
      )}
    >
      <Icon
        className={cn(
          'size-8',
          tone === 'error' ? 'text-destructive' : 'text-muted-foreground',
        )}
      />
      <p className="mt-3 text-[15px] font-semibold">{title}</p>
      {description && (
        <p className="mt-1 max-w-md text-[13px] text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
  return variant === 'card' ? <Card className="gap-0 py-0">{body}</Card> : body
}
