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
import type { Amendment } from '#/lib/amendments'
import {
  appliedUnchanged,
  asAmendment,
  awaitingPayment,
  draftRefund,
} from '#/lib/amendments.fixtures'
import type { PageResponse } from '#/lib/page'
import { formatFcfa } from '#/lib/utils'
import { AmendmentsListContent } from './_auth/contrats.modifications'

const mocks = vi.hoisted(() => {
  const search: Record<string, unknown> = {
    status: 'DRAFT',
    page: 0,
    size: 20,
    sort: 'createdAt,desc',
  }
  return { getAmendments: vi.fn(), navigate: vi.fn(), search }
})

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => ({
    ...(options as object),
    fullPath: '/_auth/contrats/modifications',
    useSearch: () => mocks.search,
  }),
  lazyRouteComponent: () => () => null,
  Link: ({ children }: { children: ReactNode }) => <a href="/x">{children}</a>,
  useNavigate: () => mocks.navigate,
}))

vi.mock('#/services/amendments', () => ({
  amendmentsKeys: {
    all: ['amendments'],
    list: (filters: unknown) => ['amendments', 'list', filters],
    detail: (id: number) => ['amendments', 'detail', id],
  },
  getAmendments: mocks.getAmendments,
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
    onChange: (value: string) => void
  }) => (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
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

function page(
  content: Amendment[],
  overrides: Partial<PageResponse<Amendment>> = {},
): PageResponse<Amendment> {
  return {
    content,
    page: 0,
    size: 20,
    totalElements: content.length,
    totalPages: content.length ? 1 : 0,
    last: true,
    ...overrides,
  }
}

function renderList() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <AmendmentsListContent />
    </QueryClientProvider>,
  )
}

// Tableau (≥ 672 px) ET liste de cartes (en dessous) sont rendus : on cible le tableau.
// Testing Library normalise les espaces insécables du DOM, pas ceux de la requête.
const shown = (amount: number) => formatFcfa(amount).replace(/\u00a0/g, ' ')
const inTable = () => within(screen.getByRole('table'))

/** Applique le dernier `search` passé à `navigate` sur l'URL simulée. */
function lastSearch(previous: Record<string, unknown>) {
  const call = mocks.navigate.mock.calls.at(-1)?.[0] as {
    search: (p: Record<string, unknown>) => Record<string, unknown>
  }
  return call.search(previous)
}

