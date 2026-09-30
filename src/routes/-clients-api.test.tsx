// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import type { ReactNode } from 'react'
import type * as SubscriptionsByClient from '#/services/subscriptions-by-client'
import type { ClientResponse } from '#/services/clients'
import { ClientsPage, Route as ClientsRoute } from './_auth/clients'
import { ClientDetailContent } from './_auth/clients_.$clientId'

const mocks = vi.hoisted(() => {
  const search: Record<string, unknown> = {
    page: 0,
    size: 20,
    sort: 'lastName,asc',
  }
  return {
    search,
    getAllClients: vi.fn(),
    getAllSubscriptions: vi.fn(),
    getClient: vi.fn(),
    getClaims: vi.fn(),
    getAllPartners: vi.fn(),
    navigate: vi.fn(),
    permissions: null as Set<string> | null,
  }
})

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => ({
    ...(options as object),
    fullPath: '/_auth/clients',
    useSearch: () => mocks.search,
    useParams: () => ({ clientId: '42' }),
  }),
  lazyRouteComponent: () => () => null,
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
  useNavigate: () => mocks.navigate,
}))

vi.mock('#/components/dashboard/shell', () => ({
  useShell: () => ({ search: '' }),
}))

vi.mock('#/services/claims', () => ({
  claimsKeys: {
    all: ['claims'],
    list: (filters: object) => ['claims', filters],
  },
  getClaims: mocks.getClaims,
}))

vi.mock('#/services/subscriptions-by-client', async (importOriginal) => ({
  ...(await importOriginal<typeof SubscriptionsByClient>()),
  getAllSubscriptions: mocks.getAllSubscriptions,
}))

vi.mock('#/components/claims/CreateClaimDialog', () => ({
  CreateClaimDialog: () => null,
}))

vi.mock('#/components/clients/ContractDrawer', () => ({
  ContractDrawer: ({
    subscriptionId,
    onClose,
  }: {
    subscriptionId: number | null
    onClose: () => void
  }) => (
    <div>
      <span data-testid="contract-drawer">{String(subscriptionId)}</span>
      <button type="button" onClick={onClose}>
        fermer-panneau
      </button>
    </div>
  ),
}))

vi.mock('#/services/partners', () => ({
  partnersAllKey: ['partners', 'all-pages'],
  getAllPartners: mocks.getAllPartners,
}))

vi.mock('#/components/dashboard/use-permissions', () => ({
  usePermissions: () => ({
    permissions: mocks.permissions,
    can: (code: string) =>
      mocks.permissions === null || mocks.permissions.has(code),
  }),
}))

vi.mock('#/components/clients/ChangePartnerDialog', () => ({
  ChangePartnerDialog: ({ clientId }: { clientId: number }) => (
    <div data-testid="change-partner">{clientId}</div>
  ),
}))

vi.mock('#/services/clients', () => ({
  clientsKeys: {
    all: ['clients'],
    everyone: (sort: string, partner: unknown = null) => [
      'clients',
      'all',
      sort,
      partner,
    ],
    detail: (id: number) => ['client', id],
  },
  getAllClients: mocks.getAllClients,
  getClient: mocks.getClient,
}))

const client: ClientResponse = {
  id: 42,
  firstName: 'Awa',
  lastName: 'Koné',
  phoneNumber: '+2250102030405',
  email: 'awa@example.ci',
  gender: 'FEMME',
  addressLine1: 'Cocody',
  addressLine2: null,
  emailVerifiedAt: '2026-01-01T10:00:00',
  phoneVerifiedAt: null,
  createdAt: '2026-01-01T10:00:00',
  updatedAt: '2026-07-01T10:00:00',
}

function renderWithQuery(children: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  delete mocks.search.partner
  mocks.permissions = null
})

beforeEach(() => {
  mocks.getAllPartners.mockResolvedValue({
    items: [
      {
        id: 7,
        name: 'Sunu Distribution',
        distributorCode: 'SUNU',
        idSite: 1,
        createdAt: '2026-01-01T00:00:00',
        updatedAt: '2026-01-01T00:00:00',
      },
    ],
    total: 1,
    capped: false,
  })
})

it('renders clients returned by GET /clients', async () => {
  mocks.getAllClients.mockResolvedValue({
    items: [client],
    total: 1,
    capped: false,
  })
  renderWithQuery(<ClientsPage />)
  // Table (≥ 672 px) and card list (below) are both in the DOM: scope.
  const table = within(screen.getByRole('table'))
  expect(await table.findByText('Awa Koné')).toBeTruthy()
  expect(table.getByText('+225 01 02 03 04 05')).toBeTruthy()
  expect(screen.queryByText('Jean Kouassi')).toBeNull()
})

