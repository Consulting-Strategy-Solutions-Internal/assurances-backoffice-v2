// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { ClientResponse } from '#/services/clients'
import { ClientsPage } from './_auth/clients'
import { ClientDetailContent } from './_auth/clients_.$clientId'

const mocks = vi.hoisted(() => ({
  getClients: vi.fn(),
  getClient: vi.fn(),
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

vi.mock('#/services/clients', () => ({
  clientsKeys: {
    list: (page: number, size: number, sort: string) => [
      'clients',
      { page, size, sort },
    ],
    detail: (id: number) => ['client', id],
  },
  getClients: mocks.getClients,
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
  mocks.getClients.mockResolvedValue({
    content: [client],
    page: 0,
    size: 20,
    totalElements: 1,
    totalPages: 1,
    last: true,
  })
  renderWithQuery(<ClientsPage />)
  expect(await screen.findByText('Awa Koné')).toBeTruthy()
  expect(screen.getByText('+2250102030405')).toBeTruthy()
  expect(screen.queryByText('Jean Kouassi')).toBeNull()
})

it('renders the API client detail and verification states', async () => {
  mocks.getClient.mockResolvedValue(client)
  renderWithQuery(<ClientDetailContent clientId={42} />)
  expect(await screen.findByRole('heading', { name: 'Awa Koné' })).toBeTruthy()
  expect(screen.getByText('Cocody')).toBeTruthy()
  expect(screen.getAllByText('Vérifié')).toHaveLength(1)
  expect(screen.getAllByText('Non vérifié')).toHaveLength(1)
})
