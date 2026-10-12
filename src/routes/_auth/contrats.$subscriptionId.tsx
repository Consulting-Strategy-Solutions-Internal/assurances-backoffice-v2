import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { ScrollText, TriangleAlert } from 'lucide-react'
import { z } from 'zod'
import { ContractGate } from '#/components/contracts/ContractGate'
import {
  DocumentsCard,
  ReceiptsCard,
  SignatureCard,
} from '#/components/contracts/ContractSections'
import { TravelDecisionPanel } from '#/components/contracts/TravelDecisionPanel'
import {
  CertificateCard,
  EvoIssuanceCard,
  EvoStatusPill,
  TravelTripCard,
  TravelersCard,
} from '#/components/contracts/TravelSections'
import { StatusPill } from '#/components/dashboard/StatusPill'
import { BackLink } from '#/components/layout/BackLink'
import {
  DetailHeaderCard,
  IconTile,
} from '#/components/layout/DetailHeaderCard'
import { DetailSkeleton } from '#/components/layout/DetailSkeleton'
import { EmptyState } from '#/components/layout/EmptyState'
import { Button } from '#/components/ui/button'
import { isForbidden } from '#/lib/api-error'
import { pageHead } from '#/lib/page-title'
import { clientFullName } from '#/lib/clients'
import { TRAVEL_FILTERS } from '#/lib/travel'
import { clientsKeys, getClient } from '#/services/clients'
import { getSubscription, subscriptionsKeys } from '#/services/subscriptions'
import {
  SUBSCRIPTION_STATUS_LABELS,
  SUBSCRIPTION_TONES,
} from '#/services/subscriptions-by-client'

/**
 * D'où vient l'utilisateur, pour que « Retour » y ramène : la supervision
 * voyage (avec son filtre et sa page), sinon la fiche client.
 */
export const contractSearchSchema = z.object({
  from: z.literal('voyage').optional().catch(undefined),
  status: z.enum(TRAVEL_FILTERS).optional().catch(undefined),
  page: z.coerce.number().int().min(0).optional().catch(undefined),
})

export type ContractSearch = z.output<typeof contractSearchSchema>

export const Route = createFileRoute('/_auth/contrats/$subscriptionId')({
  head: pageHead('Contrat'),
  validateSearch: contractSearchSchema,
  component: ContractDetailRoute,
})

function StateCard({
  title,
  description,
  tone,
  onRetry,
}: {
  title: string
  description?: string
  tone?: 'muted' | 'error'
  onRetry?: () => void
}) {
  return (
    <EmptyState
      variant="card"
      icon={TriangleAlert}
      tone={tone}
      title={title}
      description={description}
      action={
        <div className="flex flex-wrap justify-center gap-2">
          {onRetry && (
            <Button className="rounded-[11px]" onClick={onRetry}>
              Réessayer
            </Button>
          )}
          <Button
            asChild
            variant={onRetry ? 'outline' : 'default'}
            className="rounded-[11px]"
          >
            <Link
              to="/clients"
              search={{ page: 0, size: 20, sort: 'lastName,asc' }}
            >
              Retour aux clients
            </Link>
          </Button>
        </div>
      }
    />
  )
}

/** Nom du client du contrat, lien vers sa fiche ; « Client #id » à défaut. */
function ClientLink({ clientId }: { clientId: number }) {
  const client = useQuery({
    queryKey: clientsKeys.detail(clientId),
    queryFn: () => getClient(clientId),
    retry: false,
  })
  return (
    <Link
      to="/clients/$clientId"
      params={{ clientId: String(clientId) }}
      className="text-primary hover:underline"
    >
      {client.data ? clientFullName(client.data) : `Client #${clientId}`}
    </Link>
  )
}

