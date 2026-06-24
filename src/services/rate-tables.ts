import { api } from '#/lib/api'
import type { PageResponse } from '#/services/users'

/** Lifecycle status of a rate table (grille tarifaire). */
export const RATE_TABLE_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const
export type RateTableStatus = (typeof RATE_TABLE_STATUSES)[number]

export interface RateTableResponse {
  id: number
  version: string
  status: RateTableStatus
  createdAt: string
  updatedAt: string
}

export interface CreateRateTablePayload {
  version: string
}

// Le DTO de mise à jour partage la même forme que la création (UpdateRateTableDto).
export type UpdateRateTablePayload = CreateRateTablePayload

export async function getRateTables(
  page = 0,
  size = 20,
  status?: RateTableStatus,
): Promise<PageResponse<RateTableResponse>> {
  const response = await api.get('/rate-tables', {
    params: { page, size, status },
  })
  return response.data
}

export async function createRateTable(
  data: CreateRateTablePayload,
): Promise<RateTableResponse> {
  const response = await api.post('/rate-tables', data)
  return response.data
}

export async function updateRateTable(
  id: number,
  data: UpdateRateTablePayload,
): Promise<RateTableResponse> {
  const response = await api.put(`/rate-tables/${id}`, data)
  return response.data
}

// Suppression logique (soft-delete) côté API.
export async function deleteRateTable(id: number): Promise<void> {
  await api.delete(`/rate-tables/${id}`)
}

// Publie une grille — archive automatiquement celle actuellement publiée.
export async function publishRateTable(id: number): Promise<RateTableResponse> {
  const response = await api.post(`/rate-tables/${id}/publish`)
  return response.data
}

export async function archiveRateTable(id: number): Promise<RateTableResponse> {
  const response = await api.post(`/rate-tables/${id}/archive`)
  return response.data
}

export async function getRateTable(id: number): Promise<RateTableResponse> {
  const response = await api.get(`/rate-tables/${id}`)
  return response.data
}

// ---------------------------------------------------------------------------
// Produits d'une grille (table de liaison rate-table ↔ product)
// ---------------------------------------------------------------------------

export interface RateTableProductResponse {
  id: number
  rateTableId: number
  productId: number
  createdAt: string
  updatedAt: string
}

export async function getRateTableProducts(
  rateTableId: number,
  page = 0,
  size = 200,
): Promise<PageResponse<RateTableProductResponse>> {
  const response = await api.get('/rate-table-products', {
    params: { rateTableId, page, size },
  })
  return response.data
}

// Un produit peut appartenir à plusieurs grilles.
export async function addRateTableProduct(data: {
  rateTableId: number
  productId: number
}): Promise<RateTableProductResponse> {
  const response = await api.post('/rate-table-products', data)
  return response.data
}

export async function removeRateTableProduct(id: number): Promise<void> {
  await api.delete(`/rate-table-products/${id}`)
}
