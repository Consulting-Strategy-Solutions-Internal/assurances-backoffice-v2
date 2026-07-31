import { Badge } from '#/components/ui/badge'
import { CLAIM_STATUS_LABELS } from '#/lib/claims'
import { cn } from '#/lib/utils'
import type { ClaimStatus } from '#/services/claims'

const styles: Record<ClaimStatus, string> = {
  SUBMITTED: 'border-blue-200 bg-blue-50 text-blue-800',
  UNDER_REVIEW: 'border-amber-200 bg-amber-50 text-amber-800',
  INFO_REQUESTED: 'border-violet-200 bg-violet-50 text-violet-800',
  APPROVED: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  REJECTED: 'border-red-200 bg-red-50 text-red-800',
  CANCELLED: 'border-slate-200 bg-slate-50 text-slate-700',
}

export function ClaimStatusBadge({ status }: { status: ClaimStatus }) {
  return (
    <Badge variant="outline" className={cn('font-semibold', styles[status])}>
      {CLAIM_STATUS_LABELS[status]}
    </Badge>
  )
}
