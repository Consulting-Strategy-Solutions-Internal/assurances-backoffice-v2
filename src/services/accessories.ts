import { api } from '#/lib/api'
import type { PageResponse } from '#/services/users'

export interface AccessoryResponse {
  id: number
  productId: number
  minPremium: number
  maxPremium: number
  amount: number
  createdAt: string
  updatedAt: string
}

export interface CreateAccessoryPayload {
  productId: number
  minPremium: number
  maxPremium: number
  amount: number
}

// UpdateAccessoryDto partage la même forme que la création.
export type UpdateAccessoryPayload = CreateAccessoryPayload

export async function getAccessories(
  page = 0,
  size = 20,
  productId?: number,
): Promise<PageResponse<AccessoryResponse>> {
  const response = await api.get('/accessories', {
    params: { page, size, productId },
  })
  return response.data
}

export async function createAccessory(
  data: CreateAccessoryPayload,
): Promise<AccessoryResponse> {
  const response = await api.post('/accessories', data)
  return response.data
}

export async function updateAccessory(
  id: number,
  data: UpdateAccessoryPayload,
): Promise<AccessoryResponse> {
  const response = await api.put(`/accessories/${id}`, data)
  return response.data
}

export async function deleteAccessory(id: number): Promise<void> {
  await api.delete(`/accessories/${id}`)
}
