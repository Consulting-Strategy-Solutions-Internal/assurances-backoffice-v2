// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, AxiosHeaders } from 'axios'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { travelItem } from '#/lib/travel.fixtures'
import type * as TravelService from '#/services/travel'
import type { TravelSupervisionItem } from '#/services/travel'
import { TravelDecisionPanel } from './TravelDecisionPanel'

const mocks = vi.hoisted(() => ({
  find: vi.fn(),
  attach: vi.fn(),
  retry: vi.fn(),
  refuse: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  // null = jeu de droits inconnu (rôle sans `iam:read`), comme le vrai hook.
  permissions: null as Set<string> | null,
}))

vi.mock('#/services/travel', async (importOriginal) => ({
  ...(await importOriginal<typeof TravelService>()),
  findTravelSupervisionItem: mocks.find,
  attachTravelPolicy: mocks.attach,
  retryTravelIssuance: mocks.retry,
  refuseTravelIssuance: mocks.refuse,
}))

vi.mock('sonner', () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}))

vi.mock('#/components/dashboard/use-permissions', () => ({
  usePermissions: () => ({
    permissions: mocks.permissions,
    can: (code: string) =>
      mocks.permissions === null || mocks.permissions.has(code),
    canKnown: (code: string) => mocks.permissions?.has(code) === true,
  }),
}))

function axiosError(status: number, data: unknown): AxiosError {
  const headers = new AxiosHeaders()
  return new AxiosError('boom', String(status), undefined, undefined, {
    status,
    statusText: '',
    headers,
    config: { headers },
    data,
  })
}

/** reconcilableFrom des fixtures : 13/10/2026 09:30 (Abidjan = UTC). */
const BEFORE = new Date('2026-10-13T09:00:00Z')
const AFTER = new Date('2026-10-13T10:00:00Z')

let queryClient: QueryClient

function renderPanel(item: TravelSupervisionItem | null = travelItem()) {
  mocks.find.mockResolvedValue(item)
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <TravelDecisionPanel subscriptionId={812} />
    </QueryClientProvider>,
  )
}

