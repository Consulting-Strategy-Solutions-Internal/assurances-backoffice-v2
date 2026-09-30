// @vitest-environment jsdom

import { AxiosError } from 'axios'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { describe, expect, it } from 'vitest'
import {
  IA_ERROR_MESSAGES,
  orphanBannerMessage,
  parseIaError,
  parseIaErrorList,
} from '#/lib/ia-errors'

function axiosError(status: number, data: unknown): AxiosError {
  const config = { headers: {} } as InternalAxiosRequestConfig
  return new AxiosError('fail', String(status), config, null, {
    status,
    data,
    statusText: '',
    headers: {},
    config,
  } as AxiosResponse)
}

describe('parseIaError', () => {
  it('translates stable codes under their field', () => {
    const err = axiosError(409, {
      status: 409,
      message: 'x',
      errors: { classNumber: 'RISK_CLASS_NUMBER_ALREADY_EXISTS' },
    })
    expect(parseIaError(err)).toEqual({
      fields: { classNumber: 'Ce numéro de classe existe déjà.' },
      message: null,
    })
  })

  it('maps cross keys onto the max field', () => {
    const err = axiosError(400, {
      errors: {
        premiumRangeValid: 'must be true',
        monthRangeValid: 'x',
        ageSurchargeBandValid: 'x',
      },
    })
    const { fields } = parseIaError(err)
    expect(fields.maxPremium).toBe(IA_ERROR_MESSAGES.premiumRangeValid)
    expect(fields.maxMonths).toBe(IA_ERROR_MESSAGES.monthRangeValid)
    expect(fields.ageSurchargeMaxAge).toBe(
      IA_ERROR_MESSAGES.ageSurchargeBandValid,
    )
  })

  it('falls back to a generic message for Jakarta messages', () => {
    const err = axiosError(400, { errors: { description: 'must not be null' } })
    expect(parseIaError(err).fields).toEqual({
      description: 'Valeur invalide.',
    })
  })

  it('uses the server message without field errors', () => {
    const err = axiosError(400, { status: 400, message: 'Tri invalide' })
    expect(parseIaError(err)).toEqual({ fields: {}, message: 'Tri invalide' })
  })

  it('gives a generic conflict message for a bare 409', () => {
    const err = axiosError(409, { status: 409, message: 'dup' })
    expect(parseIaError(err).message).toBe('Cet élément existe déjà.')
  })

  it('handles non-axios errors', () => {
    expect(parseIaError(new Error('x')).message).toBe(
      'Impossible de contacter le serveur.',
    )
  })
})

describe('parseIaErrorList', () => {
  it('lists every reason of a class deletion', () => {
    const err = axiosError(422, {
      errors: {
        premiumRates: 'RISK_CLASS_HAS_PREMIUM_RATE',
        subscriptions: 'RISK_CLASS_HAS_ACTIVE_CONTRACT',
      },
    })
    expect(parseIaErrorList(err)).toEqual([
      IA_ERROR_MESSAGES.RISK_CLASS_HAS_PREMIUM_RATE,
      IA_ERROR_MESSAGES.RISK_CLASS_HAS_ACTIVE_CONTRACT,
    ])
  })
})

describe('orphanBannerMessage', () => {
  it('surfaces server errors on keys that are not form fields', () => {
    const parsed = parseIaError(
      axiosError(422, { errors: { product: 'x', minPremium: 'y' } }),
    )
    expect(orphanBannerMessage(parsed, ['minPremium', 'amount'])).toBe(
      'Produit : Valeur invalide.',
    )
  })
  it('prefixes every orphan message with its field key', () => {
    const parsed = parseIaError(
      axiosError(422, { errors: { product: 'x', triggerType: 'y' } }),
    )
    expect(orphanBannerMessage(parsed, [])).toBe(
      'Produit : Valeur invalide. Déclencheur : Valeur invalide.',
    )
  })
  it('falls back to the raw key for an unknown field', () => {
    const parsed = parseIaError(axiosError(422, { errors: { foo: 'x' } }))
    expect(orphanBannerMessage(parsed, [])).toBe(
      'Champ « foo » : Valeur invalide.',
    )
  })
  it('returns null when every key is a form field', () => {
    const parsed = parseIaError(axiosError(422, { errors: { amount: 'y' } }))
    expect(orphanBannerMessage(parsed, ['amount'])).toBeNull()
  })
  it('prefers the global message', () => {
    const parsed = parseIaError(axiosError(409, {}))
    expect(orphanBannerMessage(parsed, [])).toBe(parsed.message)
  })
})

describe('codes de la grille MRH et des accessoires', () => {
  it('traduit les codes de taux et de mode sous leur champ', () => {
    const parsed = parseIaError(
      axiosError(400, {
        errors: {
          buildingPremiumRate: 'NOT_ALLOWED_FOR_LEGAL_QUALITY',
          rentMultiplier: 'REQUIRED_FOR_LEGAL_QUALITY',
          flatAmount: 'NOT_ALLOWED_FOR_PREMIUM_TYPE',
          capitalShare: 'REQUIRED_FOR_PREMIUM_TYPE',
        },
      }),
    )
    expect(parsed.fields).toEqual({
      buildingPremiumRate: 'Ce taux ne s’applique pas à cette situation.',
      rentMultiplier: 'Ce taux est obligatoire pour cette situation.',
      flatAmount: 'Ce champ ne s’applique pas à ce mode de calcul.',
      capitalShare: 'Ce champ est obligatoire pour ce mode de calcul.',
    })
  })

  it('LAST_ACCESSORY_HAS_ACTIVE_CONTRACT : message clair, sans préfixe de champ', () => {
    const err = axiosError(422, {
      status: 422,
      message: 'The last accessory bracket…',
      errors: { subscriptions: 'LAST_ACCESSORY_HAS_ACTIVE_CONTRACT' },
    })
    const expected =
      'Impossible : c’est la dernière tranche du produit et des contrats sont en cours.'
    expect(parseIaErrorList(err)).toEqual([expected])
    expect(orphanBannerMessage(parseIaError(err), ['amount'])).toBe(expected)
  })
})
