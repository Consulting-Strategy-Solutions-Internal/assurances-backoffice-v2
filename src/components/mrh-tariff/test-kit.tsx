import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { render, screen } from '@testing-library/react'
import type {
  BaseRateResponse,
  LegalQualityResponse,
  LegalQualityWarrantyResponse,
  WarrantyResponse,
} from '#/services/mrh-tariff'

export function page<T>(content: T[]) {
  return {
    content,
    page: 0,
    size: 100,
    totalElements: content.length,
    totalPages: 1,
    last: true,
  }
}

export function axiosError(status: number, data: unknown): AxiosError {
  const config = { headers: {} } as InternalAxiosRequestConfig
  return new AxiosError('fail', String(status), config, null, {
    status,
    data,
    statusText: '',
    headers: {},
    config,
  } as AxiosResponse)
}

export function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

/** Conteneur du champ (libellé + saisie + erreur) désigné par son libellé. */
export function fieldOf(label: string | RegExp): HTMLElement {
  const input = screen.getByLabelText(label)
  const container = input.closest('div.flex.flex-col')
  if (!(container instanceof HTMLElement)) throw new Error('no field container')
  return container
}

const at = '2026-09-30T10:00:00'

export const TENANT: LegalQualityResponse = {
  id: 1,
  code: 'TENANT',
  name: 'Locataire',
  description: 'Occupe un logement loué',
  propertyBasis: 'LOCATIVE',
  occupancyRequired: true,
  createdAt: at,
  updatedAt: at,
}

export const NON_OCCUPANT: LegalQualityResponse = {
  id: 3,
  code: 'NON_OCCUPANT_OWNER',
  name: 'Propriétaire non occupant',
  description: null,
  propertyBasis: 'BATIMENT',
  occupancyRequired: false,
  createdAt: at,
  updatedAt: at,
}

export const TENANT_RATE: BaseRateResponse = {
  id: 10,
  legalQualityId: 1,
  buildingPremiumRate: null,
  contentsPremiumRate: 5,
  rentalValuePremiumRate: 0.35,
  rentMultiplier: 180,
  minimumContentsValue: null,
  createdAt: at,
  updatedAt: at,
}

export const NON_OCCUPANT_RATE: BaseRateResponse = {
  id: 30,
  legalQualityId: 3,
  buildingPremiumRate: 0.45,
  contentsPremiumRate: null,
  rentalValuePremiumRate: null,
  rentMultiplier: null,
  minimumContentsValue: null,
  createdAt: at,
  updatedAt: at,
}

export const FIRE: WarrantyResponse = {
  id: 100,
  code: 'FIRE',
  name: 'Incendie',
  taxRate: 25,
  createdAt: at,
  updatedAt: at,
}

export const FLOOD: WarrantyResponse = {
  id: 103,
  code: 'FLOOD',
  name: 'Inondation',
  taxRate: 14.5,
  createdAt: at,
  updatedAt: at,
}

export const THEFT: WarrantyResponse = {
  id: 106,
  code: 'BURGLARY',
  name: 'Vol',
  taxRate: 14.5,
  createdAt: at,
  updatedAt: at,
}

function line(
  values: Partial<LegalQualityWarrantyResponse> &
    Pick<LegalQualityWarrantyResponse, 'id' | 'warrantyId' | 'premiumType'>,
): LegalQualityWarrantyResponse {
  return {
    legalQualityId: 1,
    rate: null,
    flatAmount: null,
    capitalShare: null,
    mandatory: false,
    createdAt: at,
    updatedAt: at,
    ...values,
  }
}

export const TENANT_FIRE = line({
  id: 1000,
  warrantyId: 100,
  premiumType: 'POURCENTAGE',
  rate: 100,
  mandatory: true,
})
export const TENANT_FLOOD = line({
  id: 1003,
  warrantyId: 103,
  premiumType: 'CAPITAL',
  rate: 1,
  capitalShare: 25,
})
export const TENANT_THEFT = line({
  id: 1006,
  warrantyId: 106,
  premiumType: 'FORFAIT',
  flatAmount: 15000,
})
export const NON_OCCUPANT_FIRE = line({
  id: 3000,
  legalQualityId: 3,
  warrantyId: 100,
  premiumType: 'POURCENTAGE',
  rate: 100,
  mandatory: true,
})
