import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { Card } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { apiErrorMessage } from '#/lib/api-error'
import { ConfirmDialog } from '#/components/dashboard/ConfirmDialog'
import { usePermissions } from '#/components/dashboard/use-permissions'
import { RiskClassPremiumRateModal } from '#/components/ia-pricing/RiskClassPremiumRateModal'
import { PremiumModifierModal } from '#/components/ia-pricing/PremiumModifierModal'
import { MODIFIER_TYPE_LABEL } from '#/components/ia-pricing/labels'
import {
  deletePremiumModifier,
  getPremiumModifiers,
  getPremiumRateByRiskClass,
} from '#/services/ia-pricing'
import type {
  PremiumModifierResponse,
  RiskClassResponse,
} from '#/services/ia-pricing'

interface RiskClassCardProps {
  riskClass: RiskClassResponse
  onEdit: () => void
  onDelete: () => void
}

const nf = new Intl.NumberFormat('fr-FR')

function Metric({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-[10px] bg-muted/40 px-3 py-2.5">
      <div className="text-[11px] font-semibold tracking-[0.03em] text-muted-foreground uppercase">
        {label}
      </div>
      <div className="mt-0.5 text-[14px] font-bold tabular-nums">
        {value === undefined ? '—' : nf.format(value)}
      </div>
    </div>
  )
}

function formatRate(modifier: PremiumModifierResponse): string {
  switch (modifier.modifierType) {
    case 'FIXED_AMOUNT':
      return `${nf.format(modifier.rate)} FCFA`
    case 'MULTIPLIER':
      return `× ${nf.format(modifier.rate)}`
    default:
      return `${nf.format(modifier.rate)} %`
  }
}

