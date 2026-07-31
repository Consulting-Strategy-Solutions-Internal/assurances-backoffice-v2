// @vitest-environment jsdom

import { beforeEach, expect, it, vi } from 'vitest'
import { api } from '#/lib/api'
import { getClient, getClients } from '#/services/clients'

vi.mock('#/lib/api', () => ({ api: { get: vi.fn() } }))

const mockedGet = vi.mocked(api.get)

beforeEach(() => mockedGet.mockReset())

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
