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
  name: string
  email?: string
  location?: string
}

// Le distributorCode n'est pas modifiable côté API (UpdatePartnerDto).
export interface UpdatePartnerPayload {
  name: string
  email?: string
  location?: string
}

export async function getPartners(
  page = 0,
  size = 20,
): Promise<PageResponse<PartnerResponse>> {
  const response = await api.get('/partners', { params: { page, size } })
  return response.data
}

export async function getPartner(id: number): Promise<PartnerResponse> {
  const response = await api.get(`/partners/${id}`)
  return response.data
}

export async function createPartner(
  data: CreatePartnerPayload,
): Promise<PartnerResponse> {
  const response = await api.post('/partners', data)
  return response.data
}

export async function updatePartner(
  id: number,
  data: UpdatePartnerPayload,
): Promise<PartnerResponse> {
  const response = await api.put(`/partners/${id}`, data)
  return response.data
}

export async function deletePartner(id: number): Promise<void> {
  await api.delete(`/partners/${id}`)
}
