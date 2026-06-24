import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { Card } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'
import { apiErrorMessage } from '#/lib/api-error'
import { ConfirmDialog } from '#/components/dashboard/ConfirmDialog'
import { usePermissions } from '#/components/dashboard/use-permissions'
import { BaseRateModal } from '#/components/pricing/BaseRateModal'
import { AddLegalQualityWarrantyModal } from '#/components/pricing/AddLegalQualityWarrantyModal'
import {
  PREMIUM_TYPE_LABEL,
  PROPERTY_BASIS_LABEL,
} from '#/components/pricing/labels'
import {
  deleteLegalQualityWarranty,
  getBaseRateByLegalQuality,
  getLegalQualityWarranties,
  getWarranties,
} from '#/services/pricing'
import type {
  LegalQualityResponse,
  LegalQualityWarrantyResponse,
} from '#/services/pricing'

interface LegalQualityCardProps {
  legalQuality: LegalQualityResponse
  onEdit: () => void
  onDelete: () => void
}

function Metric({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-[10px] bg-muted/40 px-3 py-2.5">
      <div className="text-[11px] font-semibold tracking-[0.03em] text-muted-foreground uppercase">
        {label}
      </div>
      <div className="mt-0.5 text-[14px] font-bold tabular-nums">
        {value === undefined ? '—' : value}
      </div>
    </div>
  )
}

