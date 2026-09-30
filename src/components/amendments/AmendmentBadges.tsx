import { StatusPill } from '#/components/dashboard/StatusPill'
import {
  AMENDMENT_STATUS_LABELS,
  AMENDMENT_STATUS_TONES,
  DELTA_KIND_LABELS,
  DELTA_KIND_TONES,
  RECEIPT_STATUS_LABELS,
  RECEIPT_STATUS_TONES,
} from '#/lib/amendments'
import type {
  AmendmentStatus,
  DeltaKind,
  ReceiptStatus,
} from '#/lib/amendments'

export function AmendmentStatusBadge({ status }: { status: AmendmentStatus }) {
  return (
    <StatusPill tone={AMENDMENT_STATUS_TONES[status]}>
      {AMENDMENT_STATUS_LABELS[status]}
    </StatusPill>
  )
}

export function DeltaKindBadge({ kind }: { kind: DeltaKind }) {
  return (
    <StatusPill tone={DELTA_KIND_TONES[kind]}>
      {DELTA_KIND_LABELS[kind]}
    </StatusPill>
  )
}

/** `PAID_NOT_APPLIED` passe en rouge (danger) : NSIA doit le traiter. */
export function ReceiptStatusBadge({ status }: { status: ReceiptStatus }) {
  return (
    <StatusPill tone={RECEIPT_STATUS_TONES[status]}>
      {RECEIPT_STATUS_LABELS[status]}
    </StatusPill>
  )
}
