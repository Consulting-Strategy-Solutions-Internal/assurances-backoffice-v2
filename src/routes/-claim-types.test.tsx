// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { ClaimTypesContent } from './_auth/sinistres_.types'

const mocks = vi.hoisted(() => ({
  getClaimTypes: vi.fn(),
  getProducts: vi.fn(),
  navigate: vi.fn(),
  search: {
    page: 0,
    size: 20,
    sort: 'name,asc',
    q: undefined as string | undefined,
  },
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => ({
    ...(options as object),
    fullPath: '/_auth/sinistres_/types',
    useSearch: () => mocks.search,
  }),
  lazyRouteComponent: () => () => null,
  Link: ({ children }: { children: ReactNode }) => <a href="/x">{children}</a>,
  useNavigate: () => mocks.navigate,
}))
vi.mock('#/services/claim-types', () => ({
  claimTypesKeys: { all: ['claim-types'] },
  getClaimTypes: mocks.getClaimTypes,
  deleteClaimType: vi.fn(),
}))
vi.mock('#/services/products', () => ({ getProducts: mocks.getProducts }))
vi.mock('#/components/claims/ClaimTypeDialog', () => ({
  ClaimTypeDialog: () => null,
}))

const makeTypes = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    productId: 1,
    productLabel: 'Auto',
    name: i < 5 ? `Bris ${i}` : `Type ${i}`,
    description: null,
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  }))

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <ClaimTypesContent />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  mocks.search = { page: 0, size: 20, sort: 'name,asc', q: undefined }
  mocks.navigate.mockReset()
  mocks.getProducts.mockResolvedValue({ content: [] })
  mocks.getClaimTypes.mockResolvedValue({
    content: makeTypes(30),
    last: true,
    totalElements: 30,
  })
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('Types de sinistre', () => {
  it('compte tous les types (30) et non la page de 20 (L-006)', async () => {
    renderPage()
    expect(await screen.findByText('30 types')).toBeTruthy()
  })

  it('en recherche, affiche « N sur total »', async () => {
    mocks.search = { ...mocks.search, q: 'bris' }
    renderPage()
    expect(await screen.findByText('5 types sur 30')).toBeTruthy()
  })

  it('la frappe est différée de 250 ms et remplace l’historique', async () => {
    renderPage()
    await screen.findByText('30 types')
    vi.useFakeTimers()
    fireEvent.change(screen.getByLabelText('Rechercher un type de sinistre'), {
      target: { value: 'bris' },
    })
    expect(mocks.navigate).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(mocks.navigate).toHaveBeenCalledTimes(1)
    expect(mocks.navigate.mock.calls[0][0].replace).toBe(true)
  })
})
