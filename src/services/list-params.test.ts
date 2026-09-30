// @vitest-environment jsdom

import { beforeEach, expect, it, vi } from 'vitest'
import { api } from '#/lib/api'
import { getPartners } from '#/services/partners'
import { getProducts } from '#/services/products'
import { getUsers } from '#/services/users'

vi.mock('#/lib/api', () => ({ api: { get: vi.fn() } }))

const mockedGet = vi.mocked(api.get)

beforeEach(() => {
  mockedGet.mockReset()
  mockedGet.mockResolvedValue({ data: { content: [] } })
})

it('getProducts only sends parameters the OpenAPI knows (R1-16)', async () => {
  await getProducts(1, 50, 'IA')
  expect(mockedGet).toHaveBeenCalledWith('/products', {
    params: { page: 1, size: 50, insuranceType: 'IA' },
  })
  expect(Object.keys(mockedGet.mock.calls[0][1]?.params)).not.toContain(
    'categoryId',
  )
})

it('getPartners forwards sort (R2-9)', async () => {
  await getPartners(0, 100, 'createdAt,desc')
  expect(mockedGet).toHaveBeenCalledWith('/partners', {
    params: { page: 0, size: 100, sort: 'createdAt,desc' },
  })
})

it('getUsers forwards sort (R2-9)', async () => {
  await getUsers({ page: 0, size: 100, sort: 'createdAt,desc' })
  expect(mockedGet).toHaveBeenCalledWith('/users', {
    params: { page: 0, size: 100, sort: 'createdAt,desc' },
  })
})
