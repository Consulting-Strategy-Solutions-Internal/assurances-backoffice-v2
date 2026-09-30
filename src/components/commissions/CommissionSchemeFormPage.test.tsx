// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { CommissionSchemeFormPage } from './CommissionSchemeFormPage'

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('sonner', () => ({ toast }))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="/">{children}</a>,
  useNavigate: () => vi.fn(),
}))
vi.mock('#/components/forms/unsaved-changes', () => ({
  useUnsavedChangesGuard: () => ({ dialog: null }),
}))
vi.mock('#/components/layout/SearchableSelect', () => ({
  SearchableSelect: (props: {
    label: string
    value: string
    options: Array<{ value: string; label: string }>
    onChange: (v: string) => void
  }) => (
    <select
      aria-label={props.label}
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
    >
      <option value="">-</option>
      {props.options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}))

const services = vi.hoisted(() => ({
  createCommissionScheme: vi.fn(),
  updateCommissionScheme: vi.fn(),
  getCommissionScheme: vi.fn(),
  getCommissionSchemes: vi.fn(),
  getAllPartners: vi.fn(),
  getAllProducts: vi.fn(),
  getPartnerNetworkAvailability: vi.fn(),
}))
vi.mock('#/services/commission-schemes', () => services)
vi.mock('#/services/commission-reference-data', () => services)

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  vi.stubGlobal('matchMedia', () => ({ matches: true }))
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function httpError(status: number, data: unknown): AxiosError {
  const config = { headers: {} } as InternalAxiosRequestConfig
  return new AxiosError('fail', String(status), config, null, {
    status,
    data,
    statusText: '',
    headers: {},
    config,
  } as AxiosResponse)
}

function renderWizard() {
  services.getAllPartners.mockResolvedValue([
    { id: 1, name: 'Partenaire A', distributorCode: 'PA' },
  ])
  services.getAllProducts.mockResolvedValue([
    { code: 'IA_STANDARD', label: 'IA Standard' },
  ])
  services.getPartnerNetworkAvailability.mockResolvedValue({
    agencies: [],
    directSellers: [{ id: 9 }],
    hasAgencySeller: false,
  })
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <CommissionSchemeFormPage />
    </QueryClientProvider>,
  )
}

async function goToShares() {
  fireEvent.change(await screen.findByLabelText('Partenaire'), {
    target: { value: '1' },
  })
  fireEvent.change(screen.getByLabelText('Produit'), {
    target: { value: 'IA_STANDARD' },
  })
  fireEvent.change(screen.getByLabelText(/Taux de commission négocié/), {
    target: { value: '5' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Continuer' }))
  const level2 = await screen.findByRole('button', { name: /Niveau 2/ })
  await waitFor(() =>
    expect((level2 as HTMLButtonElement).disabled).toBe(false),
  )
  fireEvent.click(level2)
  fireEvent.click(screen.getByRole('button', { name: 'Continuer' }))
}

const save = () => screen.getByRole('button', { name: /Enregistrer le schéma/ })

describe('CommissionSchemeFormPage — répartition par défaut (R1-13)', () => {
  it('bloque « Enregistrer » tant que la répartition par défaut n’est pas confirmée', async () => {
    renderWizard()
    await goToShares()
    expect(
      await screen.findByText('Répartition par défaut — à confirmer'),
    ).toBeTruthy()
    expect((save() as HTMLButtonElement).disabled).toBe(true)
    expect(save().getAttribute('title')).toMatch(/Confirmez/)

    fireEvent.click(
      screen.getByRole('button', { name: 'Confirmer cette répartition' }),
    )
    expect((save() as HTMLButtonElement).disabled).toBe(false)
    expect(screen.getByText(/100,00 % — OK/)).toBeTruthy()
  })

  it('déplacer un curseur suffit à confirmer', async () => {
    renderWizard()
    await goToShares()
    await screen.findByText('Répartition par défaut — à confirmer')
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' })
    expect((save() as HTMLButtonElement).disabled).toBe(false)
  })
})

describe('CommissionSchemeFormPage — erreur serveur (R1-37, R1-40)', () => {
  it('affiche titre, liste des champs, action « Corriger » et l’erreur sous le champ', async () => {
    services.createCommissionScheme.mockRejectedValue(
      httpError(400, {
        message: 'Validation failed',
        errors: {
          commissionRate: 'must not be null',
          level2SellerShare: 'must be greater than 0',
        },
      }),
    )
    renderWizard()
    await goToShares()
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Confirmer cette répartition',
      }),
    )
    fireEvent.click(save())

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    const [title, options] = toast.error.mock.calls[0] as [
      string,
      {
        description: ReactNode
        action: { label: string; onClick: () => void }
      },
    ]
    expect(title).toBe(
      'Le schéma n’a pas été enregistré : des champs sont invalides',
    )
    expect(options.action.label).toBe('Corriger (étape 1)')

    // R1-40 : chaque problème sur sa propre ligne (liste), pas un « \n » perdu.
    const description = render(<>{options.description}</>)
    const items = description.container.querySelectorAll('li')
    expect(items).toHaveLength(2)
    expect(items[0].textContent).toBe(
      'Taux de commission : Ce champ est obligatoire.',
    )
    expect(items[1].textContent).toContain('Part du vendeur direct (niveau 2)')

    // Le champ fautif de l'étape courante est signalé sous sa part.
    const alerts = screen.getAllByRole('alert').map((a) => a.textContent)
    expect(alerts).toContain('Doit être supérieur à 0.')

    // L'action ramène à l'étape 1.
    options.action.onClick()
    expect(await screen.findByText('Partenaire et produit')).toBeTruthy()
  })
})
