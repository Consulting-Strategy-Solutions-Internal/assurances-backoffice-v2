import { api, readBlobErrorBody } from '#/lib/api'
import type {
  Amendment,
  AmendmentDetail,
  AmendmentListItem,
  AmendmentProduct,
  AmendmentStatus,
} from '#/lib/amendments'
import type { PageResponse } from '#/lib/page'
import { fetchAllPages } from '#/lib/fetch-all-pages'
import type { AllPages } from '#/lib/fetch-all-pages'

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
  allApplied: ['amendments', 'all', 'APPLIED'] as const,
}

export async function getAmendments(
  filters: AmendmentFilters = {},
): Promise<PageResponse<AmendmentListItem>> {
  const response = await api.get<PageResponse<AmendmentListItem>>(
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
  try {
    const response = await api.get<Blob>(
      `/subscriptions/${subscriptionId}/policy-document`,
      { params: { amendment }, responseType: 'blob' },
    )
    return response.data
  } catch (error) {
    throw await readBlobErrorBody(error)
  }
}

/** PDF d'une quittance, par le numéro imprimé dessus (`receipt.receiptNumber`). */
export async function downloadReceiptDocument(
  subscriptionId: number,
  receiptNumber: string,
): Promise<Blob> {
  try {
    const response = await api.get<Blob>(
      `/subscriptions/${subscriptionId}/receipts/${encodeURIComponent(receiptNumber)}/document`,
      { responseType: 'blob' },
    )
    return response.data
  } catch (error) {
    throw await readBlobErrorBody(error)
  }
}

/**
 * Toutes les modifications appliquées (pour retrouver les quittances d'un
 * contrat : la liste n'a pas de filtre par contrat), plus récentes d'abord.
 */
export function getAllAppliedAmendments(): Promise<
  AllPages<AmendmentListItem>
> {
  return fetchAllPages((page, size) =>
    getAmendments({ status: 'APPLIED', page, size, sort: 'createdAt,desc' }),
  )
}