/** Page d'un contrat, tous produits (remplace le panneau de la fiche client). */
export function ContractDetailContent({
  subscriptionId,
  search = {},
}: {
  subscriptionId: number
  search?: ContractSearch
}) {
  const detail = useQuery({
    queryKey: subscriptionsKeys.detail(subscriptionId),
    queryFn: () => getSubscription(subscriptionId),
    retry: false,
  })
  if (detail.isPending) return <DetailSkeleton kpis={0} />
  if (detail.isError) {
    if (isForbidden(detail.error))
      return (
        <StateCard
          tone="error"
          title="Droit insuffisant"
          description="Vous n’avez pas le droit de consulter ce contrat."
        />
      )
    if (isAxiosError(detail.error) && detail.error.response?.status === 404)
      return (
        <StateCard
          title="Contrat introuvable"
          description="Ce contrat n’existe pas ou n’est pas visible pour votre compte."
        />
      )
    return (
      <StateCard
        tone="error"
        title="Impossible de charger le contrat"
        description="Une erreur est survenue. Réessayez dans un instant."
        onRetry={() => void detail.refetch()}
      />
    )
  }

  const contract = detail.data
  // Voyage : bloc `travel` ; ni police PDF ni quittances de renouvellement.
  const travel = contract.travel
  const title = contract.policyNumber?.trim() || `Contrat #${contract.id}`

  return (
    <div className="flex flex-col gap-[18px]">
      {search.from === 'voyage' ? (
        <BackLink
          to="/contrats/voyage"
          search={{
            status: search.status ?? 'TO_RECONCILE',
            page: search.page ?? 0,
          }}
        >
          Retour à la supervision voyage
        </BackLink>
      ) : (
        <BackLink
          to="/clients/$clientId"
          params={{ clientId: String(contract.clientId) }}
        >
          Retour à la fiche client
        </BackLink>
      )}
      <DetailHeaderCard
        leading={
          <IconTile>
            <ScrollText />
          </IconTile>
        }
        title={title}
        meta={
          <>
            <ClientLink clientId={contract.clientId} />
            {contract.productSnapshot?.productLabel &&
              ` · ${contract.productSnapshot.productLabel}`}
          </>
        }
        pills={
          <>
            <StatusPill tone={SUBSCRIPTION_TONES[contract.status]}>
              {SUBSCRIPTION_STATUS_LABELS[contract.status]}
            </StatusPill>
            {travel && <EvoStatusPill status={travel.evoIssuanceStatus} />}
          </>
        }
      />

      {travel?.evoIssuanceStatus === 'TO_RECONCILE' && (
        <TravelDecisionPanel subscriptionId={contract.id} />
      )}
      {travel ? (
        <div className="grid items-start gap-[18px] lg:grid-cols-2">
          <div className="flex flex-col gap-[18px]">
            <TravelTripCard contract={contract} travel={travel} />
            <TravelersCard travel={travel} />
          </div>
          <div className="flex flex-col gap-[18px]">
            <EvoIssuanceCard contract={contract} travel={travel} />
            <CertificateCard contract={contract} travel={travel} />
            <SignatureCard contract={contract} />
          </div>
        </div>
      ) : (
        <div className="grid items-start gap-[18px] lg:grid-cols-2">
          <div className="flex flex-col gap-[18px]">
            <DocumentsCard contract={contract} />
            <ReceiptsCard subscriptionId={contract.id} />
          </div>
          <div className="flex flex-col gap-[18px]">
            <SignatureCard contract={contract} />
          </div>
        </div>
      )}
    </div>
  )
}

function ContractDetailRoute() {
  const { subscriptionId } = Route.useParams()
  const search = Route.useSearch()
  const id = Number(subscriptionId)
  return (
    <ContractGate>
      {Number.isSafeInteger(id) && id > 0 ? (
        <ContractDetailContent subscriptionId={id} search={search} />
      ) : (
        <StateCard
          title="Identifiant de contrat invalide."
          description="Vérifiez l’adresse de la page."
        />
      )}
    </ContractGate>
  )
}
