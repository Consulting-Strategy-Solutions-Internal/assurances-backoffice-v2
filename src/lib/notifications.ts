import type { TravelFilter } from '#/lib/travel'
import type { NotificationResponse } from '#/services/notifications'

/** Filtre de la supervision dont relève chaque alerte voyage (pour « Retour »). */
const TRAVEL_ALERT_FILTERS: Record<string, TravelFilter> = {
  TRAVEL_ISSUANCE_TO_RECONCILE: 'TO_RECONCILE',
  TRAVEL_ISSUANCE_REJECTED: 'REJECTED',
  TRAVEL_CERTIFICATE_MISSING: 'ISSUED',
}

export type NotificationTarget =
  | { to: '/support/$conversationId'; params: { conversationId: string } }
  | { to: '/sinistres/$claimId'; params: { claimId: string } }
  | {
      to: '/contrats/$subscriptionId'
      params: { subscriptionId: string }
      search: { from?: 'voyage'; status?: TravelFilter; page?: number }
    }
  | { to: '/remboursements/$refundId'; params: { refundId: string } }

/**
 * Où mène une notification : la ressource qu'elle cite, ou `null` pour une
 * simple information (`PAYOUT_FUNDS_INSUFFICIENT` : compte FineoPay à alimenter).
 */
export function notificationTarget(
  notification: NotificationResponse,
): NotificationTarget | null {
  const { type, resourceType, resourceId } = notification
  if (resourceId == null || type === 'PAYOUT_FUNDS_INSUFFICIENT') return null
  const id = String(resourceId)
  switch (resourceType) {
    case 'SUPPORT_CONVERSATION':
      return { to: '/support/$conversationId', params: { conversationId: id } }
    case 'CLAIM':
      return { to: '/sinistres/$claimId', params: { claimId: id } }
    case 'SUBSCRIPTION': {
      const status = TRAVEL_ALERT_FILTERS[type] as TravelFilter | undefined
      return {
        to: '/contrats/$subscriptionId',
        params: { subscriptionId: id },
        search: status ? { from: 'voyage', status, page: 0 } : {},
      }
    }
    case 'REFUND_REQUEST':
      return type === 'REFUND_ATTENTION'
        ? { to: '/remboursements/$refundId', params: { refundId: id } }
        : null
    default:
      return null
  }
}
