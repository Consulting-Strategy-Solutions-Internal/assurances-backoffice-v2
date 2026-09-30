import { api } from '#/lib/api'
import type {
  Amendment,
  AmendmentDetail,
  AmendmentProduct,
  AmendmentStatus,
} from '#/lib/amendments'
import type { PageResponse } from '#/lib/page'

export interface AmendmentFilters {
  status?: AmendmentStatus
  product?: AmendmentProduct
  page?: number
  size?: number
  /** Le backend n'accepte que `createdAt` et `updatedAt` (sinon 400). */
  sort?: string
}

export const amendmentsKeys = {
  all: ['amendments'] as const,
  list: (filters: AmendmentFilters) => ['amendments', 'list', filters] as const,
  detail: (id: number) => ['amendments', 'detail', id] as const,
}

export async function getAmendments(
  filters: AmendmentFilters = {},
): Promise<PageResponse<Amendment>> {
  const response = await api.get<PageResponse<Amendment>>(
    '/subscription-amendments',
    {
      params: {
        status: filters.status,
        product: filters.product,
        page: Math.max(0, filters.page ?? 0),
        size: Math.min(100, Math.max(1, filters.size ?? 20)),
        sort: filters.sort ?? 'createdAt,desc',
      },
    },
  )
  return response.data
}

export async function getAmendment(id: number): Promise<AmendmentDetail> {
  const response = await api.get<AmendmentDetail>(
    `/subscription-amendments/${id}`,
  )
  return response.data
}

/** Valide un brouillon : la réponse (statut, quittance, montant) fait foi. */
export async function validateAmendment(id: number): Promise<Amendment> {
  const response = await api.post<Amendment>(
    `/subscription-amendments/${id}/validate`,
  )
  return response.data
}

/** Supprime une modification (204, idempotent). */
export async function deleteAmendment(id: number): Promise<void> {
  await api.delete(`/subscription-amendments/${id}`)
}

/** PDF de l'avenant `amendment` du contrat (0 = police d'origine). */
export async function downloadPolicyDocument(
  subscriptionId: number,
  amendment: number,
): Promise<Blob> {
  const response = await api.get<Blob>(
    `/subscriptions/${subscriptionId}/policy-document`,
    { params: { amendment }, responseType: 'blob' },
  )
  return response.data
}
