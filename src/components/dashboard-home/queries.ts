import { useQuery } from '@tanstack/react-query'
import { isForbidden } from '#/lib/api-error'
import { fetchAllPages } from '#/lib/fetch-all-pages'
import { getClaims } from '#/services/claims'
import { getClients } from '#/services/clients'
import { getCommissionDistributions } from '#/services/commission-distributions'
import { getQuotations } from '#/services/quotations'
import { getSubscriptions } from '#/services/subscriptions'
import {
  getSupportConversations,
  getSupportUnreadCount,
} from '#/services/support'

/**
 * Every dashboard block owns its queries so it loads — and fails — on its own
 * (a 403 on one endpoint must not blank the page). No stats endpoint exists:
 * figures are aggregated client-side from the list endpoints.
 */
const BASE = {
  staleTime: 60_000,
  // Never retry a 403; retry anything else once.
  retry: (count: number, error: unknown) => !isForbidden(error) && count < 1,
} as const

export function useDashboardSubscriptions() {
  return useQuery({
    ...BASE,
    queryKey: ['dashboard', 'subscriptions'],
    queryFn: () =>
      fetchAllPages((page, size) =>
        getSubscriptions({ page, size, sort: 'createdAt,desc' }),
      ),
  })
}

/** Exact contract counts (`totalElements`), independent of the loaded-list cap. */
export function useDashboardContractCounts() {
  return useQuery({
    ...BASE,
    queryKey: ['dashboard', 'subscriptions', 'counts'],
    queryFn: async () => {
      const [active, pending] = await Promise.all([
        getSubscriptions({ status: 'ACTIVE', size: 1 }),
        getSubscriptions({ status: 'PENDING_PAYMENT', size: 1 }),
      ])
      return {
        active: active.totalElements,
        pending: pending.totalElements,
      }
    },
  })
}

export function useDashboardQuotations() {
  return useQuery({
    ...BASE,
    queryKey: ['dashboard', 'quotations'],
    queryFn: () =>
      fetchAllPages((page, size) =>
        getQuotations({ page, size, sort: 'createdAt,desc' }),
      ),
  })
}

export function useDashboardClients() {
  return useQuery({
    ...BASE,
    queryKey: ['dashboard', 'clients'],
    queryFn: () =>
      fetchAllPages((page, size) => getClients(page, size, 'createdAt,desc')),
  })
}

/** Open claims: exact counts from `totalElements`, plus the 5 oldest awaiting action. */
export function useDashboardClaims() {
  return useQuery({
    ...BASE,
    queryKey: ['dashboard', 'claims'],
    queryFn: async () => {
      const oldest = (
        status: 'SUBMITTED' | 'UNDER_REVIEW' | 'INFO_REQUESTED',
        size: number,
      ) => getClaims({ status, page: 0, size, sort: 'createdAt,asc' })
      const [submitted, review, info] = await Promise.all([
        oldest('SUBMITTED', 5),
        oldest('UNDER_REVIEW', 5),
        oldest('INFO_REQUESTED', 1),
      ])
      return {
        toProcess: [...submitted.content, ...review.content]
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
          .slice(0, 5),
        toProcessCount: submitted.totalElements + review.totalElements,
        openCount:
          submitted.totalElements + review.totalElements + info.totalElements,
      }
    },
  })
}

export function useDashboardSupport() {
  return useQuery({
    ...BASE,
    queryKey: ['dashboard', 'support', 'open'],
    queryFn: async () => {
      const [open, inProgress] = await Promise.all([
        getSupportConversations({ status: 'OPEN', page: 0, size: 1 }),
        getSupportConversations({ status: 'IN_PROGRESS', page: 0, size: 1 }),
      ])
      return {
        open: open.totalElements,
        inProgress: inProgress.totalElements,
      }
    },
  })
}

export function useDashboardSupportUnread() {
  return useQuery({
    ...BASE,
    queryKey: ['dashboard', 'support', 'unread'],
    queryFn: getSupportUnreadCount,
  })
}

export function useDashboardHeldCommissions() {
  return useQuery({
    ...BASE,
    queryKey: ['dashboard', 'commissions', 'on-hold'],
    queryFn: async () => {
      const page = await getCommissionDistributions({
        status: 'ON_HOLD',
        page: 0,
        size: 5,
      })
      return {
        total: page.totalElements,
        reasons: page.content
          .map((d) => d.holdReason)
          .filter((r): r is string => !!r),
      }
    },
  })
}
