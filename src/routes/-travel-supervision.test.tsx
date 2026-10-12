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
    onKeyDown,
  }: {
    children: ReactNode
    to?: string
    params?: Record<string, string>
    onClick?: (e: React.MouseEvent) => void
    onKeyDown?: (e: React.KeyboardEvent) => void
  }) => (
    <a
      href="/x"
      data-to={to}
      data-params={JSON.stringify(params ?? null)}
      onKeyDown={onKeyDown}
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
    expect(table.getByText('À partir du')).toBeTruthy()
    expect(table.getByText(/13 oct\. 2026/)).toBeTruthy()
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

describe('V1-1 : table resserrée (largeur mesurée, L-008)', () => {
  it('tentatives et dernière erreur sous l’état ; couverture, décision et dernier envoi sur deux lignes', async () => {
    mocks.getTravelSupervision.mockResolvedValue(
      page([
        travelItem({
          evoIssuanceAttempts: 5,
          evoLastError: 'Gave up after 5 attempts (max 5): HTTP 401',
          reconcilableFrom: '2026-10-13T09:30:00',
        }),
      ]),
    )
    renderList()
    await screen.findByText('1 contrat')
    const table = inTable()
    const headers = table.getAllByRole('columnheader').map((h) => h.textContent)
    expect(headers).not.toContain('Envois')
    expect(headers).not.toContain('Dernière erreur')
    const state = table
      .getAllByText('À trancher')[0]
      ?.closest('td') as HTMLElement
    expect(within(state).getByText(/5 envois/)).toBeTruthy()
    expect(within(state).getByText(/Gave up after 5 attempts/)).toBeTruthy()
    const coverage = table
      .getByText('20 oct. 2026')
      .closest('td') as HTMLElement
    expect(within(coverage).getByText(/→ 30 oct\. 2026/)).toBeTruthy()
    const decision = table.getByText('À partir du').closest('td') as HTMLElement
    expect(within(decision).getByText(/13 oct\. 2026/)).toBeTruthy()
  })
})

describe('R3 : seuils, squelette, clavier', () => {
  it('R3-4 : Client et Dernier envoi masqués sous lg (en-tête et cellule)', async () => {
    mocks.getTravelSupervision.mockResolvedValue(page([travelItem()]))
    renderList()
    await screen.findByText('1 contrat')
    const table = inTable()
    for (const name of ['Client', 'Dernier envoi']) {
      const head = table.getByRole('columnheader', { name })
      expect(head.className).toContain('@4xl/main:table-cell')
    }
    const clientCell = table.getAllByText('Client #106')[0]?.closest('td')
    expect(clientCell?.className).toContain('@4xl/main:table-cell')
  })

  it('R3-1 : le squelette masque les mêmes colonnes que l’en-tête', () => {
    mocks.getTravelSupervision.mockReturnValue(new Promise(() => undefined))
    renderList()
    const row = screen.getByRole('table').querySelector('tbody tr')
    const cells = [...(row?.children ?? [])].map((c) => c.className)
    expect(cells).toHaveLength(7)
    expect(cells[1]).toContain('@4xl/main:table-cell')
    expect(cells[3]).toContain('@4xl/main:table-cell')
    expect(cells[2]).not.toContain('hidden')
  })

  it('R2-2 : Entrée sur le lien client n’ouvre pas le contrat', async () => {
    mocks.getTravelSupervision.mockResolvedValue(page([travelItem()]))
    renderList()
    await screen.findByText('1 contrat')
    const link = inTable().getByRole('link', { name: 'Client #106' })
    mocks.navigate.mockClear()
    fireEvent.keyDown(link, { key: 'Enter' })
    expect(mocks.navigate).not.toHaveBeenCalled()
    // contrôle : Entrée sur la ligne ouvre bien le contrat
    fireEvent.keyDown(link.closest('tr') as HTMLElement, { key: 'Enter' })
    expect(mocks.navigate).toHaveBeenCalled()
  })

  it('R3-3 : heure du dernier envoi formatée, vide sans heure', async () => {
    mocks.getTravelSupervision.mockResolvedValue(
      page([
        travelItem({ evoSentAt: '2026-10-12T09:05:41' }),
        travelItem({ id: 813, evoSentAt: '2026-10-12' }),
      ]),
    )
    renderList()
    await screen.findByText('2 contrats')
    const table = inTable()
    const time = table.getByText('09:05')
    // Ligne sans heure : la date seule, pas de seconde ligne.
    const dateOnly = table.getAllByText('12 oct. 2026')[1]?.closest('td')
    expect(time.closest('td')?.className).toContain('@4xl/main:table-cell')
    expect(dateOnly?.querySelectorAll('div')[1]?.textContent).toBe('')
  })
})