it('renders a tappable client card below md that opens the detail', async () => {
  mocks.getAllClients.mockResolvedValue({
    items: [client],
    total: 1,
    capped: false,
  })
  renderWithQuery(<ClientsPage />)
  const cards = within(screen.getByRole('list'))
  const card = await cards.findByText('Awa Koné')
  expect(cards.getByText('+225 01 02 03 04 05')).toBeTruthy()
  expect(cards.getByLabelText(/Téléphone/)).toBeTruthy()
  fireEvent.click(card.closest('[role="button"]') as HTMLElement)
  expect(mocks.navigate).toHaveBeenCalledWith({
    to: '/clients/$clientId',
    params: { clientId: String(client.id) },
  })
})

it('renders the API client detail and verification states', async () => {
  mocks.getClient.mockResolvedValue(client)
  mocks.getAllSubscriptions.mockResolvedValue({
    items: [],
    total: 0,
    capped: false,
  })
  mocks.getClaims.mockResolvedValue({
    content: [],
    page: 0,
    size: 100,
    totalElements: 0,
    totalPages: 0,
    last: true,
  })
  renderWithQuery(<ClientDetailContent clientId={42} />)
  expect(await screen.findByRole('heading', { name: 'Awa Koné' })).toBeTruthy()
  expect(screen.getByText('Cocody')).toBeTruthy()
  expect(screen.getByText('Email vérifié')).toBeTruthy()
  expect(screen.getByText('Téléphone non vérifié')).toBeTruthy()
  expect(await screen.findByText(/Aucun sinistre déclaré/)).toBeTruthy()
  expect(await screen.findByText('Aucun contrat pour ce client.')).toBeTruthy()
})

it('opens the claim when a « Sinistres récents » row is activated', async () => {
  mocks.getClient.mockResolvedValue(client)
  mocks.getAllSubscriptions.mockResolvedValue({
    items: [],
    total: 0,
    capped: false,
  })
  mocks.getClaims.mockResolvedValue({
    content: [
      {
        id: 77,
        claimNumber: 'SIN-2026-0077',
        status: 'SUBMITTED',
        subscriptionId: 5,
        clientId: 42,
        claimTypeName: 'Accident',
        productLabel: 'IA Standard',
        occurredOn: '2026-08-01',
      },
    ],
    page: 0,
    size: 100,
    totalElements: 1,
    totalPages: 1,
    last: true,
  })
  renderWithQuery(<ClientDetailContent clientId={42} />)
  const cell = await screen.findByText('SIN-2026-0077')
  fireEvent.click(cell.closest('tr') as HTMLElement)
  expect(mocks.navigate).toHaveBeenCalledWith({
    to: '/sinistres/$claimId',
    params: { claimId: '77' },
  })
})

describe('fiche client — documents des contrats', () => {
  const contract = {
    id: 5,
    quotationId: 1,
    clientId: 42,
    paymentMode: 'MOBILE_MONEY',
    status: 'ACTIVE',
    totalPremium: 30000,
    currency: 'XOF',
    policyNumber: 'IA-2026-000005',
    productSnapshot: { productLabel: 'IA Standard' },
    createdAt: '2026-01-01T10:00:00',
    updatedAt: '2026-01-01T10:00:00',
  }
  function setup() {
    mocks.getClient.mockResolvedValue(client)
    mocks.getAllSubscriptions.mockResolvedValue({
      items: [contract, { ...contract, id: 6, clientId: 99 }],
      total: 2,
      capped: false,
    })
    mocks.getClaims.mockResolvedValue({
      content: [],
      page: 0,
      size: 100,
      totalElements: 0,
      totalPages: 0,
      last: true,
    })
  }

  it('AC-1 : cliquer un contrat ouvre son panneau (?contract=id)', async () => {
    setup()
    renderWithQuery(<ClientDetailContent clientId={42} />)
    const row = await screen.findByRole('button', {
      name: /Ouvrir le contrat IA-2026-000005/,
    })
    fireEvent.click(row)
    const call = mocks.navigate.mock.calls.find(
      (c) => typeof (c[0] as { search?: unknown }).search === 'function',
    )
    const next = (
      call?.[0] as { search: (p: object) => { contract?: number } }
    ).search({ page: 0 })
    expect(next.contract).toBe(5)
  })

  it('AC-1 : ?contract=5 ouvre le panneau de ce contrat ; un contrat d’un autre client ne s’ouvre pas', async () => {
    setup()
    mocks.search = { ...mocks.search, contract: 5 }
    const { unmount } = renderWithQuery(<ClientDetailContent clientId={42} />)
    await screen.findByText('IA-2026-000005')
    expect(screen.getByTestId('contract-drawer').textContent).toBe('5')
    unmount()
    mocks.search = { ...mocks.search, contract: 6 }
    renderWithQuery(<ClientDetailContent clientId={42} />)
    await screen.findByText('IA-2026-000005')
    expect(screen.getByTestId('contract-drawer').textContent).toBe('null')
    mocks.search = { page: 0, size: 20, sort: 'lastName,asc' }
  })

  it('AC-1 : fermer le panneau retire ?contract de l’URL', async () => {
    setup()
    mocks.search = { ...mocks.search, contract: 5 }
    renderWithQuery(<ClientDetailContent clientId={42} />)
    await screen.findByText('IA-2026-000005')
    mocks.navigate.mockClear()
    fireEvent.click(screen.getByText('fermer-panneau'))
    const call = mocks.navigate.mock.calls.at(-1)?.[0] as {
      search: (p: object) => { contract?: number }
    }
    expect(call.search({ page: 0, contract: 5 }).contract).toBeUndefined()
    mocks.search = { page: 0, size: 20, sort: 'lastName,asc' }
  })

  it('R1-3 : la ligne d’un contrat se termine par un chevron (ligne cliquable)', async () => {
    setup()
    renderWithQuery(<ClientDetailContent clientId={42} />)
    const row = await screen.findByRole('button', {
      name: /Ouvrir le contrat IA-2026-000005/,
    })
    expect(row.querySelector('svg.lucide-chevron-right')).toBeTruthy()
  })
})

