import { describe, expect, it } from 'vitest'
import { filterOptions, normalizeSearch } from './SearchableSelect'

const options = [
  { value: '1', label: 'NSIA Distribution', hint: 'Code 10000 · Abidjan' },
  { value: '2', label: 'Société Générale', hint: 'Code 300 · Angré' },
  { value: '3', label: 'WAVE', hint: 'Code 22222 · cocody' },
]

describe('SearchableSelect filtering', () => {
  it('normalise accents, casse et espaces', () => {
    expect(normalizeSearch('  Société ÉLÉGANTE ')).toBe('societe elegante')
  })

  it('renvoie tout sans requête', () => {
    expect(filterOptions(options, '  ')).toHaveLength(3)
  })

  it('cherche dans le libellé sans tenir compte des accents', () => {
    expect(filterOptions(options, 'societe').map((o) => o.value)).toEqual(['2'])
  })

  it('cherche aussi dans le code / la localisation', () => {
    expect(filterOptions(options, '22222').map((o) => o.value)).toEqual(['3'])
    expect(filterOptions(options, 'abidjan').map((o) => o.value)).toEqual(['1'])
  })

  it('exige tous les mots', () => {
    expect(filterOptions(options, 'nsia abidjan').map((o) => o.value)).toEqual([
      '1',
    ])
    expect(filterOptions(options, 'nsia angre')).toEqual([])
  })
})
