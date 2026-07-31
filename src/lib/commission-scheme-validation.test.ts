import { describe, expect, it } from 'vitest'
import {
  percentToCents,
  validateCommissionScheme,
} from '#/lib/commission-scheme-validation'
import type { CommissionSchemeDraft } from '#/lib/commission-scheme-validation'

function draft(
  values: Partial<CommissionSchemeDraft> = {},
): CommissionSchemeDraft {
  return {
    partnerId: 1,
    productId: 4,
    commissionRate: '12.50',
    maxLevel: 2,
    level2PartnerShare: '40.00',
    level2SellerShare: '60.00',
    level3PartnerShare: '',
    level3AgencyShare: '',
    level3SellerShare: '',
    ...values,
  }
}

describe('validateCommissionScheme', () => {
  it('exige un taux négocié valide pour le couple', () => {
    const missing = validateCommissionScheme(draft({ commissionRate: '' }))
    const tooHigh = validateCommissionScheme(
      draft({ commissionRate: '100.01' }),
    )

    expect(missing.valid).toBe(false)
    expect(missing.errors.commissionRate).toBeDefined()
    expect(tooHigh.valid).toBe(false)
  })

  it('accepte un taux nul et le transmet dans le schéma', () => {
    const result = validateCommissionScheme(draft({ commissionRate: '0,00' }))

    expect(result.valid).toBe(true)
    expect(result.payload?.commissionRate).toBe(0)
  })

  it('envoie toutes les parts à null au niveau 1', () => {
    const result = validateCommissionScheme(
      draft({
        maxLevel: 1,
        level2PartnerShare: '80',
        level2SellerShare: '20',
        level3PartnerShare: '10',
        level3AgencyShare: '20',
        level3SellerShare: '70',
      }),
    )

    expect(result.valid).toBe(true)
    expect(result.payload).toMatchObject({
      commissionRate: 12.5,
      level2PartnerShare: null,
      level2SellerShare: null,
      level3PartnerShare: null,
      level3AgencyShare: null,
      level3SellerShare: null,
    })
  })

  it('bloque un total niveau 2 différent de 100', () => {
    const result = validateCommissionScheme(
      draft({ level2PartnerShare: '40', level2SellerShare: '52' }),
    )

    expect(result.valid).toBe(false)
    expect(result.level2Total).toBe(9200)
    expect(result.payload).toBeNull()
  })

  it('exige aussi les parts niveau 2 pour un schéma niveau 3', () => {
    const result = validateCommissionScheme(
      draft({
        maxLevel: 3,
        level2PartnerShare: '',
        level2SellerShare: '',
        level3PartnerShare: '30',
        level3AgencyShare: '30',
        level3SellerShare: '40',
      }),
    )

    expect(result.valid).toBe(false)
    expect(result.level3Total).toBe(10_000)
    expect(result.errors.level2PartnerShare).toBeDefined()
  })

  it('bloque un total niveau 3 différent de 100', () => {
    const result = validateCommissionScheme(
      draft({
        maxLevel: 3,
        level3PartnerShare: '30',
        level3AgencyShare: '30',
        level3SellerShare: '39.99',
      }),
    )

    expect(result.valid).toBe(false)
    expect(result.level3Total).toBe(9999)
  })

  it('ne transmet aucune part niveau 3 sous le niveau 3', () => {
    const result = validateCommissionScheme(
      draft({
        level3PartnerShare: '20',
        level3AgencyShare: '20',
        level3SellerShare: '60',
      }),
    )

    expect(result.payload).toMatchObject({
      level3PartnerShare: null,
      level3AgencyShare: null,
      level3SellerShare: null,
    })
  })

  it('refuse les valeurs hors plage ou avec plus de deux décimales', () => {
    expect(percentToCents('-1')).toBeNull()
    expect(percentToCents('100.01')).toBeNull()
    expect(percentToCents('12.345')).toBeNull()
    expect(percentToCents('12.30')).toBe(1230)
    expect(percentToCents('12,30')).toBe(1230)
  })

  it('bloque toute modification du couple en édition', () => {
    const result = validateCommissionScheme(draft({ partnerId: 2 }), {
      partnerId: 1,
      productId: 4,
    })

    expect(result.valid).toBe(false)
    expect(result.errors.partnerId).toContain('immuable')
  })
})
