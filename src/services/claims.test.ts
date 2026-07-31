// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '#/lib/api'
import {
  buildAttachmentRequest,
  buildClaimParams,
  getClaims,
  uploadClaimAttachment,
} from '#/services/claims'
import { buildClaimTypeParams } from '#/services/claim-types'

vi.mock('#/lib/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }))

const mockedGet = vi.mocked(api.get)
const mockedPost = vi.mocked(api.post)

beforeEach(() => {
  mockedGet.mockReset()
  mockedPost.mockReset()
})

describe('Spring request construction', () => {
  it('keeps cumulative filters, sorting and caps size at 100', async () => {
    mockedGet.mockResolvedValue({
      data: {
        content: [],
        page: 0,
        size: 100,
        totalElements: 0,
        totalPages: 0,
        last: true,
      },
    })
    const filters = {
      status: 'UNDER_REVIEW' as const,
      clientId: 42,
      claimTypeId: 3,
      page: 2,
      size: 500,
      sort: 'createdAt,desc',
    }
    expect(buildClaimParams(filters)).toEqual({
      status: 'UNDER_REVIEW',
      clientId: 42,
      claimTypeId: 3,
      page: 2,
      size: 100,
      sort: 'createdAt,desc',
    })
    await getClaims(filters)
    expect(mockedGet).toHaveBeenCalledWith('/claims', {
      params: buildClaimParams(filters),
    })
    expect(
      buildClaimTypeParams({ page: 0, size: 101, sort: 'name,asc' }).size,
    ).toBe(100)
  })

  it('uses the multipart file field and sends comment as query parameter', async () => {
    const file = new File(['%PDF'], 'preuve.pdf', { type: 'application/pdf' })
    const request = buildAttachmentRequest(file, '  reçu  ')
    expect(request.data.get('file')).toBe(file)
    expect(request.params).toEqual({ comment: 'reçu' })
    mockedPost.mockResolvedValue({ data: { id: 1 } })
    await uploadClaimAttachment(8, file, 'reçu')
    expect(mockedPost).toHaveBeenCalledWith(
      '/claims/8/attachments',
      expect.any(FormData),
      {
        params: { comment: 'reçu' },
        headers: { 'Content-Type': undefined },
      },
    )
  })
})
