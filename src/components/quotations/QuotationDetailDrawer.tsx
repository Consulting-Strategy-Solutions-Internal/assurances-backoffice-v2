import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { QuotationStatusBadge } from '#/components/quotations/QuotationStatusBadge'
import type { Attribution } from '#/components/quotations/useDistributionDirectory'
import { EmptyState } from '#/components/layout/EmptyState'
import { InfoList, InfoRow } from '#/components/layout/InfoList'
import { Button } from '#/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'
import { Skeleton } from '#/components/ui/skeleton'
import { clientFullName, formatPhone } from '#/lib/clients'
import { formatPersonName } from '#/lib/people'
import { formatClaimDate } from '#/lib/claims'
import { formatPercent, formatSignedPercent } from '#/lib/format'
import { formatFcfa } from '#/lib/utils'
import { clientsKeys, getClient } from '#/services/clients'
import { getQuotation } from '#/services/quotations'
import type {
  QuotationResponse,
  RiskClassSnapshot,
  WarrantiesSnapshot,
} from '#/services/quotations'

const RELATIONSHIPS: Record<string, string> = {
  SELF: 'Le client lui-même',
  SPOUSE: 'Conjoint(e)',
  CHILD: 'Enfant',
  PARENT: 'Parent',
  SIBLING: 'Frère / sœur',
  EMPLOYEE: 'Salarié',
  OTHER: 'Autre',
}
const relationshipLabel = (value?: string) =>
  value ? (RELATIONSHIPS[value] ?? value) : undefined

const ATTRIBUTION_KIND: Record<Attribution['kind'], string> = {
  seller: 'Agent',
  agency: 'Agence',
  partner: 'Partenaire',
  unknown: 'Code distributeur',
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="mb-3 text-[11.5px] font-bold tracking-[0.06em] text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </section>
  )
}

const money = (value?: number | null) =>
  value == null ? undefined : formatFcfa(value)

/** Taux net appliqué (peut être négatif) : « +25 % », « 0 % », « −10 % ». */
const netPercent = (value: number) =>
  value === 0
    ? formatPercent(0)
    : formatSignedPercent(Math.abs(value), value > 0 ? 'SURCHARGE' : 'DISCOUNT')

