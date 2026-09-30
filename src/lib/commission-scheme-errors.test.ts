import { AxiosError } from 'axios'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { describe, expect, it } from 'vitest'
import { parseSchemeError } from './commission-scheme-errors'

function httpError(status: number, data: unknown): AxiosError {
  const config = { headers: {} } as InternalAxiosRequestConfig
  return new AxiosError('fail', String(status), config, null, {
    status,
    data,
    statusText: '',
    headers: {},
    config,
  } as AxiosResponse)
}

describe('parseSchemeError', () => {
  it('explique les champs refusés au lieu de « Validation failed »', () => {
    const parsed = parseSchemeError(
      httpError(400, {
        status: 400,
        message: 'Validation failed',
        errors: { product: 'must not be null' },
      }),
    )
    expect(parsed.fields.product).toBe('Ce champ est obligatoire.')
    expect(parsed.details).toEqual(['Produit : Ce champ est obligatoire.'])
    expect(parsed.step).toBe(1)
    expect(parsed.details.join(' ')).not.toContain('Validation failed')
  })

  it('renvoie à la première étape fautive', () => {
    const parsed = parseSchemeError(
      httpError(400, {
        message: 'Validation failed',
        errors: {
          level2SellerShare: 'must be less than or equal to 100',
          maxLevel: 'must not be null',
        },
      }),
    )
    expect(parsed.step).toBe(2)
    expect(parsed.details).toHaveLength(2)
  })

  it('signale un champ inconnu du formulaire', () => {
    const parsed = parseSchemeError(
      httpError(400, { errors: { foo: 'must not be null' } }),
    )
    expect(parsed.details[0]).toContain('« foo »')
    expect(parsed.step).toBeNull()
  })

  it('traduit les règles métier (422)', () => {
    const parsed = parseSchemeError(
      httpError(422, {
        message: 'Level 3 scheme requires an agency with a seller',
      }),
    )
    expect(parsed.title).toContain('règle')
    expect(parsed.details[0]).toContain('niveau 3 exige')
  })

  it('explique le 403', () => {
    expect(parseSchemeError(httpError(403, {})).details[0]).toContain(
      'commissionscheme:write',
    )
  })

  it.each([
    [
      'Level 2 shares must total exactly 100',
      'Les parts du niveau 2 doivent totaliser exactement 100 %.',
    ],
    [
      'Level 3 shares must total exactly 100',
      'Les parts du niveau 3 doivent totaliser exactement 100 %.',
    ],
  ])('traduit le 422 « %s » (R1-39)', (message, french) => {
    const parsed = parseSchemeError(httpError(422, { message }))
    expect(parsed.details).toEqual([french])
  })

  it('traduit le 409 « schéma déjà existant », en création comme en édition (R1-39)', () => {
    const parsed = parseSchemeError(
      httpError(409, {
        message:
          'Commission scheme already exists for this partner and product',
      }),
    )
    expect(parsed.title).toBe('Ce schéma existe déjà')
    expect(parsed.details).toEqual([
      'Un schéma de commission existe déjà pour ce partenaire et ce produit.',
    ])
  })

  it('un 409 inconnu reste un message français générique (R1-39)', () => {
    const parsed = parseSchemeError(httpError(409, {}))
    expect(parsed.title).toBe('Ce schéma existe déjà')
    expect(parsed.details[0]).not.toMatch(/already/i)
  })
})
