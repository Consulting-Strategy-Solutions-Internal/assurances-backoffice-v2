import { normalizeText } from '#/lib/clients'
import type { QuotationResponse, QuotationStatus } from '#/services/quotations'

export const QUOTATIONS_PAGE_SIZE = 20

export interface QuotationListFilters {
  query: string
  status?: QuotationStatus
  /** Inclusive bounds, `YYYY-MM-DD`. */
  from?: string
  to?: string
}

/** Date affichée d'une cotation : date du devis, sinon création (`YYYY-MM-DD`). */
export function quotationDay(
  q: Pick<QuotationResponse, 'quoteAt' | 'createdAt'>,
): string {
  return (q.quoteAt ?? q.createdAt).slice(0, 10)
}

/**
 * Filtre une liste de cotations déjà chargée. La recherche porte sur la
 * référence (« 302 », « #302 »), le client, l'assuré, le produit et le code
 * distributeur ; tous les mots saisis doivent correspondre.
 */
export function filterQuotations(
  rows: QuotationResponse[],
  filters: QuotationListFilters,
  clientNameOf: (clientId?: number) => string | undefined,
): QuotationResponse[] {
  const words = normalizeText(filters.query.replace(/#/g, ''))
    .split(/\s+/)
    .filter(Boolean)
  return rows.filter((q) => {
    if (filters.status && q.status !== filters.status) return false
    const day = quotationDay(q)
    if (filters.from && day < filters.from) return false
    if (filters.to && day > filters.to) return false
    if (words.length === 0) return true
    const haystack = normalizeText(
      [
        String(q.id),
        clientNameOf(q.clientId),
        q.insured
          ? `${q.insured.firstName ?? ''} ${q.insured.lastName ?? ''}`
          : undefined,
        q.productSnapshot?.productLabel,
        q.distributorCode,
      ]
        .filter(Boolean)
        .join(' '),
    )
    return words.every((word) => haystack.includes(word))
  })
}

export interface QuotationStats {
  converted: number
  quoted: number
  premium: number
}

export function computeQuotationStats(
  rows: QuotationResponse[],
): QuotationStats {
  return {
    converted: rows.filter((q) => q.status === 'CONVERTED').length,
    quoted: rows.filter((q) => q.status === 'QUOTED').length,
    premium: rows.reduce((sum, q) => sum + (q.grossPremium ?? 0), 0),
  }
}
