import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { Card } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { cn } from '#/lib/utils'
import { apiErrorMessage } from '#/lib/api-error'
import { ConfirmDialog } from '#/components/dashboard/ConfirmDialog'
import { usePermissions } from '#/components/dashboard/use-permissions'
import { RiskClassModal } from '#/components/ia-pricing/RiskClassModal'
import { RiskClassCard } from '#/components/ia-pricing/RiskClassCard'
import { ProrationCoefficientModal } from '#/components/ia-pricing/ProrationCoefficientModal'
import {
  deleteProrationCoefficient,
  deleteRiskClass,
  getProrationCoefficients,
  getRiskClasses,
} from '#/services/ia-pricing'
import type {
  ProrationCoefficientResponse,
  RiskClassResponse,
} from '#/services/ia-pricing'

const nf = new Intl.NumberFormat('fr-FR')
const headCls =
  'h-auto bg-[#fafbfc] px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.05em] text-muted-foreground'

function durationLabel(c: ProrationCoefficientResponse): string {
  return c.maxMonths === undefined
    ? `${c.minMonths} mois et plus`
    : `${c.minMonths} – ${c.maxMonths} mois`
}

export function IaPricing({ productId }: { productId: number }) {
  const queryClient = useQueryClient()
  const { can } = usePermissions()
  const canRc = can('riskclass:write')
  const canProration = can('prorationcoefficient:write')
  const rcTitle = canRc
    ? undefined
    : "Vous n'avez pas la permission requise (riskclass:write)."
  const prorationTitle = canProration
    ? undefined
    : "Vous n'avez pas la permission requise (prorationcoefficient:write)."

  const [showAddRc, setShowAddRc] = useState(false)
  const [editingRc, setEditingRc] = useState<RiskClassResponse | null>(null)
  const [deletingRc, setDeletingRc] = useState<RiskClassResponse | null>(null)
  const [showAddProration, setShowAddProration] = useState(false)
  const [editingProration, setEditingProration] =
    useState<ProrationCoefficientResponse | null>(null)
  const [deletingProration, setDeletingProration] =
    useState<ProrationCoefficientResponse | null>(null)

  const { data: riskClassesData } = useQuery({
    queryKey: ['risk-classes', productId],
    queryFn: () => getRiskClasses(productId),
    retry: false,
  })

  const { data: prorationData } = useQuery({
    queryKey: ['proration-coefficients', productId],
    queryFn: () => getProrationCoefficients(productId),
    retry: false,
  })

  const deleteRcMutation = useMutation({
    mutationFn: deleteRiskClass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-classes', productId] })
      toast.success('Classe de risque supprimée.')
      setDeletingRc(null)
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const deleteProrationMutation = useMutation({
    mutationFn: deleteProrationCoefficient,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['proration-coefficients', productId],
      })
      toast.success('Coefficient supprimé.')
      setDeletingProration(null)
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const riskClasses = riskClassesData?.content ?? []
  const coefficients = prorationData?.content ?? []

  return (
    <div className="flex flex-col gap-6">
      {showAddRc && (
        <RiskClassModal
          productId={productId}
          onClose={() => setShowAddRc(false)}
        />
      )}
      {editingRc && (
        <RiskClassModal
          productId={productId}
          riskClass={editingRc}
          onClose={() => setEditingRc(null)}
        />
      )}
      {showAddProration && (
        <ProrationCoefficientModal
          productId={productId}
          onClose={() => setShowAddProration(false)}
        />
      )}
      {editingProration && (
        <ProrationCoefficientModal
          productId={productId}
          coefficient={editingProration}
          onClose={() => setEditingProration(null)}
        />
      )}

      {/* Coefficients de proration (niveau produit) */}
      <Card className="gap-0 overflow-hidden p-0">
        <div className="flex items-center justify-between border-b px-[22px] py-3.5">
          <div className="text-[13.5px] font-bold">
            Coefficients de proration
            <span className="ml-2 text-[12px] font-medium text-muted-foreground tabular-nums">
              {coefficients.length}
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-[10px]"
            onClick={() => setShowAddProration(true)}
            disabled={!canProration}
            title={prorationTitle}
          >
            <Plus />
            Nouveau coefficient
          </Button>
        </div>
        {coefficients.length === 0 ? (
          <div className="px-[22px] py-6 text-[13px] text-muted-foreground">
            Aucun coefficient de proration. La prime ne sera pas ajustée selon
            la durée du contrat.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={cn(headCls, 'pl-[22px]')}>
                  Durée
                </TableHead>
                <TableHead className={cn(headCls, 'text-right')}>
                  Coefficient
                </TableHead>
                <TableHead className={cn(headCls, 'pr-[22px] text-right')}>
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coefficients.map((c) => (
                <TableRow key={c.id} className="hover:bg-transparent">
                  <TableCell className="py-3 pl-[22px] text-[13.5px] font-semibold">
                    {durationLabel(c)}
                  </TableCell>
                  <TableCell className="py-3 text-right text-[13.5px] font-semibold tabular-nums">
                    {nf.format(c.coefficient)}
                  </TableCell>
                  <TableCell className="py-3 pr-[22px]">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-[9px]"
                        onClick={() => setEditingProration(c)}
                        disabled={!canProration}
                        title={prorationTitle}
                      >
                        Modifier
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="rounded-[9px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setDeletingProration(c)}
                        disabled={!canProration}
                        title={prorationTitle}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Classes de risque */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[16px] font-extrabold tracking-[-0.02em]">
            Classes de risque
          </h2>
          <Button
            type="button"
            size="sm"
            className="rounded-[10px]"
            onClick={() => setShowAddRc(true)}
            disabled={!canRc}
            title={rcTitle}
          >
            <Plus />
            Nouvelle classe de risque
          </Button>
        </div>

        {riskClasses.length === 0 ? (
          <Card className="gap-0 py-0">
            <div className="p-9 text-center text-[13.5px] text-muted-foreground">
              Aucune classe de risque. Ajoutez-en une pour définir ses taux de
              prime et ses modificateurs.
            </div>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {riskClasses.map((rc) => (
              <RiskClassCard
                key={rc.id}
                riskClass={rc}
                onEdit={() => setEditingRc(rc)}
                onDelete={() => setDeletingRc(rc)}
              />
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deletingRc}
        title="Supprimer la classe de risque"
        description={
          deletingRc
            ? `La classe n° ${deletingRc.classNumber} et ses taux/modificateurs associés seront supprimés.`
            : undefined
        }
        confirmLabel={deleteRcMutation.isPending ? 'Suppression…' : 'Supprimer'}
        destructive
        pending={deleteRcMutation.isPending}
        onConfirm={() => deletingRc && deleteRcMutation.mutate(deletingRc.id)}
        onOpenChange={(open) => {
          if (!open) setDeletingRc(null)
        }}
      />

      <ConfirmDialog
        open={!!deletingProration}
        title="Supprimer le coefficient"
        description={
          deletingProration
            ? `Le coefficient pour « ${durationLabel(deletingProration)} » sera supprimé.`
            : undefined
        }
        confirmLabel={
          deleteProrationMutation.isPending ? 'Suppression…' : 'Supprimer'
        }
        destructive
        pending={deleteProrationMutation.isPending}
        onConfirm={() =>
          deletingProration &&
          deleteProrationMutation.mutate(deletingProration.id)
        }
        onOpenChange={(open) => {
          if (!open) setDeletingProration(null)
        }}
      />
    </div>
  )
}
