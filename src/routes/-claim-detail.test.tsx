// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import type { ReactNode } from 'react'
import type { ClaimResponse } from '#/services/claims'
import { ClaimDetailContent } from './_auth/sinistres_.$claimId'

const mocks = vi.hoisted(() => ({
  addClaimNote: vi.fn(),
  downloadClaimAttachment: vi.fn(),
  getClaim: vi.fn(),
  transitionClaim: vi.fn(),
  uploadClaimAttachment: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => options,
  lazyRouteComponent: () => () => null,
  Link: ({ children }: { children: ReactNode }) => (
    <a href="/sinistres">{children}</a>
  ),
}))

vi.mock('sonner', () => ({
  toast: { error: mocks.toastError, success: mocks.toastSuccess },
}))

vi.mock('#/services/claims', () => ({
  claimsKeys: {
    all: ['claims'],
    detail: (id: number) => ['claim', id],
  },
  addClaimNote: mocks.addClaimNote,
  downloadClaimAttachment: mocks.downloadClaimAttachment,
  getClaim: mocks.getClaim,
  transitionClaim: mocks.transitionClaim,
  uploadClaimAttachment: mocks.uploadClaimAttachment,
}))

const claim: ClaimResponse = {
  id: 42,
  claimNumber: 'SIN-2026-0042',
  status: 'UNDER_REVIEW',
  subscriptionId: 7,
  clientId: 12,
  clientName: 'Awa Koné',
  claimTypeId: 3,
  claimTypeName: 'Accident',
  occurredOn: '2026-07-20',
  location: 'Abidjan',
  description: 'Description du sinistre',
  productLabel: 'Auto',
  coverageStart: '2026-01-01',
  coverageEnd: '2026-12-31',
  declaredBy: 'CLIENT',
  createdAt: '2026-07-20T10:00:00Z',
  updatedAt: '2026-07-21T10:00:00Z',
  events: [],
  attachments: [],
}

function renderDetail(overrides: Partial<ClaimResponse> = {}) {
  mocks.getClaim.mockResolvedValue({ ...claim, ...overrides })
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <ClaimDetailContent claimId={42} />
    </QueryClientProvider>,
  )
  return queryClient
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('ClaimDetailContent', () => {
  it('validates and trims internal notes before submitting', async () => {
    renderDetail()
    await screen.findByText('SIN-2026-0042')

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter la note' }))
    expect(screen.getByRole('alert').textContent).toBe(
      'Le commentaire est obligatoire.',
    )
    expect(mocks.addClaimNote).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Commentaire de la note interne'), {
      target: { value: '  Analyse interne  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter la note' }))

    await waitFor(() => {
      expect(mocks.addClaimNote).toHaveBeenCalledWith(42, 'Analyse interne')
    })
  })

  it('offers retry text after a storage 502 upload failure', async () => {
    mocks.uploadClaimAttachment.mockRejectedValue({
      isAxiosError: true,
      response: { status: 502 },
    })
    renderDetail()
    await screen.findByText('SIN-2026-0042')

    const file = new File(['%PDF-test'], 'constat.pdf', {
      type: 'application/pdf',
    })
    fireEvent.change(screen.getByLabelText(/PDF, JPEG ou PNG/), {
      target: { files: [file] },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter la pièce' }))

    expect(
      await screen.findByText(
        'Service de stockage momentanément indisponible.',
      ),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeTruthy()
  })

  it('downloads an authenticated blob through an object URL and revokes it', async () => {
    const blob = new Blob(['document'], { type: 'application/pdf' })
    const createObjectURL = vi.fn(() => 'blob:claim-document')
    const revokeObjectURL = vi.fn()
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined)
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    mocks.downloadClaimAttachment.mockResolvedValue(blob)
    renderDetail({
      attachments: [
        {
          id: 9,
          name: 'constat.pdf',
          contentType: 'application/pdf',
          sizeBytes: 1024,
          checksumSha256: 'checksum',
          uploadedBy: 'CLIENT',
          createdAt: '2026-07-20T11:00:00Z',
        },
      ],
    })
    await screen.findByText('constat.pdf')

    fireEvent.click(
      screen.getByRole('button', { name: 'Télécharger constat.pdf' }),
    )

    await waitFor(() => {
      expect(mocks.downloadClaimAttachment).toHaveBeenCalledWith(42, 9)
      expect(createObjectURL).toHaveBeenCalledWith(blob)
      expect(click).toHaveBeenCalledOnce()
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:claim-document')
    })
  })

  it('renders null events and attachments as empty collections', async () => {
    renderDetail({ events: null, attachments: null })

    expect(await screen.findByText('Aucune pièce jointe.')).toBeTruthy()
    expect(screen.getByText('Aucun événement.')).toBeTruthy()
  })

  it('reviews a submitted claim then refetches the detail and invalidates lists', async () => {
    mocks.transitionClaim.mockResolvedValue({
      ...claim,
      status: 'UNDER_REVIEW',
    })
    const queryClient = renderDetail({ status: 'SUBMITTED' })
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    await screen.findByText('SIN-2026-0042')

    fireEvent.click(screen.getByRole('button', { name: 'Prendre en charge' }))
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Prendre en charge' }).at(-1)!,
    )

    await waitFor(() => {
      expect(mocks.transitionClaim).toHaveBeenCalledWith(42, 'review', {
        comment: undefined,
      })
      expect(mocks.getClaim.mock.calls.length).toBeGreaterThan(1)
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['claims'] })
    })
  })

  it('refetches the server status after uploading from INFO_REQUESTED', async () => {
    mocks.getClaim
      .mockResolvedValueOnce({ ...claim, status: 'INFO_REQUESTED' })
      .mockResolvedValue({ ...claim, status: 'UNDER_REVIEW' })
    mocks.uploadClaimAttachment.mockResolvedValue({ id: 11 })
    renderDetail()
    await screen.findByText('Pièces demandées')

    const file = new File(['%PDF-test'], 'réponse.pdf', {
      type: 'application/pdf',
    })
    fireEvent.change(screen.getByLabelText(/PDF, JPEG ou PNG/), {
      target: { files: [file] },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter la pièce' }))

    expect(await screen.findByText('En instruction')).toBeTruthy()
    expect(mocks.getClaim.mock.calls.length).toBeGreaterThan(1)
  })
})
