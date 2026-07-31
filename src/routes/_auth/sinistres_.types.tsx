import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { Pagination } from '#/components/ui/Pagination'
import { ConfirmDialog } from '#/components/dashboard/ConfirmDialog'
import { PageHeader } from '#/components/dashboard/PageHeader'
import { ClaimsAdminGate } from '#/components/claims/ClaimsAdminGate'
import { ClaimTypeDialog } from '#/components/claims/ClaimTypeDialog'
import { FormSelect } from '#/components/forms/FormSelect'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { formatClaimDate, mapClaimError } from '#/lib/claims'
import { getProducts } from '#/services/products'
import {
  claimTypesKeys,
  deleteClaimType,
  getClaimTypes,
} from '#/services/claim-types'
import type {
  ClaimTypeFilters,
  ClaimTypeResponse,
} from '#/services/claim-types'

const searchSchema = z.object({
  productId: z.coerce.number().int().positive().optional().catch(undefined),
  page: z.coerce.number().int().min(0).catch(0),
  size: z.coerce.number().int().min(1).max(100).catch(20),
  sort: z
    .enum(['name,asc', 'name,desc', 'createdAt,desc', 'createdAt,asc'])
    .catch('name,asc'),
})
export const Route = createFileRoute('/_auth/sinistres_/types')({
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
  const filters: ClaimTypeFilters = search
  const { data, isLoading, error } = useQuery({
    queryKey: claimTypesKeys.list(filters),
    queryFn: () => getClaimTypes(filters),
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
    })
  return (
    <>
      <Button asChild variant="ghost" className="mb-3">
        <Link
          to="/sinistres"
          search={{ page: 0, size: 20, sort: 'createdAt,desc' }}
        >
          <ArrowLeft />
          Retour aux sinistres
        </Link>
      </Button>
      <PageHeader
        title="Types de sinistre"
        subtitle="Catalogue des motifs de déclaration par produit"
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
      <Card className="mb-4 grid gap-3 p-4 md:grid-cols-2">
        <FormSelect
          id="claim-type-product-filter"
          label="Produit"
          value={search.productId ? String(search.productId) : ''}
          includeNone
          noneLabel="Tous les produits"
          options={(products?.content ?? []).map((product) => ({
            value: String(product.id),
            label: product.label,
          }))}
          onChange={(value) =>
            updateSearch({ productId: value ? Number(value) : undefined })
          }
        />
        <FormSelect
          id="claim-type-sort"
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
      </Card>
      <Card className="gap-0 overflow-x-auto py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-[22px]">Nom</TableHead>
              <TableHead>Produit</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Mis à jour</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center">
                  Chargement…
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-destructive"
                >
                  Impossible de charger le catalogue.
                </TableCell>
              </TableRow>
            ) : !data?.content.length ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground"
                >
                  Aucun type de sinistre.
                </TableCell>
              </TableRow>
            ) : (
              data.content.map((type) => (
                <TableRow key={type.id}>
                  <TableCell className="pl-[22px] font-semibold">
                    {type.name}
                  </TableCell>
                  <TableCell>{type.productLabel}</TableCell>
                  <TableCell>{type.description || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {type.active ? 'Actif' : 'Inactif'}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatClaimDate(type.updatedAt, true)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditing(type)}
                      >
                        Modifier
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!type.active}
                        className="text-destructive"
                        onClick={() => setDeleting(type)}
                      >
                        Archiver
                      </Button>
                    </div>
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
