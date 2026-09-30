import { pageHead } from '#/lib/page-title'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Pencil, Plus, TriangleAlert } from 'lucide-react'
import { getPartner } from '#/services/partners'
import { EditPartnerModal } from '#/components/partners/EditPartnerModal'
import { PartnerOverview } from '#/components/partners/PartnerOverview'
import { usePermissions } from '#/components/dashboard/use-permissions'
import { StatusPill } from '#/components/dashboard/StatusPill'
import { BackLink } from '#/components/layout/BackLink'
import { DetailHeaderCard } from '#/components/layout/DetailHeaderCard'
import { EmptyState } from '#/components/layout/EmptyState'
import { EntityAvatar } from '#/components/layout/EntityAvatar'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { mapClaimError } from '#/lib/claims'

export const Route = createFileRoute('/_auth/partners_/$partnerId')({
  head: pageHead('Fiche partenaire'),
  component: PartnerDetailPage,
})

function StateCard({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <EmptyState
      variant="card"
      icon={TriangleAlert}
      title={title}
      description={description}
      action={
        <Button asChild>
          <Link to="/partners">Retour aux partenaires</Link>
        </Button>
      }
    />
  )
}

function PartnerDetailPage() {
  const { partnerId } = Route.useParams()
  const id = Number(partnerId)
  const { can } = usePermissions()
  const canEdit = can('partner:write')
  const [editing, setEditing] = useState(false)

  const {
    data: partner,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['partner', id],
    queryFn: () => getPartner(id),
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="flex flex-col gap-[18px]">
        <Skeleton className="h-36 rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-[122px] rounded-2xl" />
          <Skeleton className="h-[122px] rounded-2xl" />
          <Skeleton className="h-[122px] rounded-2xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }
  if (error || !partner) {
    const kind = error ? mapClaimError(error).kind : 'not-found'
    return (
      <div className="flex flex-col gap-[18px]">
        <BackLink to="/partners">Retour aux partenaires</BackLink>
        {kind === 'forbidden' ? (
          <StateCard
            title="Accès refusé."
            description="Vous n’avez pas les droits nécessaires pour consulter ce partenaire."
          />
        ) : kind === 'not-found' ? (
          <StateCard
            title="Partenaire introuvable"
            description="Ce partenaire n’existe pas ou a été supprimé."
          />
        ) : (
          <StateCard
            title="Impossible de charger le partenaire"
            description="Une erreur est survenue. Réessayez dans un instant."
          />
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <BackLink to="/partners">Retour aux partenaires</BackLink>

      <DetailHeaderCard
        leading={
          <EntityAvatar name={partner.name} className="size-[72px] text-2xl" />
        }
        title={partner.name}
        meta={`Partenaire #${partner.id}${partner.location ? ` · ${partner.location}` : ''}`}
        pills={
          <StatusPill tone="info">Code {partner.distributorCode}</StatusPill>
        }
        actions={
          <>
            <Button
              variant="outline"
              className="rounded-[11px]"
              disabled={!canEdit}
              title={
                canEdit
                  ? undefined
                  : 'Vous n’avez pas la permission requise (partner:write).'
              }
              onClick={() => setEditing(true)}
            >
              <Pencil />
              Modifier
            </Button>
            <Button
              asChild
              className="rounded-[11px] shadow-[0_4px_14px_rgba(0,51,127,0.22)]"
            >
              <Link
                to="/partners/$partnerId/relations"
                params={{ partnerId: String(partner.id) }}
              >
                <Plus />
                Ajouter une relation
              </Link>
            </Button>
          </>
        }
      />

      {editing && (
        <EditPartnerModal partner={partner} onClose={() => setEditing(false)} />
      )}

      <PartnerOverview partner={partner} />
    </div>
  )
}
