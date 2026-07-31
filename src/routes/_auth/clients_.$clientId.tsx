import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Mail, MapPin, Phone, TriangleAlert } from 'lucide-react'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { formatClaimDate, mapClaimError } from '#/lib/claims'
import { clientsKeys, getClient } from '#/services/clients'

export const Route = createFileRoute('/_auth/clients_/$clientId')({
  component: ClientDetailRoute,
})

function VerificationBadge({ verified }: { verified: boolean }) {
  return <Badge variant="outline">{verified ? 'Vérifié' : 'Non vérifié'}</Badge>
}

export function ClientDetailContent({ clientId }: { clientId: number }) {
  const {
    data: client,
    isLoading,
    error,
  } = useQuery({
    queryKey: clientsKeys.detail(clientId),
    queryFn: () => getClient(clientId),
    retry: false,
  })

  if (isLoading)
    return (
      <Card className="p-8 text-center text-muted-foreground">
        Chargement du client…
      </Card>
    )
  if (error || !client) {
    const notFound = error && mapClaimError(error).kind === 'not-found'
    return (
      <Card className="p-8 text-center">
        <TriangleAlert className="mx-auto size-8 text-muted-foreground" />
        <h1 className="mt-3 text-xl font-bold">
          {notFound ? 'Client introuvable' : 'Impossible de charger le client'}
        </h1>
        <Button asChild className="mt-4">
          <Link
            to="/clients"
            search={{ page: 0, size: 20, sort: 'lastName,asc' }}
          >
            Retour aux clients
          </Link>
        </Button>
      </Card>
    )
  }

  const initials =
    `${client.firstName.charAt(0)}${client.lastName.charAt(0)}`.toUpperCase()
  return (
    <>
      <Button asChild variant="ghost" className="mb-4">
        <Link
          to="/clients"
          search={{ page: 0, size: 20, sort: 'lastName,asc' }}
        >
          <ArrowLeft />
          Retour aux clients
        </Link>
      </Button>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="size-14">
            <AvatarFallback className="bg-primary text-lg font-bold text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-extrabold">
              {client.firstName} {client.lastName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Client #{client.id} · créé le {formatClaimDate(client.createdAt)}
            </p>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link
            to="/sinistres"
            search={{ clientId, page: 0, size: 20, sort: 'createdAt,desc' }}
          >
            Voir ses sinistres
          </Link>
        </Button>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-bold">Coordonnées</h2>
          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="flex items-center gap-2 text-muted-foreground">
                <Phone className="size-4" />
                Téléphone
              </dt>
              <dd className="mt-1 flex items-center gap-2 font-semibold">
                {client.phoneNumber}
                <VerificationBadge verified={!!client.phoneVerifiedAt} />
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-2 text-muted-foreground">
                <Mail className="size-4" />
                Email
              </dt>
              <dd className="mt-1 flex items-center gap-2 font-semibold">
                {client.email || 'Non renseigné'}
                <VerificationBadge verified={!!client.emailVerifiedAt} />
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="size-4" />
                Adresse
              </dt>
              <dd className="mt-1 font-semibold">
                {client.addressLine1}
                {client.addressLine2 ? (
                  <>
                    <br />
                    {client.addressLine2}
                  </>
                ) : null}
              </dd>
            </div>
          </dl>
        </Card>
        <Card>
          <h2 className="text-lg font-bold">Informations administratives</h2>
          <dl className="mt-5 grid grid-cols-2 gap-5 text-sm">
            <div>
              <dt className="text-muted-foreground">Civilité</dt>
              <dd className="mt-1 font-semibold">
                {client.gender === 'FEMME' ? 'Femme' : 'Homme'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Identifiant</dt>
              <dd className="mt-1 font-semibold">#{client.id}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Création</dt>
              <dd>{formatClaimDate(client.createdAt, true)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Dernière mise à jour</dt>
              <dd>{formatClaimDate(client.updatedAt, true)}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </>
  )
}

function ClientDetailRoute() {
  const { clientId } = Route.useParams()
  const id = Number(clientId)
  return Number.isSafeInteger(id) && id > 0 ? (
    <ClientDetailContent clientId={id} />
  ) : (
    <Card className="p-8 text-center">Identifiant client invalide.</Card>
  )
}
