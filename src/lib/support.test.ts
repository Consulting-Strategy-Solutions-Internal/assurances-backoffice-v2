import { describe, expect, it } from 'vitest'
import { AxiosError, AxiosHeaders } from 'axios'
import {
  availableSupportTransitions,
  canReplyToSupport,
  canStreamSupport,
  filterSupportConversations,
  mapSupportError,
  needsReadReceipt,
  upsertSupportMessage,
} from '#/lib/support'
import type {
  SupportConversationResponse,
  SupportMessageResponse,
  SupportStatus,
} from '#/services/support'

describe('availableSupportTransitions', () => {
  const cases: Array<[SupportStatus, string[]]> = [
    ['OPEN', ['handle']],
    ['IN_PROGRESS', ['release', 'resolve']],
    ['RESOLVED', []],
    ['CLOSED', []],
  ]
  it.each(cases)('maps %s', (status, expected) => {
    expect(availableSupportTransitions(status)).toEqual(expected)
  })

  it('only forbids replying on a closed ticket', () => {
    expect(canReplyToSupport('OPEN')).toBe(true)
    expect(canReplyToSupport('IN_PROGRESS')).toBe(true)
    expect(canReplyToSupport('RESOLVED')).toBe(true)
    expect(canReplyToSupport('CLOSED')).toBe(false)
  })

  it('only allows streaming while handled', () => {
    expect(canStreamSupport('IN_PROGRESS')).toBe(true)
    expect(canStreamSupport('OPEN')).toBe(false)
    expect(canStreamSupport('RESOLVED')).toBe(false)
    expect(canStreamSupport('CLOSED')).toBe(false)
  })
})

describe('upsertSupportMessage', () => {
  const message = (
    id: number,
    body: string,
    attachments: SupportMessageResponse['attachments'] = [],
  ): SupportMessageResponse => ({
    id,
    senderType: 'CLIENT',
    senderLabel: 'Awa Diop',
    body,
    attachments,
    readAt: null,
    createdAt: '2026-09-01T10:00:00',
  })

  it('appends an unknown message at the end', () => {
    const result = upsertSupportMessage([message(1, 'a')], message(2, 'b'))
    expect(result.map((m) => m.id)).toEqual([1, 2])
  })

  it('replaces a known message in place instead of duplicating it (SSE repush with attachment)', () => {
    const repushed = message(1, 'a', [
      {
        id: 9,
        name: 'photo.png',
        contentType: 'image/png',
        sizeBytes: 1234,
        createdAt: '2026-09-01T10:01:00',
      },
    ])
    const result = upsertSupportMessage(
      [message(1, 'a'), message(2, 'b')],
      repushed,
    )
    expect(result).toHaveLength(2)
    expect(result[0]).toBe(repushed)
    expect(result[1].id).toBe(2)
  })
})

describe('mapSupportError', () => {
  const axiosError = (status: number, data?: unknown) =>
    new AxiosError('boom', undefined, undefined, undefined, {
      status,
      statusText: '',
      headers: {},
      config: { headers: new AxiosHeaders() },
      data,
    })

  it('describes a 409 with the action-specific message when provided', () => {
    expect(mapSupportError(axiosError(409), 'Déjà pris en charge.')).toBe(
      'Déjà pris en charge.',
    )
    expect(mapSupportError(axiosError(409))).toBe(
      "L'état du ticket ne permet plus cette action. Actualisez la page.",
    )
  })

  it('maps 404 to a not-found message (isolation: jamais 403)', () => {
    expect(mapSupportError(axiosError(404))).toBe('Ticket introuvable.')
  })

  it('surfaces the backend message on a 422 business rule', () => {
    expect(
      mapSupportError(
        axiosError(422, { message: 'attachment window expired' }),
      ),
    ).toBe('attachment window expired')
  })

  it('never surfaces a raw 5xx body', () => {
    expect(mapSupportError(axiosError(500, { message: 'stacktrace…' }))).toBe(
      'Une erreur serveur est survenue.',
    )
  })

  it('falls back for non-axios errors', () => {
    expect(mapSupportError(new Error('x'))).toBe(
      'Impossible de contacter le serveur.',
    )
  })
})

describe('filterSupportConversations', () => {
  const conv = (
    id: number,
    subject: string,
    handledByName: string | null,
  ): SupportConversationResponse => ({
    id,
    subject,
    status: handledByName ? 'IN_PROGRESS' : 'OPEN',
    handledByName,
    lastMessageAt: '2026-09-01T10:00:00',
    unreadCount: 0,
    createdAt: '2026-09-01T10:00:00',
  })
  const rows = [
    conv(52, 'Mauvaise manipulation', null),
    conv(2, 'Paiement échoué', 'Admin NSIA'),
    conv(1, 'Test', 'Awa Koné'),
  ]
  const all = { query: '', agent: 'all' as const, myName: 'Admin NSIA' }

  it('searches subject, ticket number and agent (accent-insensitive)', () => {
    expect(
      filterSupportConversations(rows, { ...all, query: 'paiement' }),
    ).toHaveLength(1)
    expect(
      filterSupportConversations(rows, { ...all, query: '#52' })[0].id,
    ).toBe(52)
    expect(
      filterSupportConversations(rows, { ...all, query: 'kone' })[0].id,
    ).toBe(1)
  })
  it('filters by agent', () => {
    expect(
      filterSupportConversations(rows, { ...all, agent: 'me' }).map(
        (r) => r.id,
      ),
    ).toEqual([2])
    expect(
      filterSupportConversations(rows, { ...all, agent: 'unassigned' }).map(
        (r) => r.id,
      ),
    ).toEqual([52])
    expect(
      filterSupportConversations(rows, {
        ...all,
        agent: 'me',
        myName: undefined,
      }),
    ).toEqual([])
  })
})

describe('needsReadReceipt', () => {
  it('ne demande rien sans message client', () => {
    expect(needsReadReceipt(undefined, undefined)).toBe(false)
  })
  it('demande un accusé pour un premier message client', () => {
    expect(needsReadReceipt(12, undefined)).toBe(true)
  })
  it('ne rejoue pas l’accusé quand le dernier message client est déjà acquitté', () => {
    expect(needsReadReceipt(12, 12)).toBe(false)
  })
  it('redemande quand un message client plus récent arrive', () => {
    expect(needsReadReceipt(13, 12)).toBe(true)
  })
})
