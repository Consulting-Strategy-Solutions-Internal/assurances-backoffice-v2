// @vitest-environment jsdom

import { AxiosError } from 'axios'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '#/lib/api'
import { getAccessories, importAccessoriesCsv } from '#/services/accessories'
import {
  getPremiumRateByRiskClass,
  getRiskClasses,
} from '#/services/ia-standard'
import { getProrations } from '#/services/proration-coefficients'

vi.mock('#/lib/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }))

const mockedGet = vi.mocked(api.get)
const mockedPost = vi.mocked(api.post)

beforeEach(() => {
  mockedGet.mockReset()
  mockedPost.mockReset()
})

function axiosError(status: number, data: unknown): AxiosError {
  const config = { headers: {} } as InternalAxiosRequestConfig
  return new AxiosError('fail', String(status), config, null, {
    status,
    data,
    statusText: '',
    headers: {},
    config,
  } as AxiosResponse)
}

const file = () => new File(['a'], 'a.csv', { type: 'text/csv' })

describe('importAccessoriesCsv', () => {
  it('returns the body on 201', async () => {
    mockedPost.mockResolvedValue({ data: { imported: 3, errors: [] } })
    await expect(importAccessoriesCsv(file())).resolves.toEqual({
      imported: 3,
      errors: [],
    })
    const [url, body] = mockedPost.mock.calls[0]
    expect(url).toBe('/accessories/import')
    expect((body as FormData).get('file')).toBeInstanceOf(File)
  })

  it('returns the rejection body on 422', async () => {
    const body = { imported: 0, errors: [{ line: 2, message: 'bad amount' }] }
    mockedPost.mockRejectedValue(axiosError(422, body))
    await expect(importAccessoriesCsv(file())).resolves.toEqual(body)
  })

  it('rethrows other errors', async () => {
    const err = axiosError(400, { status: 400, message: 'No file' })
    mockedPost.mockRejectedValue(err)
    await expect(importAccessoriesCsv(file())).rejects.toBe(err)
  })
})

describe('getPremiumRateByRiskClass', () => {
  it('returns null on 404', async () => {
    mockedGet.mockRejectedValue(axiosError(404, {}))
    await expect(getPremiumRateByRiskClass(7)).resolves.toBeNull()
    expect(mockedGet.mock.calls[0][0]).toBe(
      '/ia-standard/risk-class-premium-rates/by-risk-class/7',
    )
  })

  it('returns the rate otherwise and rethrows other errors', async () => {
    mockedGet.mockResolvedValueOnce({ data: { id: 1 } })
    await expect(getPremiumRateByRiskClass(7)).resolves.toEqual({ id: 1 })
    const err = axiosError(500, {})
    mockedGet.mockRejectedValueOnce(err)
    await expect(getPremiumRateByRiskClass(7)).rejects.toBe(err)
  })
})

describe('query params', () => {
  it('sends status, page, size and sort for risk classes', async () => {
    mockedGet.mockResolvedValue({ data: { content: [] } })
    await getRiskClasses({
      status: 'ALL',
      page: 1,
      size: 200,
      sort: 'classNumber,asc',
    })
    expect(mockedGet).toHaveBeenCalledWith('/ia-standard/risk-classes', {
      params: { status: 'ALL', page: 1, size: 200, sort: 'classNumber,asc' },
    })
  })

  it('sends the product filter for accessories', async () => {
    mockedGet.mockResolvedValue({ data: { content: [] } })
    await getAccessories({ product: 'IA_STANDARD', size: 200 })
    expect(mockedGet).toHaveBeenCalledWith('/accessories', {
      params: {
        product: 'IA_STANDARD',
        page: undefined,
        size: 200,
        sort: undefined,
      },
    })
  })

  it('unwraps the paginated proration response', async () => {
    const row = { id: 1, minMonths: 1, maxMonths: 3, coefficient: 0.6 }
    mockedGet.mockResolvedValue({ data: { content: [row], last: true } })
    await expect(getProrations('IA_STANDARD')).resolves.toEqual([row])
    expect(mockedGet).toHaveBeenCalledWith('/proration-coefficients', {
      params: { product: 'IA_STANDARD', size: 100, sort: 'minMonths,asc' },
    })
  })
})
