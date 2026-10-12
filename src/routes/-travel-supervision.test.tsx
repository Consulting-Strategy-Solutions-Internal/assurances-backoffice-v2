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
import type { PageResponse } from '#/lib/page'
import { travelItem } from '#/lib/travel.fixtures'
import type { TravelSupervisionItem } from '#/services/travel'
import { TravelSupervisionContent } from './_auth/contrats.voyage'

const mocks = vi.hoisted(() => {
  const search: Record<string, unknown> = { status: 'TO_RECONCILE', page: 0 }
  return { getTravelSupervision: vi.fn(), navigate: vi.fn(), search }
})

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => ({
    ...(options as object),
    fullPath: '/_auth/contrats/voyage',
    useSearch: () => mocks.search,
  }),
  lazyRouteComponent: () => () => null,
  Link: ({
    children,
    to,
    params,
    onClick,
  }: {
    children: ReactNode
    to?: string
    params?: Record<string, string>
    onClick?: (e: React.MouseEvent) => void
  }) => (
    <a
      href="/x"
      data-to={to}
      data-params={JSON.stringify(params ?? null)}
      onClick={(e) => {
        e.preventDefault()
        onClick?.(e)
      }}
    >
      {children}
    </a>
  ),
  useNavigate: () => mocks.navigate,
}))

vi.mock('#/services/travel', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getTravelSupervision: mocks.getTravelSupervision,
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
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}))

function page(
  content: TravelSupervisionItem[],
  overrides: Partial<PageResponse<TravelSupervisionItem>> = {},
): PageResponse<TravelSupervisionItem> {
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

function axiosError(status: number) {
  return { isAxiosError: true, response: { status, data: { status } } }
}

function renderList() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <TravelSupervisionContent />
    </QueryClientProvider>,
  )
}

const inTable = () => within(screen.getByRole('table'))

function lastNavigation() {
  return mocks.navigate.mock.calls.at(-1)?.[0] as {
    to?: string
    params?: Record<string, string>
    search: unknown
  }
}

beforeEach(() => {
  mocks.search = { status: 'TO_RECONCILE', page: 0 }
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-13T08:00:00Z'))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('TravelSupervisionContent (AC-5)', () => {
  it('filtre TO_RECONCILE par défaut, page de l’URL, sans tri', async () => {
    mocks.getTravelSupervision.mockResolvedValue(page([]))
    renderList()
    await waitFor(() =>
      expect(mocks.getTravelSupervision).toHaveBeenCalledWith({
        evoIssuanceStatus: 'TO_RECONCILE',
        page: 0,
        size: 20,
      }),
    )
  })

  it('« Tous » n’envoie pas de filtre', async () => {
    mocks.search = { status: 'ALL', page: 2 }
    mocks.getTravelSupervision.mockResolvedValue(page([]))
    renderList()
    await waitFor(() =>
      expect(mocks.getTravelSupervision).toHaveBeenCalledWith({
        evoIssuanceStatus: undefined,
        page: 2,
        size: 20,
      }),
    )
  })

  it('changer l’état écrit ?status et revient page 0', async () => {
    mocks.search = { status: 'TO_RECONCILE', page: 3 }
    mocks.getTravelSupervision.mockResolvedValue(page([]))
    renderList()
    fireEvent.change(screen.getByLabelText('État d’émission'), {
      target: { value: 'REJECTED' },
    })
    const next = lastNavigation().search as (
      p: Record<string, unknown>,
    ) => Record<string, unknown>
    expect(next({ status: 'TO_RECONCILE', page: 3 })).toEqual({
      status: 'REJECTED',
      page: 0,
    })
  })

  it('compteur = totalElements (L-006), lignes et « Décision possible à partir du »', async () => {
    mocks.getTravelSupervision.mockResolvedValue(
      page(
        [
          travelItem(),
          travelItem({
            id: 813,
            policyNumber: 'NSIACIVO00000057',
            evoIssuanceAttempts: 5,
            evoLastError: 'Gave up after 5 attempts (max 5): HTTP 401',
            reconcilableFrom: '2026-10-12T07:00:00',
          }),
        ],
        { totalElements: 42, totalPages: 3, last: false },
      ),
    )
    renderList()
    expect(await screen.findByText('42 contrats')).toBeTruthy()
    const table = inTable()
    expect(table.getByText('Contrat #812')).toBeTruthy()
    expect(table.getByText('NSIACIVO00000057')).toBeTruthy()
    expect(table.getAllByText('Client #106').length).toBe(2)
    expect(table.getAllByText('À trancher').length).toBe(2)
    expect(table.getByText(/À partir du 13 oct\. 2026/)).toBeTruthy()
    expect(table.getByText('Décision possible')).toBeTruthy()
    expect(table.getByText(/Gave up after 5 attempts/)).toBeTruthy()
  })

  it('clic sur une ligne → /contrats/{id} avec le retour vers la supervision', async () => {
    mocks.search = { status: 'ISSUED', page: 1 }
    mocks.getTravelSupervision.mockResolvedValue(
      page([
        travelItem({ evoIssuanceStatus: 'ISSUED', reconcilableFrom: null }),
      ]),
    )
    renderList()
    fireEvent.click(
      await screen.findByRole('button', { name: /Ouvrir le contrat #812/ }),
    )
    expect(lastNavigation()).toEqual({
      to: '/contrats/$subscriptionId',
      params: { subscriptionId: '812' },
      search: { from: 'voyage', status: 'ISSUED', page: 1 },
    })
  })

  it('R1-1 : le client est un lien vers sa fiche, sans ouvrir le contrat', async () => {
    mocks.getTravelSupervision.mockResolvedValue(page([travelItem()]))
    renderList()
    const link = (await screen.findAllByRole('link', { name: 'Client #106' }))
      .map((a) => a as HTMLAnchorElement)
      .find((a) => a.closest('table'))
    expect(link?.dataset.to).toBe('/clients/$clientId')
    expect(link?.dataset.params).toBe(JSON.stringify({ clientId: '106' }))
    mocks.navigate.mockClear()
    fireEvent.click(link as HTMLAnchorElement)
    expect(mocks.navigate).not.toHaveBeenCalled()
  })

  it('vide : état vide', async () => {
    mocks.getTravelSupervision.mockResolvedValue(page([]))
    renderList()
    expect(await inTableAsync(/Aucun contrat voyage à trancher/)).toBeTruthy()
  })

  it('404 : l’offre voyage n’est pas active', async () => {
    mocks.getTravelSupervision.mockRejectedValue(axiosError(404))
    renderList()
    expect(
      await inTableAsync(/L’offre voyage n’est pas active sur ce serveur/),
    ).toBeTruthy()
  })

  it('403 : accès refusé', async () => {
    mocks.getTravelSupervision.mockRejectedValue(axiosError(403))
    renderList()
    expect(await inTableAsync(/Accès refusé/)).toBeTruthy()
  })
})

async function inTableAsync(text: RegExp) {
  await screen.findAllByText(text)
  return inTable().getByText(text)
}