beforeEach(() => {
  mocks.search = { status: 'DRAFT', page: 0, size: 20, sort: 'createdAt,desc' }
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('AmendmentsListContent', () => {
  it('queries the DRAFT tab by default with the URL filters', async () => {
    mocks.getAmendments.mockResolvedValue(page([]))
    renderList()

    await waitFor(() =>
      expect(mocks.getAmendments).toHaveBeenCalledWith({
        status: 'DRAFT',
        product: undefined,
        page: 0,
        size: 20,
        sort: 'createdAt,desc',
      }),
    )
    expect(
      await inTable().findByText(
        'Aucune modification dans l’onglet « À traiter ».',
      ),
    ).toBeTruthy()
    expect(
      screen
        .getByRole('button', { name: 'À traiter' })
        .getAttribute('aria-pressed'),
    ).toBe('true')
  })

  it('reads status, product, page and sort from the URL', async () => {
    mocks.search = {
      status: 'AWAITING_PAYMENT',
      product: 'IA_FOR_ALL',
      page: 2,
      size: 20,
      sort: 'updatedAt,asc',
    }
    mocks.getAmendments.mockResolvedValue(page([]))
    renderList()

    await waitFor(() =>
      expect(mocks.getAmendments).toHaveBeenCalledWith({
        status: 'AWAITING_PAYMENT',
        product: 'IA_FOR_ALL',
        page: 2,
        size: 20,
        sort: 'updatedAt,asc',
      }),
    )
  })

  it('writes the tab to the URL and goes back to the first page', async () => {
    mocks.search = { ...mocks.search, page: 3 }
    mocks.getAmendments.mockResolvedValue(page([]))
    renderList()

    fireEvent.click(
      screen.getByRole('button', { name: 'En attente de paiement' }),
    )

    expect(lastSearch(mocks.search)).toMatchObject({
      status: 'AWAITING_PAYMENT',
      page: 0,
    })
  })

  it('writes the product filter and the sort to the URL', async () => {
    mocks.getAmendments.mockResolvedValue(page([]))
    renderList()

    fireEvent.change(screen.getByLabelText('Produit'), {
      target: { value: 'IA_STANDARD' },
    })
    expect(lastSearch(mocks.search)).toMatchObject({
      product: 'IA_STANDARD',
      page: 0,
    })

    fireEvent.change(screen.getByLabelText('Tri'), {
      target: { value: 'updatedAt,desc' },
    })
    expect(lastSearch(mocks.search)).toMatchObject({ sort: 'updatedAt,desc' })
  })

  it('offers to reset the product filter', async () => {
    mocks.search = { ...mocks.search, product: 'IA_STANDARD' }
    mocks.getAmendments.mockResolvedValue(page([]))
    renderList()

    expect(
      await inTable().findByText(
        'Aucune modification ne correspond à ce filtre.',
      ),
    ).toBeTruthy()
    fireEvent.click(inTable().getByText('Réinitialiser les filtres'))
    expect(lastSearch(mocks.search)).toMatchObject({
      product: undefined,
      page: 0,
    })
  })

  it('lists contract, product, delta kind, amount and receipt status', async () => {
    mocks.search = { ...mocks.search, status: 'AWAITING_PAYMENT' }
    mocks.getAmendments.mockResolvedValue(
      page([
        asAmendment(awaitingPayment),
        { ...asAmendment(draftRefund), id: 2, subscriptionId: 500 },
      ]),
    )
    renderList()

    expect(await inTable().findByText('402')).toBeTruthy()
    expect(inTable().getAllByText('IA Standard').length).toBe(2)
    expect(inTable().getByText('Hausse')).toBeTruthy()
    expect(inTable().getByText(shown(12345))).toBeTruthy()
    expect(inTable().getByText('À payer')).toBeTruthy()
    expect(inTable().getByText('Baisse')).toBeTruthy()
    expect(inTable().getByText(shown(-8000))).toBeTruthy()
    expect(screen.getByText('2 modifications')).toBeTruthy()
  })

  it('shows PAID_NOT_APPLIED receipts with the danger tone', async () => {
    mocks.getAmendments.mockResolvedValue(
      page([
        {
          ...asAmendment(appliedUnchanged),
          status: 'DELETED',
          receipt: { ...awaitingPayment.receipt!, status: 'PAID_NOT_APPLIED' },
        },
      ]),
    )
    renderList()

    const pill = await inTable().findByText(/Payée après suppression/)
    expect(pill.className).toContain('text-[#c0392b]')
  })

  it('opens the detail on row activation', async () => {
    mocks.getAmendments.mockResolvedValue(page([asAmendment(appliedUnchanged)]))
    renderList()

    const row = (await inTable().findByText('402')).closest('tr') as HTMLElement
    fireEvent.click(row)
    expect(mocks.navigate).toHaveBeenCalledWith({
      to: '/contrats/modifications/$amendmentId',
      params: { amendmentId: '1' },
      search: {
        status: 'DRAFT',
        product: undefined,
        page: 0,
        size: 20,
        sort: 'createdAt,desc',
      },
    })
  })

  it('paginates server-side through the URL', async () => {
    mocks.getAmendments.mockResolvedValue(
      page([asAmendment(appliedUnchanged)], {
        totalElements: 45,
        totalPages: 3,
        last: false,
      }),
    )
    renderList()

    fireEvent.click(await screen.findByRole('button', { name: /Suivant/ }))
    expect(lastSearch(mocks.search)).toMatchObject({ page: 1 })
  })

  it('renders the error state with a retry', async () => {
    mocks.getAmendments.mockRejectedValue(new Error('failed'))
    renderList()

    expect(
      await inTable().findByText('Impossible de charger les modifications.'),
    ).toBeTruthy()
    expect(inTable().getByRole('button', { name: 'Réessayer' })).toBeTruthy()
  })

  it('labels the tabs in the plural and keeps the count out of « Chargement… » on error', async () => {
    mocks.getAmendments.mockRejectedValue(new Error('failed'))
    renderList()
    for (const name of [
      'Appliquées',
      'Supprimées',
      'À traiter',
      'En attente de paiement',
    ])
      expect(screen.getByRole('button', { name })).toBeTruthy()
    await inTable().findByText('Impossible de charger les modifications.')
    expect(screen.queryByText('Chargement…')).toBeNull()
  })

  it('renders the 403 state', async () => {
    mocks.getAmendments.mockRejectedValue({
      isAxiosError: true,
      response: { status: 403 },
    })
    renderList()

    expect(await inTable().findByText('Accès refusé.')).toBeTruthy()
  })
})