describe('cloisonnement par partenaire', () => {
  const allClients = { items: [client], total: 1, capped: false }
  const emptyClaims = {
    content: [],
    page: 0,
    size: 100,
    totalElements: 0,
    totalPages: 0,
    last: true,
  }

  it('AC-1 : ?partner garde un id ou none, ignore le reste (jamais de 400)', () => {
    const schema = (ClientsRoute as unknown as { validateSearch: unknown })
      .validateSearch as {
      parse: (value: unknown) => { partner?: unknown }
    }
    expect(schema.parse({ partner: '7' }).partner).toBe(7)
    expect(schema.parse({ partner: 'none' }).partner).toBe('none')
    expect(schema.parse({ partner: 'abc' }).partner).toBeUndefined()
    expect(schema.parse({}).partner).toBeUndefined()
  })

  it('AC-1 : sans filtre, charge tous les clients', async () => {
    mocks.getAllClients.mockResolvedValue(allClients)
    renderWithQuery(<ClientsPage />)
    expect(await screen.findByText('1 client')).toBeTruthy()
    expect(mocks.getAllClients).toHaveBeenCalledWith('lastName,asc', null)
  })

  it('AC-1/AC-2 : ?partner=7 filtre côté serveur et nomme le partenaire', async () => {
    mocks.search.partner = 7
    mocks.getAllClients.mockResolvedValue(allClients)
    renderWithQuery(<ClientsPage />)
    expect(
      await screen.findByText('1 client · partenaire Sunu Distribution'),
    ).toBeTruthy()
    expect(mocks.getAllClients).toHaveBeenCalledWith('lastName,asc', 7)
  })

  it('AC-1/AC-2 : ?partner=none liste les clients sans partenaire', async () => {
    mocks.search.partner = 'none'
    mocks.getAllClients.mockResolvedValue(allClients)
    renderWithQuery(<ClientsPage />)
    expect(await screen.findByText('1 client · sans partenaire')).toBeTruthy()
    expect(mocks.getAllClients).toHaveBeenCalledWith('lastName,asc', 'none')
  })

  function renderDetail() {
    mocks.getClient.mockResolvedValue(client)
    mocks.getAllSubscriptions.mockResolvedValue({
      items: [],
      total: 0,
      capped: false,
    })
    mocks.getClaims.mockResolvedValue(emptyClaims)
    renderWithQuery(<ClientDetailContent clientId={42} />)
  }

  it('AC-3 : « Changer de partenaire » ouvre le dialogue d’arbitrage', async () => {
    mocks.permissions = new Set(['backoffice:admin'])
    renderDetail()
    fireEvent.click(
      await screen.findByRole('button', { name: /Changer de partenaire/ }),
    )
    expect(screen.getByTestId('change-partner').textContent).toBe('42')
  })

  it('bouton visible tant que les droits sont inconnus (L-009), masqué sans backoffice:admin', async () => {
    renderDetail()
    expect(
      await screen.findByRole('button', { name: /Changer de partenaire/ }),
    ).toBeTruthy()
    cleanup()
    mocks.permissions = new Set(['client:read'])
    renderDetail()
    await screen.findByRole('heading', { name: 'Awa Koné' })
    expect(
      screen.queryByRole('button', { name: /Changer de partenaire/ }),
    ).toBeNull()
  })
})
