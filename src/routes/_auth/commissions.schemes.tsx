import { pageHead } from '#/lib/page-title'
import { useMemo, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { PRODUCT_CODES } from '#/services/products'
import type { ProductCode } from '#/services/products'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Layers, Percent, Plus, TriangleAlert, Workflow } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '#/components/dashboard/ConfirmDialog'
import {
  CommissionSchemeRate,
  CommissionSchemeShares,
} from '#/components/commissions/CommissionDisplays'
import { PageHeader } from '#/components/dashboard/PageHeader'
import { usePermissions } from '#/components/dashboard/use-permissions'
import { SearchableSelect } from '#/components/layout/SearchableSelect'
import { KpiCard } from '#/components/dashboard/KpiCard'
import {
  DataTableCard,
  DataTableHead,
  FIRST_CELL_CLASS,
  TableEmptyState,
  TableErrorState,
  TableSkeletonRows,
} from '#/components/layout/DataTable'
import { KpiRow } from '#/components/layout/KpiRow'
import { ResultCount, Toolbar } from '#/components/layout/Toolbar'
import { Button } from '#/components/ui/button'
import { Pagination } from '#/components/ui/Pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { apiErrorMessage } from '#/lib/api-error'
import { mapClaimError } from '#/lib/claims'
import { fetchAllPages } from '#/lib/fetch-all-pages'
import { formatDate } from '#/lib/utils'
import {
  deleteCommissionScheme,
  getCommissionSchemes,
} from '#/services/commission-schemes'
import type { CommissionSchemeResponse } from '#/services/commission-schemes'
import {
  getAllPartners,
  getAllProducts,
} from '#/services/commission-reference-data'

const PAGE_SIZE = 20

const searchSchema = z.object({
  partnerId: z.coerce.number().int().positive().optional().catch(undefined),
  product: z.enum(PRODUCT_CODES).optional().catch(undefined),
  page: z.coerce.number().int().min(0).optional().catch(undefined),
})

export const Route = createFileRoute('/_auth/commissions/schemes')({
  head: pageHead('Schémas de commission'),
  validateSearch: searchSchema,
  component: CommissionSchemesPage,
})

