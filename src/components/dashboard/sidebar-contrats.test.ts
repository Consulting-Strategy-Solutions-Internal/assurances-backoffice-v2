import { describe, expect, it } from 'vitest'
import { contratsChildren } from './Sidebar'

const known = (granted: string[]) => (code: string) => granted.includes(code)

describe('menu Contrats (AC-13)', () => {
  it('chaque entrée suit son propre droit connu', () => {
    expect(
      contratsChildren(
        known(['amendment:read-all', 'subscription:read-all']),
      ).map((c) => c.label),
    ).toEqual(['Modifications', 'Supervision voyage'])
    expect(
      contratsChildren(known(['subscription:read-all'])).map((c) => c.to),
    ).toEqual(['/contrats/voyage'])
    expect(
      contratsChildren(known(['amendment:read-all'])).map((c) => c.to),
    ).toEqual(['/contrats/modifications'])
  })

  it('droits inconnus ou absents : aucune entrée, groupe masqué (L-005)', () => {
    expect(contratsChildren(known([]))).toEqual([])
  })
})
