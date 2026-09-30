import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { usePermissions } from '#/components/dashboard/use-permissions'
import { isForbidden } from '#/lib/api-error'
import { fetchAllPages } from '#/lib/fetch-all-pages'
import { getClaims } from '#/services/claims'
import { getClients } from '#/services/clients'
import { searchOccupations } from '#/services/ia-standard'
import { getPartners } from '#/services/partners'
import { getRoles } from '#/services/roles'
import { getSupportConversations } from '#/services/support'
import { getUsers } from '#/services/users'
import {
  buildGroups,
  occupationResults,
  searchAdmins,
  searchClaims,
  searchClients,
  searchPages,
  searchPartners,
  searchTickets,
  suggestedPages,
} from './search-logic'
import type {
  SearchGroup,
  SearchSourceError,
  SectionInput,
} from './search-logic'

const FIVE_MINUTES = 5 * 60_000
const CACHE = { staleTime: FIVE_MINUTES, retry: false } as const

function sourceError(error: unknown): SearchSourceError | undefined {
  if (!error) return undefined
  return isForbidden(error) ? 'forbidden' : 'failed'
}

/**
 * Data behind the global search. Datasets (clients, partners, admins, tickets,
 * claims) are loaded whole through `fetchAllPages` and cached, but only once
 * the user has typed something; occupations are searched server-side
 * (≥ 2 characters). `query` is the debounced text.
 */
export function useGlobalSearch(query: string): {
  groups: SearchGroup[]
  /** True once the field has text. */
  searching: boolean
  /** Some source is still loading. */
  loading: boolean
} {
  const term = query.trim()
  const searching = term.length > 0
  const { can } = usePermissions()

  const clients = useQuery({
    queryKey: ['global-search', 'clients'],
    queryFn: () =>
      fetchAllPages((page, size) => getClients(page, size, 'lastName,asc')),
    enabled: searching && can('client:read'),
    ...CACHE,
  })
  const partners = useQuery({
    queryKey: ['global-search', 'partners'],
    queryFn: () =>
      fetchAllPages((page, size) => getPartners(page, size, 'createdAt,desc')),
    enabled: searching && can('partner:read'),
    ...CACHE,
  })
  const users = useQuery({
    queryKey: ['global-search', 'users'],
    queryFn: () =>
      fetchAllPages((page, size) =>
        getUsers({ page, size, sort: 'createdAt,desc' }),
      ),
    enabled: searching && can('iam:read'),
    ...CACHE,
  })
  const roles = useQuery({
    queryKey: ['roles-all'],
    queryFn: () => getRoles(0, 200),
    enabled: searching && can('iam:read'),
    ...CACHE,
  })
  const tickets = useQuery({
    queryKey: ['global-search', 'tickets'],
    queryFn: () =>
      fetchAllPages((page, size) =>
        getSupportConversations({ page, size, sort: 'lastMessageAt,desc' }),
      ),
    enabled: searching && can('support:write'),
    ...CACHE,
  })
  const claims = useQuery({
    queryKey: ['global-search', 'claims'],
    queryFn: () =>
      fetchAllPages((page, size) =>
        getClaims({ page, size, sort: 'createdAt,desc' }),
      ),
    enabled: searching && can('claim:read'),
    ...CACHE,
  })
  const occupations = useQuery({
    queryKey: ['global-search', 'occupations', term],
    queryFn: () => searchOccupations({ q: term, size: 5 }),
    enabled: term.length >= 2 && can('riskclass:read'),
    staleTime: 60_000,
    retry: false,
  })

  const sections = useMemo<SectionInput[]>(() => {
    if (!searching) return [{ id: 'pages', results: suggestedPages() }]
    return [
      { id: 'pages', results: searchPages(term) },
      {
        id: 'clients',
        results: searchClients(clients.data?.items ?? [], term),
        loading: clients.isPending && clients.fetchStatus !== 'idle',
        error: sourceError(clients.error),
      },
      {
        id: 'claims',
        results: searchClaims(claims.data?.items ?? [], term),
        loading: claims.isPending && claims.fetchStatus !== 'idle',
        error: sourceError(claims.error),
      },
      {
        id: 'tickets',
        results: searchTickets(tickets.data?.items ?? [], term),
        loading: tickets.isPending && tickets.fetchStatus !== 'idle',
        error: sourceError(tickets.error),
      },
      {
        id: 'partners',
        results: searchPartners(partners.data?.items ?? [], term),
        loading: partners.isPending && partners.fetchStatus !== 'idle',
        error: sourceError(partners.error),
      },
      {
        id: 'admins',
        results: searchAdmins(
          users.data?.items ?? [],
          term,
          roles.data?.content,
        ),
        loading: users.isPending && users.fetchStatus !== 'idle',
        error: sourceError(users.error),
      },
      {
        id: 'occupations',
        results: occupationResults(occupations.data?.content ?? []),
        loading: occupations.isFetching,
        error: sourceError(occupations.error),
      },
    ]
  }, [
    searching,
    term,
    clients.data,
    clients.isPending,
    clients.fetchStatus,
    clients.error,
    claims.data,
    claims.isPending,
    claims.fetchStatus,
    claims.error,
    tickets.data,
    tickets.isPending,
    tickets.fetchStatus,
    tickets.error,
    partners.data,
    partners.isPending,
    partners.fetchStatus,
    partners.error,
    users.data,
    users.isPending,
    users.fetchStatus,
    users.error,
    roles.data,
    occupations.data,
    occupations.isFetching,
    occupations.error,
  ])

  const groups = useMemo(
    () => buildGroups(sections, undefined, term),
    [sections, term],
  )
  return { groups, searching, loading: sections.some((s) => s.loading) }
}
