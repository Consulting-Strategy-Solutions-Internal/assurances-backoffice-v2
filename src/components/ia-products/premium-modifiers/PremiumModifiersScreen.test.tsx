// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { getPremiumModifiers } from '#/services/ia-standard'
import { PremiumModifiersScreen } from './PremiumModifiersScreen'

vi.mock('#/services/ia-standard', () => ({
  getPremiumModifiers: vi.fn(),
  deletePremiumModifier: vi.fn(),
}))
vi.mock('#/components/dashboard/use-permissions', () => ({
  usePermissions: () => ({ can: () => true, canKnown: () => true }),
}))
vi.mock('./PremiumModifierDialog', () => ({
  PremiumModifierDialog: () => null,
}))

afterEach(cleanup)

it('page hors limites : retour à la dernière page, pas de faux état vide (R2-6)', async () => {
  vi.mocked(getPremiumModifiers).mockResolvedValue({
    content: [],
    page: 50,
    size: 20,
    totalElements: 30,
    totalPages: 2,
    last: true,
  })
  const onPageChange = vi.fn()
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PremiumModifiersScreen page={50} onPageChange={onPageChange} />
    </QueryClientProvider>,
  )
  await vi.waitFor(() => expect(onPageChange).toHaveBeenCalledWith(1))
  expect(screen.queryByText('Aucune majoration ni réduction.')).toBeNull()
})
