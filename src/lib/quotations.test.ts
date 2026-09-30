import { describe, expect, it } from 'vitest'
import {
  computeQuotationStats,
  filterQuotations,
  quotationDay,
} from '#/lib/quotations'
import type { QuotationResponse } from '#/services/quotations'

const base = {
  distributorCode: '2000',
  createdAt: '2026-09-27T10:00:00',
  updatedAt: '2026-09-27T10:00:00',
}
const rows: QuotationResponse[] = [
  {
    ...base,
    id: 302,
    status: 'CONVERTED',
    grossPremium: 7000,
    clientId: 2,
    quoteAt: '2026-09-27',
  },
  {
    ...base,
    id: 303,
    status: 'QUOTED',
    grossPremium: 15000,
    clientId: 3,
    quoteAt: '2026-08-01',
    insured: { firstName: 'Ali', lastName: 'Koné' },
  },
]
const names = (id?: number) => (id === 2 ? 'Eliphaz Bouye' : undefined)

describe('filterQuotations', () => {
  it('matches the reference with or without #', () => {
    expect(filterQuotations(rows, { query: '#302' }, names)).toHaveLength(1)
    expect(filterQuotations(rows, { query: '303' }, names)[0].id).toBe(303)
  })
  it('matches client and insured names, accent-insensitive', () => {
    expect(filterQuotations(rows, { query: 'bouye eliph' }, names)[0].id).toBe(
      302,
    )
    expect(filterQuotations(rows, { query: 'kone' }, names)[0].id).toBe(303)
  })
  it('filters by status and date range (inclusive)', () => {
    expect(
      filterQuotations(rows, { query: '', status: 'QUOTED' }, names),
    ).toHaveLength(1)
    expect(
      filterQuotations(rows, { query: '', from: '2026-09-01' }, names)[0].id,
    ).toBe(302)
    expect(
      filterQuotations(rows, { query: '', to: '2026-08-01' }, names)[0].id,
    ).toBe(303)
  })
})

describe('quotationDay / stats', () => {
  it('falls back to createdAt', () => {
    expect(quotationDay({ createdAt: '2026-01-02T00:00:00' })).toBe(
      '2026-01-02',
    )
  })
  it('aggregates', () => {
    expect(computeQuotationStats(rows)).toEqual({
      converted: 1,
      quoted: 1,
      premium: 22000,
    })
  })
})
