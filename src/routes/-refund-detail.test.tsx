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
import type { NotificationResponse } from '#/services/notifications'
import {
  RefundDetailContent,
  RefundGate,
} from './_auth/remboursements_.$refundId'

const mocks = vi.hoisted(() => ({
  getRecentNotifications: vi.fn(),
  setRefundDestination: vi.fn(),
  toastSuccess: vi.fn(),
  permissions: null as Set<string> | null,
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => options,
  lazyRouteComponent: () => () => null,
  Link: ({ children }: { children: ReactNode }) => <a href="/x">{children}</a>,
}))

vi.mock('sonner', () => ({
  toast: { success: mocks.toastSuccess, error: vi.fn() },
}))

vi.mock('#/services/refunds', () => ({
  refundKeys: { alerts: ['refunds', 'alerts'] },
  getRecentNotifications: mocks.getRecentNotifications,
  setRefundDestination: mocks.setRefundDestination,
}))

vi.mock('#/components/dashboard/use-permissions', () => ({
  usePermissions: () => ({
    permissions: mocks.permissions,
    can: (code: string) =>
      mocks.permissions === null || mocks.permissions.has(code),
    canKnown: (code: string) => mocks.permissions?.has(code) === true,
  }),
}))

function axiosError(status: number, data: unknown) {
  return { isAxiosError: true, response: { status, data } }
}

function alert(
  body: string,
  overrides: Partial<NotificationResponse> = {},
): NotificationResponse {
  return {
    id: 50,
    type: 'REFUND_ATTENTION',
    title: 'Remboursement à traiter',
    body,
    resourceType: 'REFUND_REQUEST',
    resourceId: 12,
    read: true,
    createdAt: '2026-10-12T10:15:00',
    ...overrides,
  }
}

const AWAITING =
  'Le remboursement RF-12 de 45 250 F CFA attend un numéro de remboursement : le numéro payeur est illisible.'

function renderPage(refundId = 12) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const page = (id: number) => (
    <QueryClientProvider client={queryClient}>
      <RefundDetailContent refundId={id} />
    </QueryClientProvider>
  )
  const { rerender } = render(page(refundId))
  return { showRefund: (id: number) => rerender(page(id)) }
}

