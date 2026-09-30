import { describe, expect, it } from 'vitest'
import { validateRateInput } from './rate-schema'
import { buildRateRows } from './rate-rows'
import type {
  PremiumRateResponse,
  RiskClassResponse,
} from '#/services/ia-standard'

describe('validateRateInput', () => {
  it.each(['0', '0.001', '100.01', '', 'abc', '-1', '1.234'])(
    'refuse %j',
    (v) => {
      expect(validateRateInput(v)).toBeDefined()
    },
  )
  it.each(['0.01', '100', '1.5', '1,5', ' 12 '])('accepte %j', (v) => {
    expect(validateRateInput(v)).toBeUndefined()
  })
})

const cls = (id: number, classNumber: number): RiskClassResponse => ({
  id,
  classNumber,
  description: `c${classNumber}`,
  active: true,
  occupationCount: 0,
  createdAt: '',
  updatedAt: '',
})
const rate = (id: number, riskClassId: number): PremiumRateResponse => ({
  id,
  riskClassId,
  death: 1,
  permanentDisability: 1,
  medicalExpenses: 1,
  createdAt: '',
  updatedAt: '',
})

describe('buildRateRows', () => {
  it('joint par riskClassId, trie par numéro, null si sans barème', () => {
    const rows = buildRateRows([cls(2, 2), cls(1, 1), cls(3, 3)], [rate(9, 2)])
    expect(rows.map((r) => r.riskClass.classNumber)).toEqual([1, 2, 3])
    expect(rows.map((r) => r.rate?.id ?? null)).toEqual([null, 9, null])
  })
})
