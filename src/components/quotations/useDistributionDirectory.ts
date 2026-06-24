import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getDistributionDirectory } from '#/services/distribution-directory'
import type { PartnerResponse } from '#/services/partners'
import type { AgencyResponse } from '#/services/agencies'
import type { SellerResponse } from '#/services/sellers'

export type AttributionKind = 'seller' | 'agency' | 'partner' | 'unknown'

/** Who issued a quotation, resolved from its distributor code. */
export interface Attribution {
  kind: AttributionKind
  /** Primary name (agent full name, agency or partner name, or the raw code). */
  label: string
  /** The distributor code carried by the quotation. */
  code: string
  partner?: PartnerResponse
  agency?: AgencyResponse
  seller?: SellerResponse
}

const sellerName = (s: SellerResponse) =>
  `${s.firstName} ${s.lastName}`.trim() || s.distributorCode

export function useDistributionDirectory() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['distribution-directory'],
    queryFn: getDistributionDirectory,
    // The network changes rarely; keep it warm to avoid re-fanning out.
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const maps = useMemo(() => {
    const partners = data?.partners ?? []
    const agencies = data?.agencies ?? []
    const sellers = data?.sellers ?? []

    const partnerById = new Map(partners.map((p) => [p.id, p] as const))
    const agencyById = new Map(agencies.map((a) => [a.id, a] as const))

    const partnerByCode = new Map(
      partners.map((p) => [p.distributorCode, p] as const),
    )
    const agencyByCode = new Map(
      agencies.map((a) => [a.distributorCode, a] as const),
    )
    const sellerByCode = new Map(
      sellers.map((s) => [s.distributorCode, s] as const),
    )

    return {
      partners,
      agencies,
      sellers,
      partnerById,
      agencyById,
      partnerByCode,
      agencyByCode,
      sellerByCode,
    }
  }, [data])

  const resolveCode = useMemo(() => {
    return (code: string): Attribution => {
      const seller = maps.sellerByCode.get(code)
      if (seller) {
        return {
          kind: 'seller',
          label: sellerName(seller),
          code,
          seller,
          agency: seller.agencyId
            ? maps.agencyById.get(seller.agencyId)
            : undefined,
          partner: seller.partnerId
            ? maps.partnerById.get(seller.partnerId)
            : undefined,
        }
      }
      const agency = maps.agencyByCode.get(code)
      if (agency) {
        return {
          kind: 'agency',
          label: agency.name,
          code,
          agency,
          partner: maps.partnerById.get(agency.partnerId),
        }
      }
      const partner = maps.partnerByCode.get(code)
      if (partner) {
        return { kind: 'partner', label: partner.name, code, partner }
      }
      return { kind: 'unknown', label: code, code }
    }
  }, [maps])

  // Cascade helpers for the filter selects.
  const agenciesOf = useMemo(
    () => (partnerId: number) =>
      maps.agencies.filter((a) => a.partnerId === partnerId),
    [maps],
  )

  const sellersOf = useMemo(
    () =>
      ({ partnerId, agencyId }: { partnerId?: number; agencyId?: number }) =>
        maps.sellers.filter((s) => {
          if (agencyId != null) return s.agencyId === agencyId
          if (partnerId != null) return s.partnerId === partnerId
          return false
        }),
    [maps],
  )

  return {
    ...maps,
    isLoading,
    isError,
    error,
    resolveCode,
    agenciesOf,
    sellersOf,
  }
}
