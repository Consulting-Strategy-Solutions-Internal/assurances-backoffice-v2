import { isAxiosError } from 'axios'
import { api } from '#/lib/api'
import type { PageResponse } from '#/services/users'

/**
 * Tarification du modèle MRH (Multirisque Habitation) :
 * Produit → Qualités juridiques → Taux de base + Garanties liées.
 */

export const PROPERTY_BASES = ['BATIMENT', 'LOCATIVE', 'AUCUN'] as const
export type PropertyBasis = (typeof PROPERTY_BASES)[number]

export const PREMIUM_TYPES = ['POURCENTAGE', 'FORFAIT'] as const
export type PremiumType = (typeof PREMIUM_TYPES)[number]

// ---------------------------------------------------------------------------
// Qualités juridiques (par produit)
// ---------------------------------------------------------------------------

export interface LegalQualityResponse {
  id: number
  name: string
  description?: string
  productId: number
  propertyBasis?: PropertyBasis
  createdAt: string
  updatedAt: string
}

export interface CreateLegalQualityPayload {
  name: string
  description?: string
  productId: number
  propertyBasis?: PropertyBasis
}

// UpdateLegalQualityDto exige également productId.
export type UpdateLegalQualityPayload = CreateLegalQualityPayload

export async function getLegalQualities(
  productId: number,
  page = 0,
  size = 200,
): Promise<PageResponse<LegalQualityResponse>> {
  const response = await api.get('/legal-qualities', {
    params: { productId, page, size },
  })
  return response.data
}

export async function createLegalQuality(
  data: CreateLegalQualityPayload,
): Promise<LegalQualityResponse> {
  const response = await api.post('/legal-qualities', data)
  return response.data
}

export async function updateLegalQuality(
  id: number,
  data: UpdateLegalQualityPayload,
): Promise<LegalQualityResponse> {
  const response = await api.put(`/legal-qualities/${id}`, data)
  return response.data
}

export async function deleteLegalQuality(id: number): Promise<void> {
  await api.delete(`/legal-qualities/${id}`)
}

// ---------------------------------------------------------------------------
// Taux de base (un par qualité juridique)
// ---------------------------------------------------------------------------

export interface BaseRateResponse {
  id: number
  legalQualityId: number
  buildingPremiumRate?: number
  contentsPremiumRate?: number
  rentalValuePremiumRate?: number
  minimumContentsValue?: number
  createdAt: string
  updatedAt: string
}

export interface CreateBaseRatePayload {
  legalQualityId: number
  buildingPremiumRate?: number
  contentsPremiumRate?: number
  rentalValuePremiumRate?: number
  minimumContentsValue?: number
}

export type UpdateBaseRatePayload = Omit<
  CreateBaseRatePayload,
  'legalQualityId'
>

// Renvoie le taux de base d'une qualité juridique, ou null s'il n'existe pas
// encore (404). Les autres erreurs sont propagées pour ne pas masquer une
// panne réelle derrière un état « aucun taux ».
export async function getBaseRateByLegalQuality(
  legalQualityId: number,
): Promise<BaseRateResponse | null> {
  try {
    const response = await api.get(
      `/base-rates/by-legal-quality/${legalQualityId}`,
    )
    return response.data
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null
    throw error
  }
}

export async function createBaseRate(
  data: CreateBaseRatePayload,
): Promise<BaseRateResponse> {
  const response = await api.post('/base-rates', data)
  return response.data
}

export async function updateBaseRate(
  id: number,
  data: UpdateBaseRatePayload,
): Promise<BaseRateResponse> {
  const response = await api.put(`/base-rates/${id}`, data)
  return response.data
}

// ---------------------------------------------------------------------------
// Garanties (catalogue global)
// ---------------------------------------------------------------------------

export interface WarrantyResponse {
  id: number
  name: string
  taxRate: number
  createdAt: string
  updatedAt: string
}

export interface CreateWarrantyPayload {
  name: string
  taxRate: number
}

export type UpdateWarrantyPayload = CreateWarrantyPayload

export async function getWarranties(
  page = 0,
  size = 200,
): Promise<PageResponse<WarrantyResponse>> {
  const response = await api.get('/warranties', { params: { page, size } })
  return response.data
}

export async function createWarranty(
  data: CreateWarrantyPayload,
): Promise<WarrantyResponse> {
  const response = await api.post('/warranties', data)
  return response.data
}

// ---------------------------------------------------------------------------
// Garanties d'une qualité juridique (liaison qualité ↔ garantie + tarif)
// ---------------------------------------------------------------------------

export interface LegalQualityWarrantyResponse {
  id: number
  legalQualityId: number
  warrantyId: number
  premiumType: PremiumType
  rate?: number
  flatAmount?: number
  mandatory?: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateLegalQualityWarrantyPayload {
  legalQualityId: number
  warrantyId: number
  premiumType: PremiumType
  rate?: number
  flatAmount?: number
  mandatory?: boolean
}

export async function getLegalQualityWarranties(
  legalQualityId: number,
  page = 0,
  size = 200,
): Promise<PageResponse<LegalQualityWarrantyResponse>> {
  const response = await api.get('/legal-quality-warranties', {
    params: { legalQualityId, page, size },
  })
  return response.data
}

export async function createLegalQualityWarranty(
  data: CreateLegalQualityWarrantyPayload,
): Promise<LegalQualityWarrantyResponse> {
  const response = await api.post('/legal-quality-warranties', data)
  return response.data
}

export async function deleteLegalQualityWarranty(id: number): Promise<void> {
  await api.delete(`/legal-quality-warranties/${id}`)
}
