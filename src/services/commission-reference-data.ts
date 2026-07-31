import { getPartnerAgencies } from '#/services/agencies'
import { getPartners } from '#/services/partners'
import { getProducts } from '#/services/products'
import { getAgencySellers, getPartnerSellers } from '#/services/sellers'
import type { AgencyResponse } from '#/services/agencies'
import type { PartnerResponse } from '#/services/partners'
import type { ProductResponse } from '#/services/products'
import type { SellerResponse } from '#/services/sellers'

const PAGE_SIZE = 200

export interface PartnerNetworkAvailability {
  agencies: AgencyResponse[]
  directSellers: SellerResponse[]
  hasAgencySeller: boolean
}

export async function getAllPartners(): Promise<PartnerResponse[]> {
  const first = await getPartners(0, PAGE_SIZE)
  const pages = await Promise.all(
    Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, index) =>
      getPartners(index + 1, PAGE_SIZE),
    ),
  )
  return [first, ...pages].flatMap((page) => page.content)
}

export async function getAllProducts(): Promise<ProductResponse[]> {
  const first = await getProducts(0, PAGE_SIZE)
  const pages = await Promise.all(
    Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, index) =>
      getProducts(index + 1, PAGE_SIZE),
    ),
  )
  return [first, ...pages].flatMap((page) => page.content)
}

export async function getAllPartnerAgencies(
  partnerId: number,
): Promise<AgencyResponse[]> {
  const first = await getPartnerAgencies(partnerId, 0, PAGE_SIZE)
  const pages = await Promise.all(
    Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, index) =>
      getPartnerAgencies(partnerId, index + 1, PAGE_SIZE),
    ),
  )
  return [first, ...pages].flatMap((page) => page.content)
}

export async function getAllPartnerSellers(
  partnerId: number,
): Promise<SellerResponse[]> {
  const first = await getPartnerSellers(partnerId, 0, PAGE_SIZE)
  const pages = await Promise.all(
    Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, index) =>
      getPartnerSellers(partnerId, index + 1, PAGE_SIZE),
    ),
  )
  return [first, ...pages].flatMap((page) => page.content)
}

export async function getAllAgencySellers(
  agencyId: number,
): Promise<SellerResponse[]> {
  const first = await getAgencySellers(agencyId, 0, PAGE_SIZE)
  const pages = await Promise.all(
    Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, index) =>
      getAgencySellers(agencyId, index + 1, PAGE_SIZE),
    ),
  )
  return [first, ...pages].flatMap((page) => page.content)
}

export async function getPartnerNetworkAvailability(
  partnerId: number,
): Promise<PartnerNetworkAvailability> {
  const [agencies, directSellers] = await Promise.all([
    getAllPartnerAgencies(partnerId),
    getAllPartnerSellers(partnerId),
  ])
  const agencySellerPages = await Promise.all(
    agencies.map((agency) => getAgencySellers(agency.id, 0, 1)),
  )
  return {
    agencies,
    directSellers,
    hasAgencySeller: agencySellerPages.some((page) => page.totalElements > 0),
  }
}
