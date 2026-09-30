import { describe, expect, it } from 'vitest'
import {
  buildUpdateProductPayload,
  parseSettingsForm,
  validateMaxAge,
  validateMaxDiscountRate,
  validateMinAge,
  validateSurchargeRate,
} from './logic'
import type { ProductResponse } from '#/services/products'

const product: ProductResponse = {
  id: 7,
  label: 'IA Standard',
  productCode: 1234,
  code: 'IA_STANDARD',
  insuranceType: 'IA',
  discountEnabled: false,
  maxDiscountRate: 10,
  commissionRate: 12.5,
  ageSurchargeMinAge: 60,
  ageSurchargeMaxAge: 65,
  ageSurchargeRate: 20,
  createdAt: '2026-01-01T00:00:00',
  updatedAt: '2026-01-01T00:00:00',
}

describe('buildUpdateProductPayload', () => {
  it('préserve commissionRate, label et productCode relus', () => {
    const payload = buildUpdateProductPayload(product, {
      ageSurchargeMinAge: 55,
      ageSurchargeMaxAge: 65,
      ageSurchargeRate: 15.5,
      discountEnabled: true,
      maxDiscountRate: 5,
    })
    expect(payload).toEqual({
      label: 'IA Standard',
      productCode: 1234,
      discountEnabled: true,
      maxDiscountRate: 5,
      commissionRate: 12.5,
      ageSurchargeMinAge: 55,
      ageSurchargeMaxAge: 65,
      ageSurchargeRate: 15.5,
    })
  })
  it('renvoie commissionRate null tel que relu', () => {
    const payload = buildUpdateProductPayload(
      { ...product, commissionRate: null },
      parseSettingsForm({
        ageSurchargeMinAge: '0',
        ageSurchargeMaxAge: '65',
        ageSurchargeRate: '0',
        discountEnabled: false,
        maxDiscountRate: '',
      }),
    )
    expect(payload.commissionRate).toBeNull()
    expect(payload.maxDiscountRate).toBeNull()
    expect(payload.ageSurchargeRate).toBe(0)
  })
})

describe('parseSettingsForm', () => {
  it('convertit et accepte la virgule', () => {
    expect(
      parseSettingsForm({
        ageSurchargeMinAge: '50',
        ageSurchargeMaxAge: '65',
        ageSurchargeRate: '12,5',
        discountEnabled: true,
        maxDiscountRate: '7,25',
      }),
    ).toEqual({
      ageSurchargeMinAge: 50,
      ageSurchargeMaxAge: 65,
      ageSurchargeRate: 12.5,
      discountEnabled: true,
      maxDiscountRate: 7.25,
    })
  })
})

describe('validation', () => {
  it('âges', () => {
    expect(validateMinAge('')).toBeDefined()
    expect(validateMinAge('-1')).toBeDefined()
    expect(validateMinAge('66')).toBeDefined()
    expect(validateMinAge('1.5')).toBeDefined()
    expect(validateMinAge('0')).toBeUndefined()
    expect(validateMaxAge('65', '0')).toBeUndefined()
    expect(validateMaxAge('40', '50')).toBeDefined()
    expect(validateMaxAge('50', '50')).toBeUndefined()
    expect(validateMaxAge('70', '50')).toBeDefined()
  })
  it('taux de majoration', () => {
    expect(validateSurchargeRate('')).toBeDefined()
    expect(validateSurchargeRate('0')).toBeUndefined()
    expect(validateSurchargeRate('100')).toBeUndefined()
    expect(validateSurchargeRate('100,01')).toBeDefined()
    expect(validateSurchargeRate('1,234')).toBeDefined()
    expect(validateSurchargeRate('-1')).toBeDefined()
  })
  it('plafond de réduction optionnel', () => {
    expect(validateMaxDiscountRate('')).toBeUndefined()
    expect(validateMaxDiscountRate('  ')).toBeUndefined()
    expect(validateMaxDiscountRate('0')).toBeUndefined()
    expect(validateMaxDiscountRate('101')).toBeDefined()
    expect(validateMaxDiscountRate('5,555')).toBeDefined()
  })
})
