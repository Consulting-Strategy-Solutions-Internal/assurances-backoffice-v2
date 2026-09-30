import { pageHead } from '#/lib/page-title'
import { useMemo } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Mail, Phone, UserPlus, UserRound, Users } from 'lucide-react'
import { z } from 'zod'
import { ClientAvatar } from '#/components/clients/ClientAvatar'
import { VerificationIcons } from '#/components/clients/VerificationIcons'
import { KpiCard } from '#/components/dashboard/KpiCard'
import {
  ClickableRow,
  DataTableCard,
  DataTableHead,
  FIRST_CELL_CLASS,
  RowChevron,
  TableEmptyState,
  TableErrorState,
  TableSkeletonRows,
} from '#/components/layout/DataTable'
import { KpiRow } from '#/components/layout/KpiRow'
import { TruncatedText } from '#/components/layout/TruncatedText'
import { SegmentedPills } from '#/components/layout/SegmentedPills'
import {
  ResultCount,
  Toolbar,
  ToolbarSearch,
} from '#/components/layout/Toolbar'
import { PageHeader } from '#/components/dashboard/PageHeader'
import { Pagination } from '#/components/ui/Pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import {
  clientAddress,
  clientEmail,
  clientFullName,
  computeClientStats,
  filterClients,
  formatPhone,
} from '#/lib/clients'
import type { GenderFilter, VerificationFilter } from '#/lib/clients'
import { formatClaimDate, mapClaimError } from '#/lib/claims'
import { Button } from '#/components/ui/button'
import { clientsKeys, getAllClients } from '#/services/clients'

const searchSchema = z.object({
  q: z.string().optional().catch(undefined),
  verification: z
    .enum(['all', 'verified', 'unverified'])
    .optional()
    .catch(undefined),
  gender: z.enum(['all', 'HOMME', 'FEMME']).optional().catch(undefined),
  page: z.coerce.number().int().min(0).catch(0),
  size: z.coerce.number().int().min(1).max(100).catch(20),
  sort: z
    .enum(['lastName,asc', 'lastName,desc', 'createdAt,desc', 'createdAt,asc'])
    .catch('lastName,asc'),
})

export const Route = createFileRoute('/_auth/clients')({
  head: pageHead('Clients'),
  validateSearch: searchSchema,
  component: ClientsPage,
})

