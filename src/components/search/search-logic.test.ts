import { describe, expect, it } from 'vitest'
import {
  buildGroups,
  flattenGroups,
  occupationResults,
  searchAdmins,
  searchClaims,
  searchClients,
  searchPages,
  searchPartners,
  searchTickets,
} from './search-logic'
import type { ClaimResponse } from '#/services/claims'
import type { ClientResponse } from '#/services/clients'
import type { PartnerResponse } from '#/services/partners'
import type { SupportConversationResponse } from '#/services/support'
import type { UserResponse } from '#/services/users'

const client = (
  id: number,
  firstName: string,
  lastName: string,
  phone = '+2250717763921',
  email?: string,
) =>
  ({
    id,
    firstName,
    lastName,
    phoneNumber: phone,
    email,
    gender: 'HOMME',
    createdAt: '',
    updatedAt: '',
  }) as ClientResponse

describe('searchPages', () => {
  it('finds a page by keyword, accents ignored', () => {
    const r = searchPages('bareme')
    expect(r[0]?.title).toBe('Barèmes')
    expect(r[0]?.subtitle).toBe('IA Standard')
    expect(r[0]?.target.to).toBe('/produits-ia/ia-standard/baremes')
  })
  it('ranks title prefix before keyword-only matches', () => {
    const r = searchPages('clients')
    expect(r[0]?.title).toBe('Clients')
  })
  it('returns nothing for a blank query', () => {
    expect(searchPages('  ')).toEqual([])
  })
})

describe('searchClients', () => {
  const clients = [
    client(1, 'AWA', 'KONE', '+2250101010101', 'awa@x.ci'),
    client(2, 'Koffi', 'Nsia', '+2250707070707'),
  ]
  it('matches name accent- and case-insensitively and cleans the display name', () => {
    const r = searchClients(clients, 'kone')
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ id: 'clients:1', title: 'Awa Kone' })
  })
  it('matches phone digits from 3 digits', () => {
    expect(searchClients(clients, '07 07').map((r) => r.id)).toEqual([
      'clients:2',
    ])
    expect(searchClients(clients, 'zz')).toEqual([])
  })
  it('finds a phone typed with dots or dashes (R1-23)', () => {
    expect(searchClients(clients, '07.07').map((r) => r.id)).toEqual([
      'clients:2',
    ])
    expect(searchClients(clients, '07-07-07').map((r) => r.id)).toEqual([
      'clients:2',
    ])
    expect(
      searchClients([client(3, 'Zoe', 'Yao')], '07.17.76').map((r) => r.id),
    ).toEqual(['clients:3'])
    expect(searchClients(clients, '07.17')).toEqual([])
  })
  it('links to the client detail page', () => {
    expect(searchClients(clients, 'nsia')[0]?.target).toEqual({
      to: '/clients/$clientId',
      params: { clientId: '2' },
    })
  })
})

