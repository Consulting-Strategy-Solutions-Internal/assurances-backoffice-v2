// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getLegalQualities,
  getLegalQualityWarranties,
  getLegalQualityWarranty,
  getWarranties,
  getWarranty,
  updateLegalQualityWarranty,
  updateWarranty,
} from '#/services/mrh-tariff'
import type * as MrhTariffService from '#/services/mrh-tariff'
import { LineWarrantiesScreen } from './LineWarrantiesScreen'
import { WarrantiesScreen } from './WarrantiesScreen'
import {
  FIRE,
  FLOOD,
  NON_OCCUPANT,
  NON_OCCUPANT_FIRE,
  TENANT,
  TENANT_FIRE,
  TENANT_FLOOD,
  TENANT_THEFT,
  THEFT,
  axiosError,
  fieldOf,
  page,
  renderWithClient,
} from './test-kit'

const perms = vi.hoisted(() => ({ granted: null as Set<string> | null }))
vi.mock('#/components/dashboard/use-permissions', () => ({
  usePermissions: () => ({
    permissions: perms.granted,
    can: (p: string) => perms.granted === null || perms.granted.has(p),
    canKnown: (p: string) => perms.granted?.has(p) === true,
  }),
}))
vi.mock('#/services/mrh-tariff', async (importOriginal) => ({
  ...(await importOriginal<typeof MrhTariffService>()),
  getLegalQualities: vi.fn(),
  getWarranties: vi.fn(),
  getWarranty: vi.fn(),
  updateWarranty: vi.fn(),
  getLegalQualityWarranties: vi.fn(),
  getLegalQualityWarranty: vi.fn(),
  updateLegalQualityWarranty: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

// ScrollShadow (pastilles de situation) observe sa taille.
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
)

beforeEach(() => {
  vi.clearAllMocks()
  perms.granted = null
  vi.mocked(getLegalQualities).mockResolvedValue(page([NON_OCCUPANT, TENANT]))
  vi.mocked(getWarranties).mockResolvedValue(page([THEFT, FLOOD, FIRE]))
  vi.mocked(getLegalQualityWarranties).mockResolvedValue(
    page([TENANT_THEFT, NON_OCCUPANT_FIRE, TENANT_FLOOD, TENANT_FIRE]),
  )
})
afterEach(cleanup)

function save(dialog: HTMLElement) {
  fireEvent.click(within(dialog).getByRole('button', { name: 'Enregistrer' }))
}

describe('WarrantiesScreen', () => {
  it('liste les garanties dans l’ordre de la grille, code en repère, taxe en %', async () => {
    renderWithClient(<WarrantiesScreen />)
    const table = await screen.findByRole('table')
    const names = (
      await within(table).findAllByText(/Incendie|Inondation|Vol/)
    ).map((n) => n.textContent)
    expect(names).toEqual(['Incendie', 'Inondation', 'Vol'])
    expect(within(table).getByText('FIRE')).toBeTruthy()
    expect(within(table).getByText(/25\s%/)).toBeTruthy()
    expect(
      screen.queryByRole('button', { name: /Ajouter|Supprimer/ }),
    ).toBeNull()
  })

  it('modifie libellé + taxe, relit et affiche la valeur de l’API', async () => {
    vi.mocked(updateWarranty).mockResolvedValue(FIRE)
    vi.mocked(getWarranty).mockResolvedValue({
      ...FIRE,
      name: 'Incendie et explosion',
      taxRate: 14.5,
    })
    renderWithClient(<WarrantiesScreen />)
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Modifier la garantie Incendie',
      }),
    )
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(/Taux de taxe/), {
      target: { value: '14,5' },
    })
    vi.mocked(getWarranties).mockReturnValue(new Promise(() => undefined))
    save(dialog)
    await waitFor(() => expect(getWarranty).toHaveBeenCalledWith(100))
    expect(vi.mocked(updateWarranty).mock.calls[0]).toEqual([
      100,
      { name: 'Incendie', taxRate: 14.5 },
    ])
    expect(await screen.findByText('Incendie et explosion')).toBeTruthy()
  })

  it('400 sur taxRate : message sous le champ Taux de taxe', async () => {
    vi.mocked(updateWarranty).mockRejectedValue(
      axiosError(400, {
        status: 400,
        message: 'Validation failed',
        errors: { taxRate: 'must be greater than or equal to 0' },
      }),
    )
    renderWithClient(<WarrantiesScreen />)
    fireEvent.click(
      await screen.findByRole('button', { name: 'Modifier la garantie Vol' }),
    )
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(/Taux de taxe/), {
      target: { value: '15' },
    })
    save(dialog)
    expect(
      await within(fieldOf(/Taux de taxe/)).findByText('Valeur invalide.'),
    ).toBeTruthy()
    expect(
      within(fieldOf(/Libellé/)).queryByText('Valeur invalide.'),
    ).toBeNull()
  })
})

