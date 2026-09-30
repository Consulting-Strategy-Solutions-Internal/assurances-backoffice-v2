import { StatusPill } from '#/components/dashboard/StatusPill'
import { CLAIM_STATUS_LABELS } from '#/lib/claims'
import type { PillTone } from '#/lib/dashboard-theme'
import type { ClaimStatus } from '#/services/claims'

export const CLAIM_STATUS_TONES: Record<ClaimStatus, PillTone> = {
  SUBMITTED: 'info',
  UNDER_REVIEW: 'warning',
  INFO_REQUESTED: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'neutral',
}

export function ClaimStatusBadge({ status }: { status: ClaimStatus }) {
  return (
    <StatusPill tone={CLAIM_STATUS_TONES[status]}>
      {CLAIM_STATUS_LABELS[status]}
    </StatusPill>
  )
}
