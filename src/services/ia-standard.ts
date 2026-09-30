import { isAxiosError } from 'axios'
import { api } from '#/lib/api'
import type { PageParams, PageResponse } from '#/lib/page'

const BASE = '/ia-standard'

// ---------------------------------------------------------------------------
// Classes de risque & métiers
// ---------------------------------------------------------------------------

export const RISK_CLASS_STATUSES = ['ACTIVE', 'INACTIVE', 'ALL'] as const
export type RiskClassStatus = (typeof RISK_CLASS_STATUSES)[number]

export interface RiskClassResponse {
  id: number
  classNumber: number
  description: string
  active: boolean
  occupationCount: number
  createdAt: string
  updatedAt: string
}

export interface OccupationResponse {
  id: number
  riskClassId: number
  description: string
  active: boolean
}

export interface RiskClassDetailResponse extends RiskClassResponse {
  occupations: OccupationResponse[]
}

export interface OccupationDetailResponse {
  id: number
  description: string
  active: boolean
  riskClass: { id: number; classNumber: number; description: string }
}

export interface OccupationSearchResult {
  id: number
  description: string
  classNumber: number
  riskClassId: number
}

export interface RiskClassListParams extends PageParams {
  /** Défaut serveur : ACTIVE (ignoré sans `riskclass:write`). */
  status?: RiskClassStatus
}

export interface CreateOccupationPayload {
  description: string
  active?: boolean
}

export interface CreateRiskClassPayload {
  classNumber: number
  description: string
  active?: boolean
  occupations?: CreateOccupationPayload[]
}

export interface UpdateRiskClassPayload {
  classNumber: number
  description: string
}

export interface UpdateOccupationPayload {
  description: string
  /** Reclassement : id d'une classe active. */
  riskClassId?: number
}

export interface OccupationSearchParams {
  q: string
  page?: number
  size?: number
}

export async function getRiskClasses(
  params: RiskClassListParams = {},
): Promise<PageResponse<RiskClassResponse>> {
  const response = await api.get(`${BASE}/risk-classes`, {
    params: {
      status: params.status,
      page: params.page,
      size: params.size,
      sort: params.sort,
    },
  })
  return response.data
}

export async function getRiskClass(
  id: number,
): Promise<RiskClassDetailResponse> {
  const response = await api.get(`${BASE}/risk-classes/${id}`)
  return response.data
}

export async function createRiskClass(
  data: CreateRiskClassPayload,
): Promise<RiskClassDetailResponse> {
  const response = await api.post(`${BASE}/risk-classes`, data)
  return response.data
}

export async function updateRiskClass(
  id: number,
  data: UpdateRiskClassPayload,
): Promise<RiskClassDetailResponse> {
  const response = await api.put(`${BASE}/risk-classes/${id}`, data)
  return response.data
}

export async function setRiskClassStatus(
  id: number,
  active: boolean,
): Promise<RiskClassDetailResponse> {
  const response = await api.patch(`${BASE}/risk-classes/${id}/status`, {
    active,
  })
  return response.data
}

export async function deleteRiskClass(id: number): Promise<void> {
  await api.delete(`${BASE}/risk-classes/${id}`)
}

export async function addOccupation(
  riskClassId: number,
  data: CreateOccupationPayload,
): Promise<OccupationResponse> {
  const response = await api.post(
    `${BASE}/risk-classes/${riskClassId}/occupations`,
    data,
  )
  return response.data
}

export async function getOccupation(
  id: number,
): Promise<OccupationDetailResponse> {
  const response = await api.get(`${BASE}/occupations/${id}`)
  return response.data
}

export async function updateOccupation(
  id: number,
  data: UpdateOccupationPayload,
): Promise<OccupationResponse> {
  const response = await api.put(`${BASE}/occupations/${id}`, data)
  return response.data
}

export async function setOccupationStatus(
  id: number,
  active: boolean,
): Promise<OccupationResponse> {
  const response = await api.patch(`${BASE}/occupations/${id}/status`, {
    active,
  })
  return response.data
}

export async function deleteOccupation(id: number): Promise<void> {
  await api.delete(`${BASE}/occupations/${id}`)
}

/** `q` ≥ 2 caractères, `size` ≤ 100. */
export async function searchOccupations(
  params: OccupationSearchParams,
): Promise<PageResponse<OccupationSearchResult>> {
  const response = await api.get(`${BASE}/occupations/search`, {
    params: { q: params.q, page: params.page, size: params.size },
  })
  return response.data
}

