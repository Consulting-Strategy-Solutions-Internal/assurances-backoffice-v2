import { api } from '#/lib/api'
import type { PageResponse } from '#/services/claims'

export interface ClientResponse {
  id: number
  firstName: string
  lastName: string
  phoneNumber: string
  email?: string | null
  gender: 'HOMME' | 'FEMME'
  addressLine1: string
  addressLine2?: string | null
  emailVerifiedAt?: string | null
  phoneVerifiedAt?: string | null
  createdAt: string
  updatedAt: string
}

export const clientsKeys = {
  all: ['clients'] as const,
  list: (page: number, size: number, sort: string) =>
    ['clients', { page, size, sort }] as const,
  detail: (id: number) => ['client', id] as const,
}

export async function getClients(
  page = 0,
  size = 100,
  sort = 'lastName,asc',
): Promise<PageResponse<ClientResponse>> {
  const response = await api.get<PageResponse<ClientResponse>>('/clients', {
    params: { page, size: Math.min(100, size), sort },
  })
  return response.data
}

export async function getClient(id: number): Promise<ClientResponse> {
  const response = await api.get<ClientResponse>(`/clients/${id}`)
  return response.data
}