const button = (name: RegExp | string) => screen.findByRole('button', { name })

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(AFTER)
  mocks.permissions = new Set([
    'subscription:read-all',
    'subscription:reconcile',
  ])
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('TravelDecisionPanel — activation (AC-6)', () => {
  it('cherche la ligne parmi les TO_RECONCILE et rappelle la vérification Cover Edge', async () => {
    renderPanel()
    expect(await screen.findByText(/Avant de décider/)).toBeTruthy()
    expect(screen.getByText(/nom, passeport, dates, prime/)).toBeTruthy()
    expect(mocks.find).toHaveBeenCalledWith(812, 'TO_RECONCILE')
  })

  it('droit présent, après reconcilableFrom : les trois boutons sont actifs', async () => {
    renderPanel()
    for (const name of ['Rattacher une police', 'Relancer', 'Refuser']) {
      expect((await button(name)).hasAttribute('disabled')).toBe(false)
    }
  })

  it('avant reconcilableFrom : boutons désactivés et date affichée', async () => {
    vi.setSystemTime(BEFORE)
    renderPanel()
    expect(
      await screen.findByText(/Décision possible à partir du 13 oct\. 2026/),
    ).toBeTruthy()
    for (const name of ['Rattacher une police', 'Relancer', 'Refuser']) {
      expect((await button(name)).hasAttribute('disabled')).toBe(true)
    }
  })

  it('droits inconnus (null) : boutons proposés, le serveur tranche (L-009)', async () => {
    mocks.permissions = null
    renderPanel()
    expect(await button('Relancer')).toBeTruthy()
  })

  it('droit connu et absent (MANAGER) : aucun bouton, mention ADMIN', async () => {
    mocks.permissions = new Set(['subscription:read-all'])
    renderPanel()
    expect(await screen.findByText(/réservée à l’administration/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Relancer' })).toBeNull()
  })

  it('plafond de renvois : aide « vérifier la configuration EVO »', async () => {
    renderPanel(
      travelItem({
        evoIssuanceAttempts: 5,
        evoLastError: 'Gave up after 5 attempts (max 5): HTTP 401',
      }),
    )
    expect(
      await screen.findByText(
        /Vérifiez la configuration EVO avant de relancer/,
      ),
    ).toBeTruthy()
  })

  it('ligne introuvable : le dit, sans bouton', async () => {
    renderPanel(null)
    expect(
      await screen.findByText(/introuvable dans la supervision/),
    ).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Relancer' })).toBeNull()
  })

  it('liste refusée (403) : droit insuffisant', async () => {
    mocks.find.mockRejectedValue(axiosError(403, {}))
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    render(
      <QueryClientProvider client={queryClient}>
        <TravelDecisionPanel subscriptionId={812} />
      </QueryClientProvider>,
    )
    expect(await screen.findByText(/Droit insuffisant/)).toBeTruthy()
  })
})

describe('Rattacher (AC-7)', () => {
  async function openAttach() {
    renderPanel()
    fireEvent.click(await button('Rattacher une police'))
    return screen.getByRole('dialog')
  }

  it('identifiant obligatoire, puis envoi ; succès → toast', async () => {
    mocks.attach.mockResolvedValue(
      travelItem({ evoIssuanceStatus: 'ISSUED', reconcilableFrom: null }),
    )
    const dialog = await openAttach()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Rattacher' }))
    expect(
      await within(dialog).findByText(
        'Saisissez l’identifiant de la police EVO.',
      ),
    ).toBeTruthy()
    expect(mocks.attach).not.toHaveBeenCalled()
    fireEvent.change(
      within(dialog).getByLabelText(/Identifiant de la police/),
      {
        target: { value: '  POL-9  ' },
      },
    )
    fireEvent.click(within(dialog).getByRole('button', { name: 'Rattacher' }))
    await waitFor(() => expect(mocks.attach).toHaveBeenCalledWith(812, 'POL-9'))
    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalled())
  })

  it('TRAVEL_POLICY_MISMATCH : le message du serveur sous le champ', async () => {
    mocks.attach.mockRejectedValue(
      axiosError(422, {
        message: 'Coverage dates differ',
        errors: { policyId: 'TRAVEL_POLICY_MISMATCH' },
      }),
    )
    const dialog = await openAttach()
    fireEvent.change(
      within(dialog).getByLabelText(/Identifiant de la police/),
      {
        target: { value: 'POL-9' },
      },
    )
    fireEvent.click(within(dialog).getByRole('button', { name: 'Rattacher' }))
    expect(
      await within(dialog).findByText(
        'Cette police n’est pas celle du contrat : Coverage dates differ',
      ),
    ).toBeTruthy()
  })

  it('R1-4 : police inconnue (500) → sous le champ', async () => {
    mocks.attach.mockRejectedValue(axiosError(500, {}))
    const dialog = await openAttach()
    fireEvent.change(
      within(dialog).getByLabelText(/Identifiant de la police/),
      {
        target: { value: 'POL-404' },
      },
    )
    fireEvent.click(within(dialog).getByRole('button', { name: 'Rattacher' }))
    expect(
      await within(dialog).findByText(/EVO ne reconnaît pas cet identifiant/),
    ).toBeTruthy()
  })

  it('502 : EVO ne répond pas', async () => {
    mocks.attach.mockRejectedValue(axiosError(502, {}))
    const dialog = await openAttach()
    fireEvent.change(
      within(dialog).getByLabelText(/Identifiant de la police/),
      {
        target: { value: 'POL-9' },
      },
    )
    fireEvent.click(within(dialog).getByRole('button', { name: 'Rattacher' }))
    expect(await within(dialog).findByText(/EVO ne répond pas/)).toBeTruthy()
  })

  it('TRAVEL_NOT_TO_RECONCILE : ferme, recharge, prévient', async () => {
    mocks.attach.mockRejectedValue(
      axiosError(422, {
        errors: { subscriptionId: 'TRAVEL_NOT_TO_RECONCILE' },
      }),
    )
    const dialog = await openAttach()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    fireEvent.change(
      within(dialog).getByLabelText(/Identifiant de la police/),
      {
        target: { value: 'POL-9' },
      },
    )
    fireEvent.click(within(dialog).getByRole('button', { name: 'Rattacher' }))
    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith(
        'Ce contrat n’est plus à trancher : ses données ont été rechargées.',
      ),
    )
    expect(invalidate).toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
})

describe('R1-5 : après une décision', () => {
  it('relit aussi les contrats de la fiche client', async () => {
    mocks.retry.mockResolvedValue(travelItem({ evoIssuanceStatus: 'SENDING' }))
    renderPanel()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    fireEvent.click(await button('Relancer'))
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Relancer l’émission',
      }),
    )
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: ['subscriptions', 'all'],
      }),
    )
  })
})

