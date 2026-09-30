import { pageHead } from '#/lib/page-title'
import { useMemo, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  CircleCheck,
  FileWarning,
  Hourglass,
  Inbox,
  SearchCheck,
} from 'lucide-react'
import { z } from 'zod'
import { Button } from '#/components/ui/button'
import { Pagination } from '#/components/ui/Pagination'
import { KpiCard } from '#/components/dashboard/KpiCard'
import { PageHeader } from '#/components/dashboard/PageHeader'
import { ClaimStatusBadge } from '#/components/claims/ClaimStatusBadge'
import { ClaimsAdminGate } from '#/components/claims/ClaimsAdminGate'
import { CreateClaimDialog } from '#/components/claims/CreateClaimDialog'
import { ClientPicker } from '#/components/claims/ClientPicker'
import { FilterSelect } from '#/components/claims/FilterSelect'
import { useClientNames } from '#/components/claims/use-client-names'
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
import {
  ResultCount,
  Toolbar,
  ToolbarSearch,
} from '#/components/layout/Toolbar'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import {
  CLAIM_STATUS_LABELS,
  formatClaimDate,
  mapClaimError,
  matchesStatusFilter,
} from '#/lib/claims'
import type { ClaimStatusFilter } from '#/lib/claims'
import { normalizeText } from '#/lib/clients'
import { getClaimTypes } from '#/services/claim-types'
import { fetchAllPages } from '#/lib/fetch-all-pages'
import { CLAIM_STATUSES, claimsKeys, getClaims } from '#/services/claims'
import type { ClaimResponse, ClaimStatus } from '#/services/claims'

const searchSchema = z.object({
  q: z.string().optional().catch(undefined),
  status: z
    .enum([...CLAIM_STATUSES, 'OPEN'])
    .optional()
    .catch(undefined),
  clientId: z.coerce.number().int().positive().optional().catch(undefined),
  claimTypeId: z.coerce.number().int().positive().optional().catch(undefined),
  page: z.coerce.number().int().min(0).catch(0),
  size: z.coerce.number().int().min(1).max(100).catch(20),
  sort: z
    .enum([
      'createdAt,desc',
      'createdAt,asc',
      'occurredOn,desc',
      'occurredOn,asc',
      'claimNumber,asc',
      'claimNumber,desc',
    ])
    .catch('createdAt,desc'),
})

export const Route = createFileRoute('/_auth/sinistres')({
  head: pageHead('Sinistres'),
  validateSearch: searchSchema,
  component: SinistresRoute,
})

const COLUMNS = 9

const SORT_OPTIONS: Array<{
  value: (typeof searchSchema)['_output']['sort']
  label: string
}> = [
  { value: 'createdAt,desc', label: 'Plus récents' },
  { value: 'createdAt,asc', label: 'Plus anciens' },
  { value: 'occurredOn,desc', label: 'Survenance décroissante' },
  { value: 'occurredOn,asc', label: 'Survenance croissante' },
  { value: 'claimNumber,asc', label: 'Numéro A–Z' },
  { value: 'claimNumber,desc', label: 'Numéro Z–A' },
]

function matchesClaim(claim: ClaimResponse, query: string) {
  const q = normalizeText(query)
  if (!q) return true
  return [
    claim.claimNumber,
    claim.clientName,
    claim.claimTypeName,
    claim.productLabel,
    claim.policyNumber,
  ].some((value) => value && normalizeText(value).includes(q))
}

