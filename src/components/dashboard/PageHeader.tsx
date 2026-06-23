import { Plus } from 'lucide-react'
import { Button } from '#/components/ui/button'

interface PageHeaderProps {
  title: string
  subtitle: string
  action?: string
  onAction?: () => void
}

/** Standard page title row: title + subtitle on the left, optional primary action. */
export function PageHeader({ title, subtitle, action, onAction }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[26px] font-extrabold tracking-[-0.03em]">{title}</h1>
        <p className="mt-[7px] text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {action && (
        <Button
          className="rounded-[11px] shadow-[0_4px_14px_rgba(0,51,127,0.22)]"
          onClick={onAction}
        >
          <Plus />
          {action}
        </Button>
      )}
    </div>
  )
}
