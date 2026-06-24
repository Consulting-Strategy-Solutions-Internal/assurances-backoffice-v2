import { api } from '#/lib/api'
import type { PageResponse } from '#/services/users'

export interface SellerResponse {
  id: number
  distributorCode: string
  firstName: string
  lastName: string
  phoneNumber: string
  email?: string
  pinCode?: number
  partnerId?: number
  agencyId?: number
  createdAt: string
  updatedAt: string
}

export interface CreateSellerPayload {
  distributorCode: string
  firstName: string
  lastName: string
  phoneNumber: string
  email?: string
}

export interface UpdateSellerPayload {
  firstName: string
  lastName: string
  phoneNumber: string
  email?: string
  pinCode?: number
}

// Sellers rattachés directement au partenaire.
export async function getPartnerSellers(
  partnerId: number,
  page = 0,
  size = 100,
): Promise<PageResponse<SellerResponse>> {
  const response = await api.get(`/partners/${partnerId}/sellers`, {
    params: { page, size },
  })
  return response.data
}

export async function createPartnerSeller(
  partnerId: number,
  data: CreateSellerPayload,
): Promise<SellerResponse> {
  const response = await api.post(`/partners/${partnerId}/sellers`, data)
  return response.data
}

// Sellers rattachés à une agence.
export async function getAgencySellers(
  agencyId: number,
  page = 0,
  size = 100,
): Promise<PageResponse<SellerResponse>> {
  const response = await api.get(`/agencies/${agencyId}/sellers`, {
    params: { page, size },
  })
  return response.data
}

export async function createAgencySeller(
  agencyId: number,
  data: CreateSellerPayload,
): Promise<SellerResponse> {
  const response = await api.post(`/agencies/${agencyId}/sellers`, data)
  return response.data
}

export async function getSeller(id: number): Promise<SellerResponse> {
  const response = await api.get(`/sellers/${id}`)
  return response.data
}

export async function updateSeller(
  id: number,
  data: UpdateSellerPayload,
): Promise<SellerResponse> {
  const response = await api.put(`/sellers/${id}`, data)
  return response.data
}

export async function deleteSeller(id: number): Promise<void> {
  await api.delete(`/sellers/${id}`)
}
