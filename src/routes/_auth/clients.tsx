import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { Badge } from '#/components/ui/badge'
import { Card } from '#/components/ui/card'
import { Pagination } from '#/components/ui/Pagination'
import { FormSelect } from '#/components/forms/FormSelect'
import { PageHeader } from '#/components/dashboard/PageHeader'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { formatClaimDate } from '#/lib/claims'
import { clientsKeys, getClients } from '#/services/clients'

const searchSchema = z.object({
  page: z.coerce.number().int().min(0).catch(0),
  size: z.coerce.number().int().min(1).max(100).catch(20),
  sort: z
    .enum(['lastName,asc', 'lastName,desc', 'createdAt,desc', 'createdAt,asc'])
    .catch('lastName,asc'),
})

export const Route = createFileRoute('/_auth/clients')({
  validateSearch: searchSchema,
  component: ClientsPage,
})

const headCls =
  'h-auto bg-[#fafbfc] px-3 py-3 text-[11px] font-bold uppercase tracking-[0.05em] text-muted-foreground'

export function ClientsPage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const { data, isLoading, error } = useQuery({
    queryKey: clientsKeys.list(search.page, search.size, search.sort),
    queryFn: () => getClients(search.page, search.size, search.sort),
    retry: false,
  })
  const setPage = (page: number) =>
    navigate({ search: (previous) => ({ ...previous, page }) })

  return (
    <>
      <PageHeader
        title="Clients"
        subtitle="Répertoire des clients issu de l’API"
      />
      <Card className="mb-4 p-4">
        <FormSelect
          id="clients-sort"
          label="Tri"
          value={search.sort}
          options={[
            { value: 'lastName,asc', label: 'Nom A–Z' },
            { value: 'lastName,desc', label: 'Nom Z–A' },
            { value: 'createdAt,desc', label: 'Plus récents' },
            { value: 'createdAt,asc', label: 'Plus anciens' },
          ]}
          onChange={(sort) =>
            navigate({
              search: (previous) => ({
                ...previous,
                sort: sort as typeof search.sort,
                page: 0,
              }),
            })
          }
        />
        <p className="text-xs text-muted-foreground">
          L’API ne fournit pas de recherche générale par nom. Aucun filtrage
          local incomplet n’est appliqué à cette liste paginée.
        </p>
      </Card>
      <Card className="gap-0 overflow-x-auto py-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={`${headCls} pl-[22px]`}>Client</TableHead>
              <TableHead className={headCls}>Téléphone</TableHead>
              <TableHead className={headCls}>Email</TableHead>
              <TableHead className={headCls}>Adresse</TableHead>
              <TableHead className={headCls}>Créé le</TableHead>
              <TableHead className={headCls}>Vérifications</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground"
                >
                  Chargement des clients…
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-destructive"
                >
                  Impossible de charger les clients.
                </TableCell>
              </TableRow>
            ) : !data?.content.length ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground"
                >
                  Aucun client pour le moment.
                </TableCell>
              </TableRow>
            ) : (
              data.content.map((client) => {
                const initials =
                  `${client.firstName.charAt(0)}${client.lastName.charAt(0)}`.toUpperCase()
                return (
                  <TableRow key={client.id}>
                    <TableCell className="pl-[22px]">
                      <Link
                        to="/clients/$clientId"
                        params={{ clientId: String(client.id) }}
                        className="flex items-center gap-3 font-semibold text-primary hover:underline"
                      >
                        <Avatar className="size-8">
                          <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        {client.firstName} {client.lastName}
                      </Link>
                    </TableCell>
                    <TableCell>{client.phoneNumber}</TableCell>
                    <TableCell>{client.email || 'Non renseigné'}</TableCell>
                    <TableCell>{client.addressLine1}</TableCell>
                    <TableCell>{formatClaimDate(client.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Badge variant="outline">
                          Tél.{' '}
                          {client.phoneVerifiedAt ? 'vérifié' : 'non vérifié'}
                        </Badge>
                        <Badge variant="outline">
                          Email{' '}
                          {client.emailVerifiedAt ? 'vérifié' : 'non vérifié'}
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>
      <Pagination
        page={search.page}
        totalPages={data?.totalPages ?? 0}
        isLast={data?.last ?? true}
        onPrev={() => setPage(search.page - 1)}
        onNext={() => setPage(search.page + 1)}
      />
    </>
  )
}