export function RiskClassCard({
  riskClass,
  onEdit,
  onDelete,
}: RiskClassCardProps) {
  const rcId = riskClass.id
  const queryClient = useQueryClient()
  const { can } = usePermissions()
  const canRc = can('riskclass:write')
  const canRate = can('riskclasspremiumrate:write')
  const canModifier = can('premiummodifier:write')
  const rcTitle = canRc
    ? undefined
    : "Vous n'avez pas la permission requise (riskclass:write)."
  const rateTitle = canRate
    ? undefined
    : "Vous n'avez pas la permission requise (riskclasspremiumrate:write)."
  const modifierTitle = canModifier
    ? undefined
    : "Vous n'avez pas la permission requise (premiummodifier:write)."

  const [showRate, setShowRate] = useState(false)
  const [showAddModifier, setShowAddModifier] = useState(false)
  const [editingModifier, setEditingModifier] =
    useState<PremiumModifierResponse | null>(null)
  const [removingModifier, setRemovingModifier] =
    useState<PremiumModifierResponse | null>(null)

  const { data: premiumRate, isError: premiumRateError } = useQuery({
    queryKey: ['risk-class-premium-rate', rcId],
    queryFn: () => getPremiumRateByRiskClass(rcId),
    retry: false,
  })

  const { data: modifiersData } = useQuery({
    queryKey: ['premium-modifiers', rcId],
    queryFn: () => getPremiumModifiers(rcId),
    retry: false,
  })

  const removeMutation = useMutation({
    mutationFn: deletePremiumModifier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['premium-modifiers', rcId] })
      toast.success('Modificateur supprimé.')
      setRemovingModifier(null)
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const modifiers = modifiersData?.content ?? []

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="flex items-start justify-between gap-3 border-b p-[18px]">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="rounded-md border-transparent bg-primary/10 px-2 py-0.5 text-[12px] font-bold text-primary tabular-nums">
              Classe {riskClass.classNumber}
            </Badge>
          </div>
          {riskClass.description && (
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              {riskClass.description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-[9px]"
            onClick={onEdit}
            disabled={!canRc}
            title={rcTitle}
          >
            Modifier
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-[9px] text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onDelete}
            disabled={!canRc}
            title={rcTitle}
          >
            Supprimer
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-5 p-[18px]">
        {/* Taux de prime */}
        <section>
          <div className="mb-2.5 flex items-center justify-between">
            <h4 className="text-[12px] font-bold tracking-[0.04em] text-muted-foreground uppercase">
              Taux de prime
            </h4>
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="rounded-[8px]"
              disabled={premiumRateError || !canRate}
              title={rateTitle}
              onClick={() => setShowRate(true)}
            >
              {premiumRate ? 'Modifier les taux' : 'Définir les taux'}
            </Button>
          </div>
          {premiumRateError ? (
            <p className="text-[13px] text-destructive">
              Impossible de charger les taux de prime.
            </p>
          ) : premiumRate ? (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <Metric label="Décès" value={premiumRate.death} />
              <Metric
                label="Invalidité perm."
                value={premiumRate.permanentDisability}
              />
              <Metric
                label="Frais médicaux"
                value={premiumRate.medicalExpenses}
              />
            </div>
          ) : (
            <p className="text-[13px] text-muted-foreground">
              Aucun taux de prime défini pour cette classe.
            </p>
          )}
        </section>

        {/* Modificateurs */}
        <section>
          <div className="mb-2.5 flex items-center justify-between">
            <h4 className="text-[12px] font-bold tracking-[0.04em] text-muted-foreground uppercase">
              Modificateurs
            </h4>
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="rounded-[8px]"
              onClick={() => setShowAddModifier(true)}
              disabled={!canModifier}
              title={modifierTitle}
            >
              <Plus />
              Ajouter un modificateur
            </Button>
          </div>
          {modifiers.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              Aucun modificateur pour cette classe.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {modifiers.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-3 rounded-[10px] border px-3 py-2"
                >
                  <div className="flex min-w-0 flex-col">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[13.5px] font-semibold">
                        {m.label}
                      </span>
                      {!m.isActive && (
                        <Badge
                          variant="secondary"
                          className="rounded-md px-1.5 py-0 text-[10.5px] font-semibold"
                        >
                          Inactif
                        </Badge>
                      )}
                    </div>
                    <span className="font-mono text-[11.5px] text-muted-foreground">
                      {m.code}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-right text-[13px] text-muted-foreground tabular-nums">
                      {formatRate(m)}
                      <span className="ml-1.5 text-[11px]">
                        ({MODIFIER_TYPE_LABEL[m.modifierType]})
                      </span>
                    </span>
                    <div className="flex shrink-0 gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-[9px]"
                        onClick={() => setEditingModifier(m)}
                        disabled={!canModifier}
                        title={modifierTitle}
                      >
                        Modifier
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="rounded-[9px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setRemovingModifier(m)}
                        disabled={!canModifier}
                        title={modifierTitle}
                      >
                        Retirer
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {showRate && (
        <RiskClassPremiumRateModal
          riskClassId={rcId}
          premiumRate={premiumRate ?? null}
          onClose={() => setShowRate(false)}
        />
      )}
      {showAddModifier && (
        <PremiumModifierModal
          riskClassId={rcId}
          onClose={() => setShowAddModifier(false)}
        />
      )}
      {editingModifier && (
        <PremiumModifierModal
          riskClassId={rcId}
          modifier={editingModifier}
          onClose={() => setEditingModifier(null)}
        />
      )}

      <ConfirmDialog
        open={!!removingModifier}
        title="Supprimer le modificateur"
        description={
          removingModifier
            ? `Le modificateur « ${removingModifier.label} » sera supprimé de cette classe.`
            : undefined
        }
        confirmLabel={removeMutation.isPending ? 'Suppression…' : 'Supprimer'}
        destructive
        pending={removeMutation.isPending}
        onConfirm={() =>
          removingModifier && removeMutation.mutate(removingModifier.id)
        }
        onOpenChange={(open) => {
          if (!open) setRemovingModifier(null)
        }}
      />
    </Card>
  )
}
