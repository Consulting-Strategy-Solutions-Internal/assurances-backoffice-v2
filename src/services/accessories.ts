import { isAxiosError } from 'axios'
import { api } from '#/lib/api'
import type { PageParams, PageResponse } from '#/lib/page'
import type { ProductCode } from '#/services/products'

export interface AccessoryResponse {
  id: number
  product: ProductCode
  minPremium: number
  maxPremium: number
  amount: number
  createdAt: string
  updatedAt: string
}

export interface CreateAccessoryPayload {
  product: ProductCode
  minPremium: number
  maxPremium: number
  amount: number
}

// UpdateAccessoryDto partage la même forme que la création.
export type UpdateAccessoryPayload = CreateAccessoryPayload

export interface AccessoryListParams extends PageParams {
  product: ProductCode
}

export interface AccessoryImportError {
  /** 0 = fichier entier ; sinon numéro de ligne (en-tête = 1). */
  line: number
  message: string
}

export interface AccessoryImportResult {
  imported: number
  errors: AccessoryImportError[]
}

export async function getAccessories(
  params: AccessoryListParams,
): Promise<PageResponse<AccessoryResponse>> {
  const response = await api.get('/accessories', {
    params: {
      product: params.product,
      page: params.page,
      size: params.size,
      sort: params.sort,
    },
  })
  return response.data
}

export async function getAccessory(id: number): Promise<AccessoryResponse> {
  const response = await api.get(`/accessories/${id}`)
  return response.data
}

export async function createAccessory(
  data: CreateAccessoryPayload,
): Promise<AccessoryResponse> {
  const response = await api.post('/accessories', data)
  return response.data
}

export async function updateAccessory(
  id: number,
  data: UpdateAccessoryPayload,
): Promise<AccessoryResponse> {
  const response = await api.put(`/accessories/${id}`, data)
  return response.data
}

export async function deleteAccessory(id: number): Promise<void> {
  await api.delete(`/accessories/${id}`)
}

/**
 * Import CSV (tout ou rien). Renvoie le corps `{ imported, errors }` pour un
 * 201 comme pour un 422 (rejet : `imported: 0` + lignes fautives). Toute autre
 * erreur (400 sans fichier, 403, 5xx…) est relancée.
 */
export async function importAccessoriesCsv(
  file: File,
): Promise<AccessoryImportResult> {
  const form = new FormData()
  form.append('file', file)
  try {
    const response = await api.post<AccessoryImportResult>(
      '/accessories/import',
      form,
      { headers: { 'Content-Type': undefined } },
    )
    return response.data
  } catch (err) {
    // Seul le rejet du CSV renvoie un `ImportResult` ; un autre 422 (fichier
    // trop volumineux) est un `ErrorResponse` et remonte comme une erreur.
    if (
      isAxiosError<AccessoryImportResult>(err) &&
      err.response?.status === 422 &&
      Array.isArray((err.response.data as { errors?: unknown }).errors)
    ) {
      return err.response.data
    }
    throw err
  }
}

/** Produits dont les tranches sont saisies au back-office (IA Pour Tous : compris dans le forfait). */
export const ACCESSORY_PRODUCTS = ['MRH_STANDARD', 'IA_STANDARD'] as const
export type AccessoryProduct = (typeof ACCESSORY_PRODUCTS)[number]

export const ACCESSORY_PRODUCT_LABELS: Record<AccessoryProduct, string> = {
  MRH_STANDARD: 'MRH Standard',
  IA_STANDARD: 'IA Standard',
}

export function accessoryProductLabel(code: ProductCode): string {
  return code === 'IA_FOR_ALL' ? 'IA Pour Tous' : ACCESSORY_PRODUCT_LABELS[code]
}
