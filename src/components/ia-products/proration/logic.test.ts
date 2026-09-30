import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PRORATION_GRID,
  analyzeCoverage,
  buildProrationPayload,
  formatDuration,
  validateCoefficient,
  validateMaxMonths,
  validateMinMonths,
} from './logic'

const r = (minMonths: number, maxMonths: number | null) => ({
  minMonths,
  maxMonths,
})

describe('analyzeCoverage', () => {
  it('ne signale rien pour une liste vide', () => {
    expect(analyzeCoverage([])).toEqual({ overlaps: [], uncoveredMonths: [] })
  })
  it('la grille par défaut est complète et sans chevauchement', () => {
    const report = analyzeCoverage(DEFAULT_PRORATION_GRID)
    expect(report.overlaps).toEqual([])
    expect(report.uncoveredMonths).toEqual([])
  })
  it('liste les durées non couvertes', () => {
    expect(analyzeCoverage([r(1, 4), r(7, null)]).uncoveredMonths).toEqual([
      5, 6,
    ])
  })
  it('un max null couvre jusqu’à 12', () => {
    expect(analyzeCoverage([r(3, null)]).uncoveredMonths).toEqual([1, 2])
  })
  it('détecte un chevauchement', () => {
    const report = analyzeCoverage([r(1, 6), r(4, 9), r(10, null)])
    expect(report.overlaps).toHaveLength(1)
    expect(report.overlaps[0][1].minMonths).toBe(4)
  })
  it('détecte un chevauchement avec une tranche sans limite', () => {
    expect(analyzeCoverage([r(1, null), r(6, 8)]).overlaps).toHaveLength(1)
  })
  it('des tranches jointives ne se chevauchent pas', () => {
    expect(analyzeCoverage([r(1, 3), r(4, null)]).overlaps).toEqual([])
  })
})

describe('formatDuration', () => {
  it('formate', () => {
    expect(formatDuration(1, 3)).toBe('1 – 3 mois')
    expect(formatDuration(10, null)).toBe('10 mois et +')
  })
})

describe('validation', () => {
  it('minMonths', () => {
    expect(validateMinMonths('')).toBeDefined()
    expect(validateMinMonths('0')).toBeDefined()
    expect(validateMinMonths('1,5')).toBeDefined()
    expect(validateMinMonths('1')).toBeUndefined()
  })
  it('maxMonths', () => {
    expect(validateMaxMonths('', '1', false)).toBeDefined()
    expect(validateMaxMonths('', '1', true)).toBeUndefined()
    expect(validateMaxMonths('2', '3', false)).toBeDefined()
    expect(validateMaxMonths('3', '3', false)).toBeUndefined()
    expect(validateMaxMonths('0', '', false)).toBeDefined()
  })
  it('coefficient', () => {
    expect(validateCoefficient('')).toBeDefined()
    expect(validateCoefficient('1,2')).toBeDefined()
    expect(validateCoefficient('abc')).toBeDefined()
    expect(validateCoefficient('0')).toBeUndefined()
    expect(validateCoefficient('0,8')).toBeUndefined()
    expect(validateCoefficient('1')).toBeUndefined()
  })
})

describe('buildProrationPayload', () => {
  it('envoie null quand sans limite', () => {
    expect(
      buildProrationPayload({
        minMonths: '10',
        maxMonths: '12',
        unlimited: true,
        coefficient: '1',
      }),
    ).toEqual({
      product: 'IA_STANDARD',
      minMonths: 10,
      maxMonths: null,
      coefficient: 1,
    })
  })
  it('accepte la virgule', () => {
    expect(
      buildProrationPayload({
        minMonths: '1',
        maxMonths: '3',
        unlimited: false,
        coefficient: '0,6',
      }),
    ).toEqual({
      product: 'IA_STANDARD',
      minMonths: 1,
      maxMonths: 3,
      coefficient: 0.6,
    })
  })
})
