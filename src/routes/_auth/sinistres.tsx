import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { Pagination } from '#/components/ui/Pagination'
import { FormSelect } from '#/components/forms/FormSelect'
import { PageHeader } from '#/components/dashboard/PageHeader'
import { ClaimStatusBadge } from '#/components/claims/ClaimStatusBadge'
import { ClaimsAdminGate } from '#/components/claims/ClaimsAdminGate'
import { CreateClaimDialog } from '#/components/claims/CreateClaimDialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import {
  availableActions,
  CLAIM_STATUS_LABELS,
  formatClaimDate,
} from '#/lib/claims'
import { cn } from '#/lib/utils'
import { getClaimTypes } from '#/services/claim-types'
import { getClients } from '#/services/clients'
import { CLAIM_STATUSES, claimsKeys, getClaims } from '#/services/claims'
import type { ClaimFilters, ClaimStatus } from '#/services/claims'

const searchSchema = z.object({
  status: z.enum(CLAIM_STATUSES).optional().catch(undefined),
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
  validateSearch: searchSchema,
  component: SinistresRoute,
})

const headCls =
  'h-auto bg-[#fafbfc] px-3 py-3 text-[11px] font-bold uppercase tracking-[0.05em] text-muted-foreground'

function MessageRow({ children }: { children: React.ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell
        colSpan={9}
        className="py-10 text-center text-sm text-muted-foreground"
      >
        {children}
      </TableCell>
    </TableRow>
  )
}

export function ClaimsListContent() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const [showCreate, setShowCreate] = useState(false)
  const filters: ClaimFilters = search
  const { data, isLoading, error } = useQuery({
    queryKey: claimsKeys.list(filters),
    queryFn: () => getClaims(filters),
    retry: false,
  })
  const { data: types } = useQuery({
    queryKey: ['claimTypes', 'filters'],
    queryFn: () => getClaimTypes({ page: 0, size: 100, sort: 'name,asc' }),
    retry: false,
  })
  const { data: clients } = useQuery({
    queryKey: ['clients', 'claim-filters'],
    queryFn: () => getClients(),
    retry: false,
  })
  const hasFilters =
    search.status !== undefined ||
    search.clientId !== undefined ||
    search.claimTypeId !== undefined
  const updateSearch = (patch: Partial<typeof search>) =>
    navigate({
      search: (previous) => ({ ...previous, ...patch, page: patch.page ?? 0 }),
    })

  return (
    <>
      <PageHeader
        title="Sinistres"
        subtitle="Gestion et instruction des déclarations"
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
      <Card className="mb-4 gap-4 p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <FormSelect
            id="status-filter"
            label="Statut"
            value={search.status ?? ''}
            includeNone
            noneLabel="Tous les statuts"
            options={CLAIM_STATUSES.map((status) => ({
              value: status,
              label: CLAIM_STATUS_LABELS[status],
            }))}
            onChange={(value) =>
              updateSearch({
                status: value ? (value as ClaimStatus) : undefined,
              })
            }
          />
          <FormSelect
            id="type-filter"
            label="Type"
            value={search.claimTypeId ? String(search.claimTypeId) : ''}
            includeNone
            noneLabel="Tous les types"
            options={(types?.content ?? []).map((type) => ({
              value: String(type.id),
              label: type.name,
            }))}
            onChange={(value) =>
              updateSearch({ claimTypeId: value ? Number(value) : undefined })
            }
          />
          <FormSelect
            id="client-filter"
            label="Client"
            value={search.clientId ? String(search.clientId) : ''}
            includeNone
            noneLabel="Tous les clients"
            options={(clients?.content ?? []).map((client) => ({
              value: String(client.id),
              label: `${client.lastName} ${client.firstName}`,
            }))}
            onChange={(value) =>
              updateSearch({ clientId: value ? Number(value) : undefined })
            }
          />
          <FormSelect
            id="sort-filter"
            label="Tri"
            value={search.sort}
            options={[
              { value: 'createdAt,desc', label: 'Plus récents' },
              { value: 'createdAt,asc', label: 'Plus anciens' },
              { value: 'occurredOn,desc', label: 'Survenance décroissante' },
              { value: 'occurredOn,asc', label: 'Survenance croissante' },
              { value: 'claimNumber,asc', label: 'Numéro A–Z' },
              { value: 'claimNumber,desc', label: 'Numéro Z–A' },
            ]}
            onChange={(value) =>
              updateSearch({ sort: value as typeof search.sort })
            }
          />
        </div>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() =>
              navigate({
                search: { page: 0, size: search.size, sort: 'createdAt,desc' },
              })
            }
          >
            Réinitialiser les filtres
          </Button>
        )}
      </Card>
      <Card className="gap-0 overflow-x-auto py-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {[
                'Numéro',
                'Statut',
                'Client',
                'Type',
                'Produit',
                'Survenance',
                'Déclaré par',
                'Créé le',
                'Actions',
              ].map((label) => (
                <TableHead
                  key={label}
                  className={cn(headCls, label === 'Numéro' && 'pl-[22px]')}
                >
                  {label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <MessageRow>Chargement des sinistres…</MessageRow>
            ) : error ? (
              <MessageRow>Impossible de charger les sinistres.</MessageRow>
            ) : !data?.content.length ? (
              <MessageRow>
                {hasFilters ? (
                  <span>
                    Aucun résultat pour ces filtres.{' '}
                    <button
                      className="font-semibold text-primary underline"
                      onClick={() =>
                        navigate({
                          search: {
                            page: 0,
                            size: search.size,
                            sort: 'createdAt,desc',
                          },
                        })
                      }
                    >
                      Réinitialiser
                    </button>
                  </span>
                ) : (
                  'Aucun sinistre pour le moment.'
                )}
              </MessageRow>
            ) : (
              data.content.map((claim) => (
                <TableRow key={claim.id}>
                  <TableCell className="pl-[22px] font-bold text-primary">
                    <Link
                      to="/sinistres/$claimId"
                      params={{ claimId: String(claim.id) }}
                      className="hover:underline"
                    >
                      {claim.claimNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <ClaimStatusBadge status={claim.status} />
                  </TableCell>
                  <TableCell>
                    {claim.clientName?.trim() ? (
                      <Link
                        to="/clients/$clientId"
                        params={{ clientId: String(claim.clientId) }}
                        className="font-semibold text-primary hover:underline"
                      >
                        {claim.clientName}
                      </Link>
                    ) : (
                      `Client supprimé (#${claim.clientId})`
                    )}
                  </TableCell>
                  <TableCell>{claim.claimTypeName}</TableCell>
                  <TableCell>{claim.productLabel}</TableCell>
                  <TableCell>{formatClaimDate(claim.occurredOn)}</TableCell>
                  <TableCell>
                    {claim.declaredBy === 'CLIENT' ? 'Client' : 'Back-office'}
                  </TableCell>
                  <TableCell>
                    {formatClaimDate(claim.createdAt, true)}
                  </TableCell>
                  <TableCell>
                    <Button asChild variant="outline" size="sm">
                      <Link
                        to="/sinistres/$claimId"
                        params={{ claimId: String(claim.id) }}
                      >
                        {availableActions(claim.status).length
                          ? 'Instruire'
                          : 'Consulter'}
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
      <Pagination
        page={search.page}
        totalPages={data?.totalPages ?? 0}
        isLast={data?.last ?? true}
        onPrev={() => updateSearch({ page: search.page - 1 })}
        onNext={() => updateSearch({ page: search.page + 1 })}
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
