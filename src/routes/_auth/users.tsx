import { pageHead } from '#/lib/page-title'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MailCheck, MailWarning, ShieldCheck, ShieldUser } from 'lucide-react'
import { z } from 'zod'
import { UsersTable } from '#/components/users/UsersTable'
import { AddUserModal } from '#/components/users/AddUserModal'
import { AdminDetailDrawer } from '#/components/users/AdminDetailDrawer'
import { useAllUsers } from '#/components/users/use-all-users'
import { Pagination } from '#/components/ui/Pagination'
import { KpiCard } from '#/components/dashboard/KpiCard'
import { PageHeader } from '#/components/dashboard/PageHeader'
import { usePermissions } from '#/components/dashboard/use-permissions'
import { KpiRow } from '#/components/layout/KpiRow'
import { SegmentedPills } from '#/components/layout/SegmentedPills'
import {
  ResultCount,
  Toolbar,
  ToolbarSearch,
} from '#/components/layout/Toolbar'
import { mapClaimError } from '#/lib/claims'
import { normalizeText } from '#/lib/clients'
import { makeAdminRolePredicate } from '#/lib/admin-roles'
import { getRoles } from '#/services/roles'
import { formatPersonName } from '#/lib/people'

const searchSchema = z.object({
  page: z.coerce.number().int().min(0).default(0).catch(0),
  q: z.string().optional().catch(undefined),
  verified: z.enum(['all', 'yes', 'no']).default('all').catch('all'),
  /** Deep link : ouvre le tiroir de cet administrateur. */
  userId: z.coerce.number().int().positive().optional().catch(undefined),
})

export const Route = createFileRoute('/_auth/users')({
  head: pageHead('Administrateurs'),
  validateSearch: searchSchema,
  component: UsersPage,
})

const PAGE_SIZE = 20

function UsersPage() {
  const { can } = usePermissions()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const query = search.q ?? ''
  const filterVerified = search.verified
  const [showModal, setShowModal] = useState(false)

  // Le backend ne filtre pas par rôle : on charge tous les comptes puis on
  // garde les rôles internes, pour que compteurs et pagination soient vrais.
  const { data, isLoading, error, refetch } = useAllUsers()

  // Même règle « administrateur » que l'invitation et la recherche : rôle
  // résolu via la liste des rôles quand elle est lisible, sinon par le nom.
  const { data: rolesData } = useQuery({
    queryKey: ['roles-all'],
    queryFn: () => getRoles(0, 200),
    retry: false,
  })
  const rolesList = rolesData?.content

  const allUsers = useMemo(() => data?.items ?? [], [data])
  const admins = useMemo(() => {
    const isAdmin = makeAdminRolePredicate(rolesList)
    return allUsers.filter((u) => isAdmin(u.role))
  }, [allUsers, rolesList])
  const filtered = useMemo(() => {
    const terms = [query].map(normalizeText).filter(Boolean)
    return admins
      .filter((u) => {
        const haystack = normalizeText(
          `${formatPersonName(u.firstName, u.lastName)} ${u.email}`,
        )
        return terms.every((t) => haystack.includes(t))
      })
      .filter((u) => {
        if (filterVerified === 'yes') return u.emailVerified
        if (filterVerified === 'no') return !u.emailVerified
        return true
      })
  }, [admins, query, filterVerified])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(search.page, totalPages - 1)
  const users = useMemo(
    () => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filtered, page],
  )
  const selected =
    search.userId === undefined
      ? null
      : (allUsers.find((u) => u.id === search.userId) ?? null)

  const setQuery = (q: string) =>
    void navigate({
      search: (prev) => ({ ...prev, page: 0, q: q === '' ? undefined : q }),
      replace: true,
    })
  const setVerified = (verified: typeof filterVerified) =>
    void navigate({ search: (prev) => ({ ...prev, page: 0, verified }) })
  const setPage = (next: number) =>
    void navigate({ search: (prev) => ({ ...prev, page: next }) })
  const select = (id: number | undefined) =>
    void navigate({
      search: (prev) => ({ ...prev, userId: id }),
      replace: true,
    })

  const verified = admins.filter((u) => u.emailVerified).length
  const roleCount = new Set(admins.map((u) => u.role.toLowerCase())).size
  const filtering = query.trim() !== '' || filterVerified !== 'all'
  const forbidden = !!error && mapClaimError(error).kind === 'forbidden'
  const kpi = (value: number) => (isLoading ? '…' : error ? '—' : value)

  return (
    <>
      <PageHeader
        title="Administrateurs"
        subtitle="Comptes internes et niveaux d’accès."
        action="Ajouter un administrateur"
        onAction={() => setShowModal(true)}
        actionDisabled={!can('iam:write')}
        actionTitle={
          can('iam:write')
            ? undefined
            : 'Vous n’avez pas la permission requise (iam:write).'
        }
      />

      {showModal && <AddUserModal onClose={() => setShowModal(false)} />}

      <KpiRow cols={4}>
        <KpiCard
          icon={<ShieldUser className="size-5 text-primary" />}
          iconClass="bg-primary/[0.08]"
          value={kpi(admins.length)}
          label="Administrateurs"
        />
        <KpiCard
          icon={<MailCheck className="size-5 text-[#167347]" />}
          iconClass="bg-[#1c8a57]/10"
          value={kpi(verified)}
          label="Email vérifié"
        />
        <KpiCard
          icon={<MailWarning className="size-5 text-[#8a6600]" />}
          iconClass="bg-[#ffc61e]/20"
          value={kpi(admins.length - verified)}
          label="Email non vérifié"
        />
        <KpiCard
          icon={<ShieldCheck className="size-5 text-[#1f53b0]" />}
          iconClass="bg-[#1f53b0]/10"
          value={kpi(roleCount)}
          label="Rôles distincts"
        />
      </KpiRow>

      <Toolbar
        search={
          <ToolbarSearch
            label="Rechercher un administrateur"
            placeholder="Rechercher par nom ou email…"
            value={query}
            onChange={setQuery}
          />
        }
        filters={
          <SegmentedPills
            label="Email vérifié"
            value={filterVerified}
            onChange={setVerified}
            options={[
              { value: 'all', label: 'Tous' },
              { value: 'yes', label: 'Vérifié' },
              { value: 'no', label: 'Non vérifié' },
            ]}
          />
        }
      />

      <ResultCount
        note={
          data?.capped
            ? `Seuls les ${allUsers.length} comptes les plus récents sur ${data.total} sont chargés.`
            : undefined
        }
      >
        {isLoading
          ? 'Chargement…'
          : `${filtered.length} administrateur${filtered.length > 1 ? 's' : ''}${filtering ? ` sur ${admins.length}` : ''}`}
      </ResultCount>

      <UsersTable
        users={users}
        onSelect={(u) => select(u.id)}
        selectedId={selected?.id}
        isLoading={isLoading}
        error={error}
        forbidden={forbidden}
        filtering={filtering}
        onReset={() => void navigate({ search: { page: 0, verified: 'all' } })}
        onRetry={() => void refetch()}
      />
      <AdminDetailDrawer user={selected} onClose={() => select(undefined)} />
      <Pagination
        page={page}
        totalPages={totalPages}
        isLast={page >= totalPages - 1}
        onPrev={() => setPage(page - 1)}
        onNext={() => setPage(page + 1)}
      />
    </>
  )
}
