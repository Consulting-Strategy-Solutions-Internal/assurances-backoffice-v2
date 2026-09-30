// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { ClaimResponse, PageResponse } from '#/services/claims'
import { ClaimsListContent } from './_auth/sinistres'

const mocks = vi.hoisted(() => ({
  getClaims: vi.fn(),
  getClaimTypes: vi.fn(),
  getAllClients: vi.fn(),
  navigate: vi.fn(),
  search: {
    page: 0,
    size: 20,
    sort: 'createdAt,desc',
  },
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => ({
    ...(options as object),
    fullPath: '/_auth/sinistres',
    useSearch: () => mocks.search,
  }),
  lazyRouteComponent: () => () => null,
  Link: ({ children }: { children: ReactNode }) => (
    <a href="/sinistres">{children}</a>
  ),
  useNavigate: () => mocks.navigate,
}))

vi.mock('#/services/claims', () => ({
  CLAIM_STATUSES: [
    'SUBMITTED',
    'UNDER_REVIEW',
    'INFO_REQUESTED',
    'APPROVED',
    'REJECTED',
    'CANCELLED',
  ],
  claimsKeys: { all: ['claims'] },
  getClaims: mocks.getClaims,
}))

vi.mock('#/services/claim-types', () => ({
  getClaimTypes: mocks.getClaimTypes,
}))
vi.mock('#/services/clients', () => ({
  clientsKeys: { everyone: (sort: string) => ['clients', 'all', sort] },
  getAllClients: mocks.getAllClients,
}))
vi.mock('#/components/claims/ClientPicker', () => ({
  ClientPicker: ({
    label,
    value,
    onChange,
  }: {
    label: string
    value: string
    onChange: (value: string) => void
  }) => (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">Tous</option>
      <option value="42">Jean</option>
    </select>
  ),
}))
vi.mock('#/components/dashboard/shell', () => ({
  useShell: () => ({ search: '' }),
}))
vi.mock('#/components/claims/FilterSelect', () => ({
  FilterSelect: ({
    label,
    value,
    options,
    onChange,
  }: {
    label: string
    value: string
    options: Array<{ value: string; label: string }>
    onChange?: (value: string) => void
  }) => (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
    >
      <option value="">Tous</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}))

const listedClaim: ClaimResponse = {
  id: 42,
  claimNumber: 'SIN-2026-0042',
  status: 'UNDER_REVIEW',
  subscriptionId: 7,
  clientId: 12,
  clientName: 'Awa Koné',
  claimTypeId: 3,
  claimTypeName: 'Accident',
  occurredOn: '2026-07-20',
  description: 'Description du sinistre',
  productLabel: 'Auto',
  declaredBy: 'CLIENT',
  createdAt: '2026-07-20T10:00:00Z',
  updatedAt: '2026-07-21T10:00:00Z',
  events: null,
  attachments: null,
}

function page(content: ClaimResponse[]): PageResponse<ClaimResponse> {
  return {
    content,
    page: 0,
    size: 20,
    totalElements: content.length,
    totalPages: content.length ? 1 : 0,
    last: true,
  }
}

function renderList() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <ClaimsListContent />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  mocks.search = { page: 0, size: 20, sort: 'createdAt,desc' }
  mocks.getClaimTypes.mockResolvedValue(page([]))
  mocks.getAllClients.mockResolvedValue({ items: [], total: 0, capped: false })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ClaimsListContent', () => {
  it('renders the loading state', () => {
    mocks.getClaims.mockReturnValue(new Promise(() => undefined))
    renderList()

    expect(screen.getByText('Chargement…')).toBeTruthy()
  })

  it('renders the empty state', async () => {
    mocks.getClaims.mockResolvedValue(page([]))
    renderList()

    expect(
      await screen.findByText('Aucun sinistre pour le moment.'),
    ).toBeTruthy()
  })

  it('renders the error state', async () => {
    mocks.getClaims.mockRejectedValue(new Error('failed'))
    renderList()

    expect(
      await screen.findByText('Impossible de charger les sinistres.'),
    ).toBeTruthy()
  })

  it('renders returned claim data', async () => {
    mocks.getClaims.mockResolvedValue(page([listedClaim]))
    renderList()

    expect(await screen.findByText('SIN-2026-0042')).toBeTruthy()
    expect(screen.getByText('Accident')).toBeTruthy()
    expect(screen.getByText('Auto')).toBeTruthy()
    // filter option + KPI label + status pill
    expect(screen.getAllByText('En instruction')).toHaveLength(3)
    expect(screen.getByText('Awa Koné')).toBeTruthy()
  })

  it('opens the claim detail when a row is activated', async () => {
    mocks.getClaims.mockResolvedValue(page([listedClaim]))
    renderList()

    fireEvent.click((await screen.findByText('SIN-2026-0042')).closest('tr')!)

    expect(mocks.navigate).toHaveBeenCalledWith({
      to: '/sinistres/$claimId',
      params: { claimId: '42' },
    })
  })

  it('filters the loaded claims with the search field', async () => {
    mocks.getClaims.mockResolvedValue(
      page([
        listedClaim,
        {
          ...listedClaim,
          id: 43,
          claimNumber: 'SIN-2026-0043',
          clientName: 'Jean N’Guessan',
        },
      ]),
    )
    mocks.search = { ...mocks.search, q: 'jean' } as typeof mocks.search
    renderList()
    await screen.findByText('SIN-2026-0043')

    expect(screen.queryByText('SIN-2026-0042')).toBeNull()
    expect(screen.getByText('SIN-2026-0043')).toBeTruthy()
  })

  it('renders each client and falls back when a client was deleted', async () => {
    mocks.getClaims.mockResolvedValue(
      page([
        listedClaim,
        {
          ...listedClaim,
          id: 43,
          claimNumber: 'SIN-2026-0043',
          clientId: 99,
          clientName: null,
        },
      ]),
    )
    renderList()

    expect(await screen.findByText('Awa Koné')).toBeTruthy()
    expect(screen.getByText('Client supprimé (#99)')).toBeTruthy()
    expect(screen.queryByText('null')).toBeNull()
  })

  it('moves a server filter into route search parameters', async () => {
    mocks.getClaims.mockResolvedValue(page([]))
    renderList()
    await screen.findByText('Aucun sinistre pour le moment.')

    fireEvent.change(screen.getByLabelText('Client'), {
      target: { value: '42' },
    })

    expect(mocks.navigate).toHaveBeenCalledOnce()
    const navigation = mocks.navigate.mock.calls[0][0]
    expect(navigation.search(mocks.search)).toEqual({
      ...mocks.search,
      clientId: 42,
      page: 0,
    })
  })
})
