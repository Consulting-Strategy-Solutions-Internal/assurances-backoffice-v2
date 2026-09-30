// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import {
  getBaseRate,
  getBaseRates,
  getLegalQualities,
  getLegalQuality,
  updateBaseRate,
  updateLegalQuality,
} from '#/services/mrh-tariff'
import type * as MrhTariffService from '#/services/mrh-tariff'
import { LegalQualitiesScreen } from './LegalQualitiesScreen'
import {
  NON_OCCUPANT,
  NON_OCCUPANT_RATE,
  TENANT,
  TENANT_RATE,
  axiosError,
  fieldOf,
  page,
  renderWithClient,
} from './test-kit'

const perms = vi.hoisted(() => ({ granted: null as Set<string> | null }))
vi.mock('#/components/dashboard/use-permissions', () => ({
  // Sémantique réelle (L-009) : null = inconnu → can() vrai.
  usePermissions: () => ({
    permissions: perms.granted,
    can: (p: string) => perms.granted === null || perms.granted.has(p),
    canKnown: (p: string) => perms.granted?.has(p) === true,
  }),
}))
vi.mock('#/services/mrh-tariff', async (importOriginal) => ({
  ...(await importOriginal<typeof MrhTariffService>()),
  getLegalQualities: vi.fn(),
  getLegalQuality: vi.fn(),
  updateLegalQuality: vi.fn(),
  getBaseRates: vi.fn(),
  getBaseRate: vi.fn(),
  updateBaseRate: vi.fn(),
}))
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}))

beforeEach(() => {
  vi.clearAllMocks()
  perms.granted = null
  // L'API renvoie NON_OCCUPANT d'abord : l'écran suit l'ordre de la grille.
  vi.mocked(getLegalQualities).mockResolvedValue(page([NON_OCCUPANT, TENANT]))
  vi.mocked(getBaseRates).mockResolvedValue(
    page([TENANT_RATE, NON_OCCUPANT_RATE]),
  )
})
afterEach(cleanup)

async function openRates(name: string) {
  fireEvent.click(
    await screen.findByRole('button', { name: `Modifier les taux de ${name}` }),
  )
  return screen.findByRole('dialog')
}

