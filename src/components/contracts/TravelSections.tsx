import { useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { DownloadRow } from '#/components/contracts/ContractSections'
import { StatusPill } from '#/components/dashboard/StatusPill'
import { InfoList, InfoRow } from '#/components/layout/InfoList'
import { SectionCard } from '#/components/layout/SectionCard'
import { WarningBanner } from '#/components/ia-products/shared/WarningBanner'
import { Button } from '#/components/ui/button'
import { mapPolicyDocumentError } from '#/lib/amendments'
import { apiErrorMessage } from '#/lib/api-error'
import { formatClaimDate } from '#/lib/claims'
import { saveBlob } from '#/lib/download'
import { formatPersonName } from '#/lib/people'
import {
  EVO_STATUS_HINTS,
  TRAVELER_ROLE_LABELS,
  TRAVEL_COMPOSITION_LABELS,
  evoStatusBadge,
  humanizeEvoCode,
} from '#/lib/travel'
import { formatFcfa } from '#/lib/utils'
import { getSubscription, subscriptionsKeys } from '#/services/subscriptions'
import type {
  EvoPolicyState,
  SubscriptionDetailResponse,
  TravelContractResponse,
} from '#/services/subscriptions'
import { downloadTravelCertificate } from '#/services/travel'

/** Badge de l'état d'émission chez EVO. */
export function EvoStatusPill({
  status,
}: {
  status: TravelContractResponse['evoIssuanceStatus']
}) {
  const badge = evoStatusBadge(status)
  return <StatusPill tone={badge.tone}>{badge.label}</StatusPill>
}

/** Voyage : catégorie, destination, dates, composition, formule, prime. */
export function TravelTripCard({
  contract,
  travel,
}: {
  contract: SubscriptionDetailResponse
  travel: TravelContractResponse
}) {
  return (
    <SectionCard title="Voyage">
      <InfoList>
        <InfoRow label="Destination">
          {humanizeEvoCode(travel.destinationArea)}
        </InfoRow>
        <InfoRow label="Catégorie">{humanizeEvoCode(travel.category)}</InfoRow>
        <InfoRow label="Séjour">
          {formatClaimDate(travel.startDate)} →{' '}
          {formatClaimDate(travel.endDate)}
        </InfoRow>
        {travel.composition && (
          <InfoRow label="Composition">
            {TRAVEL_COMPOSITION_LABELS[travel.composition]}
          </InfoRow>
        )}
        <InfoRow label="Formule">
          {travel.formulaName?.trim() ||
            (travel.formulaCode ? `Formule ${travel.formulaCode}` : '—')}
        </InfoRow>
        <InfoRow label="Prime">
          {contract.totalPremium != null
            ? formatFcfa(contract.totalPremium)
            : '—'}
        </InfoRow>
      </InfoList>
    </SectionCard>
  )
}

/** Voyageurs couverts par la police. */
export function TravelersCard({ travel }: { travel: TravelContractResponse }) {
  return (
    <SectionCard title={`Voyageurs (${travel.travelers.length})`}>
      {travel.travelers.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">
          Aucun voyageur transmis.
        </p>
      ) : (
        <ul className="divide-y">
          {travel.travelers.map((t, index) => (
            <li
              key={`${t.lastName}-${t.firstName}-${String(index)}`}
              className="py-2.5 first:pt-0 last:pb-0"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13.5px] font-semibold">
                  {formatPersonName(t.firstName, t.lastName)}
                </span>
                <StatusPill tone="neutral">
                  {TRAVELER_ROLE_LABELS[t.role]}
                </StatusPill>
              </div>
              <div className="mt-0.5 text-[12.5px] text-muted-foreground">
                {[
                  `Né(e) le ${formatClaimDate(t.birthDate)}`,
                  t.passportNumber && `Passeport ${t.passportNumber}`,
                  t.nationality && `Nationalité ${t.nationality}`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}

/** Une police existe chez EVO : l'actualisation a un sens (le backend ne lit EVO qu'avec elle). */
function hasEvoPolicy(travel: TravelContractResponse): boolean {
  return (
    travel.evoIssuanceStatus === 'ISSUED' ||
    travel.evoIssuanceStatus === 'CERTIFICATE_READY' ||
    !!travel.policyNumber
  )
}

function EvoStateRows({ evo }: { evo: EvoPolicyState }) {
  const active = evo.status.toLowerCase() === 'active'
  return (
    <div className="mt-3 rounded-[12px] border bg-muted/40 p-3">
      <div className="mb-2">
        <StatusPill tone={active ? 'success' : 'danger'}>
          {active ? 'Active chez EVO' : 'Désactivée chez EVO'}
        </StatusPill>
      </div>
      <InfoList>
        <InfoRow label="N° chez EVO">{evo.policyNumber}</InfoRow>
        <InfoRow label="Couverture chez EVO">
          {formatClaimDate(evo.startDate)} → {formatClaimDate(evo.endDate)}
        </InfoRow>
        {evo.cancelDate && (
          <InfoRow label="Annulée le">
            {formatClaimDate(evo.cancelDate)}
          </InfoRow>
        )}
      </InfoList>
    </div>
  )
}

/**
 * Émission chez EVO : état, n° de police, et lecture à la demande de la
 * police chez EVO (`?refresh=true`, jamais automatique).
 */
export function EvoIssuanceCard({
  contract,
  travel,
  children,
}: {
  contract: SubscriptionDetailResponse
  travel: TravelContractResponse
  children?: React.ReactNode
}) {
  const queryClient = useQueryClient()
  const refresh = useMutation({
    mutationFn: () => getSubscription(contract.id, { refresh: true }),
    onSuccess: (fresh) => {
      // La réponse porte aussi l'état local à jour : on le garde pour la page.
      queryClient.setQueryData(subscriptionsKeys.detail(contract.id), fresh)
    },
  })
  const evo = refresh.data?.travel?.evo
  const status = travel.evoIssuanceStatus

  return (
    <SectionCard
      title="Émission chez EVO"
      action={
        hasEvoPolicy(travel) ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-[10px]"
            disabled={refresh.isPending}
            onClick={() => refresh.mutate()}
          >
            <RefreshCw className="size-3.5" />
            {refresh.isPending ? 'Lecture chez EVO…' : 'Actualiser depuis EVO'}
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <EvoStatusPill status={status} />
        <span className="text-[13px] text-muted-foreground">
          {status
            ? EVO_STATUS_HINTS[status]
            : 'La police est demandée à EVO une fois le contrat payé et signé.'}
        </span>
      </div>
      <div className="mt-3">
        <InfoList>
          <InfoRow label="N° de police EVO">{travel.policyNumber}</InfoRow>
        </InfoList>
      </div>
      {!hasEvoPolicy(travel) && (
        <p className="mt-3 text-[12px] text-muted-foreground">
          Pas encore de police chez EVO : rien à actualiser.
        </p>
      )}
      {refresh.isSuccess &&
        (evo ? (
          <EvoStateRows evo={evo} />
        ) : (
          <div className="mt-3">
            <WarningBanner tone="info">
              EVO indisponible : état de la police non lu. Les données affichées
              sont celles enregistrées chez NSIA.
            </WarningBanner>
          </div>
        ))}
      {refresh.isError && (
        <p role="alert" className="mt-3 text-[12.5px] text-destructive">
          {apiErrorMessage(refresh.error)}
        </p>
      )}
      {children}
    </SectionCard>
  )
}

/** Attestation voyage : le PDF copié chez NSIA (jamais l'adresse EVO). */
export function CertificateCard({
  contract,
  travel,
}: {
  contract: SubscriptionDetailResponse
  travel: TravelContractResponse
}) {
  return (
    <SectionCard title="Attestation">
      {travel.certificateDocumentId == null ? (
        <p className="text-[13px] text-muted-foreground">
          Attestation pas encore disponible.
        </p>
      ) : (
        <ul className="divide-y">
          <DownloadRow
            label="Attestation d’assurance voyage"
            detail={travel.policyNumber ?? undefined}
            ariaLabel="Télécharger l’attestation"
            mapError={mapPolicyDocumentError}
            download={async () => {
              const blob = await downloadTravelCertificate(contract.id)
              saveBlob(
                blob,
                `Attestation ${travel.policyNumber ?? `contrat-${contract.id}`}.pdf`,
              )
            }}
          />
        </ul>
      )}
    </SectionCard>
  )
}
