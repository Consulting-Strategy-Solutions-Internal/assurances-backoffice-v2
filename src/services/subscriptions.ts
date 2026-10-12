import { isAxiosError } from 'axios'
import { api } from '#/lib/api'
import type { PageResponse } from '#/lib/page'

export const SUBSCRIPTION_STATUSES = [
  'PENDING_PAYMENT',
  'ACTIVE',
  'EXPIRED',
  'CANCELLED',
] as const
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number]

export interface SubscriptionInsured {
  relationship?: string | null
  firstName?: string | null
  lastName?: string | null
  birthDate?: string | null
  phone?: string | null
}

export type InsuranceType = 'IA' | 'MRH' | 'TRAVEL'

export const EVO_ISSUANCE_STATUSES = [
  'PENDING',
  'SENDING',
  'ISSUED',
  'CERTIFICATE_READY',
  'TO_RECONCILE',
  'REJECTED',
] as const
/** État de l'émission de la police chez EVO (`EvoIssuanceStatus`). */
export type EvoIssuanceStatus = (typeof EVO_ISSUANCE_STATUSES)[number]

export type TravelerRole = 'PRINCIPAL' | 'SPOUSE' | 'CHILD' | 'ADULT'

/** Voyageur d'un contrat voyage (`TravelerResponse`). */
export interface TravelerResponse {
  role: TravelerRole
  lastName: string
  firstName: string
  /** LocalDate. */
  birthDate: string
  gender: string | null
  nationality: string | null
  residenceCountry: string | null
  passportNumber: string | null
  email: string | null
  phone: string | null
  otherFields: Record<string, string> | null
}

/** Police lue chez EVO (`?refresh=true` seulement) ; chaînes brutes d'EVO. */
export interface EvoPolicyState {
  /** `active` | `disabled` (minuscules). */
  status: string
  policyNumber: string | null
  startDate: string | null
  endDate: string | null
  cancelDate: string | null
}

/**
 * Bloc `travel` d'un contrat voyage (`TravelContractResponse`) ; clé absente
 * sur IA et MRH.
 */
export interface TravelContractResponse {
  category: string | null
  destinationArea: string | null
  /** LocalDate. */
  startDate: string | null
  endDate: string | null
  composition: 'SINGLE' | 'GROUP' | null
  /** Code produit EVO de la formule (« 988 »). */
  formulaCode: string | null
  formulaName: string | null
  /** Nul tant que le contrat n'est pas payé. */
  evoIssuanceStatus: EvoIssuanceStatus | null
  /** Numéro EVO (`NSIACIVO…`). */
  policyNumber: string | null
  /** Attestation copiée chez nous ; nulle jusque-là. */
  certificateDocumentId: number | null
  travelers: TravelerResponse[]
  /** Présent seulement avec `?refresh=true` quand EVO a répondu. */
  evo?: EvoPolicyState
}

export interface SubscriptionProductSnapshot {
  productId?: number | null
  productLabel?: string | null
  productCode?: number | null
  insuranceType?: InsuranceType | null
  insuranceTypeLabel?: string | null
}

/** Contrat (lecture seule côté back-office). */
export interface SubscriptionResponse {
  id: number
  quotationId: number
  clientId: number
  sellerId?: number | null
  paymentMode: string
  status: SubscriptionStatus
  totalPremium: number
  currency: string
  policyNumber?: string | null
  activatedAt?: string | null
  coverageStart?: string | null
  coverageEnd?: string | null
  insured?: SubscriptionInsured | null
  productSnapshot?: SubscriptionProductSnapshot | null
  travel?: TravelContractResponse
  createdAt: string
  updatedAt: string
}

export interface SubscriptionFilters {
  status?: SubscriptionStatus
  page?: number
  size?: number
  /** Autorisés : createdAt, coverageStart, policyIssuedAt. */
  sort?: string
}

export const subscriptionsKeys = {
  all: ['subscriptions'] as const,
  detail: (id: number) => ['subscriptions', 'detail', id] as const,
  /** Lecture `?refresh=true` (état EVO), seulement sur demande. */
  evoRefresh: (id: number) => ['subscriptions', 'evo-refresh', id] as const,
  renewal: (id: number) => ['subscriptions', 'renewal', id] as const,
}

