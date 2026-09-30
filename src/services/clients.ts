import { api } from '#/lib/api'
import { fetchAllPages } from '#/lib/fetch-all-pages'
import type { AllPages } from '#/lib/fetch-all-pages'
import type { PageResponse } from '#/services/claims'

export interface ClientResponse {
  id: number
  firstName: string
  lastName: string
  phoneNumber: string
  email?: string | null
  gender: 'HOMME' | 'FEMME'
  addressLine1?: string | null
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
  /** Every client (pickers, list): one cache entry per sort and partner filter. */
  everyone: (sort: string, partner: ClientPartnerFilter | null = null) =>
    ['clients', 'all', sort, partner] as const,
}

/**
 * Back-office filter of `GET /clients` (`partnerId`): a partner id, or
 * `'none'` for the clients without partner. Absent = every client.
 */
export type ClientPartnerFilter = number | 'none'

export async function getClients(
  page = 0,
  size = 100,
  sort = 'lastName,asc',
  partner: ClientPartnerFilter | null = null,
): Promise<PageResponse<ClientResponse>> {
  const response = await api.get<PageResponse<ClientResponse>>('/clients', {
    params: {
      page,
      size: Math.min(100, size),
      sort,
      ...(partner === null ? {} : { partnerId: String(partner) }),
    },
  })
  return response.data
}

export async function getClient(id: number): Promise<ClientResponse> {
  const response = await api.get<ClientResponse>(`/clients/${id}`)
  return response.data
}

/** Loads every client (size 100 pages, capped) — the API has no text search. */
export function getAllClients(
  sort = 'lastName,asc',
  partner: ClientPartnerFilter | null = null,
): Promise<AllPages<ClientResponse>> {
  return fetchAllPages((page, size) => getClients(page, size, sort, partner))
}

/**
 * NSIA arbitration: moves the client to another partner, or leaves it without
 * partner (`null` — the field is required, so it is always sent). 204; the
 * client's quotations and contracts already made stay where they are.
 */
export async function reassignClientPartner(
  clientId: number,
  partnerId: number | null,
): Promise<void> {
  await api.put(`/clients/${clientId}/owner-partner`, { partnerId })
}