describe('LineWarrantiesScreen', () => {
  function renderLines(situation?: 'TENANT' | 'NON_OCCUPANT_OWNER') {
    const onSituationChange = vi.fn()
    renderWithClient(
      <LineWarrantiesScreen
        situation={situation}
        onSituationChange={onSituationChange}
      />,
    )
    return onSituationChange
  }

  it('un tableau par situation : garanties résolues, tarif selon le mode', async () => {
    renderLines('TENANT')
    const table = await screen.findByRole('table')
    await within(table).findByText('Incendie')
    const rows = within(table).getAllByRole('row')
    // En-tête + 3 lignes du locataire, dans l'ordre de la grille.
    expect(rows).toHaveLength(4)
    expect(within(rows[1]).getByText('Incendie')).toBeTruthy()
    expect(within(rows[1]).getByText(/100\s% de la prime de base/)).toBeTruthy()
    expect(within(rows[1]).getAllByText('Obligatoire').length).toBeGreaterThan(
      0,
    )
    expect(
      within(rows[2]).getByText(/1\s‰ sur 25\s% des capitaux/),
    ).toBeTruthy()
    expect(within(rows[3]).getByText(/15\s000\sFCFA/)).toBeTruthy()
  })

  it('situation par défaut = la première de la grille ; changer de situation remonte le code', async () => {
    const onSituationChange = renderLines()
    const group = await screen.findByRole('group', { name: 'Situation' })
    expect(
      within(group).getByRole('button', { name: 'Locataire', pressed: true }),
    ).toBeTruthy()
    fireEvent.click(
      within(group).getByRole('button', { name: 'Propriétaire non occupant' }),
    )
    expect(onSituationChange).toHaveBeenCalledWith('NON_OCCUPANT_OWNER')
  })

  it('POURCENTAGE : seul le taux (%) ; envoie rate, relit et affiche la valeur de l’API', async () => {
    vi.mocked(updateLegalQualityWarranty).mockResolvedValue(TENANT_FIRE)
    vi.mocked(getLegalQualityWarranty).mockResolvedValue({
      ...TENANT_FIRE,
      rate: 90,
    })
    renderLines('TENANT')
    fireEvent.click(
      await screen.findByRole('button', { name: 'Modifier Incendie' }),
    )
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText('Taux (%)*')).toBeTruthy()
    expect(within(dialog).queryByLabelText(/Montant forfaitaire/)).toBeNull()
    expect(within(dialog).queryByLabelText(/Part des capitaux/)).toBeNull()
    fireEvent.change(within(dialog).getByLabelText(/Taux/), {
      target: { value: '95' },
    })
    vi.mocked(getLegalQualityWarranties).mockReturnValue(
      new Promise(() => undefined),
    )
    save(dialog)
    await waitFor(() =>
      expect(getLegalQualityWarranty).toHaveBeenCalledWith(1000),
    )
    expect(vi.mocked(updateLegalQualityWarranty).mock.calls[0]).toEqual([
      1000,
      { rate: 95 },
    ])
    expect(await screen.findByText(/90\s% de la prime de base/)).toBeTruthy()
  })

  it('CAPITAL : taux (‰) + part des capitaux, tous deux envoyés ; case Garantie obligatoire', async () => {
    vi.mocked(updateLegalQualityWarranty).mockResolvedValue(TENANT_FLOOD)
    vi.mocked(getLegalQualityWarranty).mockResolvedValue({
      ...TENANT_FLOOD,
      capitalShare: 30,
      mandatory: true,
    })
    renderLines('TENANT')
    fireEvent.click(
      await screen.findByRole('button', { name: 'Modifier Inondation' }),
    )
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText('Taux (‰)*')).toBeTruthy()
    fireEvent.change(within(dialog).getByLabelText(/Part des capitaux/), {
      target: { value: '30' },
    })
    fireEvent.click(
      within(dialog).getByRole('checkbox', { name: 'Garantie obligatoire' }),
    )
    vi.mocked(getLegalQualityWarranties).mockReturnValue(
      new Promise(() => undefined),
    )
    save(dialog)
    await waitFor(() => expect(getLegalQualityWarranty).toHaveBeenCalled())
    expect(vi.mocked(updateLegalQualityWarranty).mock.calls[0][1]).toEqual({
      rate: 1,
      capitalShare: 30,
      mandatory: true,
    })
    expect(await screen.findByText(/1\s‰ sur 30\s% des capitaux/)).toBeTruthy()
  })

  it('FORFAIT : seul le montant ; 400 REQUIRED_FOR_PREMIUM_TYPE affiché sous ce champ', async () => {
    vi.mocked(updateLegalQualityWarranty).mockRejectedValue(
      axiosError(400, {
        status: 400,
        message: 'flatAmount is required for a FORFAIT line',
        errors: { flatAmount: 'REQUIRED_FOR_PREMIUM_TYPE' },
      }),
    )
    renderLines('TENANT')
    fireEvent.click(await screen.findByRole('button', { name: 'Modifier Vol' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).queryByLabelText(/Taux/)).toBeNull()
    fireEvent.change(within(dialog).getByLabelText(/Montant forfaitaire/), {
      target: { value: '20000' },
    })
    save(dialog)
    expect(
      await within(fieldOf(/Montant forfaitaire/)).findByText(
        'Ce champ est obligatoire pour ce mode de calcul.',
      ),
    ).toBeTruthy()
    expect(getLegalQualityWarranty).not.toHaveBeenCalled()
  })

  it('400 NOT_ALLOWED_FOR_PREMIUM_TYPE sur un champ hors mode : bandeau', async () => {
    vi.mocked(updateLegalQualityWarranty).mockRejectedValue(
      axiosError(400, {
        status: 400,
        message: 'capitalShare is not allowed for a POURCENTAGE line',
        errors: { capitalShare: 'NOT_ALLOWED_FOR_PREMIUM_TYPE' },
      }),
    )
    renderLines('TENANT')
    fireEvent.click(
      await screen.findByRole('button', { name: 'Modifier Incendie' }),
    )
    const dialog = await screen.findByRole('dialog')
    save(dialog)
    expect(
      await within(dialog).findByText(
        'Part des capitaux (%) : Ce champ ne s’applique pas à ce mode de calcul.',
      ),
    ).toBeTruthy()
  })
})

