import { api } from '#/lib/api'
import type { PageResponse } from '#/lib/page'

export const SUBSCRIPTION_STATUSES = [
  'PENDING_PAYMENT',
  'ACTIVE',
  'EXPIRED',
  'CANCELLED',
] as const
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number]

export interface SubscriptionInsured {
  relationship?: string | null
  firstName?: string | null
  lastName?: string | null
  birthDate?: string | null
  phone?: string | null
}

export interface SubscriptionProductSnapshot {
  productId?: number | null
  productLabel?: string | null
  productCode?: number | null
  insuranceType?: 'IA' | 'MRH' | null
  insuranceTypeLabel?: string | null
}

/** Contrat (lecture seule côté back-office). */
export interface SubscriptionResponse {
  id: number
  quotationId: number
  clientId: number
  sellerId?: number | null
  paymentMode: string
  status: SubscriptionStatus
  totalPremium: number
  currency: string
  policyNumber?: string | null
  activatedAt?: string | null
  coverageStart?: string | null
  coverageEnd?: string | null
  insured?: SubscriptionInsured | null
  productSnapshot?: SubscriptionProductSnapshot | null
  createdAt: string
  updatedAt: string
}

export interface SubscriptionFilters {
  status?: SubscriptionStatus
  page?: number
  size?: number
  /** Autorisés : createdAt, coverageStart, policyIssuedAt. */
  sort?: string
}

export const subscriptionsKeys = {
  all: ['subscriptions'] as const,
  detail: (id: number) => ['subscriptions', 'detail', id] as const,
}

export async function getSubscriptions(
  filters: SubscriptionFilters = {},
): Promise<PageResponse<SubscriptionResponse>> {
  const response = await api.get<PageResponse<SubscriptionResponse>>(
    '/subscriptions',
    {
      params: {
        status: filters.status,
        page: Math.max(0, filters.page ?? 0),
        size: Math.min(100, Math.max(1, filters.size ?? 20)),
        sort: filters.sort ?? 'createdAt,desc',
      },
    },
  )
  return response.data
}

/** Champs lus de `SubscriptionDetailResponse` (`GET /subscriptions/{id}`). */
export interface SubscriptionDetailResponse {
  id: number
  clientId: number
  status: SubscriptionStatus
  policyNumber?: string | null
  amendmentNumber?: number | null
}

/** Fiche d'un contrat (`subscription:read-all`). */
export async function getSubscription(
  id: number,
): Promise<SubscriptionDetailResponse> {
  const response = await api.get<SubscriptionDetailResponse>(
    `/subscriptions/${id}`,
  )
  return response.data
}
