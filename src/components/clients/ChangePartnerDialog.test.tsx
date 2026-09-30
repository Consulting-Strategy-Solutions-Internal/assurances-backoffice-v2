// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import type { AxiosResponse } from 'axios'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChangePartnerDialog } from './ChangePartnerDialog'

const mocks = vi.hoisted(() => ({
  reassignClientPartner: vi.fn(),
  getAllPartners: vi.fn(),
  toast: { success: vi.fn() },
}))

vi.mock('sonner', () => ({ toast: mocks.toast }))
vi.mock('#/services/clients', () => ({
  clientsKeys: { all: ['clients'] },
  reassignClientPartner: mocks.reassignClientPartner,
}))
vi.mock('#/services/partners', () => ({
  partnersAllKey: ['partners', 'all-pages'],
  getAllPartners: mocks.getAllPartners,
}))
vi.mock('#/components/layout/SearchableSelect', () => ({
  SearchableSelect: (props: {
    label: string
    value: string
    options: Array<{ value: string; label: string }>
    onChange: (v: string) => void
    disabled?: boolean
  }) => (
    <select
      aria-label={props.label}
      disabled={props.disabled}
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

const partners = [
  {
    id: 7,
    name: 'Sunu Distribution',
    distributorCode: 'SUNU',
    idSite: 1,
    createdAt: '2026-01-01T00:00:00',
    updatedAt: '2026-01-01T00:00:00',
  },
]

function httpError(status: number, data: unknown = {}) {
  const error = new AxiosError('failed')
  error.response = { status, data } as AxiosResponse
  return error
}

function renderDialog() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  const onClose = vi.fn()
  render(
    <QueryClientProvider client={queryClient}>
      <ChangePartnerDialog
        clientId={42}
        clientName="Awa Koné"
        onClose={onClose}
      />
    </QueryClientProvider>,
  )
  return { onClose, invalidate }
}

async function choose(label: string) {
  const select = screen.getByLabelText('Nouveau partenaire')
  await screen.findByRole('option', { name: 'Sunu Distribution' })
  const option = screen.getByRole<HTMLOptionElement>('option', { name: label })
  fireEvent.change(select, { target: { value: option.value } })
}

const submit = () =>
  fireEvent.click(
    screen.getByRole('button', { name: 'Confirmer le changement' }),
  )

beforeEach(() => {
  mocks.getAllPartners.mockResolvedValue({
    items: partners,
    total: 1,
    capped: false,
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ChangePartnerDialog', () => {
  it('ne confirme rien tant qu’aucun partenaire n’est choisi', async () => {
    renderDialog()
    await screen.findByRole('option', { name: 'Sunu Distribution' })
    expect(
      screen
        .getByRole('button', { name: 'Confirmer le changement' })
        .hasAttribute('disabled'),
    ).toBe(true)
  })

  it('AC-3 : rattache au partenaire choisi, explique, puis rafraîchit les listes', async () => {
    mocks.reassignClientPartner.mockResolvedValue(undefined)
    const { onClose, invalidate } = renderDialog()
    await choose('Sunu Distribution')
    expect(
      screen.getByText(/vendeurs de l’ancien partenaire n’y auront plus accès/),
    ).toBeTruthy()
    expect(
      screen.getByText(/devis et contrats déjà faits ne changent pas/),
    ).toBeTruthy()
    submit()
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(mocks.reassignClientPartner).toHaveBeenCalledWith(42, 7)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['clients'] })
    expect(mocks.toast.success).toHaveBeenCalledWith(
      'Partenaire de Awa Koné : Sunu Distribution.',
    )
  })

  it('R1-2 : sélecteur figé pendant l’envoi, toast nommé d’après le partenaire envoyé', async () => {
    let resolve: () => void = () => undefined
    mocks.reassignClientPartner.mockReturnValue(
      new Promise<void>((done) => {
        resolve = done
      }),
    )
    const { onClose } = renderDialog()
    await choose('Sunu Distribution')
    submit()
    await waitFor(() =>
      expect(
        screen
          .getByLabelText<HTMLSelectElement>('Nouveau partenaire')
          .hasAttribute('disabled'),
      ).toBe(true),
    )
    fireEvent.change(screen.getByLabelText('Nouveau partenaire'), {
      target: { value: 'none' },
    })
    resolve()
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(mocks.toast.success).toHaveBeenCalledWith(
      'Partenaire de Awa Koné : Sunu Distribution.',
    )
  })

  it('AC-3 : « Aucun partenaire » détache (partnerId null)', async () => {
    mocks.reassignClientPartner.mockResolvedValue(undefined)
    const { onClose } = renderDialog()
    await choose('Aucun partenaire')
    submit()
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(mocks.reassignClientPartner).toHaveBeenCalledWith(42, null)
  })

  it('AC-4 : 403 affiché dans le dialogue, qui reste ouvert', async () => {
    mocks.reassignClientPartner.mockRejectedValue(httpError(403))
    const { onClose } = renderDialog()
    await choose('Sunu Distribution')
    submit()
    expect(await screen.findByText(/administration NSIA/)).toBeTruthy()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('AC-4 : 404 partenaire → choix effacé et liste rechargée', async () => {
    mocks.reassignClientPartner.mockRejectedValue(
      httpError(404, { message: 'Partner not found with id: 7' }),
    )
    renderDialog()
    await choose('Sunu Distribution')
    submit()
    expect(await screen.findByText(/Ce partenaire n’existe plus/)).toBeTruthy()
    expect(
      screen.getByLabelText<HTMLSelectElement>('Nouveau partenaire').value,
    ).toBe('')
    await waitFor(() => expect(mocks.getAllPartners).toHaveBeenCalledTimes(2))
  })

  it('AC-4 : 400 affiché', async () => {
    mocks.reassignClientPartner.mockRejectedValue(
      httpError(400, { errors: { partnerId: 'REQUIRED' } }),
    )
    renderDialog()
    await choose('Sunu Distribution')
    submit()
    expect(await screen.findByText(/Choisissez un partenaire/)).toBeTruthy()
  })
})
