// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import type {
  ClaimFilters,
  ClaimResponse,
  PageResponse,
} from '#/services/claims'
import { ClaimsListContent } from './_auth/sinistres'

const mocks = vi.hoisted(() => ({
  getClaims: vi.fn(),
  getClaimTypes: vi.fn(),
  getClients: vi.fn(),
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
  claimsKeys: { list: (filters: ClaimFilters) => ['claims', filters] },
  getClaims: mocks.getClaims,
}))

vi.mock('#/services/claim-types', () => ({
  getClaimTypes: mocks.getClaimTypes,
}))
vi.mock('#/services/clients', () => ({ getClients: mocks.getClients }))
vi.mock('#/components/forms/FormSelect', () => ({
  FormSelect: ({
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
    <label>
      {label}
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
    </label>
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
  mocks.getClients.mockResolvedValue(page([]))
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ClaimsListContent', () => {
  it('renders the loading state', () => {
    mocks.getClaims.mockReturnValue(new Promise(() => undefined))
    renderList()

    expect(screen.getByText('Chargement des sinistres…')).toBeTruthy()
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
    expect(screen.getAllByText('En instruction')).toHaveLength(2)
    expect(screen.getByText('Awa Koné')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Instruire' })).toBeTruthy()
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
    mocks.getClients.mockResolvedValue({
      ...page([]),
      content: [
        { id: 41, firstName: 'Awa', lastName: 'Koné', phoneNumber: '+22501' },
        {
          id: 42,
          firstName: 'Jean',
          lastName: 'N’Guessan',
          phoneNumber: '+22505',
        },
      ],
    })
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
