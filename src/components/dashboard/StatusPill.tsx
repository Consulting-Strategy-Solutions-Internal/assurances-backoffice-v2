import { Badge } from '#/components/ui/badge'
import { cn } from '#/lib/utils'
import { statusBadgeClass } from '#/lib/dashboard-theme'

export function StatusPill({ status }: { status: string }) {
  return (
    <Badge
      className={cn(
        'border-transparent px-2.5 py-0.5 text-[12px] font-bold',
        statusBadgeClass(status),
      )}
    >
      {status}
    </Badge>
  )
}
