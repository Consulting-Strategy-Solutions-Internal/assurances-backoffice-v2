import { isAxiosError } from 'axios'
import { api } from '#/lib/api'
import type { PageResponse } from '#/services/users'

/**
 * Tarification du modèle IA (Individuel Accident) :
 * Produit → Classes de risque → Taux de prime + Modificateurs de prime,
 * plus des coefficients de proration au niveau du produit.
 */

export const MODIFIER_TYPES = [
  'PERCENTAGE',
  'FIXED_AMOUNT',
  'MULTIPLIER',
  'SURCHARGE',
  'DISCOUNT',
] as const
export type ModifierType = (typeof MODIFIER_TYPES)[number]

export const TRIGGER_TYPES = ['AGE', 'MANUAL'] as const
export type TriggerType = (typeof TRIGGER_TYPES)[number]

// ---------------------------------------------------------------------------
// Classes de risque (par produit)
// ---------------------------------------------------------------------------

export interface RiskClassResponse {
  id: number
  classNumber: number
  description?: string
  productId: number
  createdAt: string
  updatedAt: string
}

export interface CreateRiskClassPayload {
  classNumber: number
  description?: string
  productId: number
}

// UpdateRiskClassDto exige également productId.
export type UpdateRiskClassPayload = CreateRiskClassPayload

export async function getRiskClasses(
  productId: number,
  page = 0,
  size = 200,
): Promise<PageResponse<RiskClassResponse>> {
  const response = await api.get('/risk-classes', {
    params: { productId, page, size },
  })
  return response.data
}

export async function createRiskClass(
  data: CreateRiskClassPayload,
): Promise<RiskClassResponse> {
  const response = await api.post('/risk-classes', data)
  return response.data
}

export async function updateRiskClass(
  id: number,
  data: UpdateRiskClassPayload,
): Promise<RiskClassResponse> {
  const response = await api.put(`/risk-classes/${id}`, data)
  return response.data
}

export async function deleteRiskClass(id: number): Promise<void> {
  await api.delete(`/risk-classes/${id}`)
}

// ---------------------------------------------------------------------------
// Taux de prime (un par classe de risque)
// ---------------------------------------------------------------------------

export interface RiskClassPremiumRateResponse {
  id: number
  riskClassId: number
  death: number
  permanentDisability: number
  medicalExpenses: number
  createdAt: string
  updatedAt: string
}

export interface CreateRiskClassPremiumRatePayload {
  riskClassId: number
  death: number
  permanentDisability: number
  medicalExpenses: number
}

export type UpdateRiskClassPremiumRatePayload = Omit<
  CreateRiskClassPremiumRatePayload,
  'riskClassId'
>

// Renvoie le taux de prime d'une classe de risque, ou null s'il n'existe pas
// encore (404). Les autres erreurs sont propagées pour ne pas masquer une
// panne réelle derrière un état « aucun taux ».
export async function getPremiumRateByRiskClass(
  riskClassId: number,
): Promise<RiskClassPremiumRateResponse | null> {
  try {
    const response = await api.get(
      `/risk-class-premium-rates/by-risk-class/${riskClassId}`,
    )
    return response.data
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null
    throw error
  }
}

export async function createRiskClassPremiumRate(
  data: CreateRiskClassPremiumRatePayload,
): Promise<RiskClassPremiumRateResponse> {
  const response = await api.post('/risk-class-premium-rates', data)
  return response.data
}

export async function updateRiskClassPremiumRate(
  id: number,
  data: UpdateRiskClassPremiumRatePayload,
): Promise<RiskClassPremiumRateResponse> {
  const response = await api.put(`/risk-class-premium-rates/${id}`, data)
  return response.data
}

// ---------------------------------------------------------------------------
// Modificateurs de prime (par classe de risque)
// ---------------------------------------------------------------------------

export interface PremiumModifierResponse {
  id: number
  code: string
  label: string
  modifierType: ModifierType
  rate: number
  triggerType: TriggerType
  minAge: number
  maxAge: number
  isActive: boolean
  riskClassId: number
  createdAt: string
  updatedAt: string
}

export interface CreatePremiumModifierPayload {
  code: string
  label: string
  modifierType: ModifierType
  rate: number
  triggerType: TriggerType
  minAge: number
  maxAge: number
  isActive: boolean
  riskClassId: number
}

// UpdatePremiumModifierDto ne porte pas riskClassId.
export type UpdatePremiumModifierPayload = Omit<
  CreatePremiumModifierPayload,
  'riskClassId'
>

export async function getPremiumModifiers(
  riskClassId: number,
  page = 0,
  size = 200,
): Promise<PageResponse<PremiumModifierResponse>> {
  const response = await api.get('/premium-modifiers', {
    params: { riskClassId, page, size },
  })
  return response.data
}

export async function createPremiumModifier(
  data: CreatePremiumModifierPayload,
): Promise<PremiumModifierResponse> {
  const response = await api.post('/premium-modifiers', data)
  return response.data
}

export async function updatePremiumModifier(
  id: number,
  data: UpdatePremiumModifierPayload,
): Promise<PremiumModifierResponse> {
  const response = await api.put(`/premium-modifiers/${id}`, data)
  return response.data
}

export async function deletePremiumModifier(id: number): Promise<void> {
  await api.delete(`/premium-modifiers/${id}`)
}

// ---------------------------------------------------------------------------
// Coefficients de proration (par produit, selon la durée en mois)
// ---------------------------------------------------------------------------

export interface ProrationCoefficientResponse {
  id: number
  productId: number
  minMonths: number
  maxMonths?: number
  coefficient: number
  createdAt: string
  updatedAt: string
}

export interface CreateProrationCoefficientPayload {
  productId: number
  minMonths: number
  maxMonths?: number
  coefficient: number
}

// UpdateProrationCoefficientDto exige également productId.
export type UpdateProrationCoefficientPayload =
  CreateProrationCoefficientPayload

export async function getProrationCoefficients(
  productId: number,
  page = 0,
  size = 200,
): Promise<PageResponse<ProrationCoefficientResponse>> {
  const response = await api.get('/proration-coefficients', {
    params: { productId, page, size },
  })
  return response.data
}

export async function createProrationCoefficient(
  data: CreateProrationCoefficientPayload,
): Promise<ProrationCoefficientResponse> {
  const response = await api.post('/proration-coefficients', data)
  return response.data
}

export async function updateProrationCoefficient(
  id: number,
  data: UpdateProrationCoefficientPayload,
): Promise<ProrationCoefficientResponse> {
  const response = await api.put(`/proration-coefficients/${id}`, data)
  return response.data
}

export async function deleteProrationCoefficient(id: number): Promise<void> {
  await api.delete(`/proration-coefficients/${id}`)
}
