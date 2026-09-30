// @vitest-environment jsdom

import { beforeEach, expect, it, vi } from 'vitest'
import { api } from '#/lib/api'
import { getQuotations } from '#/services/quotations'

vi.mock('#/lib/api', () => ({ api: { get: vi.fn() } }))

const mockedGet = vi.mocked(api.get)

beforeEach(() => mockedGet.mockReset())

it('forwards an optional sort to the backend', async () => {
  mockedGet.mockResolvedValue({ data: { content: [] } })
  await getQuotations({ page: 0, size: 100, sort: 'createdAt,desc' })
  expect(mockedGet).toHaveBeenCalledWith('/quotations', {
    params: {
      distributorCode: undefined,
      page: 0,
      size: 100,
      sort: 'createdAt,desc',
    },
  })
})
