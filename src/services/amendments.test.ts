// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '#/lib/api'
import {
  mapPolicyDocumentError,
  mapReceiptDocumentError,
} from '#/lib/amendments'
import {
  downloadPolicyDocument,
  downloadReceiptDocument,
} from '#/services/amendments'

/** Erreur axios d'une requête `responseType: 'blob'` : le corps JSON arrive en Blob. */
const blobError = (status: number, message: string) => ({
  isAxiosError: true,
  response: {
    status,
    data: new Blob([JSON.stringify({ status, message })], {
      type: 'application/json',
    }),
  },
})

const caught = async (promise: Promise<unknown>) => {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error('expected a rejection')
}

afterEach(() => vi.restoreAllMocks())

describe('download services read the blob error body', () => {
  it('receipt: « Receipt not found » becomes « Quittance introuvable »', async () => {
    const get = vi
      .spyOn(api, 'get')
      .mockRejectedValue(blobError(404, 'Receipt not found: Q-2026-000011'))
    const error = await caught(downloadReceiptDocument(402, 'Q-2026-000011'))
    expect(get).toHaveBeenCalledWith(
      '/subscriptions/402/receipts/Q-2026-000011/document',
      { responseType: 'blob' },
    )
    expect(mapReceiptDocumentError(error).message).toBe(
      'Quittance introuvable.',
    )
  })

  it('receipt: URL-encodes the receipt number', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: new Blob() })
    await downloadReceiptDocument(402, 'Q 1/2')
    expect(get).toHaveBeenCalledWith(
      '/subscriptions/402/receipts/Q%201%2F2/document',
      { responseType: 'blob' },
    )
  })

  it('policy: « Subscription not found » becomes « Contrat introuvable »', async () => {
    vi.spyOn(api, 'get').mockRejectedValue(
      blobError(404, 'Subscription not found with id: 1'),
    )
    const error = await caught(downloadPolicyDocument(1, 0))
    expect(mapPolicyDocumentError(error)).toEqual({
      retry: false,
      message: 'Contrat introuvable.',
    })
  })
})
