import { pageHead } from '#/lib/page-title'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Headset } from 'lucide-react'
import { z } from 'zod'
import { PageHeader } from '#/components/dashboard/PageHeader'
import { StatusPill } from '#/components/dashboard/StatusPill'
import {
  ClickableRow,
  DataTableCard,
  DataTableCell,
  DataTableHead,
  RowChevron,
  TableEmptyState,
  TableErrorState,
  TableSkeletonRows,
} from '#/components/layout/DataTable'
import { EntityAvatar } from '#/components/layout/EntityAvatar'
import {
  MobileCardContent,
  MobileCardList,
} from '#/components/layout/MobileCardList'
import { SegmentedPills } from '#/components/layout/SegmentedPills'
import {
  ResultCount,
  Toolbar,
  ToolbarSearch,
} from '#/components/layout/Toolbar'
import { TruncatedText } from '#/components/layout/TruncatedText'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { SupportStatusBadge } from '#/components/support/SupportStatusBadge'
import { Button } from '#/components/ui/button'
import { Pagination } from '#/components/ui/Pagination'
import { Table, TableBody, TableHeader, TableRow } from '#/components/ui/table'
import { formatClaimDate, mapClaimError } from '#/lib/claims'
import {
  filterSupportConversations,
  SUPPORT_STATUS_LABELS,
} from '#/lib/support'
import type { SupportAgentFilter } from '#/lib/support'
import { formatPersonName } from '#/lib/people'
import { getMe } from '#/services/auth'
import { cn } from '#/lib/utils'
import {
  getAllSupportConversations,
  getSupportUnreadCount,
  SUPPORT_STATUSES,
  supportKeys,
} from '#/services/support'
import type { SupportStatus } from '#/services/support'

const searchSchema = z.object({
  status: z.enum(SUPPORT_STATUSES).optional().catch(undefined),
  agent: z.enum(['me', 'unassigned']).optional().catch(undefined),
  q: z.string().optional().catch(undefined),
  page: z.coerce.number().int().min(0).catch(0),
  size: z.coerce.number().int().min(1).max(100).catch(20),
})

export const Route = createFileRoute('/_auth/support')({
  head: pageHead('Support client'),
  validateSearch: searchSchema,
  component: SupportListRoute,
})

const COLUMNS = 6

