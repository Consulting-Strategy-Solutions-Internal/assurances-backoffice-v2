// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  downloadPolicyDocument,
  downloadReceiptDocument,
  getAllAppliedAmendments,
} from '#/services/amendments'
import type * as AmendmentsService from '#/services/amendments'
import {
  getSubscription,
  getSubscriptionRenewal,
} from '#/services/subscriptions'
import type * as SubscriptionsService from '#/services/subscriptions'
import type { SubscriptionDetailResponse } from '#/services/subscriptions'
import { ContractDrawer } from './ContractDrawer'

vi.mock('#/services/subscriptions', async (importOriginal) => ({
  ...(await importOriginal<typeof SubscriptionsService>()),
  getSubscription: vi.fn(),
  getSubscriptionRenewal: vi.fn(),
}))
vi.mock('#/services/amendments', async (importOriginal) => ({
  ...(await importOriginal<typeof AmendmentsService>()),
  downloadPolicyDocument: vi.fn(),
  downloadReceiptDocument: vi.fn(),
  getAllAppliedAmendments: vi.fn(),
}))

const signedContract: SubscriptionDetailResponse = {
  id: 7,
  clientId: 2,
  status: 'ACTIVE',
  policyNumber: 'IA-2026-000042',
  amendmentNumber: 1,
  signed: true,
  identityDocuments: [
    { type: 'NATIONAL_ID', front: true, back: true },
    { type: 'PASSPORT', front: true, back: false },
  ],
  policyDocumentId: 55,
  productSnapshot: { productLabel: 'IA Standard' },
}

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

function renderDrawer(id: number | null = 7) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const onClose = vi.fn()
  render(
    <QueryClientProvider client={client}>
      <ContractDrawer subscriptionId={id} onClose={onClose} />
    </QueryClientProvider>,
  )
  return onClose
}

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:x')
  URL.revokeObjectURL = vi.fn()
  vi.mocked(getSubscription).mockResolvedValue(signedContract)
  vi.mocked(getSubscriptionRenewal).mockResolvedValue(null)
  vi.mocked(getAllAppliedAmendments).mockResolvedValue({
    items: [],
    total: 0,
    capped: false,
  })
})
afterEach(cleanup)

