import { api } from '#/lib/api'
import type { PageResponse } from '#/lib/page'

/** Stable business code of a product (never hardcode a product id). */
export const PRODUCT_CODES = [
  'IA_STANDARD',
  'IA_FOR_ALL',
  'MRH_STANDARD',
] as const
export type ProductCode = (typeof PRODUCT_CODES)[number]

export const INSURANCE_TYPES = ['IA', 'MRH'] as const
export type InsuranceType = (typeof INSURANCE_TYPES)[number]

export interface ProductResponse {
  id: number
  label: string
  /** Numeric NSIA code (used by the accessories CSV import). */
  productCode: number
  /** Stable business code. */
  code: ProductCode
  insuranceType: InsuranceType
  discountEnabled: boolean
  maxDiscountRate: number | null
  /** @deprecated The negotiated rate now belongs to CommissionScheme. */
  commissionRate: number | null
  ageSurchargeMinAge: number | null
  ageSurchargeMaxAge: number | null
  ageSurchargeRate: number | null
  createdAt: string
  updatedAt: string
}

export interface UpdateProductPayload {
  label: string
  productCode: number
  discountEnabled: boolean
  maxDiscountRate: number | null
  /** @deprecated Kept only because UpdateProductDto still exposes it. */
  commissionRate: number | null
  ageSurchargeMinAge?: number | null
  ageSurchargeMaxAge?: number | null
  ageSurchargeRate?: number | null
}

// ---------------------------------------------------------------------------
// Produits
// ---------------------------------------------------------------------------

export async function getProducts(
  page = 0,
  size = 20,
  insuranceType?: InsuranceType,
): Promise<PageResponse<ProductResponse>> {
  const response = await api.get('/products', {
    params: { page, size, insuranceType },
  })
  return response.data
}

/** Finds an IA product by its stable code (`GET /products?insuranceType=IA`). */
export async function findIaProduct(
  code: 'IA_STANDARD' | 'IA_FOR_ALL',
): Promise<ProductResponse | null> {
  const page = await getProducts(0, 50, 'IA')
  return page.content.find((p) => p.code === code) ?? null
}

export async function getProduct(id: number): Promise<ProductResponse> {
  const response = await api.get(`/products/${id}`)
  return response.data
}

export async function updateProduct(
  id: number,
  data: UpdateProductPayload,
): Promise<ProductResponse> {
  const response = await api.put(`/products/${id}`, data)
  return response.data
}
