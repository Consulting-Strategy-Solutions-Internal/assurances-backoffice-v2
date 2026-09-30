// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ShellProvider } from '#/components/dashboard/shell'
import { RouteErrorPage } from './RouteFallbacks'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  useRouter: () => ({ invalidate: vi.fn() }),
}))
vi.mock('#/services/auth', () => ({
  verifyAuth: vi.fn().mockResolvedValue({}),
}))
vi.mock('#/components/dashboard/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => (
    <nav aria-label="shell">
      <main id="main">{children}</main>
    </nav>
  ),
}))

afterEach(cleanup)

function renderError(insideShell: boolean) {
  const client = new QueryClient()
  render(
    <QueryClientProvider client={client}>
      {insideShell ? (
        <ShellProvider>
          <RouteErrorPage error={new Error('boom')} standalone />
        </ShellProvider>
      ) : (
        <RouteErrorPage error={new Error('boom')} standalone />
      )}
    </QueryClientProvider>,
  )
}

it('R1-6 : dans le shell existant, l’erreur ne monte pas un second AppShell', async () => {
  renderError(true)
  expect(await screen.findByText('Une erreur est survenue.')).toBeTruthy()
  expect(screen.queryAllByRole('navigation')).toHaveLength(0)
  expect(document.querySelectorAll('#main')).toHaveLength(0)
})

it('R1-6 : hors shell et connecté, un seul AppShell est monté', async () => {
  renderError(false)
  expect(await screen.findByRole('navigation')).toBeTruthy()
  expect(document.querySelectorAll('#main')).toHaveLength(1)
})
