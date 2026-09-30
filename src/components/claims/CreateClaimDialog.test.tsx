// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import type * as SubscriptionsByClient from '#/services/subscriptions-by-client'
import { CreateClaimDialog } from './CreateClaimDialog'

const mocks = vi.hoisted(() => ({
  getAllSubscriptions: vi.fn(),
  getClaimTypes: vi.fn(),
}))

vi.mock('#/components/claims/ClientPicker', () => ({
  ClientPicker: () => <div>picker</div>,
}))
vi.mock('#/services/claim-types', () => ({
  getClaimTypes: mocks.getClaimTypes,
}))
vi.mock('#/services/claims', () => ({
  claimsKeys: { all: ['claims'], detail: (id: number) => ['claim', id] },
  createClaim: vi.fn(),
}))
vi.mock('#/services/subscriptions-by-client', async (importOriginal) => ({
  ...(await importOriginal<typeof SubscriptionsByClient>()),
  getAllSubscriptions: mocks.getAllSubscriptions,
}))

const subscription = (id: number, clientId: number) => ({
  id,
  clientId,
  policyNumber: `POL-${id}`,
  status: 'ACTIVE',
  coverageStart: '2026-01-01',
  coverageEnd: '2026-12-31',
  productSnapshot: { productLabel: 'IA Standard' },
})

function renderDialog() {
  mocks.getClaimTypes.mockResolvedValue({ content: [] })
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <CreateClaimDialog onClose={() => {}} defaultClientId={5} />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('CreateClaimDialog — contrat', () => {
  it('propose la liste des contrats du client quand il en a', async () => {
    mocks.getAllSubscriptions.mockResolvedValue({
      items: [subscription(1, 5), subscription(2, 9)],
      total: 2,
      capped: false,
    })
    renderDialog()
    expect(await screen.findByText('Contrat concerné')).toBeTruthy()
    expect(screen.queryByLabelText(/Identifiant du contrat/)).toBeNull()
  })

  it('bascule sur la saisie manuelle de l’identifiant si le client n’a aucun contrat', async () => {
    mocks.getAllSubscriptions.mockResolvedValue({
      items: [subscription(2, 9)],
      total: 1,
      capped: false,
    })
    renderDialog()
    expect(await screen.findByLabelText(/Identifiant du contrat/)).toBeTruthy()
    expect(screen.getByText(/Aucun contrat trouvé pour ce client/)).toBeTruthy()
  })

  it('bascule sur la saisie manuelle si la liste des contrats est indisponible', async () => {
    mocks.getAllSubscriptions.mockRejectedValue(new Error('403'))
    renderDialog()
    await waitFor(() =>
      expect(screen.getByLabelText(/Identifiant du contrat/)).toBeTruthy(),
    )
    expect(
      screen.getByText(/La liste des contrats est indisponible/),
    ).toBeTruthy()
  })
})
