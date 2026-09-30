// @vitest-environment jsdom

import { beforeEach, expect, it, vi } from 'vitest'
import { api } from '#/lib/api'
import {
  getClient,
  getClients,
  reassignClientPartner,
} from '#/services/clients'

vi.mock('#/lib/api', () => ({ api: { get: vi.fn(), put: vi.fn() } }))

const mockedGet = vi.mocked(api.get)
const mockedPut = vi.mocked(api.put)

beforeEach(() => {
  mockedGet.mockReset()
  mockedPut.mockReset()
})

it('loads the paginated client list from the real endpoint', async () => {
  mockedGet.mockResolvedValue({ data: { content: [], page: 1, size: 20 } })
  await getClients(1, 20, 'createdAt,desc')
  expect(mockedGet).toHaveBeenCalledWith('/clients', {
    params: { page: 1, size: 20, sort: 'createdAt,desc' },
  })
})

it('loads a client detail by id', async () => {
  mockedGet.mockResolvedValue({ data: { id: 42 } })
  await getClient(42)
  expect(mockedGet).toHaveBeenCalledWith('/clients/42')
})

it('filters the list by partner: an id or none (AC-1)', async () => {
  mockedGet.mockResolvedValue({ data: { content: [] } })
  await getClients(0, 100, 'lastName,asc', 7)
  expect(mockedGet).toHaveBeenLastCalledWith('/clients', {
    params: { page: 0, size: 100, sort: 'lastName,asc', partnerId: '7' },
  })
  await getClients(0, 100, 'lastName,asc', 'none')
  expect(mockedGet).toHaveBeenLastCalledWith('/clients', {
    params: { page: 0, size: 100, sort: 'lastName,asc', partnerId: 'none' },
  })
})

it('always sends partnerId when changing the partner, null to detach (AC-3)', async () => {
  mockedPut.mockResolvedValue({ status: 204 })
  await reassignClientPartner(42, 7)
  expect(mockedPut).toHaveBeenLastCalledWith('/clients/42/owner-partner', {
    partnerId: 7,
  })
  await reassignClientPartner(42, null)
  expect(mockedPut).toHaveBeenLastCalledWith('/clients/42/owner-partner', {
    partnerId: null,
  })
})
