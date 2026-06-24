import { getPartners } from '#/services/partners'
import type { PartnerResponse } from '#/services/partners'
import { getPartnerAgencies } from '#/services/agencies'
import type { AgencyResponse } from '#/services/agencies'
import { getAgencySellers, getPartnerSellers } from '#/services/sellers'
import type { SellerResponse } from '#/services/sellers'

/**
 * Flat snapshot of the whole distribution network. The quotations API only
 * filters by a single distributor code, so to answer "who issued this quote"
 * we resolve every code against this directory (seller / agency / partner) and
 * roll it up to its partner (via partnerId / idSite).
 */
export interface DistributionDirectory {
  partners: PartnerResponse[]
  agencies: AgencyResponse[]
  sellers: SellerResponse[]
}

const PAGE = 200

export async function getDistributionDirectory(): Promise<DistributionDirectory> {
  const partnersPage = await getPartners(0, PAGE)
  const partners = partnersPage.content

  // Agencies + direct sellers, one fan-out per partner.
  const perPartner = await Promise.all(
    partners.map(async (p) => {
      const [agenciesPage, directSellersPage] = await Promise.all([
        getPartnerAgencies(p.id, 0, PAGE),
        getPartnerSellers(p.id, 0, PAGE),
      ])
      return {
        agencies: agenciesPage.content,
        directSellers: directSellersPage.content,
      }
    }),
  )

  const agencies = perPartner.flatMap((r) => r.agencies)
  const directSellers = perPartner.flatMap((r) => r.directSellers)

  // Sellers attached to an agency are not returned by the partner endpoint.
  const agencySellers = (
    await Promise.all(
      agencies.map((a) =>
        getAgencySellers(a.id, 0, PAGE).then((r) => r.content),
      ),
    )
  ).flat()

  // De-duplicate sellers by id (a direct seller can't also be an agency seller,
  // but guard against overlap anyway).
  const byId = new Map<number, SellerResponse>()
  for (const s of [...directSellers, ...agencySellers]) byId.set(s.id, s)

  return { partners, agencies, sellers: [...byId.values()] }
}
