import { Fragment, useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Users,
  UserRound,
} from 'lucide-react'
import { getPartnerAgencies } from '#/services/agencies'
import type { AgencyResponse } from '#/services/agencies'
import { getAgencySellers, getPartnerSellers } from '#/services/sellers'
import type { SellerResponse } from '#/services/sellers'
import { useAllUsers } from '#/components/users/use-all-users'
import type { PartnerResponse } from '#/services/partners'
import { PartnerManagerList } from '#/components/partners/PartnerManagerList'
import { KpiCard } from '#/components/dashboard/KpiCard'
import {
  DataTableHead,
  FIRST_CELL_CLASS,
  TableEmptyState,
  TableErrorState,
  TableSkeletonRows,
} from '#/components/layout/DataTable'
import { EntityAvatar } from '#/components/layout/EntityAvatar'
import { InfoList, InfoRow } from '#/components/layout/InfoList'
import { KpiRow } from '#/components/layout/KpiRow'
import { SectionCard } from '#/components/layout/SectionCard'
import { Badge } from '#/components/ui/badge'
import { Skeleton } from '#/components/ui/skeleton'
import { Button } from '#/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { formatClaimDate, mapClaimError } from '#/lib/claims'
import { formatPhone } from '#/lib/clients'
import { formatPersonName } from '#/lib/people'
import { cn } from '#/lib/utils'

const subHeadCls =
  'h-auto px-3 py-2 text-[10.5px] font-bold uppercase tracking-[0.05em] text-muted-foreground'

export function PartnerOverview({ partner }: { partner: PartnerResponse }) {
  const partnerId = partner.id

  // Mêmes clés de cache que les étapes de rattachement : la vue d'ensemble et
  // le parcours de rattachement partagent leurs données.
  const agenciesQuery = useQuery({
    queryKey: ['agencies', partnerId],
    queryFn: () => getPartnerAgencies(partnerId),
    retry: false,
  })
  const agencies = agenciesQuery.data?.content ?? []

  const directSellersQuery = useQuery({
    queryKey: ['sellers', 'partner', partnerId],
    queryFn: () => getPartnerSellers(partnerId),
    retry: false,
  })
  const directSellers = directSellersQuery.data?.content ?? []

  const agencySellerResults = useQueries({
    queries: agencies.map((a) => ({
      queryKey: ['sellers', 'agency', a.id],
      queryFn: () => getAgencySellers(a.id),
      retry: false,
    })),
  })

  const { data: usersData, isLoading: usersLoading } = useAllUsers()
  const managers = (usersData?.items ?? []).filter(
    (u) => u.partnerId === partnerId,
  )

  const agencySellersCount = agencySellerResults.reduce(
    (total, q) => total + (q.data?.content.length ?? 0),
    0,
  )
  // Tant que les agences chargent, aucune requête « agents d'agence » n'existe
  // encore : le compteur doit rester en attente plutôt qu'afficher 0.
  const agencySellersLoading =
    agenciesQuery.isLoading || agencySellerResults.some((q) => q.isLoading)

  const truncated =
    agenciesQuery.data?.last === false ||
    directSellersQuery.data?.last === false ||
    agencySellerResults.some((q) => q.data?.last === false)

  return (
    <div className="flex flex-col gap-[18px]">
      <KpiRow cols={3} className="mb-0">
        <KpiCard
          icon={<Building2 className="size-5 text-primary" />}
          iconClass="bg-primary/[0.08]"
          value={agenciesQuery.isLoading ? '…' : agencies.length}
          label="Agences"
        />
        <KpiCard
          icon={<Users className="size-5 text-[#167347]" />}
          iconClass="bg-[#1c8a57]/10"
          value={agencySellersLoading ? '…' : agencySellersCount}
          label="Agents en agence"
        />
        <KpiCard
          icon={<UserRound className="size-5 text-[#8a6600]" />}
          iconClass="bg-[#ffc61e]/20"
          value={directSellersQuery.isLoading ? '…' : directSellers.length}
          label="Agents directs"
        />
      </KpiRow>

      <div className="grid gap-[18px] lg:grid-cols-2">
        <SectionCard title="Informations">
          <InfoList columns={2}>
            <InfoRow label="Nom">{partner.name}</InfoRow>
            <InfoRow label="Code distributeur">
              {partner.distributorCode}
            </InfoRow>
            <InfoRow label="ID site">{partner.idSite}</InfoRow>
            <InfoRow label="Email" placeholder="Non renseigné">
              {partner.email}
            </InfoRow>
            <InfoRow label="Localisation" placeholder="Non renseignée">
              {partner.location}
            </InfoRow>
            <InfoRow label="Créé le">
              {formatClaimDate(partner.createdAt)}
            </InfoRow>
            <InfoRow label="Dernière mise à jour">
              {formatClaimDate(partner.updatedAt)}
            </InfoRow>
          </InfoList>
        </SectionCard>

        <SectionCard
          title={`Manager${managers.length > 1 ? 's' : ''}`}
          description="Responsable(s) qui pilote(nt) ce partenaire."
        >
          <PartnerManagerList
            managers={managers}
            isLoading={usersLoading}
            attachToPartnerId={partnerId}
          />
        </SectionCard>
      </div>

      <AgenciesSection
        agencies={agencies}
        isLoading={agenciesQuery.isLoading}
        error={agenciesQuery.error}
        sellersByAgency={agencySellerResults.map((q) => ({
          sellers: q.data?.content ?? [],
          isLoading: q.isLoading,
          isError: q.isError,
        }))}
      />

      <DirectSellersSection
        sellers={directSellers}
        isLoading={directSellersQuery.isLoading}
        error={directSellersQuery.error}
      />

      {truncated && (
        <p className="rounded-lg bg-[#fef3da] px-3.5 py-2.5 text-[13px] text-[#8a6600]">
          Liste tronquée (100+ éléments) · toutes les agences ou tous les agents
          ne sont pas affichés.
        </p>
      )}
    </div>
  )
}

