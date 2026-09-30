// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getFormulas } from '#/services/ia-for-all'
import { FormulasScreen } from './FormulasScreen'

vi.mock('#/components/dashboard/use-permissions', () => ({
  usePermissions: () => ({
    permissions: null,
    can: () => true,
    canKnown: () => true,
  }),
}))
vi.mock('#/services/ia-for-all', () => ({
  getFormulas: vi.fn(),
  activateFormula: vi.fn(),
  deactivateFormula: vi.fn(),
}))
vi.mock('./FormulaDialog', () => ({
  FormulaDialog: ({ formula }: { formula?: { label: string } }) =>
    formula ? <div role="dialog">Édition {formula.label}</div> : null,
}))

const formula = {
  id: 4,
  label: 'Formule Sérénité',
  displayOrder: 2,
  status: 'ACTIVE',
  deathCapital: 1_000_000,
  permanentDisabilityCapital: 2_000_000,
  medicalExpenses: 300_000,
  dailyAllowance: 5_000,
  netPremium: 10_000,
  fees: 1_000,
  tax: 500,
  grossPremium: 11_500,
  createdAt: '2026-01-01T00:00:00',
  updatedAt: '2026-01-01T00:00:00',
}

function renderScreen() {
  vi.mocked(getFormulas).mockResolvedValue([formula] as never)
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <FormulasScreen />
    </QueryClientProvider>,
  )
}

describe('FormulasScreen — cartes mobiles', () => {
  afterEach(cleanup)

  it('la carte et la ligne du tableau portent le même nom accessible d’édition', async () => {
    renderScreen()
    const table = await screen.findByRole('table')
    const name = 'Modifier la formule Formule Sérénité'
    await within(table).findByRole('button', { name })
    const cards = screen.getByRole('list')
    expect(within(cards).getByText('Formule Sérénité')).toBeTruthy()
    expect(within(cards).getByText('Ordre 2')).toBeTruthy()
    fireEvent.click(within(cards).getByRole('button', { name }))
    expect(screen.getByRole('dialog').textContent).toContain(
      'Édition Formule Sérénité',
    )
  })
})
