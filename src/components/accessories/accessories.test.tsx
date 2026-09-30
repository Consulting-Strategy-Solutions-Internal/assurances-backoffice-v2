// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { AccessoriesScreen } from './AccessoriesScreen'
import { AccessoryFormDialog } from './AccessoryFormDialog'
import { ImportAccessoriesDialog } from './ImportAccessoriesDialog'
import {
  createAccessory,
  deleteAccessory,
  getAccessories,
  importAccessoriesCsv,
  updateAccessory,
} from '#/services/accessories'
import type { AccessoryResponse } from '#/services/accessories'
import type * as AccessoriesService from '#/services/accessories'

const perms = vi.hoisted(() => ({ granted: null as Set<string> | null }))
vi.mock('#/components/dashboard/use-permissions', () => ({
  usePermissions: () => ({
    permissions: perms.granted,
    can: (p: string) => perms.granted === null || perms.granted.has(p),
    canKnown: (p: string) => perms.granted?.has(p) === true,
  }),
}))
vi.mock('#/services/accessories', async (importOriginal) => ({
  ...(await importOriginal<typeof AccessoriesService>()),
  getAccessories: vi.fn(),
  createAccessory: vi.fn(),
  updateAccessory: vi.fn(),
  deleteAccessory: vi.fn(),
  importAccessoriesCsv: vi.fn(),
}))
vi.mock('#/services/products', () => ({
  findProductByCode: vi.fn().mockResolvedValue({ productCode: 320 }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
// Select Radix remplacé par un <select> natif, pilotable dans jsdom.
vi.mock('#/components/forms/FormSelect', () => ({
  FormSelect: (p: {
    id: string
    label: string
    value: string
    options: { value: string; label: string }[]
    onChange: (v: string) => void
    hint?: string
  }) => (
    <label>
      {p.label}
      <select
        id={p.id}
        value={p.value}
        onChange={(e) => p.onChange(e.target.value)}
      >
        {p.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {p.hint && <span>{p.hint}</span>}
    </label>
  ),
}))
vi.mock('#/components/ia-products/shared/CsvDropZone', () => ({
  CsvDropZone: (p: { onFileChange: (f: File | null) => void }) => (
    <button
      type="button"
      onClick={() =>
        p.onFileChange(
          new File(
            [
              'productCode,minPremium,maxPremium,amount\n320,0,100000,5000\n320,-1,x,2',
            ],
            'a.csv',
          ),
        )
      }
    >
      pick
    </button>
  ),
}))

function axiosError(status: number, data: unknown): AxiosError {
  const config = { headers: {} } as InternalAxiosRequestConfig
  return new AxiosError('fail', String(status), config, null, {
    status,
    data,
    statusText: '',
    headers: {},
    config,
  } as AxiosResponse)
}

const LAST_BRACKET = axiosError(422, {
  status: 422,
  message:
    'The last accessory bracket of product MRH_STANDARD cannot be removed',
  errors: { subscriptions: 'LAST_ACCESSORY_HAS_ACTIVE_CONTRACT' },
})
const LAST_BRACKET_FR =
  'Impossible : c’est la dernière tranche du produit et des contrats sont en cours.'

const bracket: AccessoryResponse = {
  id: 4,
  product: 'MRH_STANDARD',
  minPremium: 0,
  maxPremium: 100000,
  amount: 5000,
  createdAt: '2026-09-30T10:00:00',
  updatedAt: '2026-09-30T10:00:00',
}

function page(content: AccessoryResponse[]) {
  return {
    content,
    page: 0,
    size: 100,
    totalElements: content.length,
    totalPages: 1,
    last: true,
  }
}

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

function type(label: RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

beforeEach(() => {
  vi.clearAllMocks()
  perms.granted = null
})
afterEach(cleanup)

describe('AccessoriesScreen', () => {
  it('liste les tranches du produit de l’écran', async () => {
    vi.mocked(getAccessories).mockResolvedValue(page([bracket]))
    renderWithClient(<AccessoriesScreen product="MRH_STANDARD" />)
    const table = await screen.findByRole('table')
    expect(await within(table).findByText(/0 – 100\s000\sFCFA/)).toBeTruthy()
    expect(vi.mocked(getAccessories).mock.calls[0][0].product).toBe(
      'MRH_STANDARD',
    )
    expect(screen.queryByText(/Aucun accessoire saisi/)).toBeNull()
  })

  it('bandeau « aucun accessoire » quand le produit n’a aucune tranche', async () => {
    vi.mocked(getAccessories).mockResolvedValue(page([]))
    renderWithClient(<AccessoriesScreen product="IA_STANDARD" />)
    expect(
      await screen.findByText(
        'Aucun accessoire saisi : les devis de ce produit sont refusés.',
      ),
    ).toBeTruthy()
  })

  it('supprime une tranche puis relit la liste', async () => {
    vi.mocked(getAccessories).mockResolvedValue(page([bracket]))
    vi.mocked(deleteAccessory).mockResolvedValue()
    renderWithClient(<AccessoriesScreen product="MRH_STANDARD" />)
    const table = await screen.findByRole('table')
    fireEvent.click(
      await within(table).findByRole('button', {
        name: 'Supprimer la tranche',
      }),
    )
    vi.mocked(getAccessories).mockResolvedValue(page([]))
    fireEvent.click(await screen.findByRole('button', { name: 'Supprimer' }))
    await waitFor(() => expect(deleteAccessory).toHaveBeenCalled())
    expect(vi.mocked(deleteAccessory).mock.calls[0][0]).toBe(4)
    expect(toast.success).toHaveBeenCalledWith('Tranche supprimée.')
    expect(
      await screen.findByText(
        'Aucun accessoire saisi : les devis de ce produit sont refusés.',
      ),
    ).toBeTruthy()
  })

  it('refus 422 LAST_ACCESSORY_HAS_ACTIVE_CONTRACT à la suppression : message clair', async () => {
    vi.mocked(getAccessories).mockResolvedValue(page([bracket]))
    vi.mocked(deleteAccessory).mockRejectedValue(LAST_BRACKET)
    renderWithClient(<AccessoriesScreen product="MRH_STANDARD" />)
    const table = await screen.findByRole('table')
    fireEvent.click(
      await within(table).findByRole('button', {
        name: 'Supprimer la tranche',
      }),
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Supprimer' }))
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(LAST_BRACKET_FR),
    )
    // R1-9 : la confirmation se ferme, rien à re-cliquer.
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
  })

  it('R1-8 : accessory:write connu et absent → ajout, import, modification et suppression désactivés', async () => {
    perms.granted = new Set(['accessory:read'])
    vi.mocked(getAccessories).mockResolvedValue(page([bracket]))
    renderWithClient(<AccessoriesScreen product="MRH_STANDARD" />)
    const table = await screen.findByRole('table')
    for (const name of ['Modifier la tranche', 'Supprimer la tranche']) {
      const b = await within(table).findByRole('button', { name })
      expect((b as HTMLButtonElement).disabled).toBe(true)
    }
  })

  it('R1-8 : accessory:read connu et absent → bandeau de permission, aucune requête', async () => {
    perms.granted = new Set(['accessory:write'])
    renderWithClient(<AccessoriesScreen product="MRH_STANDARD" />)
    expect(
      await screen.findByText(/pas la permission de consulter les accessoires/),
    ).toBeTruthy()
    expect(getAccessories).not.toHaveBeenCalled()
  })
})

describe('AccessoryFormDialog', () => {
  it('création : envoie les quatre champs, produit de l’écran par défaut', async () => {
    vi.mocked(createAccessory).mockResolvedValue(bracket)
    const onClose = vi.fn()
    renderWithClient(
      <AccessoryFormDialog product="MRH_STANDARD" onClose={onClose} />,
    )
    type(/Prime nette minimale/, '0')
    type(/Prime nette maximale/, '100000')
    type(/Frais d’accessoires/, '5000')
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter la tranche' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(vi.mocked(createAccessory).mock.calls[0][0]).toEqual({
      product: 'MRH_STANDARD',
      minPremium: 0,
      maxPremium: 100000,
      amount: 5000,
    })
  })

  it('modification : envoie la tranche modifiée', async () => {
    vi.mocked(updateAccessory).mockResolvedValue({ ...bracket, amount: 6000 })
    const onClose = vi.fn()
    renderWithClient(
      <AccessoryFormDialog
        product="MRH_STANDARD"
        accessory={bracket}
        onClose={onClose}
      />,
    )
    type(/Frais d’accessoires/, '6000')
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(vi.mocked(updateAccessory).mock.calls[0]).toEqual([
      4,
      {
        product: 'MRH_STANDARD',
        minPremium: 0,
        maxPremium: 100000,
        amount: 6000,
      },
    ])
  })

  it('déplacement refusé (422 LAST_ACCESSORY…) : bandeau clair, fenêtre ouverte', async () => {
    vi.mocked(updateAccessory).mockRejectedValue(LAST_BRACKET)
    const onClose = vi.fn()
    renderWithClient(
      <AccessoryFormDialog
        product="MRH_STANDARD"
        accessory={bracket}
        onClose={onClose}
      />,
    )
    fireEvent.change(screen.getByLabelText('Produit'), {
      target: { value: 'IA_STANDARD' },
    })
    expect(screen.getByText('La tranche quittera MRH Standard.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(await screen.findByText(LAST_BRACKET_FR)).toBeTruthy()
    expect(vi.mocked(updateAccessory).mock.calls[0][1].product).toBe(
      'IA_STANDARD',
    )
    expect(onClose).not.toHaveBeenCalled()
  })

  it('ne propose que MRH Standard et IA Standard', () => {
    renderWithClient(
      <AccessoryFormDialog product="IA_STANDARD" onClose={() => undefined} />,
    )
    const options = within(screen.getByLabelText('Produit')).getAllByRole(
      'option',
    )
    expect(options.map((o) => o.textContent)).toEqual([
      'MRH Standard',
      'IA Standard',
    ])
  })
})

describe('ImportAccessoriesDialog', () => {
  it('422 ImportResult : liste les lignes refusées, rien n’est importé', async () => {
    vi.mocked(importAccessoriesCsv).mockResolvedValue({
      imported: 0,
      errors: [
        { line: 3, message: "minPremium must be a number: '-1'" },
        { line: 0, message: 'CSV file is empty' },
      ],
    })
    const onClose = vi.fn()
    renderWithClient(
      <ImportAccessoriesDialog product="MRH_STANDARD" onClose={onClose} />,
    )
    await screen.findByText('320')
    await act(async () => screen.getByText('pick').click())
    await screen.findByText(/2 ligne\(s\) détectée\(s\)/)
    fireEvent.click(screen.getByRole('button', { name: 'Importer' }))
    expect(
      await screen.findByText(/Import refusé — 2 erreur\(s\)/),
    ).toBeTruthy()
    expect(screen.getByText(/^Ligne 3 :/)).toBeTruthy()
    expect(screen.getByText(/^Fichier :/)).toBeTruthy()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('import accepté : ferme et annonce le nombre de tranches', async () => {
    vi.mocked(importAccessoriesCsv).mockResolvedValue({
      imported: 2,
      errors: [],
    })
    const onClose = vi.fn()
    renderWithClient(
      <ImportAccessoriesDialog product="MRH_STANDARD" onClose={onClose} />,
    )
    await screen.findByText('320')
    await act(async () => screen.getByText('pick').click())
    await screen.findByText(/2 ligne\(s\) détectée\(s\)/)
    fireEvent.click(screen.getByRole('button', { name: 'Importer' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(toast.success).toHaveBeenCalledWith('2 tranches importées')
  })
})
