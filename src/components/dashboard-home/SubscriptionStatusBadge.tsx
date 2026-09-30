import { StatusPill } from '#/components/dashboard/StatusPill'
import type { PillTone } from '#/lib/dashboard-theme'
import type { SubscriptionStatus } from '#/services/subscriptions'

export const SUBSCRIPTION_STATUS_META: Record<
  SubscriptionStatus,
  { label: string; tone: PillTone }
> = {
  PENDING_PAYMENT: { label: 'En attente de paiement', tone: 'warning' },
  ACTIVE: { label: 'Actif', tone: 'success' },
  EXPIRED: { label: 'Expiré', tone: 'neutral' },
  CANCELLED: { label: 'Annulé', tone: 'danger' },
}

export function SubscriptionStatusBadge({
  status,
}: {
  status: SubscriptionStatus
}) {
  const meta = SUBSCRIPTION_STATUS_META[status]
  return <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
}
