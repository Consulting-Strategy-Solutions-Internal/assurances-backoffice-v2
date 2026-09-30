import { api } from '#/lib/api'
import type { PageResponse } from '#/services/users'
import type { MrhLegalQualityCode, PremiumType } from '#/services/mrh-tariff'

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
  insuranceType?: 'IA' | 'MRH'
  insuranceTypeLabel?: string
  legalQualityId?: number
  legalQualityName?: string
  propertyBasis?: 'BATIMENT' | 'LOCATIVE' | 'AUCUN'
  contentsRate?: number
  buildingRate?: number
  rentalValueRate?: number
  minimumContentsValue?: number
  contentsValue?: number
  buildingValue?: number
  /**
   * MRH, situation LOCATIVE : risques locatifs assurés = loyer mensuel ×
   * multiplicateur (remplace l'ancien `rentalValue`, que le backend relit
   * sous ce nom pour les anciens devis).
   */
  rentalRisks?: number | null
  legalQualityCode?: MrhLegalQualityCode | null
  monthlyRent?: number | null
  rentMultiplier?: number | null
  /** Occupation du logement (sans effet sur le prix). */
  occupancy?: 'TOTAL' | 'PARTIAL' | null
}

/** Formule IA retenue au moment du devis. */
export interface FormulaSnapshot {
  formulaId?: number
  label?: string
  deathCapital?: number
  permanentDisabilityCapital?: number
  medicalExpenses?: number
  dailyAllowance?: number
  netPremium?: number
  fees?: number
  tax?: number
  grossPremium?: number
  durationMonths?: number
}

export interface AppliedModifier {
  code?: string
  label?: string
  modifierType?: string
  rate?: number
}

export interface AgeSurcharge {
  minAge?: number
  maxAge?: number
  rate?: number
}

/** Instantané de la classe de risque IA Standard (OpenAPI `RiskClassSnapshot`). */
export interface RiskClassSnapshot {
  riskClassId?: number
  classNumber?: number
  description?: string
  deathRate?: number
  permanentDisabilityRate?: number
  medicalExpensesRate?: number
  deathCapital?: number
  permanentDisabilityCapital?: number
  medicalExpensesCapital?: number
  deathPremium?: number
  permanentDisabilityPremium?: number
  medicalExpensesPremium?: number
  assistancePremium?: number
  surchargeRate?: number
  reductionRate?: number
  appliedModifiers?: AppliedModifier[] | null
  appliedAgeSurcharge?: AgeSurcharge | null
  insuredAge?: number
  premiumBeforeProration?: number
  durationMonths?: number
  prorationCoefficient?: number
}

export interface WarrantyLine {
  warrantyId?: number
  warrantyName?: string
  premiumType?: PremiumType
  base?: number
  premium?: number
  mandatory?: boolean
  taxRate?: number
  tax?: number
}

/** Instantané des garanties MRH (OpenAPI `WarrantiesSnapshot`). */
export interface WarrantiesSnapshot {
  lines?: WarrantyLine[] | null
  accessory?: number
  accessoryTax?: number
}

export interface QuotationInsured {
  relationship?: 'SELF' | 'SPOUSE' | 'CHILD' | 'EMPLOYEE'
  lastName?: string
  firstName?: string
  birthDate?: string
  phone?: string
}

export interface QuotationBeneficiary {
  name?: string
  phone?: string
  relationship?: 'SELF' | 'SPOUSE' | 'CHILD' | 'PARENT' | 'SIBLING' | 'OTHER'
  sharePercent?: number
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
  warrantiesSnapshot?: WarrantiesSnapshot | null
  riskClassSnapshot?: RiskClassSnapshot | null
  formulaSnapshot?: FormulaSnapshot | null
  insured?: QuotationInsured | null
  beneficiaries?: QuotationBeneficiary[] | null
  createdAt: string
  updatedAt: string
}

export interface QuotationsParams {
  /** Back-office filter: exact distributor code (seller, agency or partner). */
  distributorCode?: string
  page?: number
  size?: number
  /** `property,(asc|desc)` — ex. `createdAt,desc` (défaut backend : `id,ASC`). */
  sort?: string
}

export async function getQuotations({
  distributorCode,
  page = 0,
  size = 20,
  sort,
}: QuotationsParams = {}): Promise<PageResponse<QuotationResponse>> {
  const response = await api.get('/quotations', {
    params: {
      distributorCode: distributorCode || undefined,
      page,
      size,
      sort: sort || undefined,
    },
  })
  return response.data
}

export async function getQuotation(id: number): Promise<QuotationResponse> {
  const response = await api.get(`/quotations/${id}`)
  return response.data
}

// ---------------------------------------------------------------------------
// Création (action seller — persiste la cotation). Le back-office ne peut PAS
// appeler ces endpoints.
// ---------------------------------------------------------------------------

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

export async function createIaQuotation(
  data: CreateIaQuotationPayload,
): Promise<QuotationResponse> {
  const response = await api.post('/quotations/ia', data)
  return response.data
}
