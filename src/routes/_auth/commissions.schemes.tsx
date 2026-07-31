import { useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '#/components/dashboard/ConfirmDialog'
import {
  CommissionSchemeRate,
  CommissionSchemeShares,
} from '#/components/commissions/CommissionDisplays'
import { PageHeader } from '#/components/dashboard/PageHeader'
import { usePermissions } from '#/components/dashboard/use-permissions'
import { FormSelect } from '#/components/forms/FormSelect'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { Pagination } from '#/components/ui/Pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { apiErrorMessage } from '#/lib/api-error'
import { cn, formatDate } from '#/lib/utils'
import {
  deleteCommissionScheme,
  getCommissionSchemes,
} from '#/services/commission-schemes'
import type { CommissionSchemeResponse } from '#/services/commission-schemes'
import {
  getAllPartners,
  getAllProducts,
} from '#/services/commission-reference-data'

export const Route = createFileRoute('/_auth/commissions/schemes')({
  component: CommissionSchemesPage,
})

const headClass =
  'h-auto bg-[#fafbfc] px-3 py-3 text-[11px] font-bold uppercase tracking-[0.05em] text-muted-foreground'

function CommissionSchemesPage() {
  const queryClient = useQueryClient()
  const { can } = usePermissions()
  const canWrite = can('commissionscheme:write')
  const [partnerId, setPartnerId] = useState('')
  const [productId, setProductId] = useState('')
  const [page, setPage] = useState(0)
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
    queryKey: ['commission-schemes', partnerId, productId, page],
    queryFn: () =>
      getCommissionSchemes({
        partnerId: partnerId ? Number(partnerId) : undefined,
        productId: productId ? Number(productId) : undefined,
        page,
        size: 20,
      }),
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
        references.data?.products.map((item) => [item.id, item.label]) ?? [],
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

  return (
    <>
      <PageHeader
        title="Schémas de commission"
        subtitle="Répartition du pot par partenaire, produit et niveau de vente"
      >
        {canWrite && (
          <Button asChild className="rounded-[11px]">
            <Link to="/commissions/schemes/new">
              <Plus />
              Nouveau schéma
            </Link>
          </Button>
        )}
      </PageHeader>

      <Card className="mb-4 grid gap-4 p-4 md:grid-cols-2">
        <FormSelect
          id="scheme-partner-filter"
          label="Partenaire"
          value={partnerId}
          includeNone
          noneLabel="Tous les partenaires"
          options={(references.data?.partners ?? []).map((item) => ({
            value: String(item.id),
            label: item.name,
          }))}
          onChange={(value) => {
            setPartnerId(value)
            setPage(0)
          }}
        />
        <FormSelect
          id="scheme-product-filter"
          label="Produit"
          value={productId}
          includeNone
          noneLabel="Tous les produits"
          options={(references.data?.products ?? []).map((item) => ({
            value: String(item.id),
            label: item.label,
          }))}
          onChange={(value) => {
            setProductId(value)
            setPage(0)
          }}
        />
      </Card>

      <Card className="gap-0 overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={cn(headClass, 'pl-[22px]')}>
                Partenaire
              </TableHead>
              <TableHead className={headClass}>Produit</TableHead>
              <TableHead className={headClass}>Taux négocié</TableHead>
              <TableHead className={headClass}>Niveau max.</TableHead>
              <TableHead className={headClass}>Répartition</TableHead>
              <TableHead className={headClass}>Mise à jour</TableHead>
              <TableHead className={cn(headClass, 'pr-[22px] text-right')}>
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schemes.isLoading || references.isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-9 text-center text-muted-foreground"
                >
                  Chargement…
                </TableCell>
              </TableRow>
            ) : schemes.error || references.error ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-9 text-center text-destructive"
                >
                  Impossible de charger les schémas.
                </TableCell>
              </TableRow>
            ) : schemes.data?.content.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-9 text-center text-muted-foreground"
                >
                  Aucun schéma ne correspond aux filtres.
                </TableCell>
              </TableRow>
            ) : (
              schemes.data?.content.map((scheme) => (
                <TableRow key={scheme.id} className="hover:bg-transparent">
                  <TableCell className="pl-[22px] font-semibold">
                    {partnerNames.get(scheme.partnerId) ??
                      `Partenaire #${scheme.partnerId}`}
                  </TableCell>
                  <TableCell>
                    {productNames.get(scheme.productId) ??
                      `Produit #${scheme.productId}`}
                  </TableCell>
                  <TableCell className="font-bold tabular-nums text-primary">
                    <CommissionSchemeRate rate={scheme.commissionRate} />
                  </TableCell>
                  <TableCell className="tabular-nums">
                    N{scheme.maxLevel}
                  </TableCell>
                  <TableCell className="max-w-[460px] whitespace-normal text-[12.5px] text-muted-foreground">
                    <CommissionSchemeShares scheme={scheme} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(scheme.updatedAt)}
                  </TableCell>
                  <TableCell className="pr-[22px]">
                    {canWrite && (
                      <div className="flex justify-end gap-2">
                        <Button asChild size="sm" variant="outline">
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
                          className="text-destructive hover:text-destructive"
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
      </Card>
      <Pagination
        page={page}
        totalPages={schemes.data?.totalPages ?? 0}
        isLast={schemes.data?.last ?? true}
        onPrev={() => setPage((current) => current - 1)}
        onNext={() => setPage((current) => current + 1)}
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