export function ClaimsListContent() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const [showCreate, setShowCreate] = useState(false)
  const query = search.q ?? ''
  const { nameOf } = useClientNames()
  // The API paginates and filters server-side, but KPIs and text search need
  // the whole set: every page is loaded (client/type scoped), the status
  // filter and pagination are applied here.
  const scope = {
    clientId: search.clientId,
    claimTypeId: search.claimTypeId,
    sort: search.sort,
  }
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...claimsKeys.all, 'all', scope],
    queryFn: () =>
      fetchAllPages((page, size) => getClaims({ ...scope, page, size })),
    retry: false,
  })
  const { data: types } = useQuery({
    queryKey: ['claimTypes', 'filters'],
    queryFn: () => getClaimTypes({ page: 0, size: 100, sort: 'name,asc' }),
    retry: false,
  })
  const claims = useMemo(() => data?.items ?? [], [data])
  const matching = useMemo(
    () =>
      claims.filter(
        (claim) =>
          matchesStatusFilter(claim.status, search.status) &&
          matchesClaim(claim, query),
      ),
    [claims, query, search.status],
  )
  const totalPages = Math.max(1, Math.ceil(matching.length / search.size))
  const page = Math.min(search.page, totalPages - 1)
  const rows = matching.slice(page * search.size, (page + 1) * search.size)
  const count = (statuses: ClaimStatus[]) =>
    claims.filter((claim) => statuses.includes(claim.status)).length
  const hasServerFilters =
    search.status !== undefined ||
    search.clientId !== undefined ||
    search.claimTypeId !== undefined
  const searching = query.trim() !== ''
  const filtering = hasServerFilters || searching
  const scoped =
    search.clientId !== undefined || search.claimTypeId !== undefined
  const forbidden = !!error && mapClaimError(error).kind === 'forbidden'

  const updateSearch = (patch: Partial<typeof search>) =>
    navigate({
      search: (previous) => ({ ...previous, ...patch, page: patch.page ?? 0 }),
    })
  const setQuery = (value: string) =>
    navigate({
      search: (previous) => ({ ...previous, q: value || undefined, page: 0 }),
      replace: true,
    })
  const reset = () => {
    navigate({
      search: { page: 0, size: search.size, sort: 'createdAt,desc' },
    })
  }

  return (
    <>
      <PageHeader
        title="Sinistres"
        subtitle="Déclarations des assurés : instruction, pièces justificatives et décisions."
        action="Déclarer un sinistre"
        onAction={() => setShowCreate(true)}
      >
        <Button asChild variant="outline" className="rounded-[11px]">
          <Link
            to="/sinistres/types"
            search={{ page: 0, size: 20, sort: 'name,asc' }}
          >
            Types de sinistre
          </Link>
        </Button>
      </PageHeader>
      {showCreate && <CreateClaimDialog onClose={() => setShowCreate(false)} />}

      <KpiRow className="lg:grid-cols-4">
        <KpiCard
          icon={<FileWarning className="size-5 text-primary" />}
          iconClass="bg-primary/[0.08]"
          value={isLoading ? '…' : error ? '—' : claims.length}
          label="Sinistres"
        />
        <KpiCard
          icon={<Inbox className="size-5 text-[#1f53b0]" />}
          iconClass="bg-[#1f53b0]/10"
          value={isLoading ? '…' : error ? '—' : count(['SUBMITTED'])}
          label="À prendre en charge"
        />
        <KpiCard
          icon={<Hourglass className="size-5 text-[#8a6600]" />}
          iconClass="bg-[#ffc61e]/20"
          value={
            isLoading
              ? '…'
              : error
                ? '—'
                : count(['UNDER_REVIEW', 'INFO_REQUESTED'])
          }
          label="En instruction"
        />
        <KpiCard
          icon={<CircleCheck className="size-5 text-[#167347]" />}
          iconClass="bg-[#1c8a57]/10"
          value={isLoading ? '…' : error ? '—' : count(['APPROVED'])}
          label="Approuvés"
        />
      </KpiRow>

      <Toolbar
        search={
          <ToolbarSearch
            label="Rechercher un sinistre"
            placeholder="Numéro, client, type, produit, contrat…"
            value={query}
            onChange={setQuery}
          />
        }
        filters={
          <>
            <FilterSelect
              label="Statut"
              value={search.status ?? ''}
              allLabel="Tous les statuts"
              options={[
                { value: 'OPEN', label: 'En cours (non décidés)' },
                ...CLAIM_STATUSES.map((status) => ({
                  value: status,
                  label: CLAIM_STATUS_LABELS[status],
                })),
              ]}
              onChange={(value) =>
                updateSearch({
                  status: value ? (value as ClaimStatusFilter) : undefined,
                })
              }
            />
            <FilterSelect
              label="Type"
              value={search.claimTypeId ? String(search.claimTypeId) : ''}
              allLabel="Tous les types"
              options={(types?.content ?? []).map((type) => ({
                value: String(type.id),
                label: type.name,
              }))}
              onChange={(value) =>
                updateSearch({
                  claimTypeId: value ? Number(value) : undefined,
                })
              }
            />
            <ClientPicker
              label="Client"
              value={search.clientId ? String(search.clientId) : ''}
              allLabel="Tous les clients"
              className="w-[190px]"
              onChange={(value) =>
                updateSearch({ clientId: value ? Number(value) : undefined })
              }
            />
            <FilterSelect
              label="Tri"
              value={search.sort}
              className="w-[170px]"
              options={SORT_OPTIONS}
              onChange={(value) =>
                updateSearch({ sort: value as typeof search.sort })
              }
            />
          </>
        }
        actions={
          hasServerFilters ? (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-[10px]"
              onClick={reset}
            >
              Réinitialiser les filtres
            </Button>
          ) : undefined
        }
      />

      <ResultCount
        note={
          isLoading || error
            ? undefined
            : data?.capped
              ? `Affichage limité aux ${claims.length} premiers sinistres sur ${data.total}, selon le tri « ${SORT_OPTIONS.find((o) => o.value === search.sort)?.label ?? search.sort} ».`
              : `Indicateurs sur ${claims.length} sinistre${claims.length > 1 ? 's' : ''}${scoped ? ' du périmètre client / type choisi' : ' au total'}.`
        }
      >
        {isLoading
          ? 'Chargement…'
          : `${matching.length} sinistre${matching.length > 1 ? 's' : ''}${filtering ? ` sur ${claims.length}` : ''}`}
      </ResultCount>

      <DataTableCard>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <DataTableHead first>Sinistre</DataTableHead>
              <DataTableHead>Statut</DataTableHead>
              <DataTableHead>Client</DataTableHead>
              <DataTableHead>Type</DataTableHead>
              <DataTableHead>Produit</DataTableHead>
              <DataTableHead>Survenance</DataTableHead>
              <DataTableHead>Déclaré par</DataTableHead>
              <DataTableHead>Créé le</DataTableHead>
              <DataTableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeletonRows
                columns={[28, 24, 32, 24, 20, 24, 20, 28]}
                trailing
              />
            ) : error ? (
              <TableErrorState
                colSpan={COLUMNS}
                forbidden={forbidden}
                title="Impossible de charger les sinistres."
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
                colSpan={COLUMNS}
                icon={SearchCheck}
                title={
                  filtering
                    ? 'Aucun sinistre ne correspond à votre recherche.'
                    : 'Aucun sinistre pour le moment.'
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
              rows.map((claim) => (
                <ClickableRow
                  key={claim.id}
                  onActivate={() =>
                    navigate({
                      to: '/sinistres/$claimId',
                      params: { claimId: String(claim.id) },
                    })
                  }
                >
                  <TableCell className={FIRST_CELL_CLASS}>
                    <div className="font-bold whitespace-nowrap text-primary">
                      {claim.claimNumber}
                    </div>
                    <div className="text-[12px] text-muted-foreground">
                      {claim.policyNumber
                        ? `Contrat ${claim.policyNumber}`
                        : `Contrat #${claim.subscriptionId}`}
                    </div>
                  </TableCell>
                  <TableCell>
                    <ClaimStatusBadge status={claim.status} />
                  </TableCell>
                  <TableCell>
                    {claim.clientName?.trim() ? (
                      <TruncatedText className="max-w-[200px] font-semibold">
                        {nameOf(claim.clientId, claim.clientName)}
                      </TruncatedText>
                    ) : (
                      <span className="text-muted-foreground">
                        Client supprimé (#{claim.clientId})
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <TruncatedText className="max-w-[180px]">
                      {claim.claimTypeName}
                    </TruncatedText>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <TruncatedText className="max-w-[160px]">
                      {claim.productLabel}
                    </TruncatedText>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatClaimDate(claim.occurredOn)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {claim.declaredBy === 'CLIENT' ? 'Client' : 'Back-office'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatClaimDate(claim.createdAt, true)}
                  </TableCell>
                  <RowChevron />
                </ClickableRow>
              ))
            )}
          </TableBody>
        </Table>
      </DataTableCard>
      <Pagination
        page={page}
        totalPages={totalPages}
        isLast={page >= totalPages - 1}
        onPrev={() => updateSearch({ page: page - 1 })}
        onNext={() => updateSearch({ page: page + 1 })}
      />
    </>
  )
}

function SinistresRoute() {
  return (
    <ClaimsAdminGate>
      <ClaimsListContent />
    </ClaimsAdminGate>
  )
}
