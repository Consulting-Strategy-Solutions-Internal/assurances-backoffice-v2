// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import type { ReactNode } from 'react'
import type * as SubscriptionsModule from '#/services/subscriptions'
import type { AmendmentDetail } from '#/lib/amendments'
import {
  appliedPaid,
  appliedUnchanged,
  asAmendment,
  awaitingPayment,
  draftIncrease,
  draftRefund,
  draftUnchanged,
  toRefundReceipt,
} from '#/lib/amendments.fixtures'
import { formatFcfa } from '#/lib/utils'
import { AmendmentDetailContent } from './_auth/contrats.modifications_.$amendmentId'

const mocks = vi.hoisted(() => {
  // null = jeu de droits inconnu (rôle sans `iam:read`), comme le vrai hook.
  const initialPermissions = (): Set<string> | null =>
    new Set(['amendment:read-all', 'amendment:validate'])
  return {
    getAmendment: vi.fn(),
    validateAmendment: vi.fn(),
    deleteAmendment: vi.fn(),
    downloadPolicyDocument: vi.fn(),
    downloadReceiptDocument: vi.fn(),
    getSubscription: vi.fn(),
    toastError: vi.fn(),
    toastSuccess: vi.fn(),
    permissions: initialPermissions(),
  }
})

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => options,
  lazyRouteComponent: () => () => null,
  Link: ({ children, search }: { children: ReactNode; search?: unknown }) => (
    <a href="/x" data-search={JSON.stringify(search ?? null)}>
      {children}
    </a>
  ),
}))

vi.mock('sonner', () => ({
  toast: { error: mocks.toastError, success: mocks.toastSuccess },
}))

vi.mock('#/services/amendments', () => ({
  amendmentsKeys: {
    all: ['amendments'],
    list: (filters: unknown) => ['amendments', 'list', filters],
    detail: (id: number) => ['amendments', 'detail', id],
  },
  getAmendment: mocks.getAmendment,
  validateAmendment: mocks.validateAmendment,
  deleteAmendment: mocks.deleteAmendment,
  downloadPolicyDocument: mocks.downloadPolicyDocument,
  downloadReceiptDocument: mocks.downloadReceiptDocument,
}))

vi.mock('#/services/subscriptions', async (importActual) => ({
  ...(await importActual<typeof SubscriptionsModule>()),
  getSubscription: mocks.getSubscription,
}))

vi.mock('#/components/dashboard/use-permissions', () => ({
  usePermissions: () => ({
    permissions: mocks.permissions,
    // Sémantique du vrai `usePermissions` : inconnu ⇒ can() vrai, canKnown() faux.
    can: (code: string) =>
      mocks.permissions === null || mocks.permissions.has(code),
    canKnown: (code: string) => mocks.permissions?.has(code) === true,
  }),
}))

/** Erreur de téléchargement telle que les services la relèvent : corps JSON déjà lu. */
const blobError = (status: number, message: string) => ({
  isAxiosError: true,
  response: { status, data: { status, message } },
})

function renderDetail(detail: AmendmentDetail) {
  mocks.getAmendment.mockResolvedValue(detail)
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <AmendmentDetailContent amendmentId={detail.id} />
    </QueryClientProvider>,
  )
}

/** Clique le bouton d'action de l'en-tête, puis le bouton de la confirmation. */
async function confirmAction(header: string, confirm = header) {
  fireEvent.click(await screen.findByRole('button', { name: header }))
  const dialog = await screen.findByRole('alertdialog')
  fireEvent.click(within(dialog).getByRole('button', { name: confirm }))
}

