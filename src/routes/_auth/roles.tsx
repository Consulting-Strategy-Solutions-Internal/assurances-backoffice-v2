import { pageHead } from '#/lib/page-title'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { KeyRound, ShieldAlert, ShieldCheck, ShieldPlus } from 'lucide-react'
import { z } from 'zod'
import { getRoles } from '#/services/roles'
import { fetchAllPages } from '#/lib/fetch-all-pages'
import { RolesTable } from '#/components/roles/RolesTable'
import { CreateRoleDrawer } from '#/components/roles/CreateRoleDrawer'
import { RoleDetailDrawer } from '#/components/roles/RoleDetailDrawer'
import { Pagination } from '#/components/ui/Pagination'
import { Button } from '#/components/ui/button'
import { KpiCard } from '#/components/dashboard/KpiCard'
import { PageHeader } from '#/components/dashboard/PageHeader'
import { usePermissions } from '#/components/dashboard/use-permissions'
import { KpiRow } from '#/components/layout/KpiRow'
import {
  ResultCount,
  Toolbar,
  ToolbarSearch,
} from '#/components/layout/Toolbar'
import { mapClaimError } from '#/lib/claims'
import { normalizeText } from '#/lib/clients'
import { formatRoleName } from '#/lib/admin-roles'
import { translateRoleDescription } from '#/lib/backend-messages'

const searchSchema = z.object({
  page: z.coerce.number().int().min(0).default(0).catch(0),
  q: z.string().optional().catch(undefined),
})

export const Route = createFileRoute('/_auth/roles')({
  head: pageHead('Rôles & permissions'),
  validateSearch: searchSchema,
  component: RolesPage,
})

const PAGE_SIZE = 20

function RolesPage() {
  const { can } = usePermissions()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const query = search.q ?? ''
  const [showCreate, setShowCreate] = useState(false)
  // On garde l'id plutôt que l'objet pour que le panneau reflète les
  // permissions rafraîchies après chaque ajout / retrait.
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['roles', 'all-pages'],
    queryFn: () => fetchAllPages((page, size) => getRoles(page, size)),
    retry: false,
  })

  const all = useMemo(() => data?.items ?? [], [data])
  const filtered = useMemo(() => {
    const terms = [query].map(normalizeText).filter(Boolean)
    return all.filter((r) => {
      const haystack = normalizeText(
        `${r.name} ${formatRoleName(r.name)} ${translateRoleDescription(r.description)}`,
      )
      return terms.every((t) => haystack.includes(t))
    })
  }, [all, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(search.page, totalPages - 1)
  const roles = useMemo(
    () => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filtered, page],
  )
  const setQuery = (q: string) =>
    void navigate({
      search: { page: 0, q: q === '' ? undefined : q },
      replace: true,
    })
  const setPage = (next: number) =>
    void navigate({ search: (prev) => ({ ...prev, page: next }) })

  const stats = useMemo(() => {
    const distinct = new Set<number>()
    for (const r of all) for (const p of r.permissions) distinct.add(p.id)
    return {
      distinct: distinct.size,
      empty: all.filter((r) => r.permissions.length === 0).length,
    }
  }, [all])

  const total = data?.total ?? 0
  const filtering = query.trim() !== ''
  const forbidden = !!error && mapClaimError(error).kind === 'forbidden'
  const kpi = (value: number) => (isLoading ? '…' : error ? '—' : value)

  return (
    <>
      <PageHeader
        title="Rôles & permissions"
        subtitle="Gérez les rôles internes et leurs permissions d’accès."
        action="Créer un rôle"
        onAction={() => setShowCreate(true)}
        actionDisabled={!can('iam:write')}
        actionTitle={
          can('iam:write')
            ? undefined
            : 'Vous n’avez pas les droits requis (Rôles & accès — Modifier).'
        }
      >
        <Button asChild variant="outline" className="rounded-[11px]">
          <Link to="/permissions">
            <KeyRound />
            Catalogue des permissions
          </Link>
        </Button>
      </PageHeader>

      <CreateRoleDrawer
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />

      <KpiRow cols={4}>
        <KpiCard
          icon={<ShieldCheck className="size-5 text-primary" />}
          iconClass="bg-primary/[0.08]"
          value={kpi(total)}
          label="Rôles"
        />
        <KpiCard
          icon={<KeyRound className="size-5 text-[#1f53b0]" />}
          iconClass="bg-[#1f53b0]/10"
          value={kpi(stats.distinct)}
          label="Permissions accordées"
        />
        <KpiCard
          icon={<ShieldPlus className="size-5 text-[#167347]" />}
          iconClass="bg-[#1c8a57]/10"
          value={kpi(all.length - stats.empty)}
          label="Rôles avec accès"
        />
        <KpiCard
          icon={<ShieldAlert className="size-5 text-[#8a6600]" />}
          iconClass="bg-[#ffc61e]/20"
          value={kpi(stats.empty)}
          label="Rôles sans permission"
        />
      </KpiRow>

      <Toolbar
        search={
          <ToolbarSearch
            label="Rechercher un rôle"
            placeholder="Rechercher par nom ou description…"
            value={query}
            onChange={setQuery}
          />
        }
      />

      <ResultCount>
        {isLoading
          ? 'Chargement…'
          : `${filtered.length} rôle${filtered.length > 1 ? 's' : ''}${filtering ? ` sur ${all.length}` : ''}`}
      </ResultCount>

      <RolesTable
        roles={roles}
        onSelect={(role) => setSelectedRoleId(role.id)}
        selectedId={selectedRoleId ?? undefined}
        isLoading={isLoading}
        error={error}
        forbidden={forbidden}
        filtering={filtering}
        onReset={() => setQuery('')}
        onRetry={() => void refetch()}
      />
      <RoleDetailDrawer
        role={all.find((r) => r.id === selectedRoleId) ?? null}
        onClose={() => setSelectedRoleId(null)}
      />
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
