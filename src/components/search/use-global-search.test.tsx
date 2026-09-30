// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useGlobalSearch } from './use-global-search'

const svc = vi.hoisted(() => {
  const empty = (..._args: unknown[]) =>
    Promise.resolve({
      content: [],
      page: 0,
      size: 100,
      totalElements: 0,
      totalPages: 1,
      first: true,
      last: true,
    })
  return {
    getPartners: vi.fn(empty),
    getUsers: vi.fn(empty),
    getSupportConversations: vi.fn(empty),
    getClients: vi.fn(empty),
    getClaims: vi.fn(empty),
    getRoles: vi.fn(empty),
    searchOccupations: vi.fn(empty),
  }
})
vi.mock('#/services/partners', () => ({ getPartners: svc.getPartners }))
vi.mock('#/services/users', () => ({ getUsers: svc.getUsers }))
vi.mock('#/services/support', () => ({
  getSupportConversations: svc.getSupportConversations,
}))
vi.mock('#/services/clients', () => ({ getClients: svc.getClients }))
vi.mock('#/services/claims', () => ({ getClaims: svc.getClaims }))
vi.mock('#/services/roles', () => ({ getRoles: svc.getRoles }))
vi.mock('#/services/ia-standard', () => ({
  searchOccupations: svc.searchOccupations,
}))
vi.mock('#/components/dashboard/use-permissions', () => ({
  usePermissions: () => ({ can: () => true }),
}))

it('loads partners, admins and tickets newest-first (L-003, R2-9)', async () => {
  const client = new QueryClient()
  renderHook(() => useGlobalSearch('awa'), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  })
  await waitFor(() => {
    expect(svc.getPartners).toHaveBeenCalled()
    expect(svc.getUsers).toHaveBeenCalled()
    expect(svc.getSupportConversations).toHaveBeenCalled()
  })
  expect(svc.getPartners.mock.calls[0][2]).toBe('createdAt,desc')
  expect(svc.getUsers.mock.calls[0][0]).toMatchObject({
    sort: 'createdAt,desc',
  })
  expect(svc.getSupportConversations.mock.calls[0][0]).toMatchObject({
    sort: 'lastMessageAt,desc',
  })
})
