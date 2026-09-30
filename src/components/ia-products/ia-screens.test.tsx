// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PremiumRatesScreen } from '#/components/ia-products/premium-rates/PremiumRatesScreen'
import { RiskClassesScreen } from '#/components/ia-products/risk-classes/RiskClassesScreen'

import { getPremiumRates, getRiskClasses } from '#/services/ia-standard'

const canMock = vi.hoisted(() => vi.fn((_authority: string) => true))
const canKnownMock = vi.hoisted(() => vi.fn((_authority: string) => true))
vi.mock('#/components/dashboard/use-permissions', () => ({
  usePermissions: () => ({
    permissions: null,
    can: canMock,
    canKnown: canKnownMock,
  }),
}))
vi.mock('#/services/ia-standard', () => ({
  getRiskClasses: vi.fn(),
  getPremiumRates: vi.fn(),
  deletePremiumRate: vi.fn(),
}))
vi.mock('#/components/ia-products/risk-classes/OccupationSearch', () => ({
  OccupationSearch: ({ filters }: { filters?: React.ReactNode }) => (
    <div>{filters}</div>
  ),
}))
vi.mock('#/components/ia-products/risk-classes/RiskClassDrawer', () => ({
  RiskClassDrawer: () => null,
}))
vi.mock('#/components/ia-products/premium-rates/PremiumRateDialog', () => ({
  PremiumRateDialog: () => null,
}))

function page<T>(content: T[]) {
  return {
    content,
    page: 0,
    size: 100,
    totalElements: content.length,
    totalPages: 1,
    first: true,
    last: true,
  }
}

const riskClass = {
  id: 1,
  classNumber: 1,
  description: 'Bureau',
  active: true,
  occupationCount: 2,
  createdAt: '2026-01-01T00:00:00',
  updatedAt: '2026-01-01T00:00:00',
}

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe('PremiumRatesScreen', () => {
  beforeEach(() => {
    canMock.mockReturnValue(true)
    vi.mocked(getRiskClasses).mockResolvedValue(page([riskClass]))
  })
  afterEach(cleanup)

  it('affiche les taux ‰ avec leurs décimales (0,25 et non « 0 »)', async () => {
    vi.mocked(getPremiumRates).mockResolvedValue(
      page([
        {
          id: 9,
          riskClassId: 1,
          death: 0.25,
          permanentDisability: 1.5,
          medicalExpenses: 4,
        },
      ]) as never,
    )
    renderWithClient(<PremiumRatesScreen />)
    expect(await screen.findByText(/0,25\s‰/)).toBeTruthy()
    expect(screen.getByText(/1,5\s‰/)).toBeTruthy()
  })

  it('sous filtre actif, l’état vide parle du filtre et propose de le réinitialiser', async () => {
    vi.mocked(getPremiumRates).mockResolvedValue(page([]))
    const onFilterChange = vi.fn()
    renderWithClient(
      <PremiumRatesScreen filter="QUOTABLE" onFilterChange={onFilterChange} />,
    )
    expect(
      await screen.findByText('Aucune classe ne correspond à ce filtre.'),
    ).toBeTruthy()
    screen.getByText('Afficher toutes les classes').click()
    expect(onFilterChange).toHaveBeenCalledWith('ALL')
  })
})

describe('RiskClassesScreen', () => {
  beforeEach(() => {
    canKnownMock.mockReturnValue(true)
    vi.mocked(getRiskClasses).mockResolvedValue(page([riskClass]))
  })
  afterEach(cleanup)

  it('permissions inconnues : filtre masqué et statut forcé à ACTIVE (R1-5, L-005)', async () => {
    // `can` répond true (inconnu → autorisé) mais rien n'est connu ni accordé.
    canMock.mockReturnValue(true)
    canKnownMock.mockReturnValue(false)
    renderWithClient(<RiskClassesScreen status="ALL" />)
    await screen.findByText('Bureau')
    expect(
      screen.queryByRole('group', { name: 'Filtrer par statut' }),
    ).toBeNull()
    expect(vi.mocked(getRiskClasses).mock.lastCall?.[0]?.status).toBe('ACTIVE')
  })

  it('page hors limites : retour à la dernière page, pas de faux état vide (R2-6)', async () => {
    canMock.mockReturnValue(true)
    canKnownMock.mockReturnValue(true)
    vi.mocked(getRiskClasses).mockResolvedValue({
      ...page([]),
      page: 50,
      totalElements: 30,
      totalPages: 2,
      last: true,
    })
    const onFiltersChange = vi.fn()
    renderWithClient(
      <RiskClassesScreen page={50} onFiltersChange={onFiltersChange} />,
    )
    await vi.waitFor(() =>
      expect(onFiltersChange).toHaveBeenCalledWith({
        status: 'ACTIVE',
        page: 1,
      }),
    )
    expect(screen.queryByText(/Aucune classe ne correspond/)).toBeNull()
  })

  it('page hors limites pendant le chargement des droits : garde le statut demandé', async () => {
    canMock.mockReturnValue(true)
    canKnownMock.mockReturnValue(false)
    vi.mocked(getRiskClasses).mockResolvedValue({
      ...page([]),
      page: 3,
      totalElements: 30,
      totalPages: 2,
      last: true,
    })
    const onFiltersChange = vi.fn()
    renderWithClient(
      <RiskClassesScreen
        status="INACTIVE"
        page={3}
        onFiltersChange={onFiltersChange}
      />,
    )
    await vi.waitFor(() =>
      expect(onFiltersChange).toHaveBeenCalledWith({
        status: 'INACTIVE',
        page: 1,
      }),
    )
  })

  it('masque le filtre de statut sans riskclass:write', async () => {
    canMock.mockImplementation((a: string) => a !== 'riskclass:write')
    canKnownMock.mockImplementation((a: string) => a !== 'riskclass:write')
    renderWithClient(<RiskClassesScreen status="ALL" />)
    await screen.findByText('Bureau')
    expect(
      screen.queryByRole('group', { name: 'Filtrer par statut' }),
    ).toBeNull()
    expect(vi.mocked(getRiskClasses).mock.lastCall?.[0]?.status).toBe('ACTIVE')
  })

  it('affiche le filtre de statut avec riskclass:write', async () => {
    canMock.mockReturnValue(true)
    canKnownMock.mockReturnValue(true)
    renderWithClient(<RiskClassesScreen />)
    await screen.findByText('Bureau')
    expect(
      screen.getByRole('group', { name: 'Filtrer par statut' }),
    ).toBeTruthy()
  })
})
