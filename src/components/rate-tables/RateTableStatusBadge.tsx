import { Badge } from '#/components/ui/badge'
import { cn } from '#/lib/utils'
import type { RateTableStatus } from '#/services/rate-tables'

export const RATE_TABLE_STATUS_META: Record<
  RateTableStatus,
  { label: string; cls: string }
> = {
  DRAFT: { label: 'Brouillon', cls: 'bg-[#fef3da] text-[#9a7400]' },
  PUBLISHED: { label: 'Publiée', cls: 'bg-[#e7f6ee] text-[#1c8a57]' },
  ARCHIVED: { label: 'Archivée', cls: 'bg-[#f0f1f4] text-[#6b7585]' },
}

export function RateTableStatusBadge({ status }: { status: RateTableStatus }) {
  const meta = RATE_TABLE_STATUS_META[status]
  return (
    <Badge
      className={cn(
        'border-transparent px-2.5 py-0.5 text-[12px] font-bold',
        meta.cls,
      )}
    >
      {meta.label}
    </Badge>
  )
}
