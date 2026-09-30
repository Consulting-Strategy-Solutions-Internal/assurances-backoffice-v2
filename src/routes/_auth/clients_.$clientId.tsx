import { pageHead } from '#/lib/page-title'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { ContractDrawer } from '#/components/clients/ContractDrawer'
import {
  CalendarClock,
  ChevronRight,
  FileWarning,
  Hourglass,
  Mail,
  MapPin,
  Phone,
  ScrollText,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react'
import { ClientAvatar } from '#/components/clients/ClientAvatar'
import { ClaimStatusBadge } from '#/components/claims/ClaimStatusBadge'
import { CreateClaimDialog } from '#/components/claims/CreateClaimDialog'
import { KpiCard } from '#/components/dashboard/KpiCard'
import { StatusPill } from '#/components/dashboard/StatusPill'
import { BackLink } from '#/components/layout/BackLink'
import {
  ClickableRow,
  DataTableCell,
  DataTableHead,
  RowChevron,
} from '#/components/layout/DataTable'
import { DetailHeaderCard } from '#/components/layout/DetailHeaderCard'
import { EmptyState } from '#/components/layout/EmptyState'
import { TruncatedText } from '#/components/layout/TruncatedText'
import { InfoList, InfoRow } from '#/components/layout/InfoList'
import { KpiRow } from '#/components/layout/KpiRow'
import { SectionCard } from '#/components/layout/SectionCard'
import { Button } from '#/components/ui/button'
import { DetailSkeleton } from '#/components/layout/DetailSkeleton'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { formatClaimDate, mapClaimError } from '#/lib/claims'
import {
  clientAddress,
  clientEmail,
  clientFullName,
  formatPhone,
} from '#/lib/clients'
import { cn, formatFcfa } from '#/lib/utils'
import { claimsKeys, getClaims } from '#/services/claims'
import type { ClaimFilters } from '#/services/claims'
import { clientsKeys, getClient } from '#/services/clients'
import type { ClientResponse } from '#/services/clients'
import {
  SUBSCRIPTION_STATUS_LABELS,
  getAllSubscriptions,
  shortDate,
  subscriptionsAllKey,
  subscriptionsOfClient,
} from '#/services/subscriptions-by-client'
import type { SubscriptionStatus } from '#/services/subscriptions'

const searchSchema = z.object({
  /** Contrat ouvert dans le panneau latéral. */
  contract: z.coerce.number().int().positive().optional().catch(undefined),
})

export const Route = createFileRoute('/_auth/clients_/$clientId')({
  head: pageHead('Fiche client'),
  validateSearch: searchSchema,
  component: ClientDetailRoute,
})

const backSearch = { page: 0, size: 20, sort: 'lastName,asc' } as const
const SUBSCRIPTION_TONES = {
  ACTIVE: 'success',
  PENDING_PAYMENT: 'warning',
  EXPIRED: 'neutral',
  CANCELLED: 'danger',
} as const satisfies Record<SubscriptionStatus, string>
const OPEN_STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'INFO_REQUESTED']

function VerificationPill({
  verified,
  label,
}: {
  verified: boolean
  label: string
}) {
  return (
    <StatusPill tone={verified ? 'success' : 'neutral'}>
      {label} {verified ? 'vérifié' : 'non vérifié'}
    </StatusPill>
  )
}

function StateCard({
  title,
  children,
  onRetry,
}: {
  title: string
  children?: string
  onRetry?: () => void
}) {
  return (
    <EmptyState
      variant="card"
      icon={TriangleAlert}
      title={title}
      description={children}
      action={
        <div className="flex flex-wrap justify-center gap-2.5">
          {onRetry && (
            <Button variant="outline" onClick={onRetry}>
              Réessayer
            </Button>
          )}
          <Button asChild>
            <Link to="/clients" search={backSearch}>
              Retour aux clients
            </Link>
          </Button>
        </div>
      }
    />
  )
}

export function ClientDetailContent({ clientId }: { clientId: number }) {
  const {
    data: client,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: clientsKeys.detail(clientId),
    queryFn: () => getClient(clientId),
    retry: false,
  })

  if (isLoading) return <DetailSkeleton kpis={3} />
  if (error || !client) {
    const notFound = error && mapClaimError(error).kind === 'not-found'
    return notFound ? (
      <StateCard title="Client introuvable">
        Ce client n’existe pas ou a été supprimé.
      </StateCard>
    ) : (
      <StateCard
        title={
          error && mapClaimError(error).kind === 'forbidden'
            ? 'Accès refusé'
            : 'Impossible de charger le client'
        }
        onRetry={() => void refetch()}
      >
        {error && mapClaimError(error).kind === 'forbidden'
          ? 'Vous n’avez pas les droits pour consulter les clients.'
          : 'Une erreur est survenue. Réessayez dans un instant.'}
      </StateCard>
    )
  }

  return <ClientDetail client={client} />
}

