import { pageHead } from '#/lib/page-title'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { toast } from 'sonner'
import { Archive, CircleCheck, ListChecks, Tags } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Pagination } from '#/components/ui/Pagination'
import { ConfirmDialog } from '#/components/dashboard/ConfirmDialog'
import { KpiCard } from '#/components/dashboard/KpiCard'
import { PageHeader } from '#/components/dashboard/PageHeader'
import { StatusPill } from '#/components/dashboard/StatusPill'
import { ClaimsAdminGate } from '#/components/claims/ClaimsAdminGate'
import { ClaimTypeDialog } from '#/components/claims/ClaimTypeDialog'
import { FilterSelect } from '#/components/claims/FilterSelect'
import { BackLink } from '#/components/layout/BackLink'
import {
  DataTableCard,
  DataTableHead,
  DataTableCell,
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
import { Table, TableBody, TableHeader, TableRow } from '#/components/ui/table'
import { formatClaimDate, mapClaimError } from '#/lib/claims'
import { fetchAllPages } from '#/lib/fetch-all-pages'
import { normalizeText } from '#/lib/clients'
import { getProducts } from '#/services/products'
import {
  claimTypesKeys,
  deleteClaimType,
  getClaimTypes,
} from '#/services/claim-types'
import type { ClaimTypeResponse } from '#/services/claim-types'

const searchSchema = z.object({
  q: z.string().optional().catch(undefined),
  active: z.enum(['active', 'inactive']).optional().catch(undefined),
  productId: z.coerce.number().int().positive().optional().catch(undefined),
  page: z.coerce.number().int().min(0).catch(0),
  size: z.coerce.number().int().min(1).max(100).catch(20),
  sort: z
    .enum(['name,asc', 'name,desc', 'createdAt,desc', 'createdAt,asc'])
    .catch('name,asc'),
})
export const Route = createFileRoute('/_auth/sinistres_/types')({
  head: pageHead('Types de sinistre'),
  validateSearch: searchSchema,
  component: ClaimTypesRoute,
})

export function ClaimTypesContent() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const queryClient = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<ClaimTypeResponse | null>(null)
  const [deleting, setDeleting] = useState<ClaimTypeResponse | null>(null)
  const activeFilter = search.active ?? 'all'
  // Le catalogue est petit : on le charge en entier (produit + tri côté API)
  // pour que recherche, statut, indicateurs et pagination portent sur tout.
  const scope = { productId: search.productId, sort: search.sort }
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...claimTypesKeys.all, 'all', scope],
    queryFn: () =>
      fetchAllPages((page, size) => getClaimTypes({ ...scope, page, size })),
    retry: false,
  })
  const { data: products } = useQuery({
    queryKey: ['products', 'claim-type-filters'],
    queryFn: () => getProducts(0, 100),
    retry: false,
  })
  const deletion = useMutation({
    mutationFn: deleteClaimType,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: claimTypesKeys.all })
      setDeleting(null)
      toast.success('Type de sinistre archivé.')
    },
    onError: (mutationError) =>
      toast.error(mapClaimError(mutationError).message),
  })
  const updateSearch = (patch: Partial<typeof search>) =>
    navigate({
      search: (previous) => ({ ...previous, ...patch, page: patch.page ?? 0 }),
      replace: patch.page === undefined,
    })

  // Champ de recherche : état local pour la frappe, reporté (250 ms) dans
  // l'URL en remplaçant l'entrée d'historique (comme Cotations / Support).
  const [query, setQuery] = useState(search.q ?? '')
  const pushedQuery = useRef(search.q ?? '')
  useEffect(() => {
    const next = query.trim() === '' ? '' : query
    if (next === pushedQuery.current) return
    const timer = setTimeout(() => {
      pushedQuery.current = next
      updateSearch({ q: next === '' ? undefined : next })
    }, 250)
    return () => clearTimeout(timer)
  }, [query])
  // Retour arrière ou « Réinitialiser » : l'URL change, le champ suit.
  useEffect(() => {
    const urlValue = search.q ?? ''
    if (urlValue !== pushedQuery.current) {
      pushedQuery.current = urlValue
      setQuery(urlValue)
    }
  }, [search.q])

  const types = useMemo(() => data?.items ?? [], [data])
  const matching = useMemo(() => {
    const q = normalizeText(query)
    return types.filter((type) => {
      if (activeFilter === 'active' && !type.active) return false
      if (activeFilter === 'inactive' && type.active) return false
      if (!q) return true
      return [type.name, type.description, type.productLabel].some(
        (value) => value && normalizeText(value).includes(q),
      )
    })
  }, [types, query, activeFilter])
  const totalPages = Math.max(1, Math.ceil(matching.length / search.size))
  const page = Math.min(search.page, totalPages - 1)
  const rows = matching.slice(page * search.size, (page + 1) * search.size)
  const activeCount = types.filter((type) => type.active).length
  const total = types.length
  const forbidden = !!error && mapClaimError(error).kind === 'forbidden'
  const searching = query.trim() !== '' || activeFilter !== 'all'
  const filtering = searching || search.productId !== undefined
  const reset = () => {
    setQuery('')
    pushedQuery.current = ''
    updateSearch({ q: undefined, active: undefined, productId: undefined })
  }

  return (
    <>
      <BackLink
        to="/sinistres"
        search={{ page: 0, size: 20, sort: 'createdAt,desc' }}
      >
        Retour aux sinistres
      </BackLink>
      <PageHeader
        title="Types de sinistre"
        subtitle="Catalogue des motifs de déclaration proposés pour chaque produit."
        action="Nouveau type"
        onAction={() => setCreating(true)}
      />
      {(creating || editing) && (
        <ClaimTypeDialog
          claimType={editing ?? undefined}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
        />
      )}

      <KpiRow cols={3}>
        <KpiCard
          icon={<Tags className="size-5 text-primary" />}
          iconClass="bg-primary/[0.08]"
          value={isLoading ? '…' : error ? '—' : total}
          label="Types de sinistre"
        />
        <KpiCard
          icon={<CircleCheck className="size-5 text-[#167347]" />}
          iconClass="bg-[#1c8a57]/10"
          value={isLoading ? '…' : error ? '—' : activeCount}
          label="Actifs"
        />
        <KpiCard
          icon={<Archive className="size-5 text-[#8a6600]" />}
          iconClass="bg-[#ffc61e]/20"
          value={isLoading ? '…' : error ? '—' : types.length - activeCount}
          label="Archivés"
        />
      </KpiRow>

      <Toolbar
        search={
          <ToolbarSearch
            label="Rechercher un type de sinistre"
            placeholder="Rechercher par nom, produit ou description…"
            value={query}
            onChange={setQuery}
          />
        }
        filters={
          <>
            <SegmentedPills
              label="Statut"
              value={activeFilter}
              onChange={(value) =>
                updateSearch({ active: value === 'all' ? undefined : value })
              }
              options={[
                { value: 'all', label: 'Tous' },
                { value: 'active', label: 'Actifs' },
                { value: 'inactive', label: 'Archivés' },
              ]}
            />
            <FilterSelect
              label="Produit"
              value={search.productId ? String(search.productId) : ''}
              allLabel="Tous les produits"
              options={(products?.content ?? []).map((product) => ({
                value: String(product.id),
                label: product.label,
              }))}
              onChange={(value) =>
                updateSearch({ productId: value ? Number(value) : undefined })
              }
            />
            <FilterSelect
              label="Tri"
              value={search.sort}
              options={[
                { value: 'name,asc', label: 'Nom A–Z' },
                { value: 'name,desc', label: 'Nom Z–A' },
                { value: 'createdAt,desc', label: 'Plus récents' },
                { value: 'createdAt,asc', label: 'Plus anciens' },
              ]}
              onChange={(value) =>
                updateSearch({ sort: value as typeof search.sort })
              }
            />
          </>
        }
      />

      <ResultCount
        note={
          data?.capped
            ? `Affichage limité aux ${types.length} premiers types sur ${data.total}.`
            : undefined
        }
      >
        {isLoading
          ? 'Chargement…'
          : `${matching.length} type${matching.length > 1 ? 's' : ''}${searching ? ` sur ${types.length}` : ''}`}
      </ResultCount>

      <DataTableCard>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <DataTableHead first sticky="left">
                Nom
              </DataTableHead>
              <DataTableHead hideBelow="md">Produit</DataTableHead>
              <DataTableHead hideBelow="lg">Description</DataTableHead>
              <DataTableHead>Statut</DataTableHead>
              <DataTableHead hideBelow="lg">Mis à jour</DataTableHead>
              <DataTableHead sticky="right" className="pr-[22px] text-right">
                Actions
              </DataTableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeletonRows
                columns={[36, 28, 48, 16, 28, 32]}
                hideBelow={[undefined, 'md', 'lg', undefined, 'lg']}
              />
            ) : error ? (
              <TableErrorState
                colSpan={6}
                forbidden={forbidden}
                title="Impossible de charger le catalogue."
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
                colSpan={6}
                icon={ListChecks}
                title={
                  filtering
                    ? 'Aucun type de sinistre ne correspond à votre recherche.'
                    : 'Aucun type de sinistre pour le moment.'
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
                description={
                  filtering
                    ? undefined
                    : 'Utilisez « Nouveau type » en haut de page pour créer le premier.'
                }
              />
            ) : (
              rows.map((type) => (
                <TableRow key={type.id} className="hover:bg-[#f6f8fc]">
                  <DataTableCell first sticky="left" className="font-semibold">
                    {type.name}
                  </DataTableCell>
                  <DataTableCell hideBelow="md">
                    {type.productLabel}
                  </DataTableCell>
                  <DataTableCell
                    hideBelow="lg"
                    className="text-muted-foreground"
                  >
                    {type.description ? (
                      <TruncatedText lines={2} className="max-w-[320px]">
                        {type.description}
                      </TruncatedText>
                    ) : (
                      '—'
                    )}
                  </DataTableCell>
                  <DataTableCell>
                    <StatusPill tone={type.active ? 'success' : 'neutral'}>
                      {type.active ? 'Actif' : 'Inactif'}
                    </StatusPill>
                  </DataTableCell>
                  <DataTableCell
                    hideBelow="lg"
                    className="whitespace-nowrap text-muted-foreground"
                  >
                    {formatClaimDate(type.updatedAt, true)}
                  </DataTableCell>
                  <DataTableCell sticky="right" className="pr-[22px]">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-[10px]"
                        onClick={() => setEditing(type)}
                      >
                        Modifier
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!type.active}
                        className="rounded-[10px] text-destructive hover:text-destructive"
                        onClick={() => setDeleting(type)}
                      >
                        Archiver
                      </Button>
                    </div>
                  </DataTableCell>
                </TableRow>
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
      <ConfirmDialog
        open={!!deleting}
        title="Archiver le type de sinistre"
        description={
          deleting
            ? `Le type « ${deleting.name} » sera désactivé pour les nouvelles déclarations. Il restera attaché aux sinistres existants.`
            : undefined
        }
        confirmLabel={deletion.isPending ? 'Archivage…' : 'Archiver'}
        destructive
        pending={deletion.isPending}
        onConfirm={() => {
          if (deleting) deletion.mutate(deleting.id)
        }}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
      />
    </>
  )
}

function ClaimTypesRoute() {
  return (
    <ClaimsAdminGate>
      <ClaimTypesContent />
    </ClaimsAdminGate>
  )
}
