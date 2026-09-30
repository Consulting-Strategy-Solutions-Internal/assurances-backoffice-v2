// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QuotationsPage } from './_auth/cotations'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  getQuotations: vi.fn(),
  getAllClients: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => ({
    ...(options as object),
    fullPath: '/_auth/cotations',
    useSearch: () => ({}),
  }),
  lazyRouteComponent: () => () => null,
  useNavigate: () => mocks.navigate,
}))
vi.mock('#/services/quotations', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getQuotations: mocks.getQuotations,
}))
vi.mock('#/services/clients', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getAllClients: mocks.getAllClients,
}))
vi.mock('#/components/quotations/useDistributionDirectory', () => ({
  useDistributionDirectory: () => ({
    isLoading: false,
    isError: false,
    partners: [],
    agenciesOf: () => [],
    sellersOf: () => [],
    resolveCode: () => ({ label: 'Agence Plateau', kind: 'agency' }),
  }),
}))
vi.mock('#/components/quotations/QuotationDetailDrawer', () => ({
  QuotationDetailDrawer: () => null,
}))

function renderPage() {
  mocks.getQuotations.mockResolvedValue({
    content: [
      {
        id: 41,
        status: 'QUOTED',
        distributorCode: 'D-1',
        clientId: 9,
        grossPremium: 75805,
        quoteAt: '2026-09-20T10:00:00',
        productSnapshot: { productLabel: 'IA Pour Tous' },
        createdAt: '2026-09-20T10:00:00',
        updatedAt: '2026-09-20T10:00:00',
      },
    ],
    page: 0,
    size: 100,
    totalElements: 1,
    totalPages: 1,
    last: true,
  })
  mocks.getAllClients.mockResolvedValue({
    items: [{ id: 9, firstName: 'Awa', lastName: 'Koné' }],
    total: 1,
    capped: false,
  })
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <QuotationsPage />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Cotations — cartes mobiles', () => {
  it('une carte par cotation : réf., client, produit, statut, prime, et ouvre le détail', async () => {
    renderPage()
    await within(await screen.findByRole('table')).findByText('#41')
    const cards = within(screen.getByRole('list'))
    expect(cards.getByText(/#41/)).toBeTruthy()
    expect(cards.getByText(/Koné/)).toBeTruthy()
    expect(cards.getByText('IA Pour Tous')).toBeTruthy()
    expect(cards.getByText('Cotée')).toBeTruthy()
    expect(cards.getByText(/75\D805\D+FCFA/)).toBeTruthy()
    fireEvent.click(cards.getByText('Cotée').closest('[role="button"]')!)
    expect(mocks.navigate).toHaveBeenCalledTimes(1)
    const arg = mocks.navigate.mock.calls[0][0] as {
      search: (p: object) => object
    }
    expect(arg.search({})).toMatchObject({ open: 41 })
  })
})