export function ClientsPage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const query = search.q ?? ''
  const verification: VerificationFilter = search.verification ?? 'all'
  const gender: GenderFilter = search.gender ?? 'all'

  // The API has no text search / verification / gender filter: every client
  // is loaded (sorted server-side) and filtered + paginated here, so the
  // counters and the search always cover the whole base.
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: clientsKeys.everyone(search.sort),
    queryFn: () => getAllClients(search.sort),
    retry: false,
  })

  const clients = useMemo(() => data?.items ?? [], [data])
  const stats = useMemo(() => computeClientStats(clients), [clients])
  const filtered = useMemo(
    () => filterClients(clients, { query, verification, gender }),
    [clients, query, verification, gender],
  )
  const totalPages = Math.max(1, Math.ceil(filtered.length / search.size))
  const page = Math.min(search.page, totalPages - 1)
  const rows = filtered.slice(page * search.size, (page + 1) * search.size)
  const pct = stats.total
    ? Math.round((stats.phoneVerified / stats.total) * 100)
    : 0
  const filtering =
    query.trim() !== '' || verification !== 'all' || gender !== 'all'
  const forbidden = !!error && mapClaimError(error).kind === 'forbidden'

  const setPage = (next: number) =>
    navigate({ search: (previous) => ({ ...previous, page: next }) })
  const patch = (values: Partial<typeof search>, replace = false) =>
    navigate({
      search: (previous) => ({ ...previous, ...values, page: 0 }),
      replace,
    })
  const reset = () =>
    navigate({
      search: (previous) => ({
        page: 0,
        size: previous.size,
        sort: previous.sort,
      }),
    })

  return (
    <>
      <PageHeader
        title="Clients"
        subtitle="Assurés inscrits sur l’application : coordonnées, vérifications et historique de sinistres."
      />

      <KpiRow className="lg:grid-cols-4">
        <KpiCard
          icon={<Users className="size-5 text-primary" />}
          iconClass="bg-primary/[0.08]"
          value={isLoading ? '…' : error ? '—' : stats.total}
          label="Clients"
        />
        <KpiCard
          icon={<Phone className="size-5 text-[#167347]" />}
          iconClass="bg-[#1c8a57]/10"
          value={isLoading ? '…' : error ? '—' : stats.phoneVerified}
          label={`Téléphone vérifié${isLoading ? '' : ` · ${pct} %`}`}
        />
        <KpiCard
          icon={<Mail className="size-5 text-[#1f53b0]" />}
          iconClass="bg-[#1f53b0]/10"
          value={isLoading ? '…' : error ? '—' : stats.withEmail}
          label="Email renseigné"
        />
        <KpiCard
          icon={<UserPlus className="size-5 text-[#8a6600]" />}
          iconClass="bg-[#ffc61e]/20"
          value={isLoading ? '…' : error ? '—' : stats.recent}
          label="Nouveaux sur 30 jours"
        />
      </KpiRow>

      <Toolbar
        search={
          <ToolbarSearch
            label="Rechercher un client"
            placeholder="Nom, téléphone, email, adresse…"
            value={query}
            onChange={(value) => patch({ q: value || undefined }, true)}
          />
        }
        filters={
          <>
            <SegmentedPills
              label="Vérification du téléphone"
              value={verification}
              onChange={(value) => patch({ verification: value })}
              options={[
                { value: 'all', label: 'Tous' },
                { value: 'verified', label: 'Tél. vérifié' },
                { value: 'unverified', label: 'Tél. non vérifié' },
              ]}
            />
            <SegmentedPills
              label="Genre"
              value={gender}
              onChange={(value) => patch({ gender: value })}
              options={[
                { value: 'all', label: 'Tous' },
                { value: 'FEMME', label: 'Femmes' },
                { value: 'HOMME', label: 'Hommes' },
              ]}
            />
            <Select
              value={search.sort}
              onValueChange={(sort) =>
                navigate({
                  search: (previous) => ({
                    ...previous,
                    sort: sort as typeof search.sort,
                    page: 0,
                  }),
                })
              }
            >
              <SelectTrigger
                aria-label="Tri"
                className="h-10 w-[170px] rounded-[10px] bg-card"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lastName,asc">Nom A–Z</SelectItem>
                <SelectItem value="lastName,desc">Nom Z–A</SelectItem>
                <SelectItem value="createdAt,desc">Plus récents</SelectItem>
                <SelectItem value="createdAt,asc">Plus anciens</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      <ResultCount
        note={
          isLoading || error
            ? undefined
            : data?.capped
              ? `Affichage limité aux ${clients.length} premiers clients (sur ${data.total}).`
              : `La recherche et les indicateurs portent sur les ${clients.length} clients.`
        }
      >
        {isLoading
          ? 'Chargement…'
          : `${filtered.length} client${filtered.length > 1 ? 's' : ''}${filtering ? ` sur ${clients.length}` : ''}`}
      </ResultCount>

      <DataTableCard>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <DataTableHead first>Client</DataTableHead>
              <DataTableHead>Téléphone</DataTableHead>
              <DataTableHead>Email</DataTableHead>
              <DataTableHead>Adresse</DataTableHead>
              <DataTableHead>Inscrit le</DataTableHead>
              <DataTableHead>Vérifications</DataTableHead>
              <DataTableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeletonRows
                columns={[36, 28, 32, 40, 20, 16]}
                leading="avatar"
                trailing
              />
            ) : error ? (
              <TableErrorState
                colSpan={7}
                forbidden={forbidden}
                title="Impossible de charger les clients."
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
            ) : rows.length === 0 ? (
              <TableEmptyState
                colSpan={7}
                icon={UserRound}
                title={
                  filtering
                    ? 'Aucun client ne correspond à votre recherche.'
                    : 'Aucun client pour le moment.'
                }
                action={
                  filtering ? (
                    <button
                      type="button"
                      onClick={reset}
                      className="text-[13px] font-semibold text-primary hover:underline"
                    >
                      Réinitialiser les filtres
                    </button>
                  ) : undefined
                }
              />
            ) : (
              rows.map((client) => {
                const email = clientEmail(client)
                return (
                  <ClickableRow
                    key={client.id}
                    onActivate={() =>
                      navigate({
                        to: '/clients/$clientId',
                        params: { clientId: String(client.id) },
                      })
                    }
                  >
                    <TableCell className={FIRST_CELL_CLASS}>
                      <div className="flex items-center gap-3">
                        <ClientAvatar client={client} />
                        <div>
                          <div className="font-semibold">
                            {clientFullName(client)}
                          </div>
                          <div className="text-[12px] text-muted-foreground">
                            Client #{client.id}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {formatPhone(client.phoneNumber)}
                    </TableCell>
                    <TableCell>
                      {email ? (
                        <TruncatedText className="max-w-[220px]">
                          {email}
                        </TruncatedText>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {clientAddress(client) ? (
                        <TruncatedText className="max-w-[260px]">
                          {clientAddress(client)}
                        </TruncatedText>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatClaimDate(client.createdAt)}
                    </TableCell>
                    <TableCell>
                      <VerificationIcons client={client} />
                    </TableCell>
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
        onPrev={() => setPage(page - 1)}
        onNext={() => setPage(page + 1)}
      />
    </>
  )
}
