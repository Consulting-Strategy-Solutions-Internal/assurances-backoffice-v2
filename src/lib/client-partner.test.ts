import { AxiosError } from 'axios'
import type { AxiosResponse } from 'axios'
import { describe, expect, it } from 'vitest'
import {
  mapOwnerPartnerError,
  ownerPartnerId,
  parsePartnerFilter,
  partnerFilterLabel,
  partnerOptions,
} from './client-partner'
import type { PartnerResponse } from '#/services/partners'

const partner = (id: number, name: string): PartnerResponse => ({
  id,
  name,
  distributorCode: `D${id}`,
  idSite: 1,
  createdAt: '2026-01-01T00:00:00',
  updatedAt: '2026-01-01T00:00:00',
})

function httpError(status: number, data: unknown = {}) {
  const error = new AxiosError('failed')
  error.response = { status, data } as AxiosResponse
  return error
}

describe('parsePartnerFilter (AC-1)', () => {
  it('garde un id de partenaire ou none', () => {
    expect(parsePartnerFilter(7)).toBe(7)
    expect(parsePartnerFilter('7')).toBe(7)
    expect(parsePartnerFilter('none')).toBe('none')
  })
  it('écarte toute autre valeur (le serveur répondrait 400)', () => {
    for (const value of [
      '',
      'abc',
      '0',
      '-3',
      '1.5',
      'NONE',
      true,
      null,
      undefined,
    ]) {
      expect(parsePartnerFilter(value)).toBeUndefined()
    }
  })
})

describe('libellés', () => {
  const partners = [partner(2, 'Zeta'), partner(7, 'Sunu')]
  it('nomme le partenaire du filtre (AC-2)', () => {
    expect(partnerFilterLabel(7, partners)).toBe('partenaire Sunu')
    expect(partnerFilterLabel('none', partners)).toBe('sans partenaire')
    expect(partnerFilterLabel(9, partners)).toBe('partenaire #9')
  })
  it('trie les partenaires par nom', () => {
    expect(partnerOptions(partners).map((o) => o.label)).toEqual([
      'Sunu',
      'Zeta',
    ])
  })
})

describe('ownerPartnerId (AC-3)', () => {
  it('rattache à un id ou détache avec null', () => {
    expect(ownerPartnerId('7')).toBe(7)
    expect(ownerPartnerId('none')).toBeNull()
  })
})

describe('mapOwnerPartnerError (AC-4)', () => {
  it('400 : partenaire obligatoire', () => {
    expect(
      mapOwnerPartnerError(
        httpError(400, { errors: { partnerId: 'REQUIRED' } }),
      ).message,
    ).toMatch(/Choisissez un partenaire/)
  })
  it('403 : réservé à l’administration', () => {
    expect(mapOwnerPartnerError(httpError(403)).message).toMatch(
      /administration NSIA/,
    )
  })
  it('404 partenaire : liste à recharger', () => {
    expect(
      mapOwnerPartnerError(
        httpError(404, { message: 'Partner not found with id: 7' }),
      ),
    ).toEqual(expect.objectContaining({ partnerGone: true }))
  })
  it('404 client : client introuvable', () => {
    const mapped = mapOwnerPartnerError(
      httpError(404, { message: 'Client not found with id: 42' }),
    )
    expect(mapped.partnerGone).toBeUndefined()
    expect(mapped.message).toMatch(/client n’existe plus/)
  })
  it('réseau : message générique', () => {
    expect(mapOwnerPartnerError(new Error('x')).message).toMatch(/contacter/)
  })
})