describe('other record searches', () => {
  it('partners: name, code, location', () => {
    const partners = [
      {
        id: 3,
        name: 'NSIA Distribution',
        distributorCode: '10000',
        location: 'Abidjan',
      },
      { id: 4, name: 'Wave', distributorCode: '22222', location: 'Cocody' },
    ] as PartnerResponse[]
    expect(searchPartners(partners, '22222')[0]?.title).toBe('Wave')
    expect(searchPartners(partners, 'abidjan')[0]?.subtitle).toBe(
      'Code 10000 · Abidjan',
    )
  })
  it('admins: only admin roles', () => {
    const users = [
      {
        id: 1,
        role: 'ADMIN',
        firstName: 'Awa',
        lastName: 'Kone',
        email: 'a@nsia.com',
      },
      {
        id: 2,
        role: 'AGENT',
        firstName: 'Awa',
        lastName: 'Diallo',
        email: 'd@nsia.com',
      },
    ] as UserResponse[]
    expect(searchAdmins(users, 'awa').map((r) => r.id)).toEqual(['admins:1'])
  })
  it('admins: same rule as /users (isAdminRole), internal roles included (R1-22)', () => {
    const users = [
      { id: 1, role: 'SUPPORT', firstName: 'Awa', lastName: 'K', email: 'a@x' },
      { id: 2, role: 'MANAGER', firstName: 'Awa', lastName: 'M', email: 'm@x' },
    ] as UserResponse[]
    expect(searchAdmins(users, 'awa').map((r) => r.id)).toEqual(['admins:1'])
  })
  it('admins: résout le rôle via la liste des rôles quand elle est connue (R2-7)', () => {
    const users = [
      {
        id: 1,
        role: 'AUDITEUR',
        firstName: 'Awa',
        lastName: 'K',
        email: 'a@x',
      },
    ] as UserResponse[]
    const roles = [
      { name: 'AUDITEUR', system: true, userAssignable: false },
    ] as never[]
    expect(searchAdmins(users, 'awa')).toHaveLength(1)
    expect(searchAdmins(users, 'awa', roles)).toHaveLength(0)
  })
  it('tickets: subject and #id', () => {
    const t = [
      { id: 52, subject: 'Problème de paiement', status: 'OPEN' },
      { id: 2, subject: 'Autre', status: 'OPEN' },
    ] as SupportConversationResponse[]
    expect(searchTickets(t, 'paiement')[0]?.id).toBe('tickets:52')
    expect(searchTickets(t, '#2').map((r) => r.id)).toContain('tickets:2')
  })
  it('claims: claim number and client name', () => {
    const c = [
      {
        id: 9,
        claimNumber: 'SIN-2026-0009',
        clientName: 'KONE AWA',
        claimTypeName: 'Décès',
      },
    ] as ClaimResponse[]
    expect(searchClaims(c, '0009')[0]?.title).toBe('SIN-2026-0009')
    expect(searchClaims(c, 'kone')[0]?.subtitle).toBe('Kone Awa · Décès')
  })
  it('occupations open the classes screen on the class', () => {
    const r = occupationResults([
      { id: 1, description: 'Avocat', classNumber: 2, riskClassId: 14 },
    ])
    expect(r[0]?.target).toEqual({
      to: '/produits-ia/ia-standard/classes',
      search: { classId: 14 },
    })
  })
})

describe('buildGroups', () => {
  const many = searchClients(
    Array.from({ length: 8 }, (_, i) => client(i + 1, 'Awa', `Kone${i}`)),
    'awa',
  )
  it('limits records per group and appends a see-all link', () => {
    const groups = buildGroups([{ id: 'clients', results: many }], 5)
    expect(groups).toHaveLength(1)
    expect(groups[0]?.total).toBe(8)
    expect(groups[0]?.results).toHaveLength(6)
    expect(groups[0]?.results.at(-1)).toMatchObject({
      kind: 'seeAll',
      title: 'Voir tous les clients',
    })
  })
  it('follows the display order and drops empty settled groups', () => {
    const groups = buildGroups([
      { id: 'clients', results: many },
      { id: 'partners', results: [] },
      { id: 'pages', results: searchPages('clients') },
    ])
    expect(groups.map((g) => g.id)).toEqual(['pages', 'clients'])
  })
  it('keeps a loading group with no results', () => {
    const groups = buildGroups([{ id: 'claims', results: [], loading: true }])
    expect(groups[0]).toMatchObject({ id: 'claims', loading: true })
    expect(flattenGroups(groups)).toEqual([])
  })
  it('keeps a failed group with its error and no results (R1-26)', () => {
    const groups = buildGroups([
      { id: 'tickets', results: [], error: 'forbidden' },
      { id: 'claims', results: [], error: 'failed' },
    ])
    expect(groups.map((g) => [g.id, g.error])).toEqual([
      ['claims', 'failed'],
      ['tickets', 'forbidden'],
    ])
    expect(flattenGroups(groups)).toEqual([])
  })
  it('has no see-all link for pages', () => {
    const groups = buildGroups([
      { id: 'pages', results: searchPages('clients') },
    ])
    expect(groups[0]?.results.every((r) => r.kind !== 'seeAll')).toBe(true)
  })

  it('« Voir tous » transmet la recherche aux listes filtrables', () => {
    const results = searchPages('clients')
    const [group] = buildGroups([{ id: 'clients', results }], 5, ' nsia ')
    const seeAll = group.results.at(-1)
    expect(seeAll?.kind).toBe('seeAll')
    expect(seeAll?.target).toEqual({ to: '/clients', search: { q: 'nsia' } })
  })
})
