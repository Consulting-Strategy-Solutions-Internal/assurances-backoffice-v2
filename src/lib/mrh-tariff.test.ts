import { describe, expect, it } from 'vitest'
import {
  baseRateFieldsFor,
  buildBaseRatePayload,
  buildLegalQualityPayload,
  buildLineWarrantyPayload,
  lineFieldsFor,
  parseDecimalInput,
  validateDecimalInput,
  validateTextLength,
} from './mrh-tariff'
import type {
  BaseRateResponse,
  LegalQualityWarrantyResponse,
} from '#/services/mrh-tariff'

const tenantRate: BaseRateResponse = {
  id: 10,
  legalQualityId: 1,
  buildingPremiumRate: null,
  contentsPremiumRate: 5,
  rentalValuePremiumRate: 0.35,
  rentMultiplier: 180,
  minimumContentsValue: null,
  createdAt: '',
  updatedAt: '',
}

function line(
  premiumType: LegalQualityWarrantyResponse['premiumType'],
  values: Partial<LegalQualityWarrantyResponse> = {},
): LegalQualityWarrantyResponse {
  return {
    id: 5,
    legalQualityId: 1,
    warrantyId: 2,
    premiumType,
    rate: null,
    flatAmount: null,
    capitalShare: null,
    mandatory: false,
    createdAt: '',
    updatedAt: '',
    ...values,
  }
}

describe('parseDecimalInput / validateDecimalInput', () => {
  it('accepte la virgule française', () => {
    expect(parseDecimalInput(' 0,35 ')).toBe(0.35)
    expect(validateDecimalInput('0,35', { max: 1000 })).toBeUndefined()
  })
  it('refuse vide, texte, négatif et hors plafond', () => {
    expect(validateDecimalInput('', {})).toBe('Ce champ est requis.')
    expect(validateDecimalInput('abc', {})).toBe('Saisissez un nombre valide.')
    expect(validateDecimalInput('-1', {})).toBe('Saisissez un nombre valide.')
    expect(validateDecimalInput('1001', { max: 1000 })).toMatch(
      /^La valeur doit être comprise entre 0 et 1\s000\.$/,
    )
  })
  it('refuse 0 quand la valeur doit être strictement positive', () => {
    expect(validateDecimalInput('0', { positive: true })).toBe(
      'La valeur doit être supérieure à 0.',
    )
  })
})

describe('baseRateFieldsFor', () => {
  it('ne garde que les taux non nuls de la situation', () => {
    expect(baseRateFieldsFor(tenantRate)).toEqual([
      'rentalValuePremiumRate',
      'rentMultiplier',
      'contentsPremiumRate',
    ])
    expect(
      baseRateFieldsFor({
        ...tenantRate,
        buildingPremiumRate: 0.45,
        contentsPremiumRate: null,
        rentalValuePremiumRate: null,
        rentMultiplier: null,
      }),
    ).toEqual(['buildingPremiumRate'])
  })
})

describe('buildBaseRatePayload', () => {
  it('n’envoie que les champs modifiés', () => {
    expect(
      buildBaseRatePayload(tenantRate, {
        rentalValuePremiumRate: '0,4',
        rentMultiplier: '180',
        contentsPremiumRate: '5',
      }),
    ).toEqual({ rentalValuePremiumRate: 0.4 })
  })
  it('renvoie un corps vide si rien n’a changé', () => {
    expect(
      buildBaseRatePayload(tenantRate, { rentMultiplier: '180,0' }),
    ).toEqual({})
  })
})

describe('buildLegalQualityPayload', () => {
  it('envoie toujours le nom et la description (le backend efface une description absente)', () => {
    expect(
      buildLegalQualityPayload({ name: ' Locataire ', description: '' }),
    ).toEqual({ name: 'Locataire', description: null })
    expect(
      buildLegalQualityPayload({ name: 'Loc', description: ' Logement ' }),
    ).toEqual({ name: 'Loc', description: 'Logement' })
  })
})

describe('lineFieldsFor / buildLineWarrantyPayload', () => {
  it('POURCENTAGE : rate seul', () => {
    expect(lineFieldsFor('POURCENTAGE')).toEqual(['rate'])
    expect(
      buildLineWarrantyPayload(line('POURCENTAGE', { rate: 25 }), {
        rate: '30',
        flatAmount: '',
        capitalShare: '',
        mandatory: false,
      }),
    ).toEqual({ rate: 30 })
  })
  it('FORFAIT : flatAmount seul, même inchangé', () => {
    expect(
      buildLineWarrantyPayload(line('FORFAIT', { flatAmount: 15000 }), {
        rate: '',
        flatAmount: '15000',
        capitalShare: '',
        mandatory: true,
      }),
    ).toEqual({ flatAmount: 15000, mandatory: true })
  })
  it('CAPITAL : rate et capitalShare, mandatory seulement s’il change', () => {
    expect(lineFieldsFor('CAPITAL')).toEqual(['rate', 'capitalShare'])
    expect(
      buildLineWarrantyPayload(
        line('CAPITAL', { rate: 1, capitalShare: 25, mandatory: true }),
        { rate: '1,5', flatAmount: '', capitalShare: '25', mandatory: true },
      ),
    ).toEqual({ rate: 1.5, capitalShare: 25 })
  })
})

describe('revue R1', () => {
  it('R1-7 : accepte un montant saisi avec des espaces (« 15 000 »)', () => {
    expect(validateDecimalInput('15 000', {})).toBeUndefined()
    expect(validateDecimalInput('15 000,5', {})).toBeUndefined()
    expect(parseDecimalInput('15 000')).toBe(15000)
  })

  it('R1-1 : texte limité à 255 caractères (colonne varchar 255)', () => {
    expect(validateTextLength('a'.repeat(255))).toBeUndefined()
    expect(validateTextLength('a'.repeat(256))).toBe('255 caractères maximum.')
  })

  it('D-7 : un taux exigé par la situation reste affiché même vide en base', () => {
    const empty = {
      ...tenantRate,
      rentalValuePremiumRate: null,
      rentMultiplier: null,
    }
    expect(baseRateFieldsFor(empty, 'LOCATIVE')).toEqual([
      'rentalValuePremiumRate',
      'rentMultiplier',
      'contentsPremiumRate',
    ])
    expect(
      baseRateFieldsFor(
        { ...empty, contentsPremiumRate: null, buildingPremiumRate: null },
        'BATIMENT',
      ),
    ).toEqual(['buildingPremiumRate'])
  })

  it('minimumContentsValue : optionnel, envoyé seulement s’il est saisi et changé', () => {
    expect(
      buildBaseRatePayload(tenantRate, { minimumContentsValue: '' }),
    ).toEqual({})
    expect(
      buildBaseRatePayload(tenantRate, { minimumContentsValue: '2 000 000' }),
    ).toEqual({ minimumContentsValue: 2000000 })
  })
})
