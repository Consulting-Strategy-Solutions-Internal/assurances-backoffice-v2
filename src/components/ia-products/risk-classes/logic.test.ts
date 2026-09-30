import { describe, expect, it } from 'vitest'
import type { RiskClassResponse } from '#/services/ia-standard'
import {
  canSearch,
  reclassTargets,
  validateClassNumber,
  validateCreateClass,
  validateDescription,
} from './logic'

const cls = (id: number, n: number, active: boolean): RiskClassResponse => ({
  id,
  classNumber: n,
  description: `C${n}`,
  active,
  occupationCount: 0,
  createdAt: '',
  updatedAt: '',
})

describe('validateClassNumber', () => {
  it('rejects empty, zero, decimals and text', () => {
    expect(validateClassNumber('')).toBeDefined()
    expect(validateClassNumber('0')).toBeDefined()
    expect(validateClassNumber('1.5')).toBeDefined()
    expect(validateClassNumber('-2')).toBeDefined()
    expect(validateClassNumber('abc')).toBeDefined()
  })
  it('accepts integers >= 1', () => {
    expect(validateClassNumber(' 3 ')).toBeUndefined()
  })
})

describe('validateDescription', () => {
  it('rejects blank and > 255 chars', () => {
    expect(validateDescription('   ')).toBeDefined()
    expect(validateDescription('a'.repeat(256))).toBeDefined()
  })
  it('accepts 255 chars after trim', () => {
    expect(validateDescription(` ${'a'.repeat(255)} `)).toBeUndefined()
  })
})

describe('validateCreateClass', () => {
  it('builds a trimmed payload without occupations key when none', () => {
    const r = validateCreateClass({
      classNumber: ' 4',
      description: ' Bureau ',
      active: true,
      occupations: [],
    })
    expect(r.payload).toEqual({
      classNumber: 4,
      description: 'Bureau',
      active: true,
    })
  })
  it('includes trimmed occupations', () => {
    const r = validateCreateClass({
      classNumber: '1',
      description: 'A',
      active: false,
      occupations: [{ description: ' Comptable ', active: true }],
    })
    expect(r.payload?.occupations).toEqual([
      { description: 'Comptable', active: true },
    ])
  })
  it('reports indexed occupation errors', () => {
    const r = validateCreateClass({
      classNumber: '',
      description: '',
      active: true,
      occupations: [
        { description: 'ok', active: true },
        { description: ' ', active: true },
      ],
    })
    expect(r.payload).toBeNull()
    expect(Object.keys(r.errors).sort()).toEqual([
      'classNumber',
      'description',
      'occupations[1].description',
    ])
  })
})

describe('reclassTargets', () => {
  it('keeps active classes only, excludes current, sorted', () => {
    const r = reclassTargets(
      [cls(3, 3, true), cls(1, 1, true), cls(2, 2, false), cls(4, 4, true)],
      4,
    )
    expect(r.map((c) => c.id)).toEqual([1, 3])
  })
})

describe('canSearch', () => {
  it('needs 2 chars after trim', () => {
    expect(canSearch(' a ')).toBe(false)
    expect(canSearch('ab')).toBe(true)
  })
})