function VerifiedNote({ at }: { at?: string | null }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[12px] font-medium',
        at ? 'text-[#167347]' : 'text-muted-foreground',
      )}
    >
      <ShieldCheck className="size-3.5" />
      {at ? `Vérifié le ${formatClaimDate(at)}` : 'Non vérifié'}
    </span>
  )
}

function ClientDetail({ client }: { client: ClientResponse }) {
  const navigate = useNavigate()
  const { contract: openContract } = Route.useSearch()
  const setOpenContract = (contract: number | undefined) =>
    void navigate({
      to: '.',
      search: (previous: Record<string, unknown>) => ({
        ...previous,
        contract,
      }),
      replace: true,
    })
  const clientId = client.id
  const name = clientFullName(client)
  const email = clientEmail(client)
  const address = clientAddress(client)

  const filters: ClaimFilters = {
    clientId,
    page: 0,
    size: 100,
    sort: 'createdAt,desc',
  }
  const claimsQuery = useQuery({
    queryKey: claimsKeys.list(filters),
    queryFn: () => getClaims(filters),
    retry: false,
  })
  const claims = claimsQuery.data?.content ?? []
  const claimsTotal = claimsQuery.data?.totalElements ?? 0
  const openCount = claims.filter((c) =>
    OPEN_STATUSES.includes(c.status),
  ).length
  const claimsForbidden =
    !!claimsQuery.error && mapClaimError(claimsQuery.error).kind === 'forbidden'
  const claimsFailed = !!claimsQuery.error && !claimsForbidden
  const pending = claimsQuery.isLoading
  const dash = claimsQuery.error ? '—' : undefined
  const recent = claims.slice(0, 5)
  const lastClaim = claims.at(0)
  const [declaring, setDeclaring] = useState(false)
  const subscriptionsQuery = useQuery({
    queryKey: subscriptionsAllKey,
    queryFn: getAllSubscriptions,
    staleTime: 60_000,
    retry: false,
  })
  const contracts = useMemo(
    () => subscriptionsOfClient(subscriptionsQuery.data?.items ?? [], clientId),
    [subscriptionsQuery.data, clientId],
  )

  return (
    <div className="flex flex-col gap-[18px]">
      <ContractDrawer
        subscriptionId={
          openContract !== undefined &&
          (subscriptionsQuery.isPending ||
            contracts.some((c) => c.id === openContract))
            ? openContract
            : null
        }
        onClose={() => setOpenContract(undefined)}
      />
      {declaring && (
        <CreateClaimDialog
          defaultClientId={clientId}
          onClose={() => setDeclaring(false)}
        />
      )}
      <BackLink to="/clients" search={backSearch}>
        Retour aux clients
      </BackLink>

      <DetailHeaderCard
        leading={
          <ClientAvatar client={client} className="size-[72px] text-2xl" />
        }
        title={name}
        meta={
          <>
            {client.gender === 'FEMME' ? 'Femme' : 'Homme'} · Client #
            {client.id} · Client depuis {formatClaimDate(client.createdAt)}
          </>
        }
        pills={
          <>
            <VerificationPill
              verified={!!client.phoneVerifiedAt}
              label="Téléphone"
            />
            <VerificationPill
              verified={!!client.emailVerifiedAt}
              label="Email"
            />
          </>
        }
        actions={
          <>
            <Button asChild variant="outline" className="rounded-[11px]">
              <a href={`tel:${client.phoneNumber.replace(/\s/g, '')}`}>
                <Phone />
                Appeler
              </a>
            </Button>
            {email && (
              <Button asChild variant="outline" className="rounded-[11px]">
                <a href={`mailto:${email}`}>
                  <Mail />
                  Envoyer un email
                </a>
              </Button>
            )}
            <Button asChild className="rounded-[11px]">
              <Link
                to="/sinistres"
                search={{ clientId, page: 0, size: 20, sort: 'createdAt,desc' }}
              >
                <FileWarning />
                Voir ses sinistres
              </Link>
            </Button>
          </>
        }
      />

      <KpiRow cols={3} className="mb-0">
        <KpiCard
          icon={<FileWarning className="size-5 text-primary" />}
          iconClass="bg-primary/[0.08]"
          value={pending ? '…' : (dash ?? claimsTotal)}
          label="Sinistres déclarés"
        />
        <KpiCard
          icon={<Hourglass className="size-5 text-[#8a6600]" />}
          iconClass="bg-[#ffc61e]/20"
          value={pending ? '…' : (dash ?? openCount)}
          label="Sinistres en cours"
        />
        <KpiCard
          icon={<CalendarClock className="size-5 text-[#167347]" />}
          iconClass="bg-[#1c8a57]/10"
          value={
            <span className="text-[24px]">
              {pending
                ? '…'
                : lastClaim
                  ? formatClaimDate(lastClaim.createdAt)
                  : '—'}
            </span>
          }
          label="Dernier sinistre"
        />
      </KpiRow>

      <div className="grid gap-[18px] @4xl/main:grid-cols-2">
        <SectionCard title="Coordonnées">
          <InfoList>
            <InfoRow icon={<Phone />} label="Téléphone">
              <div className="flex flex-wrap items-center gap-2">
                <span className="tabular-nums">
                  {formatPhone(client.phoneNumber)}
                </span>
                <VerifiedNote at={client.phoneVerifiedAt} />
              </div>
            </InfoRow>
            <InfoRow icon={<Mail />} label="Email" placeholder="Non renseigné">
              {email ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span>{email}</span>
                  <VerifiedNote at={client.emailVerifiedAt} />
                </div>
              ) : null}
            </InfoRow>
            <InfoRow
              icon={<MapPin />}
              label="Adresse"
              placeholder="Non renseignée"
            >
              {address ? (
                <TruncatedText lines={2}>{address}</TruncatedText>
              ) : null}
            </InfoRow>
          </InfoList>
        </SectionCard>

        <SectionCard title="Informations">
          <InfoList columns={2}>
            <InfoRow label="Genre">
              {client.gender === 'FEMME' ? 'Femme' : 'Homme'}
            </InfoRow>
            <InfoRow label="Créé le">
              {formatClaimDate(client.createdAt, true)}
            </InfoRow>
            <InfoRow label="Dernière mise à jour">
              {formatClaimDate(client.updatedAt, true)}
            </InfoRow>
          </InfoList>
        </SectionCard>
      </div>

      <SectionCard
        flush
        title="Contrats"
        description="Contrats souscrits par ce client : cliquez sur un contrat pour sa signature, ses pièces et ses documents."
      >
        {subscriptionsQuery.isLoading ? (
          <div className="flex flex-col gap-3 p-6">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        ) : subscriptionsQuery.isError ? (
          <EmptyState
            icon={TriangleAlert}
            tone="error"
            title={
              mapClaimError(subscriptionsQuery.error).kind === 'forbidden'
                ? 'Accès refusé.'
                : 'Impossible de charger les contrats.'
            }
            description={
              mapClaimError(subscriptionsQuery.error).kind === 'forbidden'
                ? 'Vous n’avez pas les droits pour consulter les contrats.'
                : 'Réessayez dans un instant.'
            }
            action={
              mapClaimError(subscriptionsQuery.error).kind ===
              'forbidden' ? undefined : (
                <Button
                  variant="outline"
                  className="rounded-[11px]"
                  onClick={() => void subscriptionsQuery.refetch()}
                >
                  Réessayer
                </Button>
              )
            }
          />
        ) : contracts.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="Aucun contrat pour ce client."
            description="Les contrats apparaissent ici une fois une cotation acceptée et payée. Sans contrat listé ici, la déclaration d’un sinistre demande de saisir l’identifiant du contrat à la main."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <DataTableHead className="pl-6">Police</DataTableHead>
                  <DataTableHead>Produit</DataTableHead>
                  <DataTableHead>Statut</DataTableHead>
                  <DataTableHead hideBelow="md">Couverture</DataTableHead>
                  <DataTableHead className="pr-6 text-right">
                    Prime
                  </DataTableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((contract) => (
                  <ClickableRow
                    key={contract.id}
                    selected={openContract === contract.id}
                    onActivate={() => setOpenContract(contract.id)}
                    aria-label={`Ouvrir le contrat ${contract.policyNumber?.trim() || `#${contract.id}`}`}
                  >
                    <TableCell className="pl-6 font-semibold whitespace-nowrap">
                      {contract.policyNumber?.trim() ||
                        `Contrat #${contract.id}`}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <TruncatedText className="max-w-[200px]">
                        {contract.productSnapshot?.productLabel}
                      </TruncatedText>
                    </TableCell>
                    <TableCell>
                      <StatusPill tone={SUBSCRIPTION_TONES[contract.status]}>
                        {SUBSCRIPTION_STATUS_LABELS[contract.status]}
                      </StatusPill>
                    </TableCell>
                    <DataTableCell
                      hideBelow="md"
                      className="whitespace-nowrap tabular-nums"
                    >
                      {contract.coverageStart || contract.coverageEnd
                        ? `${shortDate(contract.coverageStart) || '…'} → ${shortDate(contract.coverageEnd) || '…'}`
                        : '—'}
                    </DataTableCell>
                    <TableCell className="pr-6 text-right whitespace-nowrap tabular-nums">
                      {formatFcfa(contract.totalPremium)}
                    </TableCell>
                  </ClickableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      <SectionCard
        flush
        title="Sinistres récents"
        description="Les 5 derniers sinistres déclarés par ce client."
        action={
          claimsTotal > 0 ? (
            <Button asChild variant="ghost" size="sm">
              <Link
                to="/sinistres"
                search={{ clientId, page: 0, size: 20, sort: 'createdAt,desc' }}
              >
                Voir tout ({claimsTotal})
                <ChevronRight />
              </Link>
            </Button>
          ) : undefined
        }
      >
        {pending ? (
          <div className="flex flex-col gap-3 p-6">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        ) : claimsForbidden || claimsFailed ? (
          <EmptyState
            icon={TriangleAlert}
            tone="error"
            title={
              claimsForbidden
                ? 'Accès refusé.'
                : 'Impossible de charger les sinistres.'
            }
            description={
              claimsForbidden
                ? 'Vous n’avez pas les droits pour consulter les sinistres.'
                : 'Réessayez dans un instant.'
            }
            action={
              claimsForbidden ? undefined : (
                <Button
                  variant="outline"
                  className="rounded-[11px]"
                  onClick={() => void claimsQuery.refetch()}
                >
                  Réessayer
                </Button>
              )
            }
          />
        ) : recent.length === 0 ? (
          <EmptyState
            icon={FileWarning}
            title="Aucun sinistre déclaré pour ce client."
            description="Un sinistre apparaît ici dès que le client le déclare depuis l’application, ou qu’un agent le déclare pour lui."
            action={
              <Button
                variant="outline"
                className="rounded-[11px]"
                onClick={() => setDeclaring(true)}
              >
                Déclarer un sinistre
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <DataTableHead className="pl-6">Sinistre</DataTableHead>
                  <DataTableHead>Type</DataTableHead>
                  <DataTableHead hideBelow="lg">Produit</DataTableHead>
                  <DataTableHead hideBelow="md">Survenu le</DataTableHead>
                  <DataTableHead>Statut</DataTableHead>
                  <DataTableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((claim) => (
                  <ClickableRow
                    key={claim.id}
                    onActivate={() =>
                      navigate({
                        to: '/sinistres/$claimId',
                        params: { claimId: String(claim.id) },
                      })
                    }
                  >
                    <TableCell className="pl-6 font-semibold text-primary">
                      {claim.claimNumber}
                    </TableCell>
                    <TableCell>
                      <TruncatedText className="max-w-[180px]">
                        {claim.claimTypeName}
                      </TruncatedText>
                    </TableCell>
                    <DataTableCell
                      hideBelow="lg"
                      className="text-muted-foreground"
                    >
                      <TruncatedText className="max-w-[160px]">
                        {claim.productLabel}
                      </TruncatedText>
                    </DataTableCell>
                    <DataTableCell hideBelow="md" className="whitespace-nowrap">
                      {formatClaimDate(claim.occurredOn)}
                    </DataTableCell>
                    <TableCell>
                      <ClaimStatusBadge status={claim.status} />
                    </TableCell>
                    <RowChevron />
                  </ClickableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}

function ClientDetailRoute() {
  const { clientId } = Route.useParams()
  const id = Number(clientId)
  return Number.isSafeInteger(id) && id > 0 ? (
    <ClientDetailContent clientId={id} />
  ) : (
    <StateCard title="Identifiant client invalide" />
  )
}