describe('Relancer (AC-8)', () => {
  it('confirmation puis envoi', async () => {
    mocks.retry.mockResolvedValue(travelItem({ evoIssuanceStatus: 'SENDING' }))
    renderPanel()
    fireEvent.click(await button('Relancer'))
    const dialog = screen.getByRole('alertdialog')
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Relancer l’émission' }),
    )
    await waitFor(() => expect(mocks.retry).toHaveBeenCalledWith(812))
    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalled())
  })

  it('TRAVEL_QUOTE_EXPIRED : propose de refuser', async () => {
    mocks.retry.mockRejectedValue(
      axiosError(422, { errors: { subscriptionId: 'TRAVEL_QUOTE_EXPIRED' } }),
    )
    renderPanel()
    fireEvent.click(await button('Relancer'))
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Relancer l’émission',
      }),
    )
    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith(
        'Le devis EVO a expiré : refusez l’émission.',
      ),
    )
  })

  it('TRAVEL_RECONCILIATION_TOO_EARLY', async () => {
    mocks.retry.mockRejectedValue(
      axiosError(422, {
        errors: { subscriptionId: 'TRAVEL_RECONCILIATION_TOO_EARLY' },
      }),
    )
    renderPanel()
    fireEvent.click(await button('Relancer'))
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Relancer l’émission',
      }),
    )
    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith(
        'Décision pas encore possible : attendez l’heure indiquée.',
      ),
    )
  })
})

describe('Refuser (AC-9)', () => {
  it('motif obligatoire, puis confirmation explicite avant l’envoi', async () => {
    mocks.refuse.mockResolvedValue(
      travelItem({ evoIssuanceStatus: 'REJECTED', status: 'CANCELLED' }),
    )
    renderPanel()
    fireEvent.click(await button('Refuser'))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Continuer' }))
    expect(
      await within(dialog).findByText('Indiquez ce qui a été vérifié.'),
    ).toBeTruthy()
    fireEvent.change(within(dialog).getByLabelText(/Ce qui a été vérifié/), {
      target: { value: 'Cover Edge : aucune police, devis expiré' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Continuer' }))
    const confirm = await screen.findByRole('alertdialog')
    expect(within(confirm).getByText(/irréversible/)).toBeTruthy()
    expect(mocks.refuse).not.toHaveBeenCalled()
    fireEvent.click(
      within(confirm).getByRole('button', { name: 'Refuser définitivement' }),
    )
    await waitFor(() =>
      expect(mocks.refuse).toHaveBeenCalledWith(
        812,
        'Cover Edge : aucune police, devis expiré',
      ),
    )
    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalled())
  })

  it('motif au-delà de 400 caractères : refusé avant l’envoi (L-011)', async () => {
    renderPanel()
    fireEvent.click(await button('Refuser'))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(/Ce qui a été vérifié/), {
      target: { value: 'x'.repeat(401) },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Continuer' }))
    expect(
      await within(dialog).findByText(/400 caractères au plus/),
    ).toBeTruthy()
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('403 : droit insuffisant', async () => {
    mocks.refuse.mockRejectedValue(axiosError(403, {}))
    renderPanel()
    fireEvent.click(await button('Refuser'))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(/Ce qui a été vérifié/), {
      target: { value: 'Vérifié' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Continuer' }))
    fireEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'Refuser définitivement',
      }),
    )
    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith('Droit insuffisant.'),
    )
  })
})
