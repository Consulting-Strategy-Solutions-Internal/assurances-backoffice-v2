import { describe, expect, it } from 'vitest'
import {
  buildModifierPayload,
  modifierCodeSchema,
  normalizeModifierCode,
  suggestModifierCode,
} from './modifier-payload'

describe('buildModifierPayload', () => {
  it('met le code en majuscules, trim, MANUAL et taux numérique', () => {
    expect(
      buildModifierPayload({
        code: '  promo-ete ',
        label: ' Été ',
        modifierType: 'DISCOUNT',
        rate: '10,5',
        isActive: true,
      }),
    ).toEqual({
      code: 'PROMO-ETE',
      label: 'Été',
      modifierType: 'DISCOUNT',
      rate: 10.5,
      triggerType: 'MANUAL',
      isActive: true,
    })
  })
})

describe('code de majoration', () => {
  const valid = (v: string) => modifierCodeSchema.safeParse(v).success

  it('accepte les codes au format attendu', () => {
    expect(valid('SPORT_DANGEREUX')).toBe(true)
    expect(valid('DEUX_ROUES_49CM3')).toBe(true)
    expect(valid('AGE')).toBe(true)
  })

  it('refuse les codes mal formés', () => {
    expect(valid('')).toBe(false)
    expect(valid('AB')).toBe(false)
    expect(valid('9SPORT')).toBe(false)
    expect(valid('_SPORT')).toBe(false)
    expect(valid('SPORT_')).toBe(false)
    expect(valid('SPORT__DANGEREUX')).toBe(false)
    expect(valid('sport')).toBe(false)
    expect(valid('A'.repeat(51))).toBe(false)
  })

  it('normalise la saisie', () => {
    expect(normalizeModifierCode('sport dangereux')).toBe('SPORT_DANGEREUX')
    expect(normalizeModifierCode('Élève-conducteur')).toBe('ELEVE_CONDUCTEUR')
    expect(normalizeModifierCode('50cm³ !')).toBe('50CM_')
  })

  it('propose un code valide depuis le libellé', () => {
    const code = suggestModifierCode("Usage d'un engin à deux roues")
    expect(code).toBe('USAGE_D_UN_ENGIN_A_DEUX_ROUES')
    expect(valid(code)).toBe(true)
    expect(suggestModifierCode('  49 cm3 -- moto ')).toBe('CM3_MOTO')
    expect(suggestModifierCode('x'.repeat(80)).length).toBe(50)
  })
})
