import { api } from '#/lib/api'
import { fetchAllPages } from '#/lib/fetch-all-pages'
import { getNotifications } from '#/services/notifications'
import type { NotificationResponse } from '#/services/notifications'

export type MobileMoneyOperator = 'ORANGE' | 'MTN' | 'MOOV' | 'WAVE'

export type RefundRequestStatus =
  | 'REQUESTED'
  | 'AWAITING_DESTINATION'
  | 'AWAITING_FUNDS'
  | 'SENDING'
  | 'SUBMITTED'
  | 'PAID'
  | 'FAILED'

/** `RefundResponse` (backend cfe620a). */
export interface RefundResponse {
  id: number
  /** « RF-12 ». */
  reference: string
  amount: number
  currency: string
  status: RefundRequestStatus
  operator: MobileMoneyOperator | null
  /** Normalisé « +2250544001122 ». */
  destination: string | null
}

export const refundKeys = {
  alerts: ['refunds', 'alerts'] as const,
}

/** Saisit le numéro de remboursement (`withdrawal:write`) ; le versement repart seul. */
export async function setRefundDestination(
  id: number,
  body: { operator: MobileMoneyOperator; destination: string },
): Promise<RefundResponse> {
  const response = await api.put<RefundResponse>(
    `/refunds/${id}/destination`,
    body,
  )
  return response.data
}

/** Pages parcourues pour retrouver l'alerte d'un remboursement (pas de filtre serveur). */
const ALERT_SCAN_PAGES = 5

/** Les notifications les plus récentes de l'utilisateur (500 au plus). */
export async function getRecentNotifications(): Promise<
  NotificationResponse[]
> {
  const all = await fetchAllPages(
    (page, size) => getNotifications({ page, size, sort: 'createdAt,desc' }),
    ALERT_SCAN_PAGES,
  )
  return all.items
}