function fill(operator: string, number: string) {
  fireEvent.click(screen.getByRole('radio', { name: operator }))
  fireEvent.change(screen.getByLabelText(/Numéro de remboursement/), {
    target: { value: number },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le numéro' }))
}

beforeEach(() => {
  mocks.permissions = new Set(['withdrawal:read', 'withdrawal:write'])
  mocks.getRecentNotifications.mockResolvedValue([alert(AWAITING)])
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Page remboursement (AC-12)', () => {
  it('référence, texte de l’alerte tel quel et aide-mémoire', async () => {
    renderPage()
    expect(await screen.findByText(AWAITING)).toBeTruthy()
    expect(screen.getByText('Remboursement RF-12')).toBeTruthy()
    const help = screen
      .getByText('Que faire selon la cause')
      .closest('[data-slot="card"]') as HTMLElement
    expect(within(help).getByText(/plafond FineoPay/)).toBeTruthy()
    expect(
      within(help).getByText(/aucun fournisseur de versement réel/i),
    ).toBeTruthy()
  })

  it('alerte introuvable : le dit, le formulaire reste proposé', async () => {
    mocks.getRecentNotifications.mockResolvedValue([
      alert(AWAITING, { resourceId: 99 }),
    ])
    renderPage()
    expect(await screen.findByText(/Alerte introuvable/)).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Enregistrer le numéro' }),
    ).toBeTruthy()
  })

  it('préfixe incohérent : refusé avant l’envoi', async () => {
    renderPage()
    await screen.findByText(AWAITING)
    fill('MTN', '07 12 34 56 78')
    expect(
      await screen.findByText('Un numéro MTN commence par 05.'),
    ).toBeTruthy()
    expect(mocks.setRefundDestination).not.toHaveBeenCalled()
  })

  it('opérateur obligatoire', async () => {
    renderPage()
    await screen.findByText(AWAITING)
    fireEvent.change(screen.getByLabelText(/Numéro de remboursement/), {
      target: { value: '05 44 00 11 22' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'Enregistrer le numéro' }),
    )
    expect(await screen.findByText('Choisissez l’opérateur.')).toBeTruthy()
  })

  it('succès : envoie le numéro normalisé, annonce le nouveau statut', async () => {
    mocks.setRefundDestination.mockResolvedValue({
      id: 12,
      reference: 'RF-12',
      amount: 45250,
      currency: 'XOF',
      status: 'REQUESTED',
      operator: 'MTN',
      destination: '+2250544001122',
    })
    renderPage()
    await screen.findByText(AWAITING)
    fill('MTN', '05 44 00 11 22')
    await waitFor(() =>
      expect(mocks.setRefundDestination).toHaveBeenCalledWith(12, {
        operator: 'MTN',
        destination: '+2250544001122',
      }),
    )
    expect(await screen.findByText(/le versement repart/)).toBeTruthy()
    expect(mocks.toastSuccess).toHaveBeenCalled()
  })

  it('422 REFUND_INVALID_STATUS : n’attend pas de numéro', async () => {
    mocks.setRefundDestination.mockRejectedValue(
      axiosError(422, { errors: { status: 'REFUND_INVALID_STATUS' } }),
    )
    renderPage()
    await screen.findByText(AWAITING)
    fill('Wave', '07 12 34 56 78')
    expect(
      await screen.findByText('Ce remboursement n’attend pas de numéro.'),
    ).toBeTruthy()
  })

  it('422 WITHDRAWAL_OPERATOR_MISMATCH : sous le numéro', async () => {
    mocks.setRefundDestination.mockRejectedValue(
      axiosError(422, {
        errors: { destination: 'WITHDRAWAL_OPERATOR_MISMATCH' },
      }),
    )
    renderPage()
    await screen.findByText(AWAITING)
    fill('Orange', '07 12 34 56 78')
    expect(
      await screen.findByText(
        'Le préfixe du numéro ne correspond pas à l’opérateur.',
      ),
    ).toBeTruthy()
  })

  it('sans withdrawal:write (connu) : pas de formulaire', async () => {
    mocks.permissions = new Set(['withdrawal:read'])
    renderPage()
    await screen.findByText(AWAITING)
    expect(
      screen.queryByRole('button', { name: 'Enregistrer le numéro' }),
    ).toBeNull()
    expect(screen.getByText(/droit de saisir le numéro/)).toBeTruthy()
  })

  it('droits inconnus (null) : formulaire proposé (L-009)', async () => {
    mocks.permissions = null
    renderPage()
    await screen.findByText(AWAITING)
    expect(
      screen.getByRole('button', { name: 'Enregistrer le numéro' }),
    ).toBeTruthy()
  })
})

describe('R1-2 : un autre remboursement repart d’un formulaire vierge (L-013)', () => {
  it('le bandeau « enregistré » et la saisie ne passent pas à RF-13', async () => {
    mocks.setRefundDestination.mockResolvedValue({
      id: 12,
      reference: 'RF-12',
      amount: 45250,
      currency: 'XOF',
      status: 'REQUESTED',
      operator: 'MTN',
      destination: '+2250544001122',
    })
    const { showRefund } = renderPage(12)
    await screen.findByText(AWAITING)
    fill('MTN', '05 44 00 11 22')
    expect(await screen.findByText(/le versement repart/)).toBeTruthy()
    showRefund(13)
    expect(await screen.findByText('Remboursement RF-13')).toBeTruthy()
    expect(screen.queryByText(/Numéro enregistré/)).toBeNull()
    const input = screen.getByLabelText<HTMLInputElement>(
      /Numéro de remboursement/,
    )
    expect(input.value).toBe('')
  })

  it('une saisie non envoyée pour RF-12 est effacée sur RF-13', async () => {
    const { showRefund } = renderPage(12)
    await screen.findByText(AWAITING)
    fireEvent.change(screen.getByLabelText(/Numéro de remboursement/), {
      target: { value: '05 44 00 11 22' },
    })
    showRefund(13)
    await screen.findByText('Remboursement RF-13')
    expect(
      screen.getByLabelText<HTMLInputElement>(/Numéro de remboursement/).value,
    ).toBe('')
  })
})

describe('R1-10 : garde de la page et retour', () => {
  function renderGate() {
    render(
      <RefundGate>
        <p>contenu</p>
      </RefundGate>,
    )
  }
  it('droits inconnus (null) : la page passe (L-009)', () => {
    mocks.permissions = null
    renderGate()
    expect(screen.getByText('contenu')).toBeTruthy()
  })
  it('withdrawal:read seul : la page passe', () => {
    mocks.permissions = new Set(['withdrawal:read'])
    renderGate()
    expect(screen.getByText('contenu')).toBeTruthy()
  })
  it('aucun droit withdrawal:* connu : droit insuffisant', () => {
    mocks.permissions = new Set(['subscription:read-all'])
    renderGate()
    expect(screen.getByText('Droit insuffisant')).toBeTruthy()
    expect(screen.queryByText('contenu')).toBeNull()
  })
  it('la page propose un retour', async () => {
    renderPage()
    expect(await screen.findByText('Retour au tableau de bord')).toBeTruthy()
  })
})
