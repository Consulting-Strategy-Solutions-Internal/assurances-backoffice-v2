import { describe, expect, it } from 'vitest'
import { computeIa } from '#/lib/premium/ia'
import { PremiumError, findProrationBracket } from '#/lib/premium/math'
import type { IaInput } from '#/lib/premium/ia'
import type { ProrationBracket } from '#/lib/premium/math'

const brackets: ProrationBracket[] = [
  { minMonths: 1, maxMonths: 3, coefficient: 0.3 },
  { minMonths: 4, maxMonths: 6, coefficient: 0.55 },
  { minMonths: 7, maxMonths: null, coefficient: 1 },
]

function input(values: Partial<IaInput> = {}): IaInput {
  return {
    deathCapital: 1000,
    permanentDisabilityCapital: 1000,
    medicalExpensesCapital: 1000,
    deathRate: 10,
    permanentDisabilityRate: 10,
    medicalExpensesRate: 10,
    appliedModifierCodes: new Set(),
    reductionRate: 0,
    durationMonths: 5,
    modifiers: [],
    accessories: [],
    prorationBrackets: brackets,
    ...values,
  }
}

describe('findProrationBracket', () => {
  it('traite les bornes minimales et maximales comme inclusives', () => {
    expect(findProrationBracket(brackets, 1)).toEqual(brackets[0])
    expect(findProrationBracket(brackets, 3)).toEqual(brackets[0])
    expect(findProrationBracket(brackets, 4)).toEqual(brackets[1])
    expect(findProrationBracket(brackets, 6)).toEqual(brackets[1])
  })

  it('sélectionne une tranche sans borne supérieure', () => {
    expect(findProrationBracket(brackets, 48)).toEqual(brackets[2])
  })

  it('retourne null quand aucune tranche n’est configurée', () => {
    expect(findProrationBracket([], 6)).toBeNull()
  })

  it('rejette une durée non couverte', () => {
    expect(() =>
      findProrationBracket(
        [
          { minMonths: 1, maxMonths: 3, coefficient: 0.3 },
          { minMonths: 5, maxMonths: 6, coefficient: 0.6 },
        ],
        4,
      ),
    ).toThrow(PremiumError)
  })

  it('rejette des tranches qui se chevauchent', () => {
    expect(() =>
      findProrationBracket(
        [
          { minMonths: 1, maxMonths: 3, coefficient: 0.3 },
          { minMonths: 3, maxMonths: 6, coefficient: 0.6 },
        ],
        3,
      ),
    ).toThrow(/chevauchement/)
  })
})

describe('computeIa proration', () => {
  it('applique le coefficient à la prime TTC complète', () => {
    const result = computeIa(input())

    expect(result.pttc).toBe(34.35)
    expect(result.coefficient).toBe(0.55)
    expect(result.prorationBracket).toEqual(brackets[1])
    expect(result.pttcDue).toBe(18.89)
  })

  it('applique explicitement un coefficient 1 sans configuration', () => {
    const result = computeIa(input({ prorationBrackets: [] }))

    expect(result.prorationBracket).toBeNull()
    expect(result.coefficient).toBe(1)
    expect(result.pttcDue).toBe(result.pttc)
  })

  it('rejette une durée fractionnaire', () => {
    expect(() => computeIa(input({ durationMonths: 1.5 }))).toThrow(
      /nombre entier/,
    )
  })
})