/** Classe de risque IA Standard retenue au moment du devis. */
function RiskClassDetail({ risk }: { risk: RiskClassSnapshot }) {
  const modifiers = risk.appliedModifiers ?? []
  return (
    <div className="mt-4" data-testid="risk-class-detail">
      <InfoList columns={2}>
        <InfoRow label="Classe de risque">
          {risk.classNumber != null
            ? `Classe n° ${risk.classNumber}`
            : undefined}
        </InfoRow>
        <InfoRow label="Durée">
          {risk.durationMonths != null
            ? `${risk.durationMonths} mois`
            : undefined}
        </InfoRow>
        <InfoRow label="Capital décès">{money(risk.deathCapital)}</InfoRow>
        <InfoRow label="Invalidité permanente">
          {money(risk.permanentDisabilityCapital)}
        </InfoRow>
        <InfoRow label="Frais médicaux">
          {money(risk.medicalExpensesCapital)}
        </InfoRow>
        <InfoRow label="Surcharge appliquée">
          {risk.surchargeRate != null
            ? netPercent(risk.surchargeRate)
            : undefined}
        </InfoRow>
        {risk.reductionRate != null && risk.reductionRate !== 0 && (
          <InfoRow label="Réduction">
            {formatPercent(risk.reductionRate)}
          </InfoRow>
        )}
        {risk.insuredAge != null && (
          <InfoRow label="Âge de l’assuré">{`${risk.insuredAge} ans`}</InfoRow>
        )}
      </InfoList>
      {risk.description && (
        <p className="mt-3 text-[12.5px] text-muted-foreground">
          {risk.description}
        </p>
      )}
      {modifiers.length > 0 && (
        <ul className="mt-3 divide-y rounded-[10px] border text-[13px]">
          {modifiers.map((m, index) => (
            <li
              key={`${m.code ?? 'm'}-${index}`}
              className="flex items-center justify-between gap-3 px-4 py-2.5"
            >
              <span className="min-w-0 break-words">
                {m.label ?? m.code ?? '—'}
              </span>
              {m.rate != null && (
                <span className="font-bold tabular-nums whitespace-nowrap">
                  {formatSignedPercent(
                    m.rate,
                    m.modifierType === 'DISCOUNT' ? 'DISCOUNT' : 'SURCHARGE',
                  )}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Garanties MRH : lignes `{ lines, accessory, accessoryTax }`. */
function WarrantiesDetail({ warranties }: { warranties: WarrantiesSnapshot }) {
  const lines = warranties.lines ?? []
  if (lines.length === 0 && warranties.accessory == null) return null
  return (
    <div className="mt-4" data-testid="warranties-detail">
      <div className="mb-2 text-[12px] font-semibold text-muted-foreground">
        Garanties
      </div>
      <ul className="divide-y rounded-[10px] border text-[13px]">
        {lines.map((line, index) => (
          <li
            key={`${line.warrantyId ?? 'w'}-${index}`}
            className="flex items-center justify-between gap-3 px-4 py-2.5"
          >
            <div className="min-w-0">
              <div className="font-semibold break-words">
                {line.warrantyName ?? '—'}
              </div>
              {line.mandatory && (
                <div className="text-[12px] text-muted-foreground">
                  Obligatoire
                </div>
              )}
            </div>
            <span className="font-bold tabular-nums whitespace-nowrap">
              {line.premium == null ? '—' : formatFcfa(line.premium)}
            </span>
          </li>
        ))}
        {warranties.accessory != null && (
          <li className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="text-muted-foreground">Accessoires</span>
            <span className="font-bold tabular-nums whitespace-nowrap">
              {formatFcfa(warranties.accessory)}
            </span>
          </li>
        )}
      </ul>
    </div>
  )
}

export function DetailBody({
  quotation,
  attribution,
}: {
  quotation: QuotationResponse
  attribution: Attribution
}) {
  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: clientsKeys.detail(quotation.clientId ?? 0),
    queryFn: () => getClient(quotation.clientId ?? 0),
    enabled: quotation.clientId != null,
    retry: false,
  })
  const product = quotation.productSnapshot
  const formula = quotation.formulaSnapshot
  const insured = quotation.insured
  const insuredName = insured
    ? formatPersonName(insured.firstName, insured.lastName)
    : ''
  const risk = quotation.riskClassSnapshot
  const warranties = quotation.warrantiesSnapshot
  const beneficiaries = quotation.beneficiaries ?? []

  return (
    <div className="flex-1 overflow-y-auto px-[26px] py-6">
      <Block title="Client">
        {quotation.clientId == null ? (
          <p className="text-[13px] text-muted-foreground">
            Aucun client rattaché à cette cotation.
          </p>
        ) : (
          <InfoList columns={2}>
            <InfoRow label="Nom">
              {client
                ? clientFullName(client)
                : clientLoading
                  ? '…'
                  : `Client #${quotation.clientId}`}
            </InfoRow>
            <InfoRow label="Téléphone">
              {client ? (
                <span className="tabular-nums whitespace-nowrap">
                  {formatPhone(client.phoneNumber)}
                </span>
              ) : undefined}
            </InfoRow>
          </InfoList>
        )}
      </Block>

      <Block title="Produit">
        <InfoList columns={2}>
          <InfoRow label="Produit">{product?.productLabel}</InfoRow>
          <InfoRow label="Type d’assurance">
            {product?.insuranceTypeLabel}
          </InfoRow>
          {formula && (
            <>
              <InfoRow label="Formule">{formula.label}</InfoRow>
              <InfoRow label="Durée">
                {formula.durationMonths != null
                  ? `${formula.durationMonths} mois`
                  : undefined}
              </InfoRow>
              <InfoRow label="Capital décès">
                {money(formula.deathCapital)}
              </InfoRow>
              <InfoRow label="Invalidité permanente">
                {money(formula.permanentDisabilityCapital)}
              </InfoRow>
              <InfoRow label="Frais médicaux">
                {money(formula.medicalExpenses)}
              </InfoRow>
              <InfoRow label="Indemnité journalière">
                {money(formula.dailyAllowance)}
              </InfoRow>
            </>
          )}
          {product?.legalQualityName && (
            <InfoRow label="Qualité juridique">
              {product.legalQualityName}
            </InfoRow>
          )}
          {product?.contentsValue != null && (
            <InfoRow label="Valeur du contenu">
              {money(product.contentsValue)}
            </InfoRow>
          )}
          {product?.buildingValue != null && (
            <InfoRow label="Valeur du bâtiment">
              {money(product.buildingValue)}
            </InfoRow>
          )}
          {product?.rentalValue != null && (
            <InfoRow label="Valeur locative">
              {money(product.rentalValue)}
            </InfoRow>
          )}
        </InfoList>
        {risk && <RiskClassDetail risk={risk} />}
        {warranties && <WarrantiesDetail warranties={warranties} />}
      </Block>

      <Block title="Décomposition de la prime">
        <dl className="overflow-hidden rounded-[10px] border text-[13.5px]">
          {(
            [
              ['Prime nette', quotation.netPremium],
              ['Frais', quotation.fees],
              ['Taxes', quotation.tax],
            ] as const
          ).map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between border-b px-4 py-2.5"
            >
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-semibold tabular-nums whitespace-nowrap">
                {value == null ? '—' : formatFcfa(value)}
              </dd>
            </div>
          ))}
          <div className="flex items-center justify-between bg-[#f6f8fc] px-4 py-3">
            <dt className="font-bold">Prime TTC</dt>
            <dd className="text-[15px] font-extrabold tabular-nums whitespace-nowrap">
              {quotation.grossPremium == null
                ? '—'
                : formatFcfa(quotation.grossPremium)}
            </dd>
          </div>
        </dl>
      </Block>

      {(insured || beneficiaries.length > 0) && (
        <Block title="Assuré et bénéficiaires">
          {insured && (
            <InfoList columns={2}>
              <InfoRow label="Assuré">{insuredName}</InfoRow>
              <InfoRow label="Lien avec le client">
                {relationshipLabel(insured.relationship)}
              </InfoRow>
              <InfoRow label="Naissance">
                {insured.birthDate
                  ? formatClaimDate(insured.birthDate)
                  : undefined}
              </InfoRow>
              <InfoRow label="Téléphone">
                {insured.phone ? (
                  <span className="tabular-nums whitespace-nowrap">
                    {formatPhone(insured.phone)}
                  </span>
                ) : undefined}
              </InfoRow>
            </InfoList>
          )}
          {beneficiaries.length > 0 && (
            <ul className="mt-4 divide-y rounded-[10px] border text-[13px]">
              {beneficiaries.map((b, index) => (
                <li
                  key={`${b.name ?? 'b'}-${index}`}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="font-semibold break-words">
                      {b.name ? formatPersonName(b.name) : '—'}
                    </div>
                    <div className="text-[12px] text-muted-foreground">
                      {relationshipLabel(b.relationship) ?? '—'}
                    </div>
                  </div>
                  {b.sharePercent != null && (
                    <span className="font-bold tabular-nums">
                      {formatPercent(b.sharePercent)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Block>
      )}

      <Block title="Distributeur">
        <InfoList columns={2}>
          <InfoRow label={ATTRIBUTION_KIND[attribution.kind]}>
            {attribution.label}
          </InfoRow>
          <InfoRow label="Code distributeur">
            <span className="tabular-nums">{quotation.distributorCode}</span>
          </InfoRow>
          {attribution.agency && attribution.kind !== 'agency' && (
            <InfoRow label="Agence">{attribution.agency.name}</InfoRow>
          )}
          <InfoRow label="Partenaire" placeholder="Non rattaché">
            {attribution.partner?.name}
          </InfoRow>
        </InfoList>
      </Block>
    </div>
  )
}

/**
 * Détail d’une cotation (tiroir droit) : relit `GET /quotations/{id}` pour
 * avoir l’instantané complet (formule, assuré, bénéficiaires).
 */
export function QuotationDetailDrawer({
  quotationId,
  onClose,
  resolveCode,
}: {
  quotationId: number | null
  onClose: () => void
  resolveCode: (code: string) => Attribution
}) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['quotation', quotationId],
    queryFn: () => getQuotation(quotationId ?? 0),
    enabled: quotationId != null,
    retry: false,
  })

  return (
    <Sheet open={quotationId != null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-[520px] gap-0 p-0 sm:max-w-[520px]"
      >
        <SheetHeader className="flex-row items-start justify-between gap-3.5 border-b p-[26px] py-[22px]">
          <div className="flex flex-col gap-0">
            <div className="mb-[3px] text-[11.5px] font-bold tracking-[0.06em] text-muted-foreground uppercase">
              Cotation
            </div>
            <SheetTitle className="text-[19px] font-extrabold tracking-[-0.025em]">
              Cotation #{quotationId}
            </SheetTitle>
            <SheetDescription className="mt-[2px] flex flex-wrap items-center gap-2 text-[13px]">
              {data && (
                <>
                  <QuotationStatusBadge status={data.status} />
                  <span>
                    Devis du {formatClaimDate(data.quoteAt ?? data.createdAt)}
                  </span>
                </>
              )}
            </SheetDescription>
          </div>
          <SheetClose asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label="Fermer"
              className="size-9 shrink-0 rounded-[9px]"
            >
              <X className="size-[17px]" />
            </Button>
          </SheetClose>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-4 px-[26px] py-6">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        ) : error || !data ? (
          <div className="px-[26px] py-6">
            <EmptyState
              tone="error"
              title="Impossible de charger cette cotation."
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
          </div>
        ) : (
          <DetailBody
            quotation={data}
            attribution={resolveCode(data.distributorCode)}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}
