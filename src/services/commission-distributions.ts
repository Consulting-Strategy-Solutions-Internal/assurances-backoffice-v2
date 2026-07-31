import { api } from '#/lib/api'
import type { PageResponse } from '#/services/users'

export const COMMISSION_STATUSES = [
  'DISTRIBUTED',
  'ON_HOLD',
  'SKIPPED',
] as const
export type CommissionStatus = (typeof COMMISSION_STATUSES)[number]
export type CommissionOwnerType = 'PARTNER' | 'AGENCY' | 'SELLER'

export interface CommissionLineResponse {
  id: number
  ownerType: CommissionOwnerType | null
  ownerId: number | null
  ownerName: string | null
  shareRate: number
  amount: number
  createdAt: string
}

export interface CommissionDistributionResponse {
  id: number
  paymentId: number
  paymentReference: string
  quotationId: number
  distributorCode: string
  status: CommissionStatus
  appliedLevel: number | null
  productRate: number | null
  netPortion: number | null
  potAmount: number | null
  holdReason: string | null
  createdAt: string
  updatedAt: string
  lines: CommissionLineResponse[]
}

export interface CommissionDistributionFilters {
  status?: CommissionStatus
  partnerId?: number
  page?: number
  size?: number
}

export async function getCommissionDistributions(
  filters: CommissionDistributionFilters = {},
): Promise<PageResponse<CommissionDistributionResponse>> {
  const response = await api.get('/commission-distributions', {
    params: filters,
  })
  return response.data
}

export async function retryCommissionDistribution(
  id: number,
): Promise<CommissionDistributionResponse> {
  const response = await api.post(`/commission-distributions/${id}/retry`)
  return response.data
}
