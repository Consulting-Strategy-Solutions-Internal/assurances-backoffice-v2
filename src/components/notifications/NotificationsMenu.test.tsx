// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NotificationResponse } from '#/services/notifications'
import { NotificationsMenu } from './NotificationsMenu'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  getNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mocks.navigate,
}))

vi.mock('#/services/notifications', () => ({
  notificationKeys: {
    all: ['notifications'],
    list: (u: boolean) => ['notifications', 'list', u],
    unread: ['notifications', 'unread-count'],
  },
  getNotifications: mocks.getNotifications,
  getNotificationsUnreadCount: () => Promise.resolve(2),
  markNotificationRead: mocks.markNotificationRead,
  markAllNotificationsRead: vi.fn(),
}))

function n(over: Partial<NotificationResponse>): NotificationResponse {
  return {
    id: 1,
    type: 'TRAVEL_ISSUANCE_TO_RECONCILE',
    title: 'Émission voyage incertaine',
    body: 'Le contrat voyage 812…',
    resourceType: 'SUBSCRIPTION',
    resourceId: 812,
    read: false,
    createdAt: '2026-10-12T10:00:00',
    ...over,
  }
}

function renderMenu() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <NotificationsMenu />
    </QueryClientProvider>,
  )
}

async function openMenu() {
  const trigger = screen.getByRole('button', { name: 'Notifications' })
  fireEvent.pointerDown(trigger, { button: 0, pointerType: 'mouse' })
  fireEvent.click(trigger)
}

beforeEach(() => {
  mocks.markNotificationRead.mockResolvedValue(undefined)
  mocks.getNotifications.mockResolvedValue({
    content: [
      n({}),
      n({
        id: 2,
        type: 'PAYOUT_FUNDS_INSUFFICIENT',
        title: 'Fonds FineoPay insuffisants',
        resourceType: 'REFUND_REQUEST',
        resourceId: 12,
      }),
    ],
    page: 0,
    size: 10,
    totalElements: 2,
    totalPages: 1,
    last: true,
  })
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('NotificationsMenu (AC-11)', () => {
  it('alerte voyage : marquée lue puis ouverture du contrat', async () => {
    renderMenu()
    await openMenu()
    fireEvent.click(await screen.findByText('Émission voyage incertaine'))
    await waitFor(() =>
      expect(mocks.navigate).toHaveBeenCalledWith({
        to: '/contrats/$subscriptionId',
        params: { subscriptionId: '812' },
        search: { from: 'voyage', status: 'TO_RECONCILE', page: 0 },
      }),
    )
    expect(mocks.markNotificationRead).toHaveBeenCalledWith(1)
  })

  it('fonds insuffisants : information, aucune navigation', async () => {
    renderMenu()
    await openMenu()
    fireEvent.click(await screen.findByText('Fonds FineoPay insuffisants'))
    await waitFor(() =>
      expect(mocks.markNotificationRead).toHaveBeenCalledWith(2),
    )
    expect(mocks.navigate).not.toHaveBeenCalled()
  })
})
