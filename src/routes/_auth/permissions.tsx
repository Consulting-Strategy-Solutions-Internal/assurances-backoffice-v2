import { pageHead } from '#/lib/page-title'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Eye, KeyRound, Layers, Pencil } from 'lucide-react'
import { z } from 'zod'
import { getPermissions } from '#/services/roles'
import { fetchAllPages } from '#/lib/fetch-all-pages'
import { normalizeText } from '#/lib/clients'
import type { PermissionResponse } from '#/services/roles'
import { PermissionsTable } from '#/components/permissions/PermissionsTable'
import { PermissionDrawer } from '#/components/permissions/PermissionDrawer'
import { Pagination } from '#/components/ui/Pagination'
import { KpiCard } from '#/components/dashboard/KpiCard'
import { PageHeader } from '#/components/dashboard/PageHeader'
import { usePermissions } from '#/components/dashboard/use-permissions'
import { BackLink } from '#/components/layout/BackLink'
import { KpiRow } from '#/components/layout/KpiRow'
import {
  ResultCount,
  Toolbar,
  ToolbarSearch,
} from '#/components/layout/Toolbar'
import { mapClaimError } from '#/lib/claims'
import { permissionDescription, permissionLabel } from '#/lib/permission-labels'

const searchSchema = z.object({
  page: z.coerce.number().int().min(0).default(0).catch(0),
  q: z.string().optional().catch(undefined),
})

export const Route = createFileRoute('/_auth/permissions')({
  head: pageHead('Permissions'),
  validateSearch: searchSchema,
  component: PermissionsPage,
})

const PAGE_SIZE = 20

function PermissionsPage() {
  const { can } = usePermissions()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const filter = search.q ?? ''
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<PermissionResponse | null>(null)

  // Tout le catalogue (une soixantaine d'entrées) : recherche, compteurs et
  // pagination portent sur le vrai total, pas sur la page courante.
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['permissions', 'all-pages'],
    queryFn: () => fetchAllPages((page, size) => getPermissions(page, size)),
    retry: false,
  })

  const catalog = useMemo(() => data?.items ?? [], [data])
  const terms = normalizeText(filter)
  const searching = terms !== ''
  const filtered = useMemo(
    () =>
      catalog.filter((p) => {
        if (!terms) return true
        const haystack = normalizeText(
          `${p.name} ${permissionLabel(p.name)} ${permissionDescription(p.name)}`,
        )
        return terms.split(' ').every((t) => haystack.includes(t))
      }),
    [catalog, terms],
  )
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(search.page, totalPages - 1)
  const permissions = useMemo(
    () => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filtered, page],
  )
  const setFilter = (q: string) =>
    void navigate({
      search: { page: 0, q: q === '' ? undefined : q },
      replace: true,
    })
  const setPage = (next: number) =>
    void navigate({ search: (prev) => ({ ...prev, page: next }) })

  const stats = useMemo(
    () => ({
      domains: new Set(catalog.map((p) => p.name.split(':')[0])).size,
      read: catalog.filter((p) => p.name.endsWith(':read')).length,
      write: catalog.filter((p) => p.name.endsWith(':write')).length,
    }),
    [catalog],
  )

  const total = data?.total ?? 0
  const forbidden = !!error && mapClaimError(error).kind === 'forbidden'
  const kpi = (value: number) => (isLoading ? '…' : error ? '—' : value)

  return (
    <>
      <div className="mb-3">
        <BackLink to="/roles">Retour aux rôles</BackLink>
      </div>

      <PageHeader
        title="Permissions"
        subtitle="Catalogue des permissions disponibles et de ce qu’elles autorisent."
        action="Ajouter une permission"
        onAction={() => setShowCreate(true)}
        actionDisabled={!can('iam:write')}
        actionTitle={
          can('iam:write')
            ? undefined
            : 'Vous n’avez pas les droits requis (Rôles & accès — Modifier).'
        }
      />

      <PermissionDrawer
        open={showCreate || !!editing}
        permission={editing}
        onClose={() => {
          setShowCreate(false)
          setEditing(null)
        }}
      />

      <KpiRow cols={4}>
        <KpiCard
          icon={<KeyRound className="size-5 text-primary" />}
          iconClass="bg-primary/[0.08]"
          value={kpi(total)}
          label="Permissions"
        />
        <KpiCard
          icon={<Layers className="size-5 text-[#1f53b0]" />}
          iconClass="bg-[#1f53b0]/10"
          value={kpi(stats.domains)}
          label="Domaines"
        />
        <KpiCard
          icon={<Eye className="size-5 text-[#167347]" />}
          iconClass="bg-[#1c8a57]/10"
          value={kpi(stats.read)}
          label="Consultation"
        />
        <KpiCard
          icon={<Pencil className="size-5 text-[#8a6600]" />}
          iconClass="bg-[#ffc61e]/20"
          value={kpi(stats.write)}
          label="Modification"
        />
      </KpiRow>

      <Toolbar
        search={
          <ToolbarSearch
            label="Rechercher une permission"
            placeholder="Rechercher par nom, intitulé ou description…"
            value={filter}
            onChange={setFilter}
          />
        }
      />

      <ResultCount>
        {isLoading
          ? 'Chargement…'
          : `${filtered.length} permission${filtered.length > 1 ? 's' : ''}${searching ? ` sur ${total}` : ''}`}
      </ResultCount>

      <PermissionsTable
        permissions={permissions}
        onSelect={can('iam:write') ? setEditing : undefined}
        selectedId={editing?.id}
        isLoading={isLoading}
        error={error}
        forbidden={forbidden}
        filtering={searching}
        onReset={() => setFilter('')}
        onRetry={() => void refetch()}
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
