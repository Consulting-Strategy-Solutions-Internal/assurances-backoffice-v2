// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import {
  matchesStatusFilter,
  MAX_ATTACHMENT_BYTES,
  availableActions,
  canUploadAttachment,
  formatClaimDate,
  mapClaimError,
  maskFrDate,
  parseFrDate,
  validateClaimUpload,
  validateOccurredOn,
} from '#/lib/claims'
import type { ClaimStatus } from '#/services/claims'

describe('availableActions', () => {
  const cases: Array<[ClaimStatus, string[]]> = [
    ['SUBMITTED', ['review']],
    ['UNDER_REVIEW', ['request-info', 'approve', 'reject']],
    ['INFO_REQUESTED', []],
    ['APPROVED', []],
    ['REJECTED', []],
    ['CANCELLED', []],
  ]
  it.each(cases)('maps %s', (status, expected) => {
    expect(availableActions(status)).toEqual(expected)
  })

  it('forbids uploads only for terminal statuses', () => {
    expect(canUploadAttachment('INFO_REQUESTED')).toBe(true)
    expect(canUploadAttachment('APPROVED')).toBe(false)
    expect(canUploadAttachment('REJECTED')).toBe(false)
    expect(canUploadAttachment('CANCELLED')).toBe(false)
  })
})

describe('validateClaimUpload', () => {
  const file = (bytes: number[], name = 'piece.bin') =>
    new File([new Uint8Array(bytes)], name)

  it('accepts PDF, JPEG and PNG magic bytes', async () => {
    await expect(
      validateClaimUpload(file([0x25, 0x50, 0x44, 0x46]), 0),
    ).resolves.toBeNull()
    await expect(
      validateClaimUpload(file([0xff, 0xd8, 0xff, 0xe0]), 0),
    ).resolves.toBeNull()
    await expect(
      validateClaimUpload(
        file([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        0,
      ),
    ).resolves.toBeNull()
  })

  it('rejects an unauthorized signature, an oversized file and the 21st attachment', async () => {
    await expect(validateClaimUpload(file([1, 2, 3]), 0)).resolves.toBe(
      'FILE_TYPE_NOT_ALLOWED',
    )
    const oversized = new File(
      [new Uint8Array(MAX_ATTACHMENT_BYTES + 1)],
      'large.pdf',
    )
    await expect(validateClaimUpload(oversized, 0)).resolves.toBe(
      'FILE_TOO_LARGE',
    )
    await expect(
      validateClaimUpload(file([0x25, 0x50, 0x44, 0x46]), 20),
    ).resolves.toBe('ATTACHMENT_LIMIT_REACHED')
  })
})

describe('mapClaimError', () => {
  const error = (status: number, data: object = {}) => ({
    isAxiosError: true,
    response: { status, data },
  })
  it.each([
    [401, 'session'],
    [403, 'forbidden'],
    [404, 'not-found'],
    [409, 'conflict'],
    [422, 'business'],
    [502, 'storage'],
  ] as const)('maps HTTP %s', (status, kind) => {
    expect(mapClaimError(error(status)).kind).toBe(kind)
  })
  it('retains validation fields and the server business message', () => {
    expect(
      mapClaimError(
        error(400, { message: 'Invalid', errors: { comment: 'Required' } }),
      ),
    ).toEqual({
      kind: 'validation',
      message: 'Invalid',
      fields: { comment: 'Required' },
    })
    expect(
      mapClaimError(
        error(422, { message: 'A claim in status X cannot be approved' }),
      ),
    ).toMatchObject({
      kind: 'business',
      message: 'A claim in status X cannot be approved',
    })
  })
})

it('formats LocalDate without UTC conversion', () => {
  expect(formatClaimDate('2026-07-31')).toContain('2026')
})

describe('French date field', () => {
  it('masks digits as jj/mm/aaaa', () => {
    expect(maskFrDate('0309')).toBe('03/09')
    expect(maskFrDate('03092026x')).toBe('03/09/2026')
  })
  it('parses real dates only', () => {
    expect(parseFrDate('03/09/2026')).toBe('2026-09-03')
    expect(parseFrDate('31/02/2026')).toBeNull()
    expect(parseFrDate('3/9/2026')).toBeNull()
  })
  it('rejects empty, invalid and future dates', () => {
    const today = new Date(2026, 8, 30)
    expect(validateOccurredOn('', today)).toMatch(/requise/)
    expect(validateOccurredOn('99/99/2026', today)).toMatch(/invalide/)
    expect(validateOccurredOn('01/10/2026', today)).toMatch(/futur/)
    expect(validateOccurredOn('30/09/2026', today)).toBeUndefined()
  })
})

describe('matchesStatusFilter (R1-27)', () => {
  it('« en cours » regroupe déclaré, en instruction et pièces demandées', () => {
    const open: ClaimStatus[] = ['SUBMITTED', 'UNDER_REVIEW', 'INFO_REQUESTED']
    for (const status of open)
      expect(matchesStatusFilter(status, 'OPEN')).toBe(true)
    for (const status of ['APPROVED', 'REJECTED', 'CANCELLED'] as ClaimStatus[])
      expect(matchesStatusFilter(status, 'OPEN')).toBe(false)
  })

  it('un statut précis ne garde que ce statut, sans filtre tout passe', () => {
    expect(matchesStatusFilter('APPROVED', 'APPROVED')).toBe(true)
    expect(matchesStatusFilter('SUBMITTED', 'APPROVED')).toBe(false)
    expect(matchesStatusFilter('REJECTED', undefined)).toBe(true)
  })
})
