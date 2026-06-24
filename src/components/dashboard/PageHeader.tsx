import type { ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '#/components/ui/button'

interface PageHeaderProps {
  title: string
  subtitle: string
  action?: string
  onAction?: () => void
  /** Disables the primary action (e.g. when the user lacks the permission). */
  actionDisabled?: boolean
  /** Tooltip shown on the primary action (e.g. why it is disabled). */
  actionTitle?: string
  /** Extra action buttons (e.g. import), rendered left of the primary action. */
  children?: ReactNode
}

/** Standard page title row: title + subtitle on the left, optional actions. */
export function PageHeader({
  title,
  subtitle,
  action,
  onAction,
  actionDisabled,
  actionTitle,
  children,
}: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[26px] font-extrabold tracking-[-0.03em]">
          {title}
        </h1>
        <p className="mt-[7px] text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {(children || action) && (
        <div className="flex flex-wrap items-center gap-2.5">
          {children}
          {action && (
            <Button
              className="rounded-[11px] shadow-[0_4px_14px_rgba(0,51,127,0.22)]"
              onClick={onAction}
              disabled={actionDisabled}
              title={actionTitle}
            >
              <Plus />
              {action}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