describe('LegalQualitiesScreen — lecture', () => {
  it('une carte par situation, dans l’ordre de la grille, codes en repère', async () => {
    renderWithClient(<LegalQualitiesScreen />)
    const titles = await screen.findAllByRole('heading', { level: 2 })
    expect(titles.map((h) => h.textContent)).toEqual([
      'Locataire',
      'Propriétaire non occupant',
    ])
    expect(screen.getByText('TENANT')).toBeTruthy()
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('n’affiche que les taux non nuls de la situation, avec les libellés d’écran', async () => {
    renderWithClient(<LegalQualitiesScreen />)
    await screen.findAllByText('Taux risques locatifs (‰)')
    expect(screen.getByText('Multiplicateur du loyer')).toBeTruthy()
    expect(screen.getByText('× 180')).toBeTruthy()
    expect(screen.getByText(/0,35\s‰/)).toBeTruthy()
    // Taux contenu : locataire seulement ; taux bâtiment : non occupant seulement.
    expect(screen.getAllByText('Taux contenu (‰)')).toHaveLength(1)
    expect(screen.getAllByText('Taux bâtiment (‰)')).toHaveLength(1)
    expect(screen.getByText(/0,45\s‰/)).toBeTruthy()
  })

  it('aucun bouton de création ni de suppression', async () => {
    renderWithClient(<LegalQualitiesScreen />)
    await screen.findAllByRole('heading', { level: 2 })
    expect(
      screen.queryByRole('button', { name: /Ajouter|Créer|Supprimer/ }),
    ).toBeNull()
  })
})

describe('LegalQualitiesScreen — taux de base', () => {
  it('modifie, relit et affiche la valeur renvoyée par l’API ; seul le champ changé est envoyé', async () => {
    vi.mocked(updateBaseRate).mockResolvedValue(TENANT_RATE)
    vi.mocked(getBaseRate).mockResolvedValue({
      ...TENANT_RATE,
      rentalValuePremiumRate: 0.42,
    })
    renderWithClient(<LegalQualitiesScreen />)
    const dialog = await openRates('Locataire')
    expect(within(dialog).queryByLabelText(/Taux bâtiment/)).toBeNull()
    fireEvent.change(within(dialog).getByLabelText(/Taux risques locatifs/), {
      target: { value: '0,4' },
    })
    // Rechargement de la liste en attente : seule la relecture peut afficher 0,42.
    vi.mocked(getBaseRates).mockReturnValue(new Promise(() => undefined))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(getBaseRate).toHaveBeenCalledWith(10))
    expect(vi.mocked(updateBaseRate).mock.calls[0]).toEqual([
      10,
      { rentalValuePremiumRate: 0.4 },
    ])
    // Valeur relue (0,42), pas la valeur saisie (0,4).
    expect(await screen.findByText(/0,42\s‰/)).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('400 NOT_ALLOWED_FOR_LEGAL_QUALITY : message sous le champ concerné', async () => {
    vi.mocked(updateBaseRate).mockRejectedValue(
      axiosError(400, {
        status: 400,
        message: 'contentsPremiumRate is not allowed for this legal quality',
        errors: { contentsPremiumRate: 'NOT_ALLOWED_FOR_LEGAL_QUALITY' },
      }),
    )
    renderWithClient(<LegalQualitiesScreen />)
    const dialog = await openRates('Locataire')
    fireEvent.change(within(dialog).getByLabelText(/Taux contenu/), {
      target: { value: '6' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() =>
      expect(
        within(fieldOf(/Taux contenu/)).getByText(
          'Ce taux ne s’applique pas à cette situation.',
        ),
      ).toBeTruthy(),
    )
    expect(
      within(fieldOf(/Taux risques locatifs/)).queryByText(/situation/),
    ).toBeNull()
    expect(getBaseRate).not.toHaveBeenCalled()
  })

  it('400 sur un champ masqué (REQUIRED_FOR_LEGAL_QUALITY) : affiché en bandeau avec son libellé', async () => {
    vi.mocked(updateBaseRate).mockRejectedValue(
      axiosError(400, {
        status: 400,
        message: 'buildingPremiumRate is required for this legal quality',
        errors: { buildingPremiumRate: 'REQUIRED_FOR_LEGAL_QUALITY' },
      }),
    )
    renderWithClient(<LegalQualitiesScreen />)
    const dialog = await openRates('Locataire')
    fireEvent.change(within(dialog).getByLabelText(/Taux contenu/), {
      target: { value: '6' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Enregistrer' }))
    expect(
      await within(dialog).findByText(
        'Taux bâtiment (‰) : Ce taux est obligatoire pour cette situation.',
      ),
    ).toBeTruthy()
  })

  it('refuse une saisie invalide avant l’envoi', async () => {
    renderWithClient(<LegalQualitiesScreen />)
    const dialog = await openRates('Locataire')
    fireEvent.change(within(dialog).getByLabelText(/Multiplicateur/), {
      target: { value: '0' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Enregistrer' }))
    expect(
      await within(fieldOf(/Multiplicateur/)).findByText(
        'La valeur doit être supérieure à 0.',
      ),
    ).toBeTruthy()
    expect(updateBaseRate).not.toHaveBeenCalled()
  })
})

describe('LegalQualitiesScreen — situation', () => {
  it('modifie le nom, envoie nom + description, relit et affiche le nom renvoyé', async () => {
    vi.mocked(updateLegalQuality).mockResolvedValue(TENANT)
    vi.mocked(getLegalQuality).mockResolvedValue({
      ...TENANT,
      name: 'Locataire (NSIA)',
    })
    renderWithClient(<LegalQualitiesScreen />)
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Modifier la situation Locataire',
      }),
    )
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(/Nom/), {
      target: { value: 'Locataire NSIA' },
    })
    vi.mocked(getLegalQualities).mockReturnValue(new Promise(() => undefined))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(getLegalQuality).toHaveBeenCalledWith(1))
    expect(vi.mocked(updateLegalQuality).mock.calls[0]).toEqual([
      1,
      { name: 'Locataire NSIA', description: 'Occupe un logement loué' },
    ])
    expect(
      await screen.findByRole('heading', { name: 'Locataire (NSIA)' }),
    ).toBeTruthy()
  })

  it('400 sur name : message sous le champ Nom', async () => {
    vi.mocked(updateLegalQuality).mockRejectedValue(
      axiosError(400, {
        status: 400,
        message: 'Validation failed',
        errors: { name: 'must not be blank' },
      }),
    )
    renderWithClient(<LegalQualitiesScreen />)
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Modifier la situation Locataire',
      }),
    )
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(/Nom/), {
      target: { value: 'X' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Enregistrer' }))
    expect(
      await within(fieldOf(/Nom/)).findByText('Valeur invalide.'),
    ).toBeTruthy()
  })
})

describe('revue R1', () => {
  it('R1-5 : droits connus sans écriture → boutons Modifier désactivés avec explication', async () => {
    perms.granted = new Set(['legalquality:read', 'baserate:read'])
    renderWithClient(<LegalQualitiesScreen />)
    const situation = await screen.findByRole('button', {
      name: 'Modifier la situation Locataire',
    })
    const rates = screen.getByRole('button', {
      name: 'Modifier les taux de Locataire',
    })
    expect((situation as HTMLButtonElement).disabled).toBe(true)
    expect((rates as HTMLButtonElement).disabled).toBe(true)
    expect(situation.parentElement?.getAttribute('title')).toMatch(
      /droits requis/,
    )
  })

  it('R1-5 : droits inconnus → boutons actifs (le serveur tranche)', async () => {
    renderWithClient(<LegalQualitiesScreen />)
    const rates = await screen.findByRole('button', {
      name: 'Modifier les taux de Locataire',
    })
    expect((rates as HTMLButtonElement).disabled).toBe(false)
  })

  it('R1-1 : description de plus de 255 caractères refusée avant l’envoi', async () => {
    renderWithClient(<LegalQualitiesScreen />)
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Modifier la situation Locataire',
      }),
    )
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(/Description/), {
      target: { value: 'a'.repeat(256) },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Enregistrer' }))
    expect(
      await within(fieldOf(/Description/)).findByText(
        '255 caractères maximum.',
      ),
    ).toBeTruthy()
    expect(updateLegalQuality).not.toHaveBeenCalled()
  })

  it('R1-4 : l’erreur serveur disparaît dès que le champ est corrigé', async () => {
    vi.mocked(updateLegalQuality).mockRejectedValue(
      axiosError(400, { errors: { name: 'must not be blank' } }),
    )
    renderWithClient(<LegalQualitiesScreen />)
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Modifier la situation Locataire',
      }),
    )
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(/Nom/), {
      target: { value: 'X' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Enregistrer' }))
    await within(fieldOf(/Nom/)).findByText('Valeur invalide.')
    fireEvent.change(within(dialog).getByLabelText(/Nom/), {
      target: { value: 'Locataire' },
    })
    expect(within(fieldOf(/Nom/)).queryByText('Valeur invalide.')).toBeNull()
  })

  it('R1-2 : PUT réussi mais relecture en échec → valeur du PUT affichée, pas d’erreur', async () => {
    vi.mocked(updateBaseRate).mockResolvedValue({
      ...TENANT_RATE,
      rentalValuePremiumRate: 0.41,
    })
    vi.mocked(getBaseRate).mockRejectedValue(axiosError(503, {}))
    renderWithClient(<LegalQualitiesScreen />)
    const dialog = await openRates('Locataire')
    fireEvent.change(within(dialog).getByLabelText(/Taux risques locatifs/), {
      target: { value: '0,41' },
    })
    vi.mocked(getBaseRates).mockReturnValue(new Promise(() => undefined))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Enregistrer' }))
    expect(await screen.findByText(/0,41\s‰/)).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(toast.warning).toHaveBeenCalled()
  })

  it('D-7 : un taux exigé mais vide en base a son champ', async () => {
    vi.mocked(getBaseRates).mockResolvedValue(
      page([{ ...TENANT_RATE, rentMultiplier: null }, NON_OCCUPANT_RATE]),
    )
    renderWithClient(<LegalQualitiesScreen />)
    const dialog = await openRates('Locataire')
    expect(
      within(dialog).getByLabelText(/Multiplicateur du loyer/),
    ).toBeTruthy()
  })
})
