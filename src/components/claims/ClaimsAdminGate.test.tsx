// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { getMe } from '#/services/auth'
import { ClaimsAdminGate } from './ClaimsAdminGate'

vi.mock('#/services/auth', () => ({ getMe: vi.fn() }))

const mockedGetMe = vi.mocked(getMe)

function renderGate() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <ClaimsAdminGate>
        <p>Contenu sinistres</p>
      </ClaimsAdminGate>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  cleanup()
  mockedGetMe.mockReset()
})

it('allows an ADMIN account', async () => {
  mockedGetMe.mockResolvedValue({
    id: 1,
    userType: 'ADMIN',
    firstName: 'Awa',
    lastName: 'Koné',
    email: 'admin@nsia.ci',
    role: 'ADMIN',
  })
  renderGate()
  expect(await screen.findByText('Contenu sinistres')).toBeTruthy()
})

it('blocks a non-ADMIN account without rendering module actions', async () => {
  mockedGetMe.mockResolvedValue({
    id: 2,
    userType: 'ADMIN',
    firstName: 'Marc',
    lastName: 'Kouassi',
    email: 'manager@nsia.ci',
    role: 'MANAGER',
  })
  renderGate()
  expect(await screen.findByText('Droits insuffisants')).toBeTruthy()
  expect(screen.queryByText('Contenu sinistres')).toBeNull()
})
