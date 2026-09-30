import { api } from '#/lib/api'
import type { PageParams, PageResponse } from '#/lib/page'

/**
 * Grille MRH Standard NSIA, figée côté backend (ADR-0021 backend) : lecture
 * et `PUT` seulement — `POST` et `DELETE` répondent 405. Formes lues dans les
 * DTO du backend (`LegalQualityResponse`, `BaseRateResponse`,
 * `WarrantyResponse`, `LegalQualityWarrantyResponse` et leurs `Update…Dto`).
 */

export const MRH_LEGAL_QUALITY_CODES = [
  'TENANT',
  'OWNER_OCCUPIER',
  'NON_OCCUPANT_OWNER',
  'FURNISHED_RENTAL',
] as const
export type MrhLegalQualityCode = (typeof MRH_LEGAL_QUALITY_CODES)[number]

export const MRH_WARRANTY_CODES = [
  'FIRE',
  'ELECTRICAL_DAMAGE',
  'STORM',
  'FLOOD',
  'WATER_DAMAGE',
  'GLASS_BREAKAGE',
  'BURGLARY',
  'STAY_TRAVEL',
  'IT_ALL_RISKS',
  'PRIVATE_LIABILITY',
  'BUILDING_OWNER_LIABILITY',
] as const
export type MrhWarrantyCode = (typeof MRH_WARRANTY_CODES)[number]

export type PropertyBasis = 'BATIMENT' | 'LOCATIVE' | 'AUCUN'
export type PremiumType = 'POURCENTAGE' | 'FORFAIT' | 'CAPITAL'

export interface LegalQualityResponse {
  id: number
  code: MrhLegalQualityCode
  name: string
  description: string | null
  propertyBasis: PropertyBasis
  occupancyRequired: boolean
  createdAt: string
  updatedAt: string
}

/** `UpdateLegalQualityDto` : `description` absente ou null est effacée. */
export interface UpdateLegalQualityPayload {
  name: string
  description: string | null
}

/** Taux en ‰ ; `rentMultiplier` : risques locatifs = loyer mensuel × valeur. */
export interface BaseRateResponse {
  id: number
  legalQualityId: number
  buildingPremiumRate: number | null
  contentsPremiumRate: number | null
  rentalValuePremiumRate: number | null
  rentMultiplier: number | null
  minimumContentsValue: number | null
  createdAt: string
  updatedAt: string
}

export type BaseRateField =
  | 'buildingPremiumRate'
  | 'contentsPremiumRate'
  | 'rentalValuePremiumRate'
  | 'rentMultiplier'

/** `UpdateBaseRateDto` : un champ absent garde sa valeur. */
export type UpdateBaseRatePayload = Partial<Record<BaseRateField, number>>

export interface WarrantyResponse {
  id: number
  code: MrhWarrantyCode
  name: string
  /** Taux de taxe, en %. */
  taxRate: number
  createdAt: string
  updatedAt: string
}

export interface UpdateWarrantyPayload {
  name: string
  taxRate: number
}

export interface LegalQualityWarrantyResponse {
  id: number
  legalQualityId: number
  warrantyId: number
  premiumType: PremiumType
  /** % de la prime de base (POURCENTAGE) ou ‰ de la part de capital (CAPITAL). */
  rate: number | null
  /** Francs (FORFAIT). */
  flatAmount: number | null
  /** % des capitaux bâtiment (ou risques locatifs) + contenu (CAPITAL). */
  capitalShare: number | null
  mandatory: boolean
  createdAt: string
  updatedAt: string
}

/**
 * `UpdateLegalQualityWarrantyDto` : les champs du mode de la ligne sont exigés
 * à chaque appel, les autres doivent être absents ; `mandatory` absent garde
 * sa valeur.
 */
export interface UpdateLegalQualityWarrantyPayload {
  rate?: number
  flatAmount?: number
  capitalShare?: number
  mandatory?: boolean
}

/** 4 situations, 11 garanties, 39 lignes : une page de 100 suffit. */
const ALL: PageParams = { page: 0, size: 100, sort: 'id,asc' }

export async function getLegalQualities(): Promise<
  PageResponse<LegalQualityResponse>
> {
  const response = await api.get('/mrh-standard/legal-qualities', {
    params: ALL,
  })
  return response.data
}

export async function getLegalQuality(
  id: number,
): Promise<LegalQualityResponse> {
  const response = await api.get(`/mrh-standard/legal-qualities/${id}`)
  return response.data
}

export async function updateLegalQuality(
  id: number,
  data: UpdateLegalQualityPayload,
): Promise<LegalQualityResponse> {
  const response = await api.put(`/mrh-standard/legal-qualities/${id}`, data)
  return response.data
}

export async function getBaseRates(): Promise<PageResponse<BaseRateResponse>> {
  const response = await api.get('/base-rates', { params: ALL })
  return response.data
}

export async function getBaseRate(id: number): Promise<BaseRateResponse> {
  const response = await api.get(`/base-rates/${id}`)
  return response.data
}

export async function updateBaseRate(
  id: number,
  data: UpdateBaseRatePayload,
): Promise<BaseRateResponse> {
  const response = await api.put(`/base-rates/${id}`, data)
  return response.data
}

export async function getWarranties(): Promise<PageResponse<WarrantyResponse>> {
  const response = await api.get('/warranties', { params: ALL })
  return response.data
}

export async function getWarranty(id: number): Promise<WarrantyResponse> {
  const response = await api.get(`/warranties/${id}`)
  return response.data
}

export async function updateWarranty(
  id: number,
  data: UpdateWarrantyPayload,
): Promise<WarrantyResponse> {
  const response = await api.put(`/warranties/${id}`, data)
  return response.data
}

export async function getLegalQualityWarranties(): Promise<
  PageResponse<LegalQualityWarrantyResponse>
> {
  const response = await api.get('/legal-quality-warranties', { params: ALL })
  return response.data
}

export async function getLegalQualityWarranty(
  id: number,
): Promise<LegalQualityWarrantyResponse> {
  const response = await api.get(`/legal-quality-warranties/${id}`)
  return response.data
}

export async function updateLegalQualityWarranty(
  id: number,
  data: UpdateLegalQualityWarrantyPayload,
): Promise<LegalQualityWarrantyResponse> {
  const response = await api.put(`/legal-quality-warranties/${id}`, data)
  return response.data
}
