import { describe, expect, it } from 'vitest'
import { formatFcfa, formatInteger } from './utils'

describe('formatFcfa', () => {
  it('has no decimals and groups thousands with a no-break space', () => {
    expect(formatFcfa(10007.5)).toBe('10 008 FCFA')
    expect(formatFcfa(1234567)).toBe('1 234 567 FCFA')
    expect(formatFcfa(0)).toBe('0 FCFA')
  })
  it('never emits the narrow no-break space', () => {
    expect(formatFcfa(25000)).not.toContain(' ')
  })
  it('returns an empty string for missing values', () => {
    expect(formatFcfa(undefined)).toBe('')
    expect(formatFcfa(null)).toBe('')
  })
})

describe('formatInteger', () => {
  it('groups with U+00A0', () => {
    expect(formatInteger(12000)).toBe('12 000')
  })
})