describe('ContractDrawer', () => {
  it('AC-2 : signature et pièces d’identité fournies', async () => {
    renderDrawer()
    const section = (
      await screen.findByText('Signature et pièces d’identité')
    ).closest('section') as HTMLElement
    expect(within(section).getByText('Signé')).toBeTruthy()
    expect(
      within(section).getByText('Carte nationale d’identité — recto et verso'),
    ).toBeTruthy()
    expect(
      within(section).getByText('Passeport — recto seulement'),
    ).toBeTruthy()
    expect(
      within(section).getByText(/réservées au client et à son vendeur/),
    ).toBeTruthy()
  })

  it('AC-2 : contrat non signé, sans pièce', async () => {
    vi.mocked(getSubscription).mockResolvedValue({
      ...signedContract,
      signed: false,
      identityDocuments: [],
    })
    renderDrawer()
    expect(await screen.findByText('Non signé')).toBeTruthy()
    expect(screen.getByText('Aucune pièce fournie')).toBeTruthy()
  })

  it('AC-3 : télécharge la police et chaque avenant', async () => {
    vi.mocked(downloadPolicyDocument).mockResolvedValue(new Blob(['%PDF']))
    renderDrawer()
    fireEvent.click(
      await screen.findByRole('button', { name: 'Télécharger Police' }),
    )
    await waitFor(() =>
      expect(downloadPolicyDocument).toHaveBeenCalledWith(7, 0),
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Télécharger Avenant n° 1' }),
    )
    await waitFor(() =>
      expect(downloadPolicyDocument).toHaveBeenCalledWith(7, 1),
    )
  })

  it('AC-3 : erreur lisible sous le document', async () => {
    vi.mocked(downloadPolicyDocument).mockRejectedValue(
      axiosError(404, {
        status: 404,
        message: 'The policy document is not issued yet',
      }),
    )
    renderDrawer()
    fireEvent.click(
      await screen.findByRole('button', { name: 'Télécharger Police' }),
    )
    expect(await screen.findByText(/pas encore disponible/i)).toBeTruthy()
  })

  it('AC-3 : police pas encore émise', async () => {
    vi.mocked(getSubscription).mockResolvedValue({
      ...signedContract,
      status: 'PENDING_PAYMENT',
      policyNumber: null,
      amendmentNumber: 0,
      policyDocumentId: null,
    })
    renderDrawer()
    expect(
      await screen.findByText(/émise après le paiement et la signature/),
    ).toBeTruthy()
    expect(
      screen.queryByRole('button', { name: /Télécharger Police/ }),
    ).toBeNull()
  })

  it('AC-4 : quittances de ce contrat (modification appliquée + renouvellement)', async () => {
    vi.mocked(getAllAppliedAmendments).mockResolvedValue({
      items: [
        {
          id: 3,
          subscriptionId: 7,
          status: 'APPLIED',
          receipt: {
            receiptNumber: 'Q-2026-000010',
            kind: 'REFUND',
            status: 'TO_REFUND',
            total: -5000,
          },
        },
        {
          id: 4,
          subscriptionId: 99,
          status: 'APPLIED',
          receipt: {
            receiptNumber: 'Q-OTHER',
            kind: 'REFUND',
            status: 'TO_REFUND',
            total: -1,
          },
        },
      ] as never,
      total: 2,
      capped: false,
    })
    vi.mocked(getSubscriptionRenewal).mockResolvedValue({
      id: 1,
      subscriptionId: 7,
      status: 'PAID',
      receipt: {
        receiptNumber: 'Q-2026-000020',
        status: 'PAID',
        total: 30000,
        documentId: 12,
      },
    })
    vi.mocked(downloadReceiptDocument).mockResolvedValue(new Blob(['%PDF']))
    renderDrawer()
    const section = (await screen.findByText('Quittances')).closest(
      'section',
    ) as HTMLElement
    await within(section).findByText(/Ristourne — modification n° 3/)
    expect(within(section).getByText('Renouvellement')).toBeTruthy()
    expect(within(section).queryByText(/Q-OTHER/)).toBeNull()
    fireEvent.click(
      within(section).getByRole('button', {
        name: 'Télécharger la quittance Q-2026-000020',
      }),
    )
    await waitFor(() =>
      expect(downloadReceiptDocument).toHaveBeenCalledWith(7, 'Q-2026-000020'),
    )
  })

  it('AC-4 : aucune quittance disponible', async () => {
    renderDrawer()
    expect(await screen.findByText('Aucune quittance disponible.')).toBeTruthy()
  })

  it('R1-1 : modifications refusées (403, sans amendment:read-all) → la quittance de renouvellement reste, avec une note', async () => {
    vi.mocked(getAllAppliedAmendments).mockRejectedValue(
      axiosError(403, { status: 403, message: 'Access denied' }),
    )
    vi.mocked(getSubscriptionRenewal).mockResolvedValue({
      id: 1,
      subscriptionId: 7,
      status: 'PAID',
      receipt: {
        receiptNumber: 'Q-2026-000020',
        status: 'PAID',
        total: 30000,
        documentId: 12,
      },
    })
    renderDrawer()
    const section = (await screen.findByText('Quittances')).closest(
      'section',
    ) as HTMLElement
    expect(await within(section).findByText('Renouvellement')).toBeTruthy()
    expect(
      within(section).getByText(/droit de consulter les modifications/),
    ).toBeTruthy()
    expect(within(section).queryByText(/Impossible de retrouver/)).toBeNull()
  })

  it('R1-1 : modifications en échec (500) → erreur ciblée, la quittance de renouvellement reste', async () => {
    vi.mocked(getAllAppliedAmendments).mockRejectedValue(axiosError(500, {}))
    vi.mocked(getSubscriptionRenewal).mockResolvedValue({
      id: 1,
      subscriptionId: 7,
      status: 'PAID',
      receipt: {
        receiptNumber: 'Q-2026-000020',
        status: 'PAID',
        total: 30000,
        documentId: 12,
      },
    })
    renderDrawer()
    const section = (await screen.findByText('Quittances')).closest(
      'section',
    ) as HTMLElement
    expect(await within(section).findByText('Renouvellement')).toBeTruthy()
    expect(
      within(section).getByText(
        /Impossible de charger les quittances des modifications/,
      ),
    ).toBeTruthy()
  })

  it('R1-6 : plus de 2 000 modifications appliquées → le signale', async () => {
    vi.mocked(getAllAppliedAmendments).mockResolvedValue({
      items: [],
      total: 2500,
      capped: true,
    })
    renderDrawer()
    expect(
      await screen.findByText(
        /seules les 2 000 modifications les plus récentes/,
      ),
    ).toBeTruthy()
  })
})
