import { cn } from '#/lib/utils'

/**
 * Text that is cut with an ellipsis instead of overflowing, with the full
 * value in the native tooltip (`title`) so nothing is lost. The parent must
 * constrain the width (`min-w-0`, `max-w-*` or a table cell `max-w-*`).
 */
export function TruncatedText({
  children,
  lines = 1,
  className,
}: {
  children: string | null | undefined
  /** 1 = single line (default), 2–3 = multi-line clamp. */
  lines?: 1 | 2 | 3
  className?: string
}) {
  if (!children) return null
  return (
    <span
      title={children}
      className={cn(
        'block min-w-0',
        lines === 1 && 'truncate',
        lines === 2 && 'line-clamp-2 break-words',
        lines === 3 && 'line-clamp-3 break-words',
        className,
      )}
    >
      {children}
    </span>
  )
}