beforeEach(() => {
  mocks.permissions = new Set(['amendment:read-all', 'amendment:validate'])
  mocks.getSubscription.mockResolvedValue({ id: 402, clientId: 12 })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('AmendmentDetailContent — validation', () => {
  it('UNCHANGED: confirms the immediate application, then shows APPLIED', async () => {
    renderDetail(draftUnchanged)
    fireEvent.click(await screen.findByRole('button', { name: 'Valider' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(dialog.textContent).toContain(
      'L’avenant sera appliqué immédiatement.',
    )

    const applied = { ...appliedUnchanged, amendmentNumber: 1 }
    mocks.validateAmendment.mockResolvedValue(asAmendment(applied))
    mocks.getAmendment.mockResolvedValue(applied)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Valider' }))

    await waitFor(() => expect(mocks.validateAmendment).toHaveBeenCalledWith(1))
    await waitFor(() =>
      expect(mocks.toastSuccess).toHaveBeenCalledWith(
        'Modification appliquée (avenant n° 1).',
      ),
    )
    // Détail rechargé : statut Appliquée, plus de bouton Valider.
    await waitFor(() => expect(screen.getByText('Appliquée')).toBeTruthy())
    expect(screen.queryByRole('button', { name: 'Valider' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Avenant n° 1' })).toBeTruthy()
  })

  it('REFUND: applied with a TO_REFUND receipt, refund announced', async () => {
    renderDetail(draftRefund)
    fireEvent.click(await screen.findByRole('button', { name: 'Valider' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(dialog.textContent).toContain(
      `une ristourne de ${formatFcfa(8000)} sera à rembourser au client`,
    )

    const applied: AmendmentDetail = {
      ...draftRefund,
      status: 'APPLIED',
      amendmentNumber: 2,
      receipt: toRefundReceipt,
    }
    mocks.validateAmendment.mockResolvedValue(asAmendment(applied))
    mocks.getAmendment.mockResolvedValue(applied)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Valider' }))

    await waitFor(() =>
      expect(mocks.toastSuccess).toHaveBeenCalledWith(
        `Modification appliquée (avenant n° 2). Ristourne de ${formatFcfa(8000)} à rembourser au client.`,
      ),
    )
    expect(await screen.findByText('À rembourser')).toBeTruthy()
    expect(screen.getByText('Q-2026-000011')).toBeTruthy()
    expect(screen.getByText('Ristourne')).toBeTruthy()
  })

  it('INCREASE: goes to AWAITING_PAYMENT with a TO_PAY receipt', async () => {
    renderDetail(draftIncrease)
    fireEvent.click(await screen.findByRole('button', { name: 'Valider' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(dialog.textContent).toContain(
      `Une quittance de ${formatFcfa(12345)} sera envoyée au client.`,
    )

    // Le serveur recalcule : son montant fait foi, pas l'estimation affichée.
    const validated: AmendmentDetail = {
      ...awaitingPayment,
      receipt: { ...awaitingPayment.receipt!, total: 12000 },
    }
    mocks.validateAmendment.mockResolvedValue(asAmendment(validated))
    mocks.getAmendment.mockResolvedValue(validated)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Valider' }))

    await waitFor(() =>
      expect(mocks.toastSuccess).toHaveBeenCalledWith(
        `Quittance de ${formatFcfa(12000)} envoyée au client : le contrat changera après son paiement.`,
      ),
    )
    expect(await screen.findByText('À payer')).toBeTruthy()
    expect(
      screen.getAllByText('En attente de paiement').length,
    ).toBeGreaterThan(0)
    // AWAITING_PAYMENT : plus de validation, suppression encore possible.
    expect(screen.queryByRole('button', { name: 'Valider' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Supprimer' })).toBeTruthy()
  })

  it('422 AMENDMENT_NOT_DRAFT: shows the message and refetches the detail', async () => {
    renderDetail(draftUnchanged)
    mocks.validateAmendment.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 422,
        data: { errors: { status: 'AMENDMENT_NOT_DRAFT' } },
      },
    })
    mocks.getAmendment.mockClear()
    mocks.getAmendment.mockResolvedValue(appliedUnchanged)

    await confirmAction('Valider')

    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith(
        'Cette modification a déjà été traitée.',
      ),
    )
    await waitFor(() => expect(mocks.getAmendment).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByText('Appliquée')).toBeTruthy())
    expect(screen.queryByRole('button', { name: 'Valider' })).toBeNull()
  })
})

describe('AmendmentDetailContent — deletion', () => {
  it('warns that the receipt will be cancelled, then shows it cancelled after refetch', async () => {
    renderDetail(awaitingPayment)
    fireEvent.click(await screen.findByRole('button', { name: 'Supprimer' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(dialog.textContent).toContain(
      'La quittance sera annulée et le client ne pourra plus la payer.',
    )

    const deleted: AmendmentDetail = {
      ...awaitingPayment,
      status: 'DELETED',
      deletedAt: '2026-09-30T10:00:00',
      receipt: { ...awaitingPayment.receipt!, status: 'CANCELLED' },
    }
    mocks.deleteAmendment.mockResolvedValue(undefined)
    mocks.getAmendment.mockResolvedValue(deleted)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Supprimer' }))

    await waitFor(() => expect(mocks.deleteAmendment).toHaveBeenCalledWith(1))
    expect(await screen.findByText('Annulée')).toBeTruthy()
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Modification supprimée.')
    expect(screen.queryByRole('button', { name: 'Supprimer' })).toBeNull()
  })

  it('deleting a DRAFT carries no receipt warning', async () => {
    renderDetail(draftUnchanged)
    fireEvent.click(await screen.findByRole('button', { name: 'Supprimer' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(dialog.textContent).not.toContain('quittance')
  })
})

describe('AmendmentDetailContent — permissions and status gates', () => {
  it('hides Valider and Supprimer without amendment:validate', async () => {
    mocks.permissions = new Set(['amendment:read-all'])
    renderDetail(draftUnchanged)
    await screen.findByRole('heading', { name: 'IA-2026-000002' })
    expect(screen.queryByRole('button', { name: 'Valider' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Supprimer' })).toBeNull()
  })

  it('keeps the actions visible when the permission set is unknown (server decides)', async () => {
    mocks.permissions = null
    renderDetail(draftUnchanged)
    await screen.findByRole('heading', { name: 'IA-2026-000002' })
    expect(screen.getByRole('button', { name: 'Valider' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Supprimer' })).toBeTruthy()
  })

  it('hides the actions when the permission set is known and lacks the right', async () => {
    mocks.permissions = new Set(['amendment:read-all', 'support:read'])
    renderDetail(draftUnchanged)
    await screen.findByRole('heading', { name: 'IA-2026-000002' })
    expect(screen.queryByRole('button', { name: 'Valider' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Supprimer' })).toBeNull()
  })

  it('offers no action on an APPLIED amendment', async () => {
    renderDetail(appliedUnchanged)
    await screen.findByRole('heading', { name: 'IA-2026-000002' })
    expect(screen.queryByRole('button', { name: 'Valider' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Supprimer' })).toBeNull()
  })
})

describe('AmendmentDetailContent — content', () => {
  it('shows the before/after comparison for a DRAFT', async () => {
    renderDetail(draftIncrease)
    expect(await screen.findByText('Avant / après')).toBeTruthy()
    expect(screen.getByText('Avant (contrat actuel)')).toBeTruthy()
    expect(screen.getByText('Prime supplémentaire à payer')).toBeTruthy()
  })

  it('hides the comparison for an APPLIED amendment and says what is shown', async () => {
    renderDetail(appliedUnchanged)
    expect(await screen.findByText('Modification demandée')).toBeTruthy()
    expect(screen.queryByText('Avant / après')).toBeNull()
    expect(screen.queryByText('Avant (contrat actuel)')).toBeNull()
    expect(
      screen.getByText(/Voici ce que la modification demandait/),
    ).toBeTruthy()
  })

  it('shows an administrative-change notice when the tariff is unchanged', async () => {
    renderDetail(draftUnchanged)
    expect(
      await screen.findByText(
        'Changement administratif : la prime ne change pas.',
      ),
    ).toBeTruthy()
  })

  it('flags a PAID_NOT_APPLIED receipt in red', async () => {
    renderDetail({
      ...awaitingPayment,
      status: 'DELETED',
      receipt: { ...awaitingPayment.receipt!, status: 'PAID_NOT_APPLIED' },
    })
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('NSIA doit traiter ce paiement')
  })

  it('links the client page when the contract gives a clientId', async () => {
    renderDetail(draftUnchanged)
    // En-tête et carte « Contrat ».
    const links = await screen.findAllByText('KONATÉ Yann', { selector: 'a' })
    expect(links).toHaveLength(2)
  })

  it('shows « Client supprimé » greyed in the header and the Contrat card when clientName is null', async () => {
    renderDetail({ ...draftUnchanged, clientName: null })
    await screen.findByRole('heading', { name: 'IA-2026-000002' })
    const labels = screen.getAllByText('Client supprimé')
    expect(labels).toHaveLength(2)
    for (const label of labels)
      expect(label.className).toContain('text-muted-foreground')
    expect(screen.queryByText('Client inconnu')).toBeNull()
  })

  it('shows the client name without a link when the contract cannot be read', async () => {
    mocks.getSubscription.mockRejectedValue(new Error('403'))
    renderDetail(draftUnchanged)
    await screen.findByRole('heading', { name: 'IA-2026-000002' })
    expect(screen.queryByText('KONATÉ Yann', { selector: 'a' })).toBeNull()
  })
})

describe('AmendmentDetailContent — PDF', () => {
  it('downloads the amendment PDF through an object URL', async () => {
    const createObjectURL = vi.fn(() => 'blob:avenant')
    const revokeObjectURL = vi.fn()
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined)
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    mocks.downloadPolicyDocument.mockResolvedValue(new Blob(['pdf']))
    renderDetail(appliedUnchanged)

    fireEvent.click(await screen.findByRole('button', { name: 'Avenant n° 1' }))

    await waitFor(() => expect(click).toHaveBeenCalled())
    expect(mocks.downloadPolicyDocument).toHaveBeenCalledWith(402, 1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:avenant')
    click.mockRestore()
  })

  it('shows a retry message on 404 (not issued yet)', async () => {
    mocks.downloadPolicyDocument.mockRejectedValue({
      isAxiosError: true,
      response: { status: 404 },
    })
    renderDetail(appliedUnchanged)
    fireEvent.click(await screen.findByRole('button', { name: 'Avenant n° 1' }))

    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toContain(
      'pas encore disponible',
    )
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeTruthy()
  })

  it('offers no retry when the PDF is forbidden (403)', async () => {
    mocks.downloadPolicyDocument.mockRejectedValue({
      isAxiosError: true,
      response: { status: 403 },
    })
    renderDetail(appliedUnchanged)
    fireEvent.click(await screen.findByRole('button', { name: 'Avenant n° 1' }))

    expect((await screen.findByRole('alert')).textContent).toContain(
      'pas le droit',
    )
    expect(screen.queryByRole('button', { name: 'Réessayer' })).toBeNull()
  })

  it('shows a retry message on 404 « policy document not issued yet » (read from the body)', async () => {
    mocks.downloadPolicyDocument.mockRejectedValue(
      blobError(404, 'The policy document is not issued yet'),
    )
    renderDetail(appliedUnchanged)
    fireEvent.click(await screen.findByRole('button', { name: 'Avenant n° 1' }))

    expect((await screen.findByRole('alert')).textContent).toContain(
      'pas encore disponible',
    )
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeTruthy()
  })

  it('says « Contrat introuvable » without retry on 404 « Subscription not found »', async () => {
    mocks.downloadPolicyDocument.mockRejectedValue(
      blobError(404, 'Subscription not found with id: 402'),
    )
    renderDetail(appliedUnchanged)
    fireEvent.click(await screen.findByRole('button', { name: 'Avenant n° 1' }))

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Contrat introuvable',
    )
    expect(screen.queryByRole('button', { name: 'Réessayer' })).toBeNull()
  })

  it('shows a generic message without retry on 400 for the receipt PDF', async () => {
    mocks.downloadReceiptDocument.mockRejectedValue(
      blobError(400, 'Bad request'),
    )
    renderDetail({
      ...draftRefund,
      status: 'APPLIED',
      amendmentNumber: 2,
      receipt: toRefundReceipt,
    })
    fireEvent.click(
      await screen.findByRole('button', { name: 'Télécharger la quittance' }),
    )
    expect((await screen.findByRole('alert')).textContent).toContain('invalide')
    expect(screen.queryByRole('button', { name: 'Réessayer' })).toBeNull()
  })

  it('has no PDF link before an amendment number is assigned', async () => {
    renderDetail(draftUnchanged)
    await screen.findByRole('heading', { name: 'IA-2026-000002' })
    expect(screen.queryByText('Document')).toBeNull()
  })
})

describe('AmendmentDetailContent — receipt PDF', () => {
  const stubDownload = () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined)
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:quittance'),
      revokeObjectURL: vi.fn(),
    })
    return click
  }
  const receiptButton = () =>
    screen.queryByRole('button', { name: 'Télécharger la quittance' })

  it('REFUND validated: the TO_REFUND receipt is downloadable with the right ids', async () => {
    const click = stubDownload()
    mocks.downloadReceiptDocument.mockResolvedValue(new Blob(['pdf']))
    renderDetail(draftRefund)
    fireEvent.click(await screen.findByRole('button', { name: 'Valider' }))
    const dialog = await screen.findByRole('alertdialog')
    const applied: AmendmentDetail = {
      ...draftRefund,
      status: 'APPLIED',
      amendmentNumber: 2,
      receipt: toRefundReceipt,
    }
    mocks.validateAmendment.mockResolvedValue(asAmendment(applied))
    mocks.getAmendment.mockResolvedValue(applied)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Valider' }))

    fireEvent.click(
      await screen.findByRole('button', { name: 'Télécharger la quittance' }),
    )

    await waitFor(() => expect(click).toHaveBeenCalled())
    expect(mocks.downloadReceiptDocument).toHaveBeenCalledWith(
      402,
      'Q-2026-000011',
    )
    click.mockRestore()
  })

  it('INCREASE: no button while the call is unpaid, the button appears once paid', async () => {
    const click = stubDownload()
    mocks.downloadReceiptDocument.mockResolvedValue(new Blob(['pdf']))
    mocks.getAmendment.mockResolvedValue(awaitingPayment)
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    render(
      <QueryClientProvider client={queryClient}>
        <AmendmentDetailContent amendmentId={1} />
      </QueryClientProvider>,
    )

    expect(
      await screen.findByText('PDF disponible après le paiement'),
    ).toBeTruthy()
    expect(receiptButton()).toBeNull()

    // Le client paie : le rechargement renvoie PAID.
    mocks.getAmendment.mockResolvedValue(appliedPaid)
    await queryClient.invalidateQueries({ queryKey: ['amendments'] })

    fireEvent.click(
      await screen.findByRole('button', { name: 'Télécharger la quittance' }),
    )
    await waitFor(() =>
      expect(mocks.downloadReceiptDocument).toHaveBeenCalledWith(
        402,
        'Q-2026-000010',
      ),
    )
    expect(screen.queryByText('PDF disponible après le paiement')).toBeNull()
    click.mockRestore()
  })

  it.each(['CANCELLED', 'PAID_NOT_APPLIED'] as const)(
    '%s: no download button, says there is no PDF',
    async (status) => {
      renderDetail({
        ...awaitingPayment,
        status: 'DELETED',
        receipt: { ...awaitingPayment.receipt!, status },
      })
      expect(
        await screen.findByText('Pas de PDF pour cette quittance'),
      ).toBeTruthy()
      expect(receiptButton()).toBeNull()
    },
  )

  it.each([
    [
      404,
      'The receipt document is not issued yet',
      'Quittance en cours de production',
      true,
    ],
    [404, 'Receipt not found: Q-2026-000011', 'Quittance introuvable', false],
    [404, 'Subscription not found with id: 402', 'Contrat introuvable', false],
    [403, 'Forbidden', 'Accès refusé', false],
    [502, 'Bad gateway', 'Service de documents indisponible', true],
  ])(
    'error %i « %s » shows « %s » (retry: %s)',
    async (status, message, expected, retry) => {
      mocks.downloadReceiptDocument.mockRejectedValue(
        blobError(status, message),
      )
      renderDetail({
        ...draftRefund,
        status: 'APPLIED',
        amendmentNumber: 2,
        receipt: toRefundReceipt,
      })
      fireEvent.click(
        await screen.findByRole('button', { name: 'Télécharger la quittance' }),
      )

      expect((await screen.findByRole('alert')).textContent).toContain(expected)
      expect(!!screen.queryByRole('button', { name: 'Réessayer' })).toBe(retry)
    },
  )

  it('retries the download from the « Réessayer » button', async () => {
    const click = stubDownload()
    mocks.downloadReceiptDocument
      .mockRejectedValueOnce(
        blobError(404, 'The receipt document is not issued yet'),
      )
      .mockResolvedValueOnce(new Blob(['pdf']))
    renderDetail({
      ...draftRefund,
      status: 'APPLIED',
      amendmentNumber: 2,
      receipt: toRefundReceipt,
    })
    fireEvent.click(
      await screen.findByRole('button', { name: 'Télécharger la quittance' }),
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Réessayer' }))

    await waitFor(() => expect(click).toHaveBeenCalled())
    expect(mocks.downloadReceiptDocument).toHaveBeenCalledTimes(2)
    click.mockRestore()
  })
})

describe('AmendmentDetailContent — header and back link', () => {
  it('shows the avenant number only when assigned, never the technical id as a « n° »', async () => {
    renderDetail(appliedUnchanged)
    await screen.findByRole('heading', { name: 'IA-2026-000002' })
    expect(screen.getByText(/Avenant n° 1 ·/)).toBeTruthy()
    expect(screen.queryByText(/Modification n°/)).toBeNull()
  })

  it('has no avenant number for a DRAFT', async () => {
    renderDetail(draftUnchanged)
    await screen.findByRole('heading', { name: 'IA-2026-000002' })
    expect(screen.queryByText(/Avenant n° \d+ ·/)).toBeNull()
  })

  it('goes back to the list view the user came from, DRAFT tab by default', async () => {
    const queryClient = new QueryClient()
    mocks.getAmendment.mockResolvedValue(appliedUnchanged)
    const back = {
      status: 'APPLIED',
      product: 'IA_STANDARD',
      page: 2,
      size: 20,
      sort: 'updatedAt,asc',
    } as const
    const { unmount } = render(
      <QueryClientProvider client={queryClient}>
        <AmendmentDetailContent amendmentId={1} backSearch={back} />
      </QueryClientProvider>,
    )
    const link = (await screen.findByText('Retour aux modifications')).closest(
      'a',
    )
    expect(JSON.parse(link?.dataset.search ?? 'null')).toEqual(back)
    unmount()

    renderDetail(appliedUnchanged)
    const direct = (
      await screen.findByText('Retour aux modifications')
    ).closest('a')
    expect(JSON.parse(direct?.dataset.search ?? 'null')).toMatchObject({
      status: 'DRAFT',
      page: 0,
    })
  })
})

describe('AmendmentDetailContent — load errors', () => {
  it('keeps the list view in the « Retour » link of the error card', async () => {
    mocks.getAmendment.mockRejectedValue({
      isAxiosError: true,
      response: { status: 404 },
    })
    const back = {
      status: 'DELETED',
      page: 1,
      size: 20,
      sort: 'createdAt,asc',
    } as const
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AmendmentDetailContent amendmentId={99} backSearch={back} />
      </QueryClientProvider>,
    )
    const link = (await screen.findByText('Retour aux modifications')).closest(
      'a',
    )
    expect(JSON.parse(link?.dataset.search ?? 'null')).toEqual(back)
  })

  it('shows « introuvable » on 404', async () => {
    mocks.getAmendment.mockRejectedValue({
      isAxiosError: true,
      response: { status: 404 },
    })
    const queryClient = new QueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <AmendmentDetailContent amendmentId={99} />
      </QueryClientProvider>,
    )
    expect(await screen.findByText('Modification introuvable')).toBeTruthy()
  })
})
