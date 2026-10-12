import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it } from 'vitest'
import {
  findRefundAlert,
  mapRefundDestinationError,
  normalizeIvorianNumber,
  validateRefundDestination,
} from '#/lib/refunds'
import type { NotificationResponse } from '#/services/notifications'

function axiosError(status: number, data: unknown): AxiosError {
  const headers = new AxiosHeaders()
  return new AxiosError('boom', String(status), undefined, undefined, {
    status,
    statusText: '',
    headers,
    config: { headers },
    data,
  })
}

describe('normalizeIvorianNumber (comme PhoneNumberNormalizer)', () => {
  it.each([
    ['0544001122', '+2250544001122'],
    ['05 44 00 11 22', '+2250544001122'],
    ['+225 05-44-00-11-22', '+2250544001122'],
    ['2250544001122', '+2250544001122'],
    ['002250544001122', '+2250544001122'],
    ['(07).12.34.56.78', '+2250712345678'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeIvorianNumber(input)).toBe(expected)
  })

  it.each([
    ['544001122'], // 9 chiffres sans 0
    ['+33612345678'], // autre pays
    ['05440011'], // trop court
    ['abc'],
    [''],
  ])('%s → null', (input) => {
    expect(normalizeIvorianNumber(input)).toBeNull()
  })
})

describe('validateRefundDestination (préfixe / opérateur)', () => {
  it('opérateur obligatoire', () => {
    expect(validateRefundDestination(null, '0544001122')).toEqual({
      operator: 'Choisissez l’opérateur.',
    })
  })

  it('numéro illisible', () => {
    expect(validateRefundDestination('MTN', '12')).toEqual({
      destination:
        'Numéro ivoirien attendu : 10 chiffres (0X XX XX XX XX), avec ou sans +225.',
    })
  })

  it.each([
    ['ORANGE', '07 12 34 56 78'],
    ['MTN', '05 44 00 11 22'],
    ['MOOV', '+225 01 02 03 04 05'],
    ['WAVE', '05 44 00 11 22'],
    ['WAVE', '07 12 34 56 78'],
    ['WAVE', '01 02 03 04 05'],
  ] as const)('%s + %s : accepté', (operator, number) => {
    expect(validateRefundDestination(operator, number)).toEqual({})
  })

  it.each([
    ['ORANGE', '05 44 00 11 22', 'Un numéro Orange commence par 07.'],
    ['MTN', '07 12 34 56 78', 'Un numéro MTN commence par 05.'],
    ['MOOV', '05 44 00 11 22', 'Un numéro Moov commence par 01.'],
  ] as const)('%s + %s : refusé', (operator, number, message) => {
    expect(validateRefundDestination(operator, number)).toEqual({
      destination: message,
    })
  })
})

describe('mapRefundDestinationError', () => {
  it('REFUND_INVALID_STATUS', () => {
    expect(
      mapRefundDestinationError(
        axiosError(422, {
          message: 'Refund RF-12 is PAID, not AWAITING_DESTINATION',
          errors: { status: 'REFUND_INVALID_STATUS' },
        }),
      ),
    ).toEqual({
      kind: 'invalid-status',
      message: 'Ce remboursement n’attend pas de numéro.',
    })
  })

  it('WITHDRAWAL_OPERATOR_MISMATCH et INVALID_PHONE_NUMBER sous le numéro', () => {
    expect(
      mapRefundDestinationError(
        axiosError(422, {
          errors: { destination: 'WITHDRAWAL_OPERATOR_MISMATCH' },
        }),
      ),
    ).toEqual({
      kind: 'field',
      field: 'destination',
      message: 'Le préfixe du numéro ne correspond pas à l’opérateur.',
    })
    expect(
      mapRefundDestinationError(
        axiosError(400, { errors: { destination: 'INVALID_PHONE_NUMBER' } }),
      ),
    ).toMatchObject({ kind: 'field', field: 'destination' })
  })

  it('opérateur manquant ou inconnu', () => {
    expect(
      mapRefundDestinationError(
        axiosError(400, { errors: { operator: 'must not be null' } }),
      ),
    ).toMatchObject({ kind: 'field', field: 'operator' })
    expect(
      mapRefundDestinationError(
        axiosError(400, { message: 'Malformed or missing request body' }),
      ),
    ).toMatchObject({ kind: 'field', field: 'operator' })
  })

  it('404 et 403', () => {
    expect(mapRefundDestinationError(axiosError(404, {}))).toEqual({
      kind: 'not-found',
      message: 'Remboursement introuvable.',
    })
    expect(mapRefundDestinationError(axiosError(403, {}))).toEqual({
      kind: 'forbidden',
      message: 'Droit insuffisant.',
    })
  })
})

function notification(
  overrides: Partial<NotificationResponse>,
): NotificationResponse {
  return {
    id: 1,
    type: 'REFUND_ATTENTION',
    title: 'Remboursement à traiter',
    body: 'Le remboursement RF-12 de 45 250 F CFA a échoué chez FineoPay.',
    resourceType: 'REFUND_REQUEST',
    resourceId: 12,
    read: false,
    createdAt: '2026-10-12T10:00:00',
    ...overrides,
  }
}

describe('findRefundAlert', () => {
  it('la plus récente alerte REFUND_ATTENTION de ce remboursement', () => {
    const list = [
      notification({ id: 3, resourceId: 99 }),
      notification({ id: 2, createdAt: '2026-10-12T11:00:00' }),
      notification({
        id: 4,
        type: 'PAYOUT_FUNDS_INSUFFICIENT',
        createdAt: '2026-10-12T12:00:00',
      }),
      notification({ id: 1 }),
    ]
    expect(findRefundAlert(list, 12)?.id).toBe(2)
  })

  it('null sans alerte', () => {
    expect(findRefundAlert([notification({ resourceId: 99 })], 12)).toBeNull()
  })
})
