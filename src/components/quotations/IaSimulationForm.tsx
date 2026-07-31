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
import { computeIa } from '#/lib/premium/ia'
import type { IaModifierLine, IaResult } from '#/lib/premium/ia'
import {
  getPremiumModifiers,
  getPremiumRateByRiskClass,
  getProrationCoefficients,
  getRiskClasses,
} from '#/services/ia-pricing'
import { getAccessories } from '#/services/accessories'
import type { ProductResponse } from '#/services/products'

function num(v: string): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : NaN
}

const reqPositive = (v: string) => {
  const n = num(v)
  return v !== '' && !Number.isNaN(n) && n >= 0
}

export function IaSimulationForm({ product }: { product: ProductResponse }) {
  const [riskClassId, setRiskClassId] = useState('')
  const [deathCapital, setDeathCapital] = useState('')
  const [pdCapital, setPdCapital] = useState('')
  const [medicalCapital, setMedicalCapital] = useState('')
  const [insuredAge, setInsuredAge] = useState('')
  const [durationMonths, setDurationMonths] = useState('12')
  const [reductionRate, setReductionRate] = useState('0')
  const [appliedCodes, setAppliedCodes] = useState<Set<string>>(new Set())

  const rcQuery = useQuery({
    queryKey: ['risk-classes', product.id],
    queryFn: () => getRiskClasses(product.id),
    retry: false,
  })
  const accessoriesQuery = useQuery({
    queryKey: ['accessories', 'by-product', product.id],
    queryFn: () => getAccessories(0, 200, product.id),
    retry: false,
  })
  const prorationQuery = useQuery({
    queryKey: ['proration-coefficients', product.id],
    queryFn: () => getProrationCoefficients(product.id),
    retry: false,
  })

  const riskClasses = rcQuery.data?.content ?? []
  const selectedRc = riskClasses.find((r) => String(r.id) === riskClassId)

  const rateQuery = useQuery({
    queryKey: ['premium-rate', selectedRc?.id],
    queryFn: () => getPremiumRateByRiskClass(selectedRc!.id),
    enabled: !!selectedRc,
    retry: false,
  })
  const modifiersQuery = useQuery({
    queryKey: ['premium-modifiers', selectedRc?.id],
    queryFn: () => getPremiumModifiers(selectedRc!.id),
    enabled: !!selectedRc,
    retry: false,
  })

  useEffect(() => {
    setAppliedCodes(new Set())
  }, [riskClassId])

  const modifiers = useMemo<IaModifierLine[]>(() => {
    return (modifiersQuery.data?.content ?? [])
      .filter((m) => m.isActive)
      .map((m) => ({
        code: m.code,
        label: m.label,
        rate: m.rate,
        triggerType: m.triggerType,
        minAge: m.minAge,
        maxAge: m.maxAge,
      }))
  }, [modifiersQuery.data])

  const ageModifiers = modifiers.filter((m) => m.triggerType === 'AGE')
  const manualModifiers = modifiers.filter((m) => m.triggerType === 'MANUAL')
  const parsedDuration = num(durationMonths)
  const durationError =
    durationMonths === ''
      ? 'La durée est requise.'
      : !Number.isInteger(parsedDuration) || parsedDuration < 1
        ? 'Saisissez un nombre entier de mois supérieur ou égal à 1.'
        : undefined

  const computation = useMemo<{
    result?: IaResult
    error?: string
    message?: string
    ready: boolean
  }>(() => {
    if (!selectedRc) return { ready: false }
    if (rateQuery.data === null) {
      return {
        ready: false,
        error: 'Aucun taux de prime configuré pour cette classe de risque.',
      }
    }
    if (!rateQuery.data || !modifiersQuery.data) return { ready: false }
    if (prorationQuery.isLoading) {
      return { ready: false, message: 'Chargement des règles de prorata…' }
    }
    if (prorationQuery.error) {
      return {
        ready: false,
        error: 'Impossible de charger les règles de prorata de ce produit.',
      }
    }
    if (!prorationQuery.data) return { ready: false }

    if (
      !reqPositive(deathCapital) ||
      !reqPositive(pdCapital) ||
      !reqPositive(medicalCapital)
    ) {
      return { ready: false }
    }
    if (durationError) return { ready: false }
    const age = insuredAge === '' ? undefined : num(insuredAge)

    try {
      const result = computeIa({
        deathCapital: num(deathCapital),
        permanentDisabilityCapital: num(pdCapital),
        medicalExpensesCapital: num(medicalCapital),
        deathRate: rateQuery.data.death,
        permanentDisabilityRate: rateQuery.data.permanentDisability,
        medicalExpensesRate: rateQuery.data.medicalExpenses,
        insuredAge: age,
        appliedModifierCodes: appliedCodes,
        reductionRate: num(reductionRate) || 0,
        durationMonths: parsedDuration,
        modifiers,
        accessories: (accessoriesQuery.data?.content ?? []).map((a) => ({
          minPremium: a.minPremium,
          maxPremium: a.maxPremium,
          amount: a.amount,
        })),
        prorationBrackets: prorationQuery.data.content.map((p) => ({
          minMonths: p.minMonths,
          maxMonths: p.maxMonths,
          coefficient: p.coefficient,
        })),
      })
      return { result, ready: true }
    } catch (err) {
      if (err instanceof PremiumError)
        return { ready: false, error: err.message }
      return { ready: false, error: 'Erreur de calcul.' }
    }
  }, [
    selectedRc,
    rateQuery.data,
    modifiersQuery.data,
    deathCapital,
    pdCapital,
    medicalCapital,
    durationMonths,
    insuredAge,
    appliedCodes,
    reductionRate,
    modifiers,
    accessoriesQuery.data,
    prorationQuery.data,
    prorationQuery.isLoading,
    prorationQuery.error,
    durationError,
    parsedDuration,
  ])

  const toggle = (code: string) =>
    setAppliedCodes((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })

  const age = insuredAge === '' ? undefined : num(insuredAge)
  const ageApplies = (m: IaModifierLine) =>
    age != null &&
    m.minAge != null &&
    m.maxAge != null &&
    age >= m.minAge &&
    age <= m.maxAge

  return (
    <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[1fr_minmax(340px,400px)]">
      <Card className="gap-5 p-5">
        <div className="flex flex-col gap-1.5">
          <Label className="text-[13px]">Classe de risque</Label>
          <Select value={riskClassId} onValueChange={setRiskClassId}>
            <SelectTrigger className="h-10 w-full rounded-[10px]">
              <SelectValue
                placeholder={
                  rcQuery.isLoading
                    ? 'Chargement…'
                    : riskClasses.length === 0
                      ? 'Aucune classe de risque pour ce produit'
                      : 'Sélectionner une classe de risque'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {riskClasses.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>
                  Classe {r.classNumber}
                  {r.description ? ` · ${r.description}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedRc && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField
                id="deathCapital"
                label="Capital décès (FCFA)"
                type="number"
                required
                value={deathCapital}
                onChange={setDeathCapital}
              />
              <FormField
                id="pdCapital"
                label="Capital IPP (FCFA)"
                type="number"
                required
                value={pdCapital}
                onChange={setPdCapital}
              />
              <FormField
                id="medicalCapital"
                label="Capital frais méd. (FCFA)"
                type="number"
                required
                value={medicalCapital}
                onChange={setMedicalCapital}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField
                id="insuredAge"
                label="Âge de l'assuré"
                type="number"
                value={insuredAge}
                onChange={setInsuredAge}
                hint="Déclenche les majorations d'âge"
              />
              <FormField
                id="durationMonths"
                label="Durée (mois)"
                type="number"
                required
                value={durationMonths}
                onChange={setDurationMonths}
                error={durationError}
                hint="Le coefficient est sélectionné automatiquement selon la tranche configurée pour le produit."
              />
              <FormField
                id="reductionRate"
                label="Réduction (%)"
                type="number"
                value={reductionRate}
                onChange={setReductionRate}
              />
            </div>

            {(ageModifiers.length > 0 || manualModifiers.length > 0) && (
              <div className="flex flex-col gap-2">
                <Label className="text-[13px]">Majorations</Label>

                {manualModifiers.map((m) => (
                  <label
                    key={m.code}
                    className="flex items-center justify-between gap-3 rounded-[10px] border px-3 py-2"
                  >
                    <span className="flex flex-1 items-center gap-2.5">
                      <Checkbox
                        checked={appliedCodes.has(m.code)}
                        onCheckedChange={() => toggle(m.code)}
                      />
                      <span className="text-[13.5px] font-medium">
                        {m.label}
                      </span>
                    </span>
                    <span className="text-[12px] font-semibold text-muted-foreground tabular-nums">
                      +{m.rate} %
                    </span>
                  </label>
                ))}

                {ageModifiers.map((m) => {
                  const active = ageApplies(m)
                  return (
                    <div
                      key={m.code}
                      className={cn(
                        'flex items-center justify-between gap-3 rounded-[10px] border px-3 py-2',
                        active && 'border-primary/40 bg-primary/[0.04]',
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-[13.5px] font-medium">
                          {m.label}
                        </span>
                        <Badge
                          variant="secondary"
                          className="rounded-md px-1.5 py-0 text-[10.5px] font-semibold"
                        >
                          {m.minAge}–{m.maxAge} ans
                        </Badge>
                        {active && (
                          <Badge className="rounded-md border-transparent bg-primary/10 px-1.5 py-0 text-[10.5px] font-semibold text-primary">
                            Appliquée
                          </Badge>
                        )}
                      </span>
                      <span className="text-[12px] font-semibold text-muted-foreground tabular-nums">
                        +{m.rate} %
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </Card>

      <IaResultPanel computation={computation} hasRc={!!selectedRc} />
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

function IaResultPanel({
  computation,
  hasRc,
}: {
  computation: {
    result?: IaResult
    error?: string
    message?: string
    ready: boolean
  }
  hasRc: boolean
}) {
  const { result, error, message } = computation
  return (
    <Card className="h-fit gap-0 overflow-hidden p-0 lg:sticky lg:top-4">
      <div className="flex items-center gap-2.5 border-b bg-[linear-gradient(150deg,#013a8f_0%,#00255e_100%)] px-5 py-4 text-white">
        <Calculator className="size-[18px] text-[#FFC61E]" />
        <div className="text-[14px] font-bold">Résultat de la simulation</div>
      </div>
      <div className="p-5">
        {error ? (
          <p className="text-[13px] text-destructive">{error}</p>
        ) : message ? (
          <p className="text-[13px] text-muted-foreground">{message}</p>
        ) : !result ? (
          <p className="text-[13px] text-muted-foreground">
            {hasRc
              ? 'Renseignez les capitaux pour calculer la prime.'
              : 'Choisissez une classe de risque pour démarrer.'}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <Row label="Prime décès (PD)" value={formatFcfa(result.pd)} />
            <Row label="Prime IPP (PIP)" value={formatFcfa(result.pip)} />
            <Row
              label="Prime frais méd. (PFM)"
              value={formatFcfa(result.pfm)}
            />
            <Separator />
            <Row
              label="Majoration (TMaj)"
              value={`+${result.surchargePercent} %`}
            />
            <Row
              label="Réduction (Tmin)"
              value={`−${result.reductionPercent} %`}
            />
            <Separator />
            <Row label="Prime nette (PNT)" value={formatFcfa(result.pnt)} />
            <Row label="Accessoire" value={formatFcfa(result.fees)} />
            <Row label="Taxe (14,5 %)" value={formatFcfa(result.tax)} />
            <Row label="Prime TTC" value={formatFcfa(result.pttc)} />
            <Separator />
            <Row
              label="Durée déclarée"
              value={`${result.durationMonths} mois`}
            />
            <Row
              label="Tranche de prorata"
              value={
                result.prorationBracket
                  ? `${result.prorationBracket.minMonths}–${result.prorationBracket.maxMonths ?? '∞'} mois`
                  : 'Aucune tranche configurée'
              }
            />
            <Row
              label="Coefficient appliqué"
              value={`× ${result.coefficient.toLocaleString('fr-FR')}`}
            />
            <Row
              label="Prime TTC due"
              value={formatFcfa(result.pttcDue)}
              strong
            />
          </div>
        )}
      </div>
    </Card>
  )
}
