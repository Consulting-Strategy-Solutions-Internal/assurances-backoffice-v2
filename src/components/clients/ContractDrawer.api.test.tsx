// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { api } from '#/lib/api'
import { ContractDrawer } from './ContractDrawer'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('AC-5 : n’appelle jamais les routes de signature ni de pièces d’identité (vrais services)', async () => {
  const get = vi.spyOn(api, 'get').mockImplementation((url: string) => {
    if (url === '/subscriptions/7')
      return Promise.resolve({
        data: {
          id: 7,
          clientId: 2,
          status: 'ACTIVE',
          policyNumber: 'IA-2026-000042',
          amendmentNumber: 0,
          signed: true,
          identityDocuments: [{ type: 'NATIONAL_ID', front: true, back: true }],
        },
      })
    if (url === '/subscriptions/7/renewal')
      return Promise.resolve({ data: null })
    if (url === '/subscription-amendments')
      return Promise.resolve({
        data: {
          content: [],
          page: 0,
          size: 100,
          totalElements: 0,
          totalPages: 0,
          last: true,
        },
      })
    return Promise.reject(new Error(`unexpected ${url}`))
  })
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <ContractDrawer subscriptionId={7} onClose={() => undefined} />
    </QueryClientProvider>,
  )
  await screen.findByText('Carte nationale d’identité — recto et verso')
  await screen.findByText('Aucune quittance disponible.')
  const urls = get.mock.calls.map((c) => String(c[0]))
  expect(urls).toEqual(
    expect.arrayContaining([
      '/subscriptions/7',
      '/subscriptions/7/renewal',
      '/subscription-amendments',
    ]),
  )
  expect(urls.some((u) => /signature|identity-document/.test(u))).toBe(false)
})