export function SupportListRoute() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  // Le backend ne filtre que par statut : on charge toute la file (courte) et
  // on filtre (recherche, agent) et pagine côté client.
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: supportKeys.queue(search.status),
    queryFn: () => getAllSupportConversations(search.status),
    // La file est partagée entre agents : on la rafraîchit périodiquement.
    refetchInterval: 30_000,
    retry: false,
  })
  const { data: unread } = useQuery({
    queryKey: supportKeys.unread,
    queryFn: getSupportUnreadCount,
    refetchInterval: 30_000,
    retry: false,
  })
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe })
  const myName = me ? formatPersonName(me.firstName, me.lastName) : undefined

  const updateSearch = (patch: Partial<typeof search>) =>
    navigate({
      search: (previous) => ({ ...previous, ...patch, page: patch.page ?? 0 }),
      replace: true,
    })

  // Recherche : saisie locale, synchronisée (différée) dans l'URL.
  const [query, setQuery] = useState(search.q ?? '')
  const pushedQuery = useRef(search.q ?? '')
  useEffect(() => {
    const next = query.trim() === '' ? '' : query
    if (next === pushedQuery.current) return
    const timer = setTimeout(() => {
      pushedQuery.current = next
      void updateSearch({ q: next === '' ? undefined : next })
    }, 250)
    return () => clearTimeout(timer)
  }, [query])
  useEffect(() => {
    const urlValue = search.q ?? ''
    if (urlValue !== pushedQuery.current) {
      pushedQuery.current = urlValue
      setQuery(urlValue)
    }
  }, [search.q])

  const all = useMemo(() => data?.items ?? [], [data])
  const filtered = useMemo(
    () =>
      filterSupportConversations(all, {
        query: search.q ?? '',
        agent: search.agent ?? 'all',
        myName,
      }),
    [all, search.q, search.agent, myName],
  )
  const totalPages = Math.max(1, Math.ceil(filtered.length / search.size))
  const page = Math.min(search.page, totalPages - 1)
  const conversations = filtered.slice(
    page * search.size,
    (page + 1) * search.size,
  )
  const filtering =
    search.status !== undefined ||
    search.agent !== undefined ||
    Boolean(search.q)
  const forbidden = error ? mapClaimError(error).kind === 'forbidden' : false
  const open = (id: number) =>
    navigate({
      to: '/support/$conversationId',
      params: { conversationId: String(id) },
    })
  const resetFilters = () => {
    setQuery('')
    void navigate({ search: { page: 0, size: search.size }, replace: true })
  }

  return (
    <>
      <PageHeader
        title="Support client"
        subtitle="Demandes envoyées depuis l’application mobile, dans une file commune à tous les agents."
      >
        {unread !== undefined && unread > 0 && (
          <StatusPill tone="warning">
            {unread} message{unread > 1 ? 's' : ''} non lu
            {unread > 1 ? 's' : ''}
          </StatusPill>
        )}
      </PageHeader>

      <Toolbar
        search={
          <ToolbarSearch
            label="Rechercher un ticket"
            placeholder="Sujet, n° de ticket, agent…"
            value={query}
            onChange={setQuery}
          />
        }
        filters={
          <>
            <Select
              value={search.status ?? 'all'}
              onValueChange={(value) =>
                void updateSearch({
                  status:
                    value === 'all' ? undefined : (value as SupportStatus),
                })
              }
            >
              <SelectTrigger
                aria-label="Statut"
                className="h-10 rounded-[10px] bg-card @xl/main:w-[160px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {SUPPORT_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {SUPPORT_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <SegmentedPills<SupportAgentFilter>
              label="Agent"
              value={search.agent ?? 'all'}
              onChange={(value) =>
                void updateSearch({
                  agent: value === 'all' ? undefined : value,
                })
              }
              options={[
                { value: 'all', label: 'Tous' },
                { value: 'me', label: 'Mes tickets' },
                { value: 'unassigned', label: 'Non assignés' },
              ]}
            />
          </>
        }
        actions={
          filtering ? (
            <Button
              type="button"
              variant="ghost"
              className="rounded-[11px]"
              onClick={resetFilters}
            >
              Réinitialiser les filtres
            </Button>
          ) : undefined
        }
      />

      <ResultCount
        note={
          data?.capped
            ? `Affichage limité aux ${all.length} tickets les plus récents sur ${data.total}.`
            : undefined
        }
      >
        {isLoading
          ? 'Chargement…'
          : error
            ? '—'
            : `${filtered.length} ticket${filtered.length > 1 ? 's' : ''}${
                filtered.length !== all.length ? ` sur ${all.length}` : ''
              }`}
      </ResultCount>

      <DataTableCard
        mobileCards={
          <MobileCardList
            items={conversations}
            getKey={(conversation) => conversation.id}
            onActivate={(conversation) => void open(conversation.id)}
            isLoading={isLoading}
            skeletonCount={6}
            error={!!error}
            forbidden={forbidden}
            errorTitle="Impossible de charger la file de support."
            errorAction={
              <Button
                variant="outline"
                className="rounded-[11px]"
                onClick={() => void refetch()}
              >
                Réessayer
              </Button>
            }
            empty={{
              icon: Headset,
              title: filtering
                ? 'Aucun ticket ne correspond à votre recherche.'
                : 'Aucune demande de support pour le moment.',
              description: filtering
                ? undefined
                : 'Les demandes des clients apparaîtront ici dès leur envoi.',
              action: filtering ? (
                <Button
                  variant="outline"
                  className="rounded-[11px]"
                  onClick={resetFilters}
                >
                  Réinitialiser les filtres
                </Button>
              ) : undefined,
            }}
            renderCard={(conversation) => (
              <MobileCardContent
                title={conversation.subject}
                subtitle={`Ticket #${conversation.id}${
                  conversation.handledByName?.trim()
                    ? ` · ${conversation.handledByName.trim()}`
                    : ''
                }`}
                status={<SupportStatusBadge status={conversation.status} />}
                meta={
                  <>
                    {conversation.unreadCount > 0 && (
                      <StatusPill tone="warning">
                        {conversation.unreadCount} non lu
                        {conversation.unreadCount > 1 ? 's' : ''}
                      </StatusPill>
                    )}{' '}
                    {formatClaimDate(conversation.lastMessageAt, true)}
                  </>
                }
              />
            )}
          />
        }
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <DataTableHead first sticky="left">
                Sujet
              </DataTableHead>
              <DataTableHead>Statut</DataTableHead>
              <DataTableHead hideBelow="md">Pris en charge par</DataTableHead>
              <DataTableHead>Dernière activité</DataTableHead>
              <DataTableHead hideBelow="lg">Créé le</DataTableHead>
              <DataTableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeletonRows
                columns={[56, 18, 32, 32, 32]}
                hideBelow={[undefined, undefined, 'md', undefined, 'lg']}
                trailing
                rows={6}
              />
            ) : error ? (
              <TableErrorState
                colSpan={COLUMNS}
                forbidden={forbidden}
                title="Impossible de charger la file de support."
                action={
                  <Button
                    variant="outline"
                    className="rounded-[11px]"
                    onClick={() => void refetch()}
                  >
                    Réessayer
                  </Button>
                }
              />
            ) : conversations.length === 0 ? (
              <TableEmptyState
                colSpan={COLUMNS}
                icon={Headset}
                title={
                  filtering
                    ? 'Aucun ticket ne correspond à votre recherche.'
                    : 'Aucune demande de support pour le moment.'
                }
                description={
                  filtering
                    ? undefined
                    : 'Les demandes des clients apparaîtront ici dès leur envoi.'
                }
                action={
                  filtering ? (
                    <Button
                      variant="outline"
                      className="rounded-[11px]"
                      onClick={resetFilters}
                    >
                      Réinitialiser les filtres
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              conversations.map((conversation) => {
                const hasUnread = conversation.unreadCount > 0
                const handler = conversation.handledByName?.trim()
                return (
                  <ClickableRow
                    key={conversation.id}
                    onActivate={() => void open(conversation.id)}
                    aria-label={`Ouvrir le ticket ${conversation.subject}`}
                  >
                    <DataTableCell
                      first
                      sticky="left"
                      className="max-w-[16rem] @4xl/main:max-w-[340px]"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          aria-hidden
                          className={cn(
                            'size-2 shrink-0 rounded-full',
                            hasUnread ? 'bg-[#ffc61e]' : 'bg-transparent',
                          )}
                        />
                        <div className="min-w-0">
                          <TruncatedText
                            className={cn(
                              hasUnread ? 'font-bold' : 'font-semibold',
                            )}
                          >
                            {conversation.subject}
                          </TruncatedText>
                          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                            Ticket #{conversation.id}
                            {hasUnread && (
                              <StatusPill tone="warning">
                                {conversation.unreadCount} non lu
                                {conversation.unreadCount > 1 ? 's' : ''}
                              </StatusPill>
                            )}
                          </div>
                        </div>
                      </div>
                    </DataTableCell>
                    <DataTableCell>
                      <SupportStatusBadge status={conversation.status} />
                    </DataTableCell>
                    <DataTableCell hideBelow="md">
                      {handler ? (
                        <div className="flex items-center gap-2">
                          <EntityAvatar
                            name={handler}
                            className="size-7 text-[11px]"
                          />
                          <span className="font-medium">{handler}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap tabular-nums">
                      {formatClaimDate(conversation.lastMessageAt, true)}
                    </DataTableCell>
                    <DataTableCell
                      hideBelow="lg"
                      className="whitespace-nowrap text-muted-foreground tabular-nums"
                    >
                      {formatClaimDate(conversation.createdAt, true)}
                    </DataTableCell>
                    <RowChevron />
                  </ClickableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </DataTableCard>
      <Pagination
        page={page}
        totalPages={totalPages}
        isLast={page >= totalPages - 1}
        onPrev={() => void updateSearch({ page: page - 1 })}
        onNext={() => void updateSearch({ page: page + 1 })}
      />
    </>
  )
}
