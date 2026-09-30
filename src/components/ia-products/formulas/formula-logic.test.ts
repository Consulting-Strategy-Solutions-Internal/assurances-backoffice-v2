import { describe, expect, it } from 'vitest'
import {
  EMPTY_FORM_VALUES,
  buildFormulaPayload,
  copyFormValues,
  hasPremiumMismatch,
  premiumSum,
  validateField,
} from './formula-logic'
import type { FormulaFormValues } from './formula-logic'

const valid: FormulaFormValues = {
  label: ' Formule 1 ',
  displayOrder: '',
  deathCapital: '1000000',
  permanentDisabilityCapital: '2000000,5',
  medicalExpenses: '300000',
  dailyAllowance: '5000',
  netPremium: '0.1',
  fees: '0.2',
  tax: '0',
  grossPremium: '0.3',
}

describe('sum check', () => {
  it('is exact at cents precision (0.1 + 0.2 = 0.3)', () => {
    expect(premiumSum(valid)).toBe(0.3)
    expect(hasPremiumMismatch(valid)).toBe(false)
  })
  it('detects a one-cent gap', () => {
    expect(hasPremiumMismatch({ ...valid, grossPremium: '0.31' })).toBe(true)
  })
  it('does not warn while a field is empty', () => {
    expect(hasPremiumMismatch({ ...valid, tax: '' })).toBe(false)
    expect(premiumSum({ ...valid, fees: '' })).toBeNull()
  })
})

describe('buildFormulaPayload', () => {
  it('omits displayOrder on create when empty', () => {
    const p = buildFormulaPayload(valid, 'create')
    expect('displayOrder' in p).toBe(false)
    expect(p.label).toBe('Formule 1')
    expect(p.permanentDisabilityCapital).toBe(2000000.5)
  })
  it('always sends displayOrder on edit (null when empty)', () => {
    expect(buildFormulaPayload(valid, 'edit').displayOrder).toBeNull()
    expect(
      buildFormulaPayload({ ...valid, displayOrder: '3' }, 'edit').displayOrder,
    ).toBe(3)
  })
  it('sends numbers, not strings', () => {
    const p = buildFormulaPayload({ ...valid, displayOrder: '0' }, 'create')
    expect(p.displayOrder).toBe(0)
    expect(typeof p.deathCapital).toBe('number')
  })
})

describe('validation', () => {
  it('requires a label of at most 255 chars', () => {
    expect(validateField('label', '  ')).toBeDefined()
    expect(validateField('label', 'a'.repeat(256))).toBeDefined()
    expect(validateField('label', 'a'.repeat(255))).toBeUndefined()
  })
  it('accepts amounts >= 0 with at most 2 decimals', () => {
    expect(validateField('tax', '0')).toBeUndefined()
    expect(validateField('tax', '12,5')).toBeUndefined()
    expect(validateField('tax', '12.55')).toBeUndefined()
    expect(validateField('tax', '')).toBeDefined()
    expect(validateField('tax', '-1')).toBeDefined()
    expect(validateField('tax', '1.234')).toBeDefined()
    expect(validateField('tax', 'abc')).toBeDefined()
  })
  it('accepts an empty or integer displayOrder only', () => {
    expect(validateField('displayOrder', '')).toBeUndefined()
    expect(validateField('displayOrder', '2')).toBeUndefined()
    expect(validateField('displayOrder', '2.5')).toBeDefined()
  })
})

describe('copyFormValues', () => {
  it('suffixes the label and keeps other values', () => {
    const c = copyFormValues(valid)
    expect(c.label).toBe('Formule 1 (copie)')
    expect(c.netPremium).toBe(valid.netPremium)
  })
  it('keeps the label within 255 chars', () => {
    const c = copyFormValues({ ...EMPTY_FORM_VALUES, label: 'a'.repeat(255) })
    expect(c.label.length).toBe(255)
    expect(c.label.endsWith('(copie)')).toBe(true)
  })
})
