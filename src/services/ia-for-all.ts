import { api } from '#/lib/api'

const BASE = '/ia-for-all/formulas'

export const FORMULA_STATUSES = ['ACTIVE', 'INACTIVE'] as const
export type FormulaStatus = (typeof FORMULA_STATUSES)[number]

export interface FormulaResponse {
  id: number
  label: string
  displayOrder: number | null
  status: FormulaStatus
  deathCapital: number
  permanentDisabilityCapital: number
  medicalExpenses: number
  dailyAllowance: number
  netPremium: number
  fees: number
  tax: number
  grossPremium: number
  createdAt: string
  updatedAt: string
}

export interface CreateFormulaPayload {
  label: string
  displayOrder?: number | null
  deathCapital: number
  permanentDisabilityCapital: number
  medicalExpenses: number
  dailyAllowance: number
  netPremium: number
  fees: number
  tax: number
  grossPremium: number
}

// PUT = remplacement complet (statut inchangé) : même forme que la création.
export type UpdateFormulaPayload = CreateFormulaPayload

/** Réponse en tableau (pas de pagination), triée displayOrder puis id. */
export async function getFormulas(): Promise<FormulaResponse[]> {
  const response = await api.get(BASE)
  return response.data
}

export async function getFormula(id: number): Promise<FormulaResponse> {
  const response = await api.get(`${BASE}/${id}`)
  return response.data
}

export async function createFormula(
  data: CreateFormulaPayload,
): Promise<FormulaResponse> {
  const response = await api.post(BASE, data)
  return response.data
}

export async function updateFormula(
  id: number,
  data: UpdateFormulaPayload,
): Promise<FormulaResponse> {
  const response = await api.put(`${BASE}/${id}`, data)
  return response.data
}

export async function activateFormula(id: number): Promise<FormulaResponse> {
  const response = await api.patch(`${BASE}/${id}/activate`)
  return response.data
}

export async function deactivateFormula(id: number): Promise<FormulaResponse> {
  const response = await api.patch(`${BASE}/${id}/deactivate`)
  return response.data
}
