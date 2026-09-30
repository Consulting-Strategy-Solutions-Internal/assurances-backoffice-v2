// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import type * as SubscriptionsByClient from '#/services/subscriptions-by-client'
import type { ClientResponse } from '#/services/clients'
import { ClientsPage } from './_auth/clients'
import { ClientDetailContent } from './_auth/clients_.$clientId'

const mocks = vi.hoisted(() => ({
  getAllClients: vi.fn(),
  getAllSubscriptions: vi.fn(),
  getClient: vi.fn(),
  getClaims: vi.fn(),
  navigate: vi.fn(),
  search: { page: 0, size: 20, sort: 'lastName,asc' },
}))

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

vi.mock('#/services/clients', () => ({
  clientsKeys: {
    everyone: (sort: string) => ['clients', 'all', sort],
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
  render(
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

it('renders clients returned by GET /clients', async () => {
  mocks.getAllClients.mockResolvedValue({
    items: [client],
    total: 1,
    capped: false,
  })
  renderWithQuery(<ClientsPage />)
  expect(await screen.findByText('Awa Koné')).toBeTruthy()
  expect(screen.getByText('+225 01 02 03 04 05')).toBeTruthy()
  expect(screen.queryByText('Jean Kouassi')).toBeNull()
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