export function LegalQualityCard({
  legalQuality,
  onEdit,
  onDelete,
}: LegalQualityCardProps) {
  const lqId = legalQuality.id
  const queryClient = useQueryClient()
  const { can } = usePermissions()
  const canLq = can('legalquality:write')
  const canRate = can('baserate:write')
  const lqTitle = canLq
    ? undefined
    : "Vous n'avez pas la permission requise (legalquality:write)."
  const rateTitle = canRate
    ? undefined
    : "Vous n'avez pas la permission requise (baserate:write)."
  const [showBaseRate, setShowBaseRate] = useState(false)
  const [showAddWarranty, setShowAddWarranty] = useState(false)
  const [removingWarranty, setRemovingWarranty] =
    useState<LegalQualityWarrantyResponse | null>(null)

  const { data: baseRate, isError: baseRateError } = useQuery({
    queryKey: ['base-rate', lqId],
    queryFn: () => getBaseRateByLegalQuality(lqId),
    retry: false,
  })

  const { data: warrantiesLinks } = useQuery({
    queryKey: ['legal-quality-warranties', lqId],
    queryFn: () => getLegalQualityWarranties(lqId),
    retry: false,
  })

  const { data: warrantiesCatalog } = useQuery({
    queryKey: ['warranties', 'all'],
    queryFn: () => getWarranties(0, 200),
    retry: false,
  })

  const warrantyName = (id: number) =>
    warrantiesCatalog?.content.find((w) => w.id === id)?.name ??
    `Garantie #${id}`

  const removeMutation = useMutation({
    mutationFn: deleteLegalQualityWarranty,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['legal-quality-warranties', lqId],
      })
      toast.success('Garantie retirée.')
      setRemovingWarranty(null)
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const links = warrantiesLinks?.content ?? []

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="flex items-start justify-between gap-3 border-b p-[18px]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-bold">{legalQuality.name}</span>
            {legalQuality.propertyBasis && (
              <Badge
                variant="secondary"
                className="rounded-md px-2 py-0.5 text-[11px] font-semibold"
              >
                {PROPERTY_BASIS_LABEL[legalQuality.propertyBasis]}
              </Badge>
            )}
          </div>
          {legalQuality.description && (
            <p className="mt-1 text-[13px] text-muted-foreground">
              {legalQuality.description}
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
            disabled={!canLq}
            title={lqTitle}
          >
            Modifier
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-[9px] text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onDelete}
            disabled={!canLq}
            title={lqTitle}
          >
            Supprimer
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-5 p-[18px]">
        {/* Taux de base */}
        <section>
          <div className="mb-2.5 flex items-center justify-between">
            <h4 className="text-[12px] font-bold tracking-[0.04em] text-muted-foreground uppercase">
              Taux de base
            </h4>
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="rounded-[8px]"
              disabled={baseRateError || !canRate}
              title={rateTitle}
              onClick={() => setShowBaseRate(true)}
            >
              {baseRate ? 'Modifier les taux' : 'Définir les taux'}
            </Button>
          </div>
          {baseRateError ? (
            <p className="text-[13px] text-destructive">
              Impossible de charger les taux de base.
            </p>
          ) : baseRate ? (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <Metric label="Bâtiment" value={baseRate.buildingPremiumRate} />
              <Metric label="Contenu" value={baseRate.contentsPremiumRate} />
              <Metric
                label="Val. locative"
                value={baseRate.rentalValuePremiumRate}
              />
              <Metric
                label="Contenu min."
                value={baseRate.minimumContentsValue}
              />
            </div>
          ) : (
            <p className="text-[13px] text-muted-foreground">
              Aucun taux de base défini pour cette qualité.
            </p>
          )}
        </section>

        {/* Garanties */}
        <section>
          <div className="mb-2.5 flex items-center justify-between">
            <h4 className="text-[12px] font-bold tracking-[0.04em] text-muted-foreground uppercase">
              Garanties
            </h4>
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="rounded-[8px]"
              onClick={() => setShowAddWarranty(true)}
              disabled={!canLq}
              title={lqTitle}
            >
              <Plus />
              Lier une garantie
            </Button>
          </div>
          {links.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              Aucune garantie liée à cette qualité.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {links.map((link) => (
                <li
                  key={link.id}
                  className="flex items-center justify-between gap-3 rounded-[10px] border px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[13.5px] font-semibold">
                      {warrantyName(link.warrantyId)}
                    </span>
                    {link.mandatory && (
                      <Badge
                        variant="secondary"
                        className="rounded-md px-1.5 py-0 text-[10.5px] font-semibold"
                      >
                        Obligatoire
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] text-muted-foreground tabular-nums">
                      {link.premiumType === 'FORFAIT'
                        ? link.flatAmount === undefined
                          ? '—'
                          : `${link.flatAmount} FCFA`
                        : link.rate === undefined
                          ? '—'
                          : `${link.rate} %`}
                      <span className="ml-1.5 text-[11px]">
                        ({PREMIUM_TYPE_LABEL[link.premiumType]})
                      </span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={cn(
                        'rounded-[9px] text-destructive hover:bg-destructive/10 hover:text-destructive',
                      )}
                      onClick={() => setRemovingWarranty(link)}
                      disabled={!canLq}
                      title={lqTitle}
                    >
                      Retirer
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {showBaseRate && (
        <BaseRateModal
          legalQualityId={lqId}
          baseRate={baseRate ?? null}
          onClose={() => setShowBaseRate(false)}
        />
      )}
      {showAddWarranty && (
        <AddLegalQualityWarrantyModal
          legalQualityId={lqId}
          existingWarrantyIds={links.map((l) => l.warrantyId)}
          onClose={() => setShowAddWarranty(false)}
        />
      )}

      <ConfirmDialog
        open={!!removingWarranty}
        title="Retirer la garantie"
        description={
          removingWarranty
            ? `La garantie « ${warrantyName(removingWarranty.warrantyId)} » sera retirée de cette qualité juridique.`
            : undefined
        }
        confirmLabel={removeMutation.isPending ? 'Retrait…' : 'Retirer'}
        destructive
        pending={removeMutation.isPending}
        onConfirm={() =>
          removingWarranty && removeMutation.mutate(removingWarranty.id)
        }
        onOpenChange={(open) => {
          if (!open) setRemovingWarranty(null)
        }}
      />
    </Card>
  )
}
