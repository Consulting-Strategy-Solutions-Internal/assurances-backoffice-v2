import { api, readBlobErrorBody } from '#/lib/api'
import type { PageResponse } from '#/lib/page'
import type {
  EvoIssuanceStatus,
  SubscriptionStatus,
} from '#/services/subscriptions'

export type ProductCode =
  | 'IA_STANDARD'
  | 'IA_FOR_ALL'
  | 'MRH_STANDARD'
  | 'TRAVEL_STANDARD'

/**
 * Contrat voyage vu par la supervision (`TravelSupervisionItemResponse`) :
 * élément de `GET /subscriptions/travel` et réponse des trois décisions.
 * Les `LocalDateTime` sont sans fuseau, à l'heure d'Abidjan (UTC).
 */
export interface TravelSupervisionItem {
  id: number
  productCode: ProductCode
  clientId: number | null
  status: SubscriptionStatus
  evoIssuanceStatus: EvoIssuanceStatus | null
  /** Nombre d'envois à EVO. */
  evoIssuanceAttempts: number
  evoPolicyId: string | null
  policyNumber: string | null
  /** Dernier envoi à EVO ; nul si jamais envoyé. */
  evoSentAt: string | null
  /** Dernière erreur ou décision enregistrée. */
  evoLastError: string | null
  /** `TO_RECONCILE` seulement : décision ouverte à partir de cette heure. */
  reconcilableFrom: string | null
  coverageStart: string | null
  coverageEnd: string | null
  createdAt: string
}

export const travelKeys = {
  all: ['travel'] as const,
  supervision: (status: EvoIssuanceStatus | 'ALL', page: number) =>
    ['travel', 'supervision', status, page] as const,
  /** Ligne de supervision d'un contrat `TO_RECONCILE` (pour la page contrat). */
  item: (id: number) => ['travel', 'item', id] as const,
}

/** Taille max d'une page côté serveur (plafonnée sans erreur au-delà). */
const SCAN_PAGE_SIZE = 100
const SCAN_MAX_PAGES = 20

/**
 * Liste de supervision, plus récente d'abord. **Aucun `sort`** : le serveur
 * répond 400 « Invalid sort property » s'il en reçoit un.
 */
export async function getTravelSupervision(params: {
  evoIssuanceStatus?: EvoIssuanceStatus
  page?: number
  size?: number
}): Promise<PageResponse<TravelSupervisionItem>> {
  const response = await api.get<PageResponse<TravelSupervisionItem>>(
    '/subscriptions/travel',
    {
      params: {
        evoIssuanceStatus: params.evoIssuanceStatus,
        page: Math.max(0, params.page ?? 0),
        size: Math.min(SCAN_PAGE_SIZE, Math.max(1, params.size ?? 20)),
      },
    },
  )
  return response.data
}

/**
 * Ligne de supervision d'un contrat, cherchée dans les contrats de l'état
 * donné (pas de route de lecture unitaire) ; `null` si absente.
 */
export async function findTravelSupervisionItem(
  id: number,
  evoIssuanceStatus: EvoIssuanceStatus,
): Promise<TravelSupervisionItem | null> {
  for (let page = 0; page < SCAN_MAX_PAGES; page++) {
    const result = await getTravelSupervision({
      evoIssuanceStatus,
      page,
      size: SCAN_PAGE_SIZE,
    })
    const found = result.content.find((item) => item.id === id)
    if (found) return found
    if (result.last || result.content.length === 0) return null
  }
  return null
}

/** Rattache la police EVO trouvée chez Cover Edge. */
export async function attachTravelPolicy(
  id: number,
  policyId: string,
): Promise<TravelSupervisionItem> {
  const response = await api.post<TravelSupervisionItem>(
    `/subscriptions/travel/${id}/reconciliation/attach`,
    { policyId },
  )
  return response.data
}

/** Relance l'émission (un seul nouvel envoi à EVO). */
export async function retryTravelIssuance(
  id: number,
): Promise<TravelSupervisionItem> {
  const response = await api.post<TravelSupervisionItem>(
    `/subscriptions/travel/${id}/reconciliation/retry`,
  )
  return response.data
}

/** Constate le refus : contrat annulé, remboursement demandé. Irréversible. */
export async function refuseTravelIssuance(
  id: number,
  reason: string,
): Promise<TravelSupervisionItem> {
  const response = await api.post<TravelSupervisionItem>(
    `/subscriptions/travel/${id}/reconciliation/refuse`,
    { reason },
  )
  return response.data
}

/** Attestation voyage (PDF copié chez nous, jamais l'URL EVO). */
export async function downloadTravelCertificate(
  subscriptionId: number,
): Promise<Blob> {
  try {
    const response = await api.get<Blob>(
      `/subscriptions/${subscriptionId}/policy-document`,
      { responseType: 'blob' },
    )
    return response.data
  } catch (error) {
    throw await readBlobErrorBody(error)
  }
}
