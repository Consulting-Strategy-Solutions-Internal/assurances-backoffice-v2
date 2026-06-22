import { api } from '#/lib/api'
import type { PageResponse } from '#/services/users'

export interface PartnerResponse {
  id: number
  distributorCode: string
  idSite: number
  name: string
  email?: string
  location?: string
  createdAt: string
  updatedAt: string
}

export interface CreatePartnerPayload {
  distributorCode: string
  idSite?: number
  name: string
  email?: string
  location?: string
}

export async function getPartners(page = 0, size = 20): Promise<PageResponse<PartnerResponse>> {
  const response = await api.get('/partners', { params: { page, size } })
  return response.data
}

export async function createPartner(data: CreatePartnerPayload): Promise<PartnerResponse> {
  const response = await api.post('/partners', data)
  return response.data
}