export async function getSubscriptions(
  filters: SubscriptionFilters = {},
): Promise<PageResponse<SubscriptionResponse>> {
  const response = await api.get<PageResponse<SubscriptionResponse>>(
    '/subscriptions',
    {
      params: {
        status: filters.status,
        page: Math.max(0, filters.page ?? 0),
        size: Math.min(100, Math.max(1, filters.size ?? 20)),
        sort: filters.sort ?? 'createdAt,desc',
      },
    },
  )
  return response.data
}

export type IdentityDocumentType =
  | 'NATIONAL_ID'
  | 'PASSPORT'
  | 'DRIVING_LICENSE'
  | 'CONSULAR_CARD'
  | 'RCCM'

/** Pièce d'identité envoyée : son type et les faces reçues (pas l'image). */
export interface IdentityDocumentStatus {
  type: IdentityDocumentType
  front: boolean
  back: boolean
}

export type HousingType = 'VILLA' | 'APARTMENT' | 'DUPLEX' | 'BUILDING'

/** Logement assuré d'un contrat MRH (`HousingDto`) ; nul sur IA. */
export interface SubscriptionHousing {
  type: HousingType
  number: string
  rooms: number
  location: string
  latitude?: number | null
  longitude?: number | null
  /** Propriétaire non occupant seulement. */
  surfaceArea?: number | null
}

/** Société assurée d'un contrat MRH souscrit en son nom (`InsuredCompanyDto`). */
export interface SubscriptionInsuredCompany {
  name: string
  phoneNumber: string
  email: string
  address: string
}

/** Champs lus de `SubscriptionDetailResponse` (`GET /subscriptions/{id}`). */
export interface SubscriptionDetailResponse {
  id: number
  clientId: number
  status: SubscriptionStatus
  policyNumber?: string | null
  /** 0 pour la police elle-même, +1 par avenant. */
  amendmentNumber: number
  /** Signature du souscripteur reçue (l'image n'est pas lisible ici). */
  signed: boolean
  identityDocuments: IdentityDocumentStatus[]
  /** PDF de la police émis ; nul tant qu'il ne l'est pas. */
  policyDocumentId?: number | null
  productSnapshot?: SubscriptionProductSnapshot | null
  totalPremium?: number
  coverageStart?: string | null
  coverageEnd?: string | null
  housing?: SubscriptionHousing | null
  insuredCompany?: SubscriptionInsuredCompany | null
  /** Contrat voyage seulement. */
  travel?: TravelContractResponse
}

/** `RenewalResponse.receipt` (`GET /subscriptions/{id}/renewal`). */
export interface RenewalReceipt {
  receiptNumber: string
  status: 'PAID' | 'PAID_NOT_APPLIED'
  total: number
  /** PDF de la quittance émis ; nul jusque-là. */
  documentId?: number | null
}

/** Champs lus de `RenewalResponse`. */
export interface SubscriptionRenewal {
  id: number
  subscriptionId: number
  status: string
  receipt?: RenewalReceipt | null
}

/** Fiche d'un contrat (`subscription:read-all`). */
export async function getSubscription(
  id: number,
  options: { refresh?: boolean } = {},
): Promise<SubscriptionDetailResponse> {
  const url = `/subscriptions/${id}`
  const response = options.refresh
    ? await api.get<SubscriptionDetailResponse>(url, {
        params: { refresh: true },
      })
    : await api.get<SubscriptionDetailResponse>(url)
  return response.data
}

/**
 * Dernier renouvellement d'un contrat ; `null` quand il n'y en a pas encore
 * (404 « No renewal for subscription »).
 */
export async function getSubscriptionRenewal(
  id: number,
): Promise<SubscriptionRenewal | null> {
  try {
    const response = await api.get<SubscriptionRenewal>(
      `/subscriptions/${id}/renewal`,
    )
    return response.data
  } catch (err) {
    if (isAxiosError(err) && err.response?.status === 404) return null
    throw err
  }
}
