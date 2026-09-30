import { pageHead } from '#/lib/page-title'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Building2, CalendarPlus, Mail, MapPin } from 'lucide-react'
import { z } from 'zod'
import { getPartners } from '#/services/partners'
import { fetchAllPages } from '#/lib/fetch-all-pages'
import { PartnersTable } from '#/components/partners/PartnersTable'
import { AddPartnerModal } from '#/components/partners/AddPartnerModal'
import { Pagination } from '#/components/ui/Pagination'
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

const searchSchema = z.object({
  page: z.coerce.number().int().min(0).default(0).catch(0),
  q: z.string().optional().catch(undefined),
})

export const Route = createFileRoute('/_auth/partners')({
  head: pageHead('Partenaires'),
  validateSearch: searchSchema,
  component: PartnersPage,
})

const RECENT_DAYS = 30
const PAGE_SIZE = 20

function PartnersPage() {
  const { can } = usePermissions()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const query = search.q ?? ''
  const [showModal, setShowModal] = useState(false)

  // Le backend ne filtre pas : on charge tout le réseau (quelques dizaines de
  // partenaires) pour que recherche, compteurs et pagination soient exacts.
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['partners', 'all-pages'],
    queryFn: () =>
      fetchAllPages((page, size) => getPartners(page, size, 'createdAt,desc')),
    retry: false,
  })

  const all = useMemo(() => data?.items ?? [], [data])
  const filtered = useMemo(() => {
    const terms = [query].map(normalizeText).filter(Boolean)
    if (terms.length === 0) return all
    return all.filter((p) => {
      const haystack = normalizeText(
        [p.name, p.distributorCode, p.email, p.location].join(' '),
      )
      return terms.every((t) => haystack.includes(t))
    })
  }, [all, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(search.page, totalPages - 1)
  const partners = useMemo(
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
    const since = Date.now() - RECENT_DAYS * 24 * 3600 * 1000
    return {
      withEmail: all.filter((p) => !!p.email).length,
      withLocation: all.filter((p) => !!p.location).length,
      recent: all.filter((p) => new Date(p.createdAt).getTime() >= since)
        .length,
    }
  }, [all])

  const total = data?.total ?? 0
  const capped = !!data?.capped
  const filtering = query.trim() !== ''
  const forbidden = !!error && mapClaimError(error).kind === 'forbidden'
  const kpi = (value: number) => (isLoading ? '…' : error ? '—' : value)

  return (
    <>
      <PageHeader
        title="Partenaires"
        subtitle="Réseau de distribution : courtiers, agences et bancassurance."
        action="Ajouter un partenaire"
        onAction={() => setShowModal(true)}
        actionDisabled={!can('partner:write')}
        actionTitle={
          can('partner:write')
            ? undefined
            : 'Vous n’avez pas la permission requise (partner:write).'
        }
      />

      {showModal && <AddPartnerModal onClose={() => setShowModal(false)} />}

      <KpiRow>
        <KpiCard
          icon={<Building2 className="size-5 text-primary" />}
          iconClass="bg-primary/[0.08]"
          value={kpi(total)}
          label="Partenaires"
        />
        <KpiCard
          icon={<Mail className="size-5 text-[#167347]" />}
          iconClass="bg-[#1c8a57]/10"
          value={kpi(stats.withEmail)}
          label="Email renseigné"
        />
        <KpiCard
          icon={<MapPin className="size-5 text-[#1f53b0]" />}
          iconClass="bg-[#1f53b0]/10"
          value={kpi(stats.withLocation)}
          label="Localisation renseignée"
        />
        <KpiCard
          icon={<CalendarPlus className="size-5 text-[#8a6600]" />}
          iconClass="bg-[#ffc61e]/20"
          value={kpi(stats.recent)}
          label="Ajoutés sur 30 jours"
        />
      </KpiRow>

      <Toolbar
        search={
          <ToolbarSearch
            label="Rechercher un partenaire"
            placeholder="Rechercher par nom, code, email ou localisation…"
            value={query}
            onChange={setQuery}
          />
        }
      />

      <ResultCount
        note={
          capped
            ? `Seuls les ${all.length} partenaires les plus récents sur ${total} sont chargés.`
            : undefined
        }
      >
        {isLoading
          ? 'Chargement…'
          : `${filtered.length} partenaire${filtered.length > 1 ? 's' : ''}${filtering ? ` sur ${all.length}` : ''}`}
      </ResultCount>

      <PartnersTable
        partners={partners}
        isLoading={isLoading}
        error={error}
        forbidden={forbidden}
        filtering={filtering}
        onReset={() => setQuery('')}
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
