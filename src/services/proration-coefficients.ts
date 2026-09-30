import { api } from '#/lib/api'
import { MAX_PAGE_SIZE } from '#/lib/page'
import type { PageResponse } from '#/lib/page'
import type { ProductCode } from '#/services/products'

export interface ProrationResponse {
  id: number
  product: ProductCode
  minMonths: number
  /** `null` = « et au-delà ». */
  maxMonths: number | null
  /** 0–1. */
  coefficient: number
  createdAt: string
  updatedAt: string
}

export interface CreateProrationPayload {
  product: ProductCode
  minMonths: number
  maxMonths?: number | null
  coefficient: number
}

export type UpdateProrationPayload = CreateProrationPayload

/** Toutes les tranches du produit (réponse paginée, une page de 100 suffit). */
export async function getProrations(
  product: ProductCode,
): Promise<ProrationResponse[]> {
  const response = await api.get<PageResponse<ProrationResponse>>(
    '/proration-coefficients',
    { params: { product, size: MAX_PAGE_SIZE, sort: 'minMonths,asc' } },
  )
  return response.data.content
}

export async function getProration(id: number): Promise<ProrationResponse> {
  const response = await api.get(`/proration-coefficients/${id}`)
  return response.data
}

export async function createProration(
  data: CreateProrationPayload,
): Promise<ProrationResponse> {
  const response = await api.post('/proration-coefficients', data)
  return response.data
}

export async function updateProration(
  id: number,
  data: UpdateProrationPayload,
): Promise<ProrationResponse> {
  const response = await api.put(`/proration-coefficients/${id}`, data)
  return response.data
}

export async function deleteProration(id: number): Promise<void> {
  await api.delete(`/proration-coefficients/${id}`)
}