describe('revue R1', () => {
  it('R1-5 : warranty:write connu et absent → Modifier désactivé', async () => {
    perms.granted = new Set(['warranty:read'])
    renderWithClient(<WarrantiesScreen />)
    const button = await screen.findByRole('button', {
      name: 'Modifier la garantie Incendie',
    })
    expect((button as HTMLButtonElement).disabled).toBe(true)
  })

  it('R1-5 : legalquality:write connu et absent → lignes non modifiables', async () => {
    perms.granted = new Set(['legalquality:read', 'warranty:read'])
    renderWithClient(
      <LineWarrantiesScreen situation="TENANT" onSituationChange={vi.fn()} />,
    )
    const button = await screen.findByRole('button', {
      name: 'Modifier Incendie',
    })
    expect((button as HTMLButtonElement).disabled).toBe(true)
  })

  it('R1-6 : mode et caractère obligatoire relayés sous le nom (colonnes masquées sur téléphone)', async () => {
    renderWithClient(
      <LineWarrantiesScreen situation="TENANT" onSituationChange={vi.fn()} />,
    )
    const table = await screen.findByRole('table')
    await within(table).findByText('Incendie')
    const rows = within(table).getAllByRole('row')
    expect(within(rows[1]).getByText('Pourcentage · Obligatoire')).toBeTruthy()
    expect(within(rows[2]).getByText('Capital · Optionnelle')).toBeTruthy()
  })

  it('R1-1 : libellé de plus de 255 caractères refusé avant l’envoi', async () => {
    renderWithClient(<WarrantiesScreen />)
    fireEvent.click(
      await screen.findByRole('button', { name: 'Modifier la garantie Vol' }),
    )
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(/Libellé/), {
      target: { value: 'a'.repeat(256) },
    })
    save(dialog)
    expect(
      await within(fieldOf(/Libellé/)).findByText('255 caractères maximum.'),
    ).toBeTruthy()
    expect(updateWarranty).not.toHaveBeenCalled()
  })

  it('R1-4 : l’erreur serveur sous Taux de taxe disparaît à la correction', async () => {
    vi.mocked(updateWarranty).mockRejectedValue(
      axiosError(400, { errors: { taxRate: 'must be >= 0' } }),
    )
    renderWithClient(<WarrantiesScreen />)
    fireEvent.click(
      await screen.findByRole('button', { name: 'Modifier la garantie Vol' }),
    )
    const dialog = await screen.findByRole('dialog')
    save(dialog)
    await within(fieldOf(/Taux de taxe/)).findByText('Valeur invalide.')
    fireEvent.change(within(dialog).getByLabelText(/Taux de taxe/), {
      target: { value: '15' },
    })
    expect(
      within(fieldOf(/Taux de taxe/)).queryByText('Valeur invalide.'),
    ).toBeNull()
  })

  it('R1-7 : montant forfaitaire saisi « 20 000 » envoyé comme 20000', async () => {
    vi.mocked(updateLegalQualityWarranty).mockResolvedValue(TENANT_THEFT)
    vi.mocked(getLegalQualityWarranty).mockResolvedValue(TENANT_THEFT)
    renderWithClient(
      <LineWarrantiesScreen situation="TENANT" onSituationChange={vi.fn()} />,
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Modifier Vol' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(/Montant forfaitaire/), {
      target: { value: '20 000' },
    })
    save(dialog)
    await waitFor(() => expect(updateLegalQualityWarranty).toHaveBeenCalled())
    expect(vi.mocked(updateLegalQualityWarranty).mock.calls[0][1]).toEqual({
      flatAmount: 20000,
    })
  })
})
