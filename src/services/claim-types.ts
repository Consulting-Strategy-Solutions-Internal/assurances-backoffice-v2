import { api } from '#/lib/api'
import type { PageResponse } from '#/services/claims'

export interface ClaimTypeResponse {
  id: number
  productId: number
  productLabel: string
  name: string
  description?: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface ClaimTypeFilters {
  productId?: number
  page: number
  size: number
  sort: string
}

export interface CreateClaimTypeDto {
  productId: number
  name: string
  description?: string
  active?: boolean
}

export interface UpdateClaimTypeDto {
  name: string
  description?: string
  active?: boolean
}

export const claimTypesKeys = {
  all: ['claimTypes'] as const,
  list: (filters: ClaimTypeFilters) => ['claimTypes', filters] as const,
  detail: (id: number) => ['claimType', id] as const,
}

export function buildClaimTypeParams(filters: ClaimTypeFilters) {
  return {
    productId: filters.productId,
    page: Math.max(0, filters.page),
    size: Math.min(100, Math.max(1, filters.size)),
    sort: filters.sort,
  }
}

export async function getClaimTypes(
  filters: ClaimTypeFilters,
): Promise<PageResponse<ClaimTypeResponse>> {
  const response = await api.get<PageResponse<ClaimTypeResponse>>(
    '/claim-types',
    {
      params: buildClaimTypeParams(filters),
    },
  )
  return response.data
}

export async function createClaimType(
  payload: CreateClaimTypeDto,
): Promise<ClaimTypeResponse> {
  const response = await api.post<ClaimTypeResponse>('/claim-types', payload)
  return response.data
}

export async function updateClaimType(
  id: number,
  payload: UpdateClaimTypeDto,
): Promise<ClaimTypeResponse> {
  const response = await api.put<ClaimTypeResponse>(
    `/claim-types/${id}`,
    payload,
  )
  return response.data
}

export async function deleteClaimType(id: number): Promise<void> {
  await api.delete(`/claim-types/${id}`)
}
