import { api } from '#/lib/api'
import type { PageResponse } from '#/services/users'

/** Product-category calculation types supported by the API. */
export const PRODUCT_CALCULATION_TYPES = ['MRH', 'IA'] as const
export type ProductCalculationType = (typeof PRODUCT_CALCULATION_TYPES)[number]

export interface ProductResponse {
  id: number
  label: string
  productCode: number
  categoryId: number
  discountEnabled: boolean
  maxDiscountRate: number | null
  /** @deprecated The negotiated rate now belongs to CommissionScheme. */
  commissionRate: number | null
  createdAt: string
  updatedAt: string
}

export interface ProductCategoryResponse {
  id: number
  name: string
  description?: string
  calculationType?: ProductCalculationType
  createdAt: string
  updatedAt: string
}

export interface CreateProductPayload {
  label: string
  productCode: number
  categoryId: number
}

export interface UpdateProductPayload {
  label: string
  productCode: number
  categoryId: number
  discountEnabled: boolean
  maxDiscountRate: number | null
  /** @deprecated Kept only because UpdateProductDto still exposes it. */
  commissionRate: number | null
}

export interface CreateCategoryPayload {
  name: string
  description?: string
  calculationType?: ProductCalculationType
}

export type UpdateCategoryPayload = CreateCategoryPayload

// ---------------------------------------------------------------------------
// Produits
// ---------------------------------------------------------------------------

export async function getProducts(
  page = 0,
  size = 20,
  categoryId?: number,
): Promise<PageResponse<ProductResponse>> {
  const response = await api.get('/products', {
    params: { page, size, categoryId },
  })
  return response.data
}

export async function getProduct(id: number): Promise<ProductResponse> {
  const response = await api.get(`/products/${id}`)
  return response.data
}

export async function createProduct(
  data: CreateProductPayload,
): Promise<ProductResponse> {
  const response = await api.post('/products', data)
  return response.data
}

export async function updateProduct(
  id: number,
  data: UpdateProductPayload,
): Promise<ProductResponse> {
  const response = await api.put(`/products/${id}`, data)
  return response.data
}

// Suppression logique (soft-delete) côté API.
export async function deleteProduct(id: number): Promise<void> {
  await api.delete(`/products/${id}`)
}

// ---------------------------------------------------------------------------
// Catégories de produits
// ---------------------------------------------------------------------------

export async function getCategories(
  page = 0,
  size = 20,
): Promise<PageResponse<ProductCategoryResponse>> {
  const response = await api.get('/product-categories', {
    params: { page, size },
  })
  return response.data
}

export async function getCategory(
  id: number,
): Promise<ProductCategoryResponse> {
  const response = await api.get(`/product-categories/${id}`)
  return response.data
}

export async function createCategory(
  data: CreateCategoryPayload,
): Promise<ProductCategoryResponse> {
  const response = await api.post('/product-categories', data)
  return response.data
}

export async function updateCategory(
  id: number,
  data: UpdateCategoryPayload,
): Promise<ProductCategoryResponse> {
  const response = await api.put(`/product-categories/${id}`, data)
  return response.data
}

// Suppression logique (soft-delete) côté API.
export async function deleteCategory(id: number): Promise<void> {
  await api.delete(`/product-categories/${id}`)
}
