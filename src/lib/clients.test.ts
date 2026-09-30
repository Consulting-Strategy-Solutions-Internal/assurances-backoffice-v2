import { expect, it } from 'vitest'
import type { ClientResponse } from '#/services/clients'
import {
  clientAddress,
  clientFullName,
  computeClientStats,
  filterClients,
  formatPhone,
} from './clients'

const base: ClientResponse = {
  id: 1,
  firstName: 'Awa ',
  lastName: 'KONÉ ',
  phoneNumber: '+2250717763921',
  email: null,
  gender: 'FEMME',
  addressLine1: 'Cocody',
  addressLine2: 'Néant',
  phoneVerifiedAt: '2026-09-20T10:00:00',
  emailVerifiedAt: null,
  createdAt: '2026-09-20T10:00:00',
  updatedAt: '2026-09-20T10:00:00',
}
const other: ClientResponse = {
  ...base,
  id: 2,
  firstName: 'Jean',
  lastName: 'Assoumou',
  gender: 'HOMME',
  phoneNumber: '+2250102030405',
  email: 'jean@ex.ci',
  addressLine2: 'Riviera 3',
  phoneVerifiedAt: null,
  createdAt: '2025-01-01T10:00:00',
}
const all = { query: '', verification: 'all', gender: 'all' } as const

it('formats Ivorian phone numbers', () => {
  expect(formatPhone('+2250717763921')).toBe('+225 07 17 76 39 21')
  expect(formatPhone('+22507177639')).toBe('+225 07 17 76 39')
  expect(formatPhone('+33612345678')).toBe('+33612345678')
})

it('cleans names and addresses', () => {
  expect(clientFullName(base)).toBe('Awa Koné')
  expect(clientAddress(base)).toBe('Cocody')
  expect(clientAddress(other)).toBe('Cocody · Riviera 3')
})

it('filters by accent-insensitive query, phone digits, verification and gender', () => {
  const list = [base, other]
  expect(filterClients(list, { ...all, query: 'kone' })).toEqual([base])
  expect(filterClients(list, { ...all, query: 'riviera' })).toEqual([other])
  expect(filterClients(list, { ...all, query: '01 02 03' })).toEqual([other])
  expect(filterClients(list, { ...all, verification: 'verified' })).toEqual([
    base,
  ])
  expect(filterClients(list, { ...all, gender: 'HOMME' })).toEqual([other])
})

it('computes stats', () => {
  expect(computeClientStats([base, other], new Date('2026-09-30'))).toEqual({
    total: 2,
    phoneVerified: 1,
    withEmail: 1,
    recent: 1,
  })
})
