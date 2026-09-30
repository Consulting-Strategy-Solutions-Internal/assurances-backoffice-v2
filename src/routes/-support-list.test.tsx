// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import type * as SupportService from '#/services/support'
import { SupportListRoute } from './_auth/support'

const mocks = vi.hoisted(() => ({
  getMe: vi.fn(),
  getAllSupportConversations: vi.fn(),
  getSupportUnreadCount: vi.fn(),
  navigate: vi.fn(),
  search: {},
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => ({
    ...(options as object),
    fullPath: '/_auth/support',
    useSearch: () => mocks.search,
  }),
  lazyRouteComponent: () => () => null,
  useNavigate: () => mocks.navigate,
}))

vi.mock('#/services/auth', () => ({ getMe: mocks.getMe }))

vi.mock('#/services/support', async (importOriginal) => ({
  ...(await importOriginal<typeof SupportService>()),
  getAllSupportConversations: mocks.getAllSupportConversations,
  getSupportUnreadCount: mocks.getSupportUnreadCount,
}))

const conversation = (id: number, subject: string, handledByName?: string) => ({
  id,
  subject,
  status: 'IN_PROGRESS',
  handledByName: handledByName ?? null,
  lastMessageAt: '2026-09-20T10:00:00',
  unreadCount: 0,
  createdAt: '2026-09-19T10:00:00',
})

function renderList(capped = false) {
  mocks.getMe.mockResolvedValue({ firstName: 'Admin', lastName: 'NSIA' })
  mocks.getSupportUnreadCount.mockResolvedValue(0)
  mocks.getAllSupportConversations.mockResolvedValue({
    items: [
      conversation(1, 'Ticket de moi', 'Admin NSIA'),
      conversation(2, 'Ticket de Jean', 'Jean Dupont'),
      conversation(3, 'Ticket libre'),
    ],
    total: capped ? 5000 : 3,
    capped,
  })
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <SupportListRoute />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  mocks.search = {}
})

describe('Support — « Mes tickets »', () => {
  it('ne garde que les tickets pris en charge par l’agent connecté (getMe)', async () => {
    mocks.search = { agent: 'me', page: 0, size: 20 }
    renderList()
    expect(
      await within(screen.getByRole('table')).findByText('Ticket de moi'),
    ).toBeTruthy()
    expect(screen.queryByText('Ticket de Jean')).toBeNull()
    expect(screen.queryByText('Ticket libre')).toBeNull()
    expect(mocks.getMe).toHaveBeenCalled()
  })

  it('pousse agent=me dans l’URL au clic sur « Mes tickets »', async () => {
    mocks.search = { page: 0, size: 20 }
    renderList()
    await within(screen.getByRole('table')).findByText('Ticket de Jean')
    fireEvent.click(screen.getByText('Mes tickets'))
    expect(mocks.navigate).toHaveBeenCalled()
    const arg = mocks.navigate.mock.calls[0][0] as {
      search: (p: object) => object
    }
    expect(arg.search({})).toMatchObject({ agent: 'me', page: 0 })
  })

  it('affiche une carte par ticket sous md et ouvre le ticket', async () => {
    mocks.search = { page: 0, size: 20 }
    renderList()
    const cards = within(screen.getByRole('list'))
    const card = await cards.findByText('Ticket de Jean')
    fireEvent.click(card.closest('[role="button"]') as HTMLElement)
    expect(mocks.navigate).toHaveBeenCalledWith({
      to: '/support/$conversationId',
      params: { conversationId: '2' },
    })
  })

  it('signale la limite quand la file est plafonnée', async () => {
    mocks.search = { page: 0, size: 20 }
    renderList(true)
    expect(
      await screen.findByText(/Affichage limité aux 3 tickets/),
    ).toBeTruthy()
  })
})