function CommissionSchemesPage() {
  const queryClient = useQueryClient()
  const { can } = usePermissions()
  const canWrite = can('commissionscheme:write')
  const navigate = useNavigate({ from: Route.fullPath })
  const search = Route.useSearch()
  const partnerId = search.partnerId ? String(search.partnerId) : ''
  const product = search.product ?? ''
  const requestedPage = search.page ?? 0
  const setSearch = (next: {
    partnerId?: number | undefined
    product?: ProductCode | undefined
    page?: number | undefined
  }) =>
    void navigate({
      search: (prev) => ({ ...prev, ...next }),
      replace: true,
    })
  const [deleting, setDeleting] = useState<CommissionSchemeResponse | null>(
    null,
  )
  const references = useQuery({
    queryKey: ['commission-references'],
    queryFn: async () => {
      const [partners, products] = await Promise.all([
        getAllPartners(),
        getAllProducts(),
      ])
      return { partners, products }
    },
    retry: false,
  })
  const schemes = useQuery({
    // Every scheme matching the filters is loaded (a handful per partner and
    // product), so the KPIs describe the whole selection, not one page.
    queryKey: ['commission-schemes', partnerId, product],
    queryFn: () =>
      fetchAllPages((page, size) =>
        getCommissionSchemes({
          partnerId: partnerId ? Number(partnerId) : undefined,
          product: product || undefined,
          page,
          size,
        }),
      ),
    retry: false,
  })
  const partnerNames = useMemo(
    () =>
      new Map(
        references.data?.partners.map((item) => [item.id, item.name]) ?? [],
      ),
    [references.data],
  )
  const productNames = useMemo(
    () =>
      new Map(
        references.data?.products.map((item) => [item.code, item.label]) ?? [],
      ),
    [references.data],
  )
  const deletion = useMutation({
    mutationFn: deleteCommissionScheme,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-schemes'] })
      setDeleting(null)
      toast.success(
        'Schéma supprimé. Le couple partenaire / produit est de nouveau libre.',
      )
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  })

  const all = schemes.data?.items ?? []
  const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE))
  const page = Math.min(requestedPage, totalPages - 1)
  const content = all.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const loading = schemes.isLoading || references.isLoading
  const failure = schemes.error ?? references.error
  const forbidden =
    failure !== null && mapClaimError(failure).kind === 'forbidden'
  const filtering = partnerId !== '' || product !== ''
  const total = schemes.data?.total ?? all.length
  const level2 = all.filter((item) => item.maxLevel === 2).length
  const level3 = all.filter((item) => item.maxLevel === 3).length
  const unset = all.filter((item) => item.commissionRate === null).length
  const kpi = (value: number) => (loading ? '…' : failure ? '—' : value)
  const resetFilters = () =>
    setSearch({ partnerId: undefined, product: undefined, page: undefined })
  const newSchemeButton = canWrite ? (
    <Button asChild className="rounded-[11px]">
      <Link to="/commissions/schemes/new">
        <Plus />
        Nouveau schéma
      </Link>
    </Button>
  ) : undefined

  return (
    <>
      <PageHeader
        title="Schémas de commission"
        subtitle="Répartition du pot par partenaire, produit et niveau de vente."
      >
        {canWrite && (
          <Button
            asChild
            className="rounded-[11px] shadow-[0_4px_14px_rgba(0,51,127,0.22)]"
          >
            <Link to="/commissions/schemes/new">
              <Plus />
              Nouveau schéma
            </Link>
          </Button>
        )}
      </PageHeader>

      <KpiRow>
        <KpiCard
          icon={<Layers className="size-5 text-primary" />}
          iconClass="bg-primary/[0.08]"
          value={kpi(total)}
          label="Schémas"
        />
        <KpiCard
          icon={<Workflow className="size-5 text-[#1f53b0]" />}
          iconClass="bg-[#1f53b0]/10"
          value={kpi(level2)}
          label="Schémas de niveau 2"
        />
        <KpiCard
          icon={<Percent className="size-5 text-[#167347]" />}
          iconClass="bg-[#1c8a57]/10"
          value={kpi(level3)}
          label="Schémas de niveau 3"
        />
        <KpiCard
          icon={<TriangleAlert className="size-5 text-[#8a6600]" />}
          iconClass="bg-[#ffc61e]/20"
          value={kpi(unset)}
          label="Taux à configurer"
        />
      </KpiRow>

      <Toolbar
        filters={
          <>
            <SearchableSelect
              id="scheme-partner-filter"
              label="Partenaire"
              value={partnerId}
              allLabel="Tous les partenaires"
              options={(references.data?.partners ?? []).map((item) => ({
                value: String(item.id),
                label: item.name,
              }))}
              loading={references.isLoading}
              onChange={(value) =>
                setSearch({
                  partnerId: value ? Number(value) : undefined,
                  page: undefined,
                })
              }
            />
            <SearchableSelect
              id="scheme-product-filter"
              label="Produit"
              value={product}
              allLabel="Tous les produits"
              options={(references.data?.products ?? []).map((item) => ({
                value: item.code,
                label: item.label,
              }))}
              loading={references.isLoading}
              onChange={(value) =>
                setSearch({
                  product: value ? (value as ProductCode) : undefined,
                  page: undefined,
                })
              }
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
      <ResultCount>
        {loading
          ? 'Chargement…'
          : failure
            ? ''
            : `${total} schéma${total > 1 ? 's' : ''}${filtering ? ' pour ces filtres' : ''}${schemes.data?.capped ? ` (${all.length} chargés)` : ''}`}
      </ResultCount>

      <DataTableCard>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <DataTableHead first>Partenaire</DataTableHead>
              <DataTableHead>Produit</DataTableHead>
              <DataTableHead>Taux négocié</DataTableHead>
              <DataTableHead>Niveau max.</DataTableHead>
              <DataTableHead>Répartition</DataTableHead>
              <DataTableHead>Mise à jour</DataTableHead>
              <DataTableHead className="pr-[22px] text-right">
                Actions
              </DataTableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeletonRows columns={[36, 30, 16, 12, 60, 24, 32]} />
            ) : failure ? (
              <TableErrorState
                colSpan={7}
                forbidden={forbidden}
                title="Impossible de charger les schémas."
                action={
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-[11px]"
                    onClick={() => {
                      void schemes.refetch()
                      void references.refetch()
                    }}
                  >
                    Réessayer
                  </Button>
                }
              />
            ) : content.length === 0 ? (
              <TableEmptyState
                colSpan={7}
                icon={Layers}
                title={
                  filtering
                    ? 'Aucun schéma ne correspond à ces filtres.'
                    : 'Aucun schéma de commission pour le moment.'
                }
                description={
                  filtering
                    ? undefined
                    : 'Sans schéma, les ventes de niveaux 2 et 3 sont mises en attente.'
                }
                action={
                  filtering ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-[11px]"
                      onClick={resetFilters}
                    >
                      Réinitialiser les filtres
                    </Button>
                  ) : (
                    newSchemeButton
                  )
                }
              />
            ) : (
              content.map((scheme) => (
                <TableRow key={scheme.id} className="hover:bg-[#f6f8fc]">
                  <TableCell className={`${FIRST_CELL_CLASS} font-semibold`}>
                    {partnerNames.get(scheme.partnerId) ??
                      `Partenaire #${scheme.partnerId}`}
                  </TableCell>
                  <TableCell>
                    {productNames.get(scheme.product) ?? scheme.product}
                  </TableCell>
                  <TableCell className="font-bold whitespace-nowrap tabular-nums text-primary">
                    <CommissionSchemeRate rate={scheme.commissionRate} />
                  </TableCell>
                  <TableCell className="tabular-nums">
                    N{scheme.maxLevel}
                  </TableCell>
                  <TableCell className="max-w-[460px] whitespace-normal text-[12.5px] text-muted-foreground">
                    <CommissionSchemeShares scheme={scheme} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(scheme.updatedAt)}
                  </TableCell>
                  <TableCell className="pr-[22px]">
                    {canWrite && (
                      <div className="flex justify-end gap-2">
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="rounded-[9px]"
                        >
                          <Link
                            to="/commissions/schemes/$schemeId/edit"
                            params={{ schemeId: String(scheme.id) }}
                          >
                            Modifier
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="rounded-[9px] text-destructive hover:text-destructive"
                          onClick={() => setDeleting(scheme)}
                        >
                          Supprimer
                        </Button>
                      </div>
                    )}
                  </TableCell>
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
        onPrev={() => setSearch({ page: page - 1 || undefined })}
        onNext={() => setSearch({ page: page + 1 })}
      />
      <ConfirmDialog
        open={deleting !== null}
        title="Supprimer le schéma"
        description="Le couple partenaire / produit redeviendra libre. Sans nouveau schéma, les ventes de niveaux 2 et 3 seront mises en attente jusqu’à correction de la configuration."
        confirmLabel={
          deletion.isPending ? 'Suppression…' : 'Supprimer le schéma'
        }
        destructive
        pending={deletion.isPending}
        onConfirm={() => deleting && deletion.mutate(deleting.id)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
      />
    </>
  )
}