// ---------------------------------------------------------------------------
// Barèmes de prime (taux en ‰)
// ---------------------------------------------------------------------------

export interface PremiumRateResponse {
  id: number
  riskClassId: number
  death: number
  permanentDisability: number
  medicalExpenses: number
  createdAt: string
  updatedAt: string
}

export interface CreatePremiumRatePayload {
  riskClassId: number
  death: number
  permanentDisability: number
  medicalExpenses: number
}

export type UpdatePremiumRatePayload = Omit<
  CreatePremiumRatePayload,
  'riskClassId'
>

export async function getPremiumRates(
  params: PageParams = {},
): Promise<PageResponse<PremiumRateResponse>> {
  const response = await api.get(`${BASE}/risk-class-premium-rates`, {
    params: { page: params.page, size: params.size, sort: params.sort },
  })
  return response.data
}

/** Barème d'une classe, ou `null` si elle n'en a pas (404). */
export async function getPremiumRateByRiskClass(
  riskClassId: number,
): Promise<PremiumRateResponse | null> {
  try {
    const response = await api.get(
      `${BASE}/risk-class-premium-rates/by-risk-class/${riskClassId}`,
    )
    return response.data
  } catch (err) {
    if (isAxiosError(err) && err.response?.status === 404) return null
    throw err
  }
}

export async function getPremiumRate(id: number): Promise<PremiumRateResponse> {
  const response = await api.get(`${BASE}/risk-class-premium-rates/${id}`)
  return response.data
}

export async function createPremiumRate(
  data: CreatePremiumRatePayload,
): Promise<PremiumRateResponse> {
  const response = await api.post(`${BASE}/risk-class-premium-rates`, data)
  return response.data
}

export async function updatePremiumRate(
  id: number,
  data: UpdatePremiumRatePayload,
): Promise<PremiumRateResponse> {
  const response = await api.put(`${BASE}/risk-class-premium-rates/${id}`, data)
  return response.data
}

export async function deletePremiumRate(id: number): Promise<void> {
  await api.delete(`${BASE}/risk-class-premium-rates/${id}`)
}

// ---------------------------------------------------------------------------
// Majorations & réductions
// ---------------------------------------------------------------------------

export const MODIFIER_TYPES = ['SURCHARGE', 'DISCOUNT'] as const
export type ModifierType = (typeof MODIFIER_TYPES)[number]

export const MODIFIER_TRIGGER_TYPES = ['MANUAL'] as const
export type ModifierTriggerType = (typeof MODIFIER_TRIGGER_TYPES)[number]

export interface PremiumModifierResponse {
  id: number
  code: string
  label: string
  modifierType: ModifierType
  /** Pourcentage (0,01–100). */
  rate: number
  triggerType: ModifierTriggerType
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreatePremiumModifierPayload {
  code: string
  label: string
  modifierType: ModifierType
  rate: number
  /** Toujours `MANUAL`, jamais affiché. */
  triggerType: ModifierTriggerType
  isActive: boolean
}

// PUT remplace tout : même forme que la création.
export type UpdatePremiumModifierPayload = CreatePremiumModifierPayload

export async function getPremiumModifiers(
  params: PageParams = {},
): Promise<PageResponse<PremiumModifierResponse>> {
  const response = await api.get(`${BASE}/premium-modifiers`, {
    params: { page: params.page, size: params.size, sort: params.sort },
  })
  return response.data
}

export async function getPremiumModifier(
  id: number,
): Promise<PremiumModifierResponse> {
  const response = await api.get(`${BASE}/premium-modifiers/${id}`)
  return response.data
}

export async function createPremiumModifier(
  data: CreatePremiumModifierPayload,
): Promise<PremiumModifierResponse> {
  const response = await api.post(`${BASE}/premium-modifiers`, data)
  return response.data
}

export async function updatePremiumModifier(
  id: number,
  data: UpdatePremiumModifierPayload,
): Promise<PremiumModifierResponse> {
  const response = await api.put(`${BASE}/premium-modifiers/${id}`, data)
  return response.data
}

export async function deletePremiumModifier(id: number): Promise<void> {
  await api.delete(`${BASE}/premium-modifiers/${id}`)
}
