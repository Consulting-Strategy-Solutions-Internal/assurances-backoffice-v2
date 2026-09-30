import { StatusPill } from '#/components/dashboard/StatusPill'
import type { PillTone } from '#/lib/dashboard-theme'
import type { QuotationStatus } from '#/services/quotations'

export const QUOTATION_STATUS_META: Record<
  QuotationStatus,
  { label: string; tone: PillTone }
> = {
  DRAFT: { label: 'Brouillon', tone: 'neutral' },
  QUOTED: { label: 'Cotée', tone: 'info' },
  EXPIRED: { label: 'Expirée', tone: 'danger' },
  CONVERTED: { label: 'Convertie', tone: 'success' },
}

export function QuotationStatusBadge({ status }: { status: QuotationStatus }) {
  const meta = QUOTATION_STATUS_META[status]
  return <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
}
