import { fetchAllPages } from '#/lib/fetch-all-pages'
import type { AllPages } from '#/lib/fetch-all-pages'
import { getSubscriptions } from '#/services/subscriptions'
import type {
  SubscriptionResponse,
  SubscriptionStatus,
} from '#/services/subscriptions'

/**
 * Le paramètre `clientId` de `GET /subscriptions` est ignoré par l'API : on
 * charge tous les contrats (lecture seule) et on filtre côté client.
 */
export const subscriptionsAllKey = ['subscriptions', 'all'] as const

export function getAllSubscriptions(): Promise<AllPages<SubscriptionResponse>> {
  return fetchAllPages((page, size) =>
    getSubscriptions({ page, size, sort: 'createdAt,desc' }),
  )
}

export function subscriptionsOfClient(
  subscriptions: SubscriptionResponse[],
  clientId: number,
): SubscriptionResponse[] {
  return subscriptions.filter((s) => s.clientId === clientId)
}

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  PENDING_PAYMENT: 'En attente de paiement',
  ACTIVE: 'Actif',
  EXPIRED: 'Expiré',
  CANCELLED: 'Résilié',
}

export function shortDate(value?: string | null): string {
  if (!value) return ''
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : ''
}

/** « POL-123 · IA Standard · Actif · 01/01/2026 → 31/12/2026 ». */
export function subscriptionLabel(s: SubscriptionResponse): string {
  const start = shortDate(s.coverageStart)
  const end = shortDate(s.coverageEnd)
  const period = start || end ? `${start || '…'} → ${end || '…'}` : ''
  return [
    s.policyNumber?.trim() || `Contrat #${s.id}`,
    s.productSnapshot?.productLabel?.trim(),
    SUBSCRIPTION_STATUS_LABELS[s.status],
    period,
  ]
    .filter(Boolean)
    .join(' · ')
}
