// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LatestContracts } from './LatestContracts'

const mocks = vi.hoisted(() => ({ items: [] as unknown[] }))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  useNavigate: () => vi.fn(),
}))
vi.mock('./queries', () => ({
  useDashboardSubscriptions: () => ({
    data: { items: mocks.items },
    isLoading: false,
    error: null,
  }),
}))

const contract = (totalPremium: number | null) => ({
  id: 1,
  clientId: 9,
  status: 'ACTIVE',
  totalPremium,
  policyNumber: 'POL-1',
  createdAt: '2026-09-20T10:00:00',
  insured: { firstName: 'Awa', lastName: 'Koné' },
})

// Sous-ligne « prime » affichée dans la 1re cellule quand la colonne Prime est masquée.
const premiumSubline = (container: HTMLElement) =>
  container.querySelector('td div.mt-0\\.5')

describe('LatestContracts', () => {
  afterEach(cleanup)

  it('n’affiche pas de sous-ligne prime vide quand la prime est absente', () => {
    mocks.items = [contract(null)]
    const { container } = render(<LatestContracts />)
    expect(premiumSubline(container)).toBeNull()
  })

  it('affiche la prime en sous-ligne sur contenu étroit', () => {
    mocks.items = [contract(75805)]
    const { container } = render(<LatestContracts />)
    expect(premiumSubline(container)?.textContent).toMatch(/75\D805\D+FCFA/)
  })
})
