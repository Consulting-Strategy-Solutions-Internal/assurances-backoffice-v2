import { describe, expect, it } from 'vitest'
import {
  buildCsvTemplate,
  findGaps,
  findOverlaps,
  formatImportedCount,
  precheckAccessoriesCsv,
} from './accessories-logic'

const r = (minPremium: number, maxPremium: number) => ({
  minPremium,
  maxPremium,
})

describe('precheckAccessoriesCsv', () => {
  it('accepte le séparateur virgule', () => {
    const csv =
      'productCode,minPremium,maxPremium,amount\n7,0,10000,500\n7,10001,20000,900'
    expect(precheckAccessoriesCsv(csv, 7)).toEqual({
      headerError: null,
      rowCount: 2,
      badLines: [],
    })
  })

  it('accepte le point-virgule et les décimaux à virgule', () => {
    const csv =
      'productCode;minPremium;maxPremium;amount\r\n7;0;10000,5;500,25\r\n'
    const res = precheckAccessoriesCsv(csv, 7)
    expect(res.badLines).toEqual([])
    expect(res.rowCount).toBe(1)
  })

  it("ignore casse, espaces, guillemets et BOM dans l'en-tête", () => {
    const csv = '﻿" Product Code ", MINPREMIUM ,maxPremium,amount\n7,0,1,1'
    expect(precheckAccessoriesCsv(csv, 7).headerError).toBeNull()
  })

  it('ignore les lignes vides mais garde la numérotation physique', () => {
    const csv =
      'productCode,minPremium,maxPremium,amount\n\n7,0,1,1\n   \n8,2,3,1\n'
    const res = precheckAccessoriesCsv(csv, 7)
    expect(res.rowCount).toBe(2)
    expect(res.badLines).toEqual([{ line: 5, found: '8' }])
  })

  it('liste toutes les lignes au mauvais productCode', () => {
    const csv =
      'productCode,minPremium,maxPremium,amount\n9,0,1,1\n7,2,3,1\n,4,5,1'
    expect(precheckAccessoriesCsv(csv, 7).badLines).toEqual([
      { line: 2, found: '9' },
      { line: 4, found: '' },
    ])
  })

  it('bloque sans en-tête valide', () => {
    expect(precheckAccessoriesCsv('7,0,1,1', 7).headerError).not.toBeNull()
    expect(precheckAccessoriesCsv('   \n\n', 7).headerError).toBe(
      'Le fichier est vide.',
    )
  })

  it("bloque un fichier qui n'a que l'en-tête", () => {
    expect(
      precheckAccessoriesCsv('productCode,minPremium,maxPremium,amount\n', 7)
        .headerError,
    ).toBe('Le fichier ne contient aucune tranche.')
  })
})

describe('findOverlaps', () => {
  it('ne détecte rien pour des tranches contiguës', () => {
    expect(findOverlaps([r(0, 10000), r(10001, 20000)])).toEqual([])
  })

  it('traite les bornes comme inclusives', () => {
    expect(findOverlaps([r(0, 10000), r(10000, 20000)])).toHaveLength(1)
  })

  it('liste les paires même désordonnées', () => {
    const pairs = findOverlaps([r(5000, 15000), r(0, 6000), r(20000, 30000)])
    expect(pairs).toEqual([{ a: r(0, 6000), b: r(5000, 15000) }])
  })
})

describe('findGaps', () => {
  it('aucun trou pour des tranches entières contiguës', () => {
    expect(findGaps([r(0, 10000), r(10001, 20000)])).toEqual([])
  })

  it('détecte un trou entre tranches triées par min', () => {
    expect(findGaps([r(15000, 20000), r(0, 10000)])).toEqual([
      { from: 10001, to: 14999 },
    ])
  })

  it('utilise la couverture maximale (tranche imbriquée)', () => {
    expect(findGaps([r(0, 100), r(10, 20), r(101, 200)])).toEqual([])
  })

  it('liste vide ou une seule tranche : pas de trou', () => {
    expect(findGaps([])).toEqual([])
    expect(findGaps([r(5, 10)])).toEqual([])
  })
})

describe('buildCsvTemplate', () => {
  it("contient l'en-tête et le code produit", () => {
    const csv = buildCsvTemplate(42)
    expect(csv.split('\n')[0]).toBe('productCode,minPremium,maxPremium,amount')
    expect(csv).toContain('42,0,10000,500')
  })
})

describe('formatImportedCount', () => {
  it('accorde singulier et pluriel', () => {
    expect(formatImportedCount(0)).toBe('0 tranche importée')
    expect(formatImportedCount(1)).toBe('1 tranche importée')
    expect(formatImportedCount(3)).toBe('3 tranches importées')
  })
})
