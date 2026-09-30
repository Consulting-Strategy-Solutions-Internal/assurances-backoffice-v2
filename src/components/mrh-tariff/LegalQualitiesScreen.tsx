import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Pencil, TriangleAlert } from 'lucide-react'
import { usePermissions } from '#/components/dashboard/use-permissions'
import { EmptyState } from '#/components/layout/EmptyState'
import { InfoList, InfoRow } from '#/components/layout/InfoList'
import { SectionCard } from '#/components/layout/SectionCard'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { WarningBanner } from '#/components/ia-products/shared/WarningBanner'
import {
  isForbidden,
  noWriteTitle,
} from '#/components/ia-products/shared/screen-kit'
import { apiErrorMessage } from '#/lib/api-error'
import { formatPermille } from '#/lib/format'
import {
  BASE_RATE_FIELDS,
  PROPERTY_BASIS_LABELS,
  baseRateFieldsFor,
} from '#/lib/mrh-tariff'
import {
  MRH_LEGAL_QUALITY_CODES,
  getBaseRates,
  getLegalQualities,
} from '#/services/mrh-tariff'
import type {
  BaseRateResponse,
  LegalQualityResponse,
} from '#/services/mrh-tariff'
import { BaseRateDialog } from './BaseRateDialog'
import { CodeTag, MRH_KEYS } from './grid-kit'
import { LegalQualityDialog } from './LegalQualityDialog'

const multiplierFormatter = new Intl.NumberFormat('fr-FR', {
  maximumFractionDigits: 2,
})

/** Ordre de la grille NSIA, quel que soit l'ordre renvoyé par l'API. */
export function sortByGridOrder<T extends { code: string }>(rows: T[]): T[] {
  const rank = (code: string) =>
    (MRH_LEGAL_QUALITY_CODES as readonly string[]).indexOf(code)
  return [...rows].sort((a, b) => rank(a.code) - rank(b.code))
}

function BaseRateValue({
  rate,
  unit,
}: {
  rate: number | null
  unit: 'permille' | 'multiplier'
}) {
  if (unit === 'permille') return <>{formatPermille(rate)}</>
  return <>{rate == null ? '—' : `× ${multiplierFormatter.format(rate)}`}</>
}

function SituationCard({
  legalQuality,
  baseRate,
  baseRatesLoading,
  canEditSituation,
  canEditRates,
  onEditSituation,
  onEditRates,
}: {
  legalQuality: LegalQualityResponse
  baseRate: BaseRateResponse | undefined
  baseRatesLoading: boolean
  canEditSituation: boolean
  canEditRates: boolean
  onEditSituation: () => void
  onEditRates: () => void
}) {
  const shown = baseRate ? baseRateFieldsFor(baseRate) : []
  return (
    <SectionCard
      title={legalQuality.name}
      description={legalQuality.description ?? undefined}
      action={
        <span title={noWriteTitle('Qualités juridiques', canEditSituation)}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-[10px]"
            disabled={!canEditSituation}
            aria-label={`Modifier la situation ${legalQuality.name}`}
            onClick={onEditSituation}
          >
            <Pencil className="size-3.5" />
            Modifier
          </Button>
        </span>
      }
    >
      <InfoList columns={2}>
        <InfoRow label="Code">
          <CodeTag>{legalQuality.code}</CodeTag>
        </InfoRow>
        <InfoRow label="Base de calcul">
          {PROPERTY_BASIS_LABELS[legalQuality.propertyBasis]}
        </InfoRow>
        <InfoRow label="Occupation à préciser au devis">
          {legalQuality.occupancyRequired ? 'Oui' : 'Non'}
        </InfoRow>
      </InfoList>

      <div className="mt-5 border-t pt-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[13.5px] font-bold">Taux de base</h3>
          {baseRate && (
            <span title={noWriteTitle('Tarifs de base', canEditRates)}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-[10px]"
                disabled={!canEditRates}
                aria-label={`Modifier les taux de ${legalQuality.name}`}
                onClick={onEditRates}
              >
                <Pencil className="size-3.5" />
                Modifier les taux
              </Button>
            </span>
          )}
        </div>
        {baseRatesLoading ? (
          <Skeleton className="h-12 rounded-lg" />
        ) : !baseRate ? (
          <p className="text-[13px] text-muted-foreground">
            Aucun taux de base pour cette situation.
          </p>
        ) : (
          <InfoList columns={2}>
            {BASE_RATE_FIELDS.filter((f) => shown.includes(f.name)).map((f) => (
              <InfoRow key={f.name} label={f.label}>
                <span className="tabular-nums">
                  <BaseRateValue rate={baseRate[f.name]} unit={f.unit} />
                </span>
              </InfoRow>
            ))}
          </InfoList>
        )}
      </div>
    </SectionCard>
  )
}

export function LegalQualitiesScreen() {
  const { can } = usePermissions()
  const [editingSituation, setEditingSituation] =
    useState<LegalQualityResponse | null>(null)
  const [editingRates, setEditingRates] = useState<{
    legalQuality: LegalQualityResponse
    baseRate: BaseRateResponse
  } | null>(null)

  const situations = useQuery({
    queryKey: MRH_KEYS.legalQualities,
    queryFn: getLegalQualities,
  })
  const baseRates = useQuery({
    queryKey: MRH_KEYS.baseRates,
    queryFn: getBaseRates,
  })

  const rows = useMemo(
    () => sortByGridOrder(situations.data?.content ?? []),
    [situations.data],
  )
  const rateBySituation = useMemo(
    () =>
      new Map(
        (baseRates.data?.content ?? []).map((r) => [r.legalQualityId, r]),
      ),
    [baseRates.data],
  )

  if (situations.isPending) {
    return (
      <div className="grid gap-[18px] @4xl/main:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-72 rounded-xl" />
        ))}
      </div>
    )
  }

  if (situations.isError) {
    return (
      <EmptyState
        variant="card"
        icon={TriangleAlert}
        tone="error"
        title={
          isForbidden(situations.error)
            ? 'Accès refusé.'
            : 'Impossible de charger les situations.'
        }
        description={apiErrorMessage(situations.error)}
        action={
          <Button
            variant="outline"
            className="rounded-[11px]"
            onClick={() => void situations.refetch()}
          >
            Réessayer
          </Button>
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-[18px]">
      {baseRates.isError && (
        <WarningBanner tone="danger">
          Impossible de charger les taux de base :{' '}
          {apiErrorMessage(baseRates.error)}
        </WarningBanner>
      )}
      <div className="grid gap-[18px] @4xl/main:grid-cols-2">
        {rows.map((lq) => {
          const baseRate = rateBySituation.get(lq.id)
          return (
            <SituationCard
              key={lq.id}
              legalQuality={lq}
              baseRate={baseRate}
              baseRatesLoading={baseRates.isPending}
              canEditSituation={can('legalquality:write')}
              canEditRates={can('baserate:write')}
              onEditSituation={() => setEditingSituation(lq)}
              onEditRates={() => {
                if (baseRate) setEditingRates({ legalQuality: lq, baseRate })
              }}
            />
          )
        })}
      </div>

      {editingSituation && (
        <LegalQualityDialog
          legalQuality={editingSituation}
          onClose={() => setEditingSituation(null)}
        />
      )}
      {editingRates && (
        <BaseRateDialog
          legalQuality={editingRates.legalQuality}
          baseRate={editingRates.baseRate}
          onClose={() => setEditingRates(null)}
        />
      )}
    </div>
  )
}
