import { api } from '#/lib/api'
import type { PageResponse } from '#/services/users'

export interface AgencyResponse {
  id: number
  distributorCode: string
  name: string
  email?: string
  location?: string
  partnerId: number
  createdAt: string
  updatedAt: string
}

export interface CreateAgencyPayload {
  distributorCode: string
  name: string
  email?: string
  location?: string
}

// Le distributorCode n'est pas modifiable côté API (UpdateAgencyDto).
export interface UpdateAgencyPayload {
  name: string
  email?: string
  location?: string
}

export async function getPartnerAgencies(
  partnerId: number,
  page = 0,
  size = 100,
): Promise<PageResponse<AgencyResponse>> {
  const response = await api.get(`/partners/${partnerId}/agencies`, {
    params: { page, size },
  })
  return response.data
}

export async function getAgency(id: number): Promise<AgencyResponse> {
  const response = await api.get(`/agencies/${id}`)
  return response.data
}

export async function createAgency(
  partnerId: number,
  data: CreateAgencyPayload,
): Promise<AgencyResponse> {
  const response = await api.post(`/partners/${partnerId}/agencies`, data)
  return response.data
}

export async function updateAgency(
  id: number,
  data: UpdateAgencyPayload,
): Promise<AgencyResponse> {
  const response = await api.put(`/agencies/${id}`, data)
  return response.data
}

export async function deleteAgency(id: number): Promise<void> {
  await api.delete(`/agencies/${id}`)
}
