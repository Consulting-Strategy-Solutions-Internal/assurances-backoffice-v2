import { StatusPill } from '#/components/dashboard/StatusPill'
import { SUPPORT_STATUS_LABELS } from '#/lib/support'
import type { PillTone } from '#/lib/dashboard-theme'
import type { SupportStatus } from '#/services/support'

const tones: Record<SupportStatus, PillTone> = {
  OPEN: 'info',
  IN_PROGRESS: 'warning',
  RESOLVED: 'success',
  CLOSED: 'neutral',
}

export function SupportStatusBadge({ status }: { status: SupportStatus }) {
  return (
    <StatusPill tone={tones[status]}>
      {SUPPORT_STATUS_LABELS[status]}
    </StatusPill>
  )
}
