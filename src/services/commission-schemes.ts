import { api } from '#/lib/api'
import type { PageResponse } from '#/services/users'

export type CommissionLevel = 1 | 2 | 3

export interface CommissionSchemePayload {
  partnerId: number
  productId: number
  commissionRate: number
  maxLevel: CommissionLevel
  level2PartnerShare: number | null
  level2SellerShare: number | null
  level3PartnerShare: number | null
  level3AgencyShare: number | null
  level3SellerShare: number | null
}

export interface CommissionSchemeResponse extends Omit<
  CommissionSchemePayload,
  'commissionRate'
> {
  id: number
  commissionRate: number | null
  createdAt: string
  updatedAt: string
}

export interface CommissionSchemeFilters {
  partnerId?: number
  productId?: number
  page?: number
  size?: number
}

export async function getCommissionSchemes(
  filters: CommissionSchemeFilters = {},
): Promise<PageResponse<CommissionSchemeResponse>> {
  const response = await api.get('/commission-schemes', { params: filters })
  return response.data
}

export async function getCommissionScheme(
  id: number,
): Promise<CommissionSchemeResponse> {
  const response = await api.get(`/commission-schemes/${id}`)
  return response.data
}

export async function createCommissionScheme(
  data: CommissionSchemePayload,
): Promise<CommissionSchemeResponse> {
  const response = await api.post('/commission-schemes', data)
  return response.data
}

export async function updateCommissionScheme(
  id: number,
  data: CommissionSchemePayload,
): Promise<CommissionSchemeResponse> {
  const response = await api.put(`/commission-schemes/${id}`, data)
  return response.data
}

export async function deleteCommissionScheme(id: number): Promise<void> {
  await api.delete(`/commission-schemes/${id}`)
}
