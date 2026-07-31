import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Calculator } from 'lucide-react'
import { Card } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { Checkbox } from '#/components/ui/checkbox'
import { Label } from '#/components/ui/label'
import { Separator } from '#/components/ui/separator'
import { FormField } from '#/components/forms/FormField'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { cn, formatFcfa } from '#/lib/utils'
import { PremiumError } from '#/lib/premium/math'
import { computeMrh } from '#/lib/premium/mrh'
import type { MrhResult, MrhWarrantyTariff } from '#/lib/premium/mrh'
import {
  getBaseRateByLegalQuality,
  getLegalQualities,
  getLegalQualityWarranties,
  getWarranties,
} from '#/services/pricing'
import { getAccessories } from '#/services/accessories'
import type { ProductResponse } from '#/services/products'

const PROPERTY_BASIS_LABEL: Record<string, string> = {
  BATIMENT: 'Bâtiment',
  LOCATIVE: 'Valeur locative',
  AUCUN: 'Contenu seul',
}

function num(v: string): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : NaN
}

export function MrhSimulationForm({ product }: { product: ProductResponse }) {
  const [legalQualityId, setLegalQualityId] = useState('')
  const [contentsValue, setContentsValue] = useState('')
  const [buildingValue, setBuildingValue] = useState('')
  const [rentalValue, setRentalValue] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const lqQuery = useQuery({
    queryKey: ['legal-qualities', product.id],
    queryFn: () => getLegalQualities(product.id),
    retry: false,
  })
  const warrantiesQuery = useQuery({
    queryKey: ['warranties', 'all'],
    queryFn: () => getWarranties(0, 200),
    retry: false,
  })
  const accessoriesQuery = useQuery({
    queryKey: ['accessories', 'by-product', product.id],
    queryFn: () => getAccessories(0, 200, product.id),
    retry: false,
  })

  const legalQualities = lqQuery.data?.content ?? []
  const selectedLq = legalQualities.find((l) => String(l.id) === legalQualityId)

  const baseRateQuery = useQuery({
    queryKey: ['base-rate', selectedLq?.id],
    queryFn: () => getBaseRateByLegalQuality(selectedLq!.id),
    enabled: !!selectedLq,
    retry: false,
  })
  const lqwQuery = useQuery({
    queryKey: ['legal-quality-warranties', selectedLq?.id],
    queryFn: () => getLegalQualityWarranties(selectedLq!.id),
    enabled: !!selectedLq,
    retry: false,
  })

  // Reset the optional-warranty selection whenever the legal quality changes.
  useEffect(() => {
    setSelected(new Set())
  }, [legalQualityId])

  const warrantyMeta = useMemo(() => {
    const map = new Map(
      (warrantiesQuery.data?.content ?? []).map((w) => [w.id, w] as const),
    )
    return (id: number) => map.get(id)
  }, [warrantiesQuery.data])

  const tariffs = useMemo<MrhWarrantyTariff[]>(() => {
    return (lqwQuery.data?.content ?? []).map((lqw) => {
      const w = warrantyMeta(lqw.warrantyId)
      return {
        warrantyId: lqw.warrantyId,
        warrantyName: w?.name ?? `Garantie #${lqw.warrantyId}`,
        premiumType: lqw.premiumType,
        rate: lqw.rate,
        flatAmount: lqw.flatAmount,
        mandatory: !!lqw.mandatory,
        taxRate: w?.taxRate ?? 0,
      }
    })
  }, [lqwQuery.data, warrantyMeta])

  const basis = selectedLq?.propertyBasis
  const needBuilding = basis === 'BATIMENT'
  const needRental = basis === 'LOCATIVE'

  const computation = useMemo<
    { result?: MrhResult; error?: string; ready: boolean }
  >(() => {
    if (!selectedLq) return { ready: false }
    if (!basis) {
      return {
        ready: false,
        error:
          "Cette qualité juridique n'a pas de base de propriété (propertyBasis) configurée.",
      }
    }
    if (baseRateQuery.data === null) {
      return {
        ready: false,
        error: 'Aucun taux de base configuré pour cette qualité juridique.',
      }
    }
    if (!baseRateQuery.data || !lqwQuery.data) return { ready: false }

    const cc = num(contentsValue)
    if (contentsValue === '' || Number.isNaN(cc) || cc < 0) return { ready: false }
    if (needBuilding) {
      const vb = num(buildingValue)
      if (buildingValue === '' || Number.isNaN(vb) || vb < 0) return { ready: false }
    }
    if (needRental) {
      const vl = num(rentalValue)
      if (rentalValue === '' || Number.isNaN(vl) || vl < 0) return { ready: false }
    }

    try {
      const result = computeMrh({
        contentsValue: cc,
        buildingValue: needBuilding ? num(buildingValue) : undefined,
        rentalValue: needRental ? num(rentalValue) : undefined,
        propertyBasis: basis,
        contentsRate: baseRateQuery.data.contentsPremiumRate ?? 0,
        buildingRate: baseRateQuery.data.buildingPremiumRate ?? 0,
        rentalRate: baseRateQuery.data.rentalValuePremiumRate ?? 0,
        tariffs,
        selectedWarrantyIds: selected,
        accessories: (accessoriesQuery.data?.content ?? []).map((a) => ({
          minPremium: a.minPremium,
          maxPremium: a.maxPremium,
          amount: a.amount,
        })),
      })
      return { result, ready: true }
    } catch (err) {
      if (err instanceof PremiumError) return { ready: false, error: err.message }
      return { ready: false, error: 'Erreur de calcul.' }
    }
  }, [
    selectedLq,
    basis,
    baseRateQuery.data,
    lqwQuery.data,
    contentsValue,
    buildingValue,
    rentalValue,
    needBuilding,
    needRental,
    tariffs,
    selected,
    accessoriesQuery.data,
  ])

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[1fr_minmax(340px,400px)]">
      {/* Saisie */}
      <Card className="gap-5 p-5">
        <div className="flex flex-col gap-1.5">
          <Label className="text-[13px]">Qualité juridique</Label>
          <Select value={legalQualityId} onValueChange={setLegalQualityId}>
            <SelectTrigger className="h-10 w-full rounded-[10px]">
              <SelectValue
                placeholder={
                  lqQuery.isLoading
                    ? 'Chargement…'
                    : legalQualities.length === 0
                      ? 'Aucune qualité juridique pour ce produit'
                      : 'Sélectionner une qualité juridique'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {legalQualities.map((l) => (
                <SelectItem key={l.id} value={String(l.id)}>
                  {l.name}
                  {l.propertyBasis
                    ? ` · ${PROPERTY_BASIS_LABEL[l.propertyBasis] ?? l.propertyBasis}`
                    : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedLq && (
          <>
            <FormField
              id="contentsValue"
              label="Capital contenu (FCFA)"
              type="number"
              required
              value={contentsValue}
              onChange={setContentsValue}
            />
            {needBuilding && (
              <FormField
                id="buildingValue"
                label="Valeur bâtiment (FCFA)"
                type="number"
                required
                value={buildingValue}
                onChange={setBuildingValue}
              />
            )}
            {needRental && (
              <FormField
                id="rentalValue"
                label="Valeur locative (FCFA)"
                type="number"
                required
                value={rentalValue}
                onChange={setRentalValue}
              />
            )}

            <div className="flex flex-col gap-2">
              <Label className="text-[13px]">Garanties</Label>
              {lqwQuery.isLoading ? (
                <p className="text-[13px] text-muted-foreground">Chargement…</p>
              ) : tariffs.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">
                  Aucune garantie liée à cette qualité juridique.
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {tariffs.map((t) => {
                    const checked = t.mandatory || selected.has(t.warrantyId)
                    return (
                      <li
                        key={t.warrantyId}
                        className="flex items-center justify-between gap-3 rounded-[10px] border px-3 py-2"
                      >
                        <label className="flex flex-1 items-center gap-2.5">
                          <Checkbox
                            checked={checked}
                            disabled={t.mandatory}
                            onCheckedChange={() => toggle(t.warrantyId)}
                          />
                          <span className="text-[13.5px] font-medium">
                            {t.warrantyName}
                          </span>
                          {t.mandatory && (
                            <Badge
                              variant="secondary"
                              className="rounded-md px-1.5 py-0 text-[10.5px] font-semibold"
                            >
                              Obligatoire
                            </Badge>
                          )}
                        </label>
                        <span className="text-[12px] text-muted-foreground tabular-nums">
                          {t.premiumType === 'FORFAIT'
                            ? `${formatFcfa(t.flatAmount)}`
                            : `${t.rate ?? 0} %`}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </>
        )}
      </Card>

      {/* Résultat */}
      <MrhResultPanel
        computation={computation}
        hasLq={!!selectedLq}
      />
    </div>
  )
}

function Row({
  label,
  value,
  strong,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span
        className={cn(
          'text-[13px]',
          strong ? 'font-semibold' : 'text-muted-foreground',
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          'tabular-nums',
          strong ? 'text-[14px] font-bold' : 'text-[13px] font-semibold',
        )}
      >
        {value}
      </span>
    </div>
  )
}

function MrhResultPanel({
  computation,
  hasLq,
}: {
  computation: { result?: MrhResult; error?: string; ready: boolean }
  hasLq: boolean
}) {
  const { result, error } = computation
  return (
    <Card className="h-fit gap-0 overflow-hidden p-0 lg:sticky lg:top-4">
      <div className="flex items-center gap-2.5 border-b bg-[linear-gradient(150deg,#013a8f_0%,#00255e_100%)] px-5 py-4 text-white">
        <Calculator className="size-[18px] text-[#FFC61E]" />
        <div className="text-[14px] font-bold">Résultat de la simulation</div>
      </div>
      <div className="p-5">
        {error ? (
          <p className="text-[13px] text-destructive">{error}</p>
        ) : !result ? (
          <p className="text-[13px] text-muted-foreground">
            {hasLq
              ? 'Renseignez les valeurs pour calculer la prime.'
              : 'Choisissez une qualité juridique pour démarrer.'}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <Row label="Assiette de base" value={formatFcfa(result.assiette)} />
            <Separator />
            <div className="flex flex-col gap-1.5">
              {result.lines.map((l) => (
                <div
                  key={l.warrantyId}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="text-[12.5px] text-muted-foreground">
                    {l.warrantyName}
                  </span>
                  <span className="text-[12.5px] font-semibold tabular-nums">
                    {formatFcfa(l.premium)}
                  </span>
                </div>
              ))}
            </div>
            <Separator />
            <Row label="Prime nette (PNT)" value={formatFcfa(result.netPremium)} />
            <Row label="Accessoire" value={formatFcfa(result.fees)} />
            <Row
              label="Taxe"
              value={formatFcfa(result.tax)}
            />
            <Separator />
            <Row label="Prime TTC" value={formatFcfa(result.gross)} strong />
          </div>
        )}
      </div>
    </Card>
  )
}
