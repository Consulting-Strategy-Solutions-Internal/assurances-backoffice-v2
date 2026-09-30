import { describe, expect, it } from 'vitest'
import { readBlobErrorBody } from './api'

const blobError = (body: string) => ({
  isAxiosError: true,
  response: { status: 404, data: new Blob([body]) },
})

describe('readBlobErrorBody', () => {
  it('replaces the blob body with the parsed ErrorResponse', async () => {
    const error = blobError(
      JSON.stringify({ status: 404, message: 'Receipt not found: Q-1' }),
    )
    const result = (await readBlobErrorBody(error)) as typeof error
    expect(result).toBe(error)
    expect(result.response.data).toEqual({
      status: 404,
      message: 'Receipt not found: Q-1',
    })
  })

  it('keeps the error untouched when the body is not JSON', async () => {
    const error = blobError('<html>Bad gateway</html>')
    const result = (await readBlobErrorBody(error)) as typeof error
    expect(result.response.status).toBe(404)
    expect(result.response.data).toBeInstanceOf(Blob)
  })

  it('passes through errors without a blob body', async () => {
    const plain = new Error('network')
    expect(await readBlobErrorBody(plain)).toBe(plain)
    const json = {
      isAxiosError: true,
      response: { status: 400, data: { message: 'x' } },
    }
    expect(await readBlobErrorBody(json)).toBe(json)
  })
})
