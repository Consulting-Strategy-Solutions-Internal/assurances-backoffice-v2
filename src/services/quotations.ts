import { api } from '#/lib/api'
import type { PageResponse } from '#/services/users'

export const QUOTATION_STATUSES = [
  'DRAFT',
  'QUOTED',
  'EXPIRED',
  'CONVERTED',
] as const
export type QuotationStatus = (typeof QUOTATION_STATUSES)[number]

/** Gel du produit au moment du devis (JSONB product_snapshot). */
export interface ProductSnapshot {
  productId?: number
  productLabel?: string
  productCode?: number
  categoryId?: number
  categoryName?: string
  calculationType?: string
  legalQualityId?: number
  legalQualityName?: string
  propertyBasis?: string
  contentsRate?: number
  buildingRate?: number
  rentalValueRate?: number
  minimumContentsValue?: number
  contentsValue?: number
  buildingValue?: number
  rentalValue?: number
}

export interface QuotationResponse {
  id: number
  productId?: number
  status: QuotationStatus
  quoteAt?: string
  netPremium?: number
  fees?: number
  tax?: number
  grossPremium?: number
  distributorCode: string
  clientId?: number
  productSnapshot?: ProductSnapshot
  warrantiesSnapshot?: unknown
  riskClassSnapshot?: unknown
  createdAt: string
  updatedAt: string
}

export interface QuotationsParams {
  /** Back-office filter: exact distributor code (seller, agency or partner). */
  distributorCode?: string
  page?: number
  size?: number
}

export async function getQuotations({
  distributorCode,
  page = 0,
  size = 20,
}: QuotationsParams = {}): Promise<PageResponse<QuotationResponse>> {
  const response = await api.get('/quotations', {
    params: { distributorCode: distributorCode || undefined, page, size },
  })
  return response.data
}

export async function getQuotation(id: number): Promise<QuotationResponse> {
  const response = await api.get(`/quotations/${id}`)
  return response.data
}

// ---------------------------------------------------------------------------
// Création (action seller — persiste la cotation). Le back-office ne peut PAS
// appeler ces endpoints : la simulation calcule la prime côté client.
// ---------------------------------------------------------------------------

export interface CreateMrhQuotationPayload {
  productId: number
  legalQualityId: number
  contentsValue: number
  buildingValue?: number
  rentalValue?: number
  selectedWarrantyIds?: number[]
  clientId?: number
}

export interface CreateIaQuotationPayload {
  productId: number
  riskClassId: number
  deathCapital: number
  permanentDisabilityCapital: number
  medicalExpensesCapital: number
  insuredAge?: number
  appliedModifierCodes?: string[]
  reductionRate?: number
  durationMonths: number
  clientId?: number
}

export async function createMrhQuotation(
  data: CreateMrhQuotationPayload,
): Promise<QuotationResponse> {
  const response = await api.post('/quotations/mrh', data)
  return response.data
}

export async function createIaQuotation(
  data: CreateIaQuotationPayload,
): Promise<QuotationResponse> {
  const response = await api.post('/quotations/ia', data)
  return response.data
}