interface AgencySellers {
  sellers: SellerResponse[]
  isLoading: boolean
  isError: boolean
}

function AgenciesSection({
  agencies,
  isLoading,
  error,
  sellersByAgency,
}: {
  agencies: AgencyResponse[]
  isLoading: boolean
  error: unknown
  sellersByAgency: AgencySellers[]
}) {
  // `null` = l'utilisateur n'a encore rien déplié : les petits réseaux
  // s'affichent alors dépliés, pour voir toute la structure d'un coup d'œil.
  const [expanded, setExpanded] = useState<Set<number> | null>(null)
  const openByDefault = agencies.length > 0 && agencies.length <= 5
  const allIds = () => new Set(agencies.map((a) => a.id))
  const isOpen = (id: number) => (expanded ? expanded.has(id) : openByDefault)
  const allOpen = agencies.length > 0 && agencies.every((a) => isOpen(a.id))

  function toggle(id: number) {
    setExpanded((current) => {
      const next = new Set(current ?? (openByDefault ? allIds() : []))
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const errorState = error ? mapClaimError(error).kind === 'forbidden' : false
  return (
    <SectionCard
      flush
      title="Agences"
      description="Dépliez une agence pour voir les agents qui y sont rattachés."
      action={
        !isLoading && !error ? (
          <div className="flex items-center gap-2.5">
            <Badge variant="secondary" className="rounded-md text-[11.5px]">
              {agencies.length} agence{agencies.length > 1 ? 's' : ''}
            </Badge>
            {agencies.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-[9px]"
                onClick={() => setExpanded(allOpen ? new Set() : allIds())}
              >
                {allOpen ? 'Tout replier' : 'Tout déplier'}
              </Button>
            )}
          </div>
        ) : undefined
      }
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <DataTableHead first className="w-[64px]">
                <span className="sr-only">Déplier</span>
              </DataTableHead>
              <DataTableHead>Nom</DataTableHead>
              <DataTableHead>Code distributeur</DataTableHead>
              <DataTableHead>Email</DataTableHead>
              <DataTableHead>Localisation</DataTableHead>
              <DataTableHead className="pr-[22px] text-right">
                Agents
              </DataTableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeletonRows rows={3} columns={[8, 36, 20, 36, 24, 8]} />
            ) : error ? (
              <TableErrorState
                colSpan={6}
                forbidden={errorState}
                title="Impossible de charger les agences de ce partenaire."
              />
            ) : agencies.length === 0 ? (
              <TableEmptyState
                colSpan={6}
                icon={Building2}
                title="Aucune agence pour ce partenaire."
                description="Utilisez « Ajouter une relation » pour rattacher des agences."
              />
            ) : (
              agencies.map((agency, index) => {
                const agencySellers = sellersByAgency[index]
                const open = isOpen(agency.id)
                return (
                  <Fragment key={agency.id}>
                    <TableRow className="hover:bg-[#f6f8fc]">
                      <TableCell className={FIRST_CELL_CLASS}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={
                            open
                              ? `Masquer les agents de ${agency.name}`
                              : `Afficher les agents de ${agency.name}`
                          }
                          aria-expanded={open}
                          onClick={() => toggle(agency.id)}
                        >
                          {open ? <ChevronDown /> : <ChevronRight />}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <EntityAvatar name={agency.name} />
                          <span className="font-semibold">{agency.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-muted-foreground">
                        {agency.distributorCode}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {agency.email || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {agency.location || '—'}
                      </TableCell>
                      <TableCell className="pr-[22px] text-right font-semibold tabular-nums">
                        {agencySellers.isLoading
                          ? '…'
                          : agencySellers.isError
                            ? '—'
                            : agencySellers.sellers.length}
                      </TableCell>
                    </TableRow>
                    {open && (
                      <TableRow className="bg-[#fafbfc] hover:bg-[#fafbfc]">
                        <TableCell
                          colSpan={6}
                          className="px-[22px] py-4 md:pl-[86px]"
                        >
                          <AgencySellersTable data={agencySellers} />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </SectionCard>
  )
}

function AgencySellersTable({ data }: { data: AgencySellers }) {
  if (data.isLoading) return <Skeleton className="h-16 rounded-lg" />
  if (data.isError) {
    return (
      <p className="text-[13px] text-destructive">
        Impossible de charger les agents de cette agence.
      </p>
    )
  }
  if (data.sellers.length === 0)
    return (
      <p className="text-[13px] text-muted-foreground">
        Aucun agent rattaché à cette agence.
      </p>
    )
  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-xs">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={cn(subHeadCls, 'pl-[14px]')}>Agent</TableHead>
            <TableHead className={subHeadCls}>Téléphone</TableHead>
            <TableHead className={subHeadCls}>Code distributeur</TableHead>
            <TableHead className={cn(subHeadCls, 'pr-[14px]')}>Email</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.sellers.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="py-2.5 pl-[14px] text-[13px] font-semibold">
                {formatPersonName(s.firstName, s.lastName)}
              </TableCell>
              <TableCell className="py-2.5 text-[12.5px] whitespace-nowrap text-muted-foreground tabular-nums">
                {formatPhone(s.phoneNumber)}
              </TableCell>
              <TableCell className="py-2.5 text-[12.5px] font-semibold text-muted-foreground">
                {s.distributorCode}
              </TableCell>
              <TableCell className="py-2.5 pr-[14px] text-[12.5px] text-muted-foreground">
                {s.email ?? '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function DirectSellersSection({
  sellers,
  isLoading,
  error,
}: {
  sellers: SellerResponse[]
  isLoading: boolean
  error: unknown
}) {
  return (
    <SectionCard
      flush
      title="Agents directs"
      description="Agents rattachés au partenaire, sans passer par une agence."
      action={
        !isLoading && !error ? (
          <Badge variant="secondary" className="rounded-md text-[11.5px]">
            {sellers.length} agent{sellers.length > 1 ? 's' : ''}
          </Badge>
        ) : undefined
      }
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <DataTableHead first>Agent</DataTableHead>
              <DataTableHead>Téléphone</DataTableHead>
              <DataTableHead>Code distributeur</DataTableHead>
              <DataTableHead>Email</DataTableHead>
              <DataTableHead className="pr-[22px]">Créé le</DataTableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeletonRows
                rows={3}
                columns={[40, 28, 20, 36, 20]}
                leading="avatar"
              />
            ) : error ? (
              <TableErrorState
                colSpan={5}
                forbidden={mapClaimError(error).kind === 'forbidden'}
                title="Impossible de charger les agents directs de ce partenaire."
              />
            ) : sellers.length === 0 ? (
              <TableEmptyState
                colSpan={5}
                icon={UserRound}
                title="Aucun agent rattaché directement au partenaire."
              />
            ) : (
              sellers.map((s) => (
                <TableRow key={s.id} className="hover:bg-[#f6f8fc]">
                  <TableCell className={FIRST_CELL_CLASS}>
                    <div className="flex items-center gap-3">
                      <EntityAvatar
                        name={formatPersonName(s.firstName, s.lastName)}
                      />
                      <span className="font-semibold">
                        {formatPersonName(s.firstName, s.lastName)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {formatPhone(s.phoneNumber)}
                  </TableCell>
                  <TableCell className="font-semibold text-muted-foreground">
                    {s.distributorCode}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {s.email || '—'}
                  </TableCell>
                  <TableCell className="pr-[22px] whitespace-nowrap text-muted-foreground">
                    {formatClaimDate(s.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </SectionCard>
  )
}
