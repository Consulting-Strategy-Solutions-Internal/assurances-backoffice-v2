import { pageHead } from '#/lib/page-title'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import {
  Banknote,
  Building2,
  CheckCircle2,
  FileText,
  Send,
  Store,
  User,
} from 'lucide-react'
import { SearchableSelect } from '#/components/layout/SearchableSelect'
import { KpiCard } from '#/components/dashboard/KpiCard'
import { PageHeader } from '#/components/dashboard/PageHeader'
import {
  ClickableRow,
  DataTableCard,
  DataTableCell,
  DataTableHead,
  RowChevron,
  TableEmptyState,
  TableErrorState,
  TableSkeletonRows,
} from '#/components/layout/DataTable'
import { KpiRow } from '#/components/layout/KpiRow'
import {
  ResultCount,
  Toolbar,
  ToolbarSearch,
} from '#/components/layout/Toolbar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { TruncatedText } from '#/components/layout/TruncatedText'
import { Skeleton } from '#/components/ui/skeleton'
import { DateRangeFilter } from '#/components/layout/DateRangeFilter'
import {
  MobileCardContent,
  MobileCardList,
} from '#/components/layout/MobileCardList'
import { QuotationDetailDrawer } from '#/components/quotations/QuotationDetailDrawer'
import { Button } from '#/components/ui/button'
import { Pagination } from '#/components/ui/Pagination'
import { Table, TableBody, TableHeader, TableRow } from '#/components/ui/table'
import {
  QUOTATION_STATUS_META,
  QuotationStatusBadge,
} from '#/components/quotations/QuotationStatusBadge'
import { useDistributionDirectory } from '#/components/quotations/useDistributionDirectory'
import type { Attribution } from '#/components/quotations/useDistributionDirectory'
import { mapClaimError } from '#/lib/claims'
import { clientFullName } from '#/lib/clients'
import { fetchAllPages } from '#/lib/fetch-all-pages'
import {
  computeQuotationStats,
  filterQuotations,
  QUOTATIONS_PAGE_SIZE,
} from '#/lib/quotations'
import { formatDate, formatFcfa, formatInteger } from '#/lib/utils'
import { clientsKeys, getAllClients } from '#/services/clients'
import { getQuotations, QUOTATION_STATUSES } from '#/services/quotations'

const optionalId = z.coerce
  .number()
  .int()
  .positive()
  .optional()
  .catch(undefined)
const optionalDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .catch(undefined)

const searchSchema = z.object({
  partnerId: optionalId,
  agencyId: optionalId,
  sellerId: optionalId,
  status: z.enum(QUOTATION_STATUSES).optional().catch(undefined),
  q: z.string().optional().catch(undefined),
  from: optionalDate,
  to: optionalDate,
  open: optionalId,
  page: z.coerce.number().int().min(0).optional().catch(0),
})

export const Route = createFileRoute('/_auth/cotations')({
  head: pageHead('Cotations'),
  validateSearch: searchSchema,
  component: QuotationsPage,
})

const KIND_ICON = {
  seller: User,
  agency: Building2,
  partner: Store,
  unknown: User,
} as const

const COLUMNS = 8

function IssuerCell({ attribution }: { attribution: Attribution }) {
  const Icon = KIND_ICON[attribution.kind]
  const kindLabel =
    attribution.kind === 'seller'
      ? 'Agent'
      : attribution.kind === 'agency'
        ? 'Agence'
        : attribution.kind === 'partner'
          ? 'Partenaire'
          : 'Code'
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-primary/10">
        <Icon className="size-[15px] text-primary" />
      </div>
      <div className="min-w-0 leading-tight">
        <TruncatedText className="text-[13.5px] font-semibold">
          {attribution.label}
        </TruncatedText>
        <div className="truncate text-[11.5px] text-muted-foreground tabular-nums">
          {kindLabel} · {attribution.code}
          {attribution.partner && attribution.kind !== 'partner'
            ? ` · ${attribution.partner.name}`
            : ''}
        </div>
      </div>
    </div>
  )
}

export function QuotationsPage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const dir = useDistributionDirectory()

  const partnerId = search.partnerId == null ? '' : String(search.partnerId)
  const agencyId = search.agencyId == null ? '' : String(search.agencyId)
  const sellerId = search.sellerId == null ? '' : String(search.sellerId)
  const setFilters = (patch: Partial<typeof search>) =>
    void navigate({
      search: (previous) => ({ ...previous, ...patch, page: 0 }),
      replace: true,
    })

  // Search box: local state for typing, synced (debounced) to the URL.
  const [query, setQuery] = useState(search.q ?? '')
  const pushedQuery = useRef(search.q ?? '')
  useEffect(() => {
    const next = query.trim() === '' ? '' : query
    if (next === pushedQuery.current) return
    const timer = setTimeout(() => {
      pushedQuery.current = next
      setFilters({ q: next === '' ? undefined : next })
    }, 250)
    return () => clearTimeout(timer)
  }, [query])
  // Back/forward or « Réinitialiser » changed the URL: mirror it in the input.
  useEffect(() => {
    const urlValue = search.q ?? ''
    if (urlValue !== pushedQuery.current) {
      pushedQuery.current = urlValue
      setQuery(urlValue)
    }
  }, [search.q])

  // Cascade option lists derived from the current selection.
  const agencyOptions = useMemo(
    () => (partnerId === '' ? [] : dir.agenciesOf(Number(partnerId))),
    [dir, partnerId],
  )
  const sellerOptions = useMemo(() => {
    if (partnerId === '') return []
    return dir.sellersOf({
      partnerId: Number(partnerId),
      agencyId: agencyId === '' ? undefined : Number(agencyId),
    })
  }, [dir, partnerId, agencyId])

  // The most specific selection wins — that is the code we filter quotations by.
  const activeCode = useMemo(() => {
    if (sellerId !== '') {
      return dir.sellers.find((s) => String(s.id) === sellerId)?.distributorCode
    }
    if (agencyId !== '') {
      return dir.agencies.find((a) => String(a.id) === agencyId)
        ?.distributorCode
    }
    if (partnerId !== '') {
      return dir.partners.find((p) => String(p.id) === partnerId)
        ?.distributorCode
    }
    return undefined
  }, [dir, partnerId, agencyId, sellerId])

  const networkFilter = partnerId !== ''
  // Wait for the directory only when an id filter from the URL needs it.
  const waitingForDirectory = networkFilter && dir.isLoading

  // The API only paginates: load every page (volume is small) so search,
  // status, dates and KPIs cover all quotations, not one page.
  const {
    data: loaded,
    isLoading: quotationsLoading,
    error: quotationsError,
    refetch,
  } = useQuery({
    queryKey: ['quotations', 'all', activeCode ?? null],
    queryFn: () =>
      fetchAllPages((page, size) =>
        getQuotations({
          distributorCode: activeCode,
          page,
          size,
          sort: 'createdAt,desc',
        }),
      ),
    enabled: !waitingForDirectory,
    retry: false,
  })
  const isLoading = quotationsLoading || waitingForDirectory

  // Même cache que `useClientNames` / `ClientPicker` (pas de second chargement).
  const { data: clientsLoaded } = useQuery({
    queryKey: clientsKeys.everyone('lastName,asc'),
    queryFn: () => getAllClients('lastName,asc'),
    staleTime: 60_000,
    retry: false,
  })
  const clientNames = useMemo(
    () =>
      new Map(
        (clientsLoaded?.items ?? []).map(
          (c) => [c.id, clientFullName(c)] as const,
        ),
      ),
    [clientsLoaded],
  )
  const clientNameOf = (id?: number) =>
    id == null ? undefined : clientNames.get(id)

  const all = useMemo(() => loaded?.items ?? [], [loaded])
  const rows = useMemo(
    () =>
      filterQuotations(
        all,
        {
          query: search.q ?? '',
          status: search.status,
          from: search.from,
          to: search.to,
        },
        (id) => (id == null ? undefined : clientNames.get(id)),
      ),
    [all, search.q, search.status, search.from, search.to, clientNames],
  )
  const stats = useMemo(() => computeQuotationStats(rows), [rows])

  const totalPages = Math.max(1, Math.ceil(rows.length / QUOTATIONS_PAGE_SIZE))
  const page = Math.min(search.page ?? 0, totalPages - 1)
  const pageRows = rows.slice(
    page * QUOTATIONS_PAGE_SIZE,
    (page + 1) * QUOTATIONS_PAGE_SIZE,
  )

  const forbidden =
    quotationsError !== null &&
    mapClaimError(quotationsError).kind === 'forbidden'
  const filtering =
    networkFilter ||
    Boolean(search.q) ||
    search.status !== undefined ||
    Boolean(search.from) ||
    Boolean(search.to)
  const kpi = (value: number | string) =>
    isLoading ? '…' : quotationsError ? '—' : value

  const resetFilters = () => {
    setQuery('')
    void navigate({ search: { page: 0 }, replace: true })
  }

  const countLabel = isLoading
    ? 'Chargement…'
    : quotationsError
      ? ''
      : `${
          rows.length === all.length
            ? `${rows.length} cotation${rows.length > 1 ? 's' : ''}`
            : `${rows.length} cotation${rows.length > 1 ? 's' : ''} sur ${all.length}`
        }${activeCode ? ` · code distributeur ${activeCode}` : ''}`

  const openQuotation = (id: number) =>
    void navigate({ search: (previous) => ({ ...previous, open: id }) })
  const closeQuotation = () =>
    void navigate({ search: (previous) => ({ ...previous, open: undefined }) })

  const directoryHint = dir.isError
    ? 'Le réseau de distribution n’a pas pu être chargé (droits insuffisants ?).'
    : undefined

  return (
    <>
      <PageHeader
        title="Cotations"
        subtitle="Devis émis par le réseau : recherchez, filtrez par statut, date, partenaire, agence ou agent."
      />

      <KpiRow>
        <KpiCard
          icon={<FileText className="size-5 text-primary" />}
          iconClass="bg-primary/[0.08]"
          value={kpi(rows.length)}
          label={filtering ? 'Cotations (filtre)' : 'Cotations'}
        />
        <KpiCard
          icon={<CheckCircle2 className="size-5 text-[#167347]" />}
          iconClass="bg-[#1c8a57]/10"
          value={kpi(stats.converted)}
          label="Converties"
        />
        <KpiCard
          icon={<Send className="size-5 text-[#1f53b0]" />}
          iconClass="bg-[#1f53b0]/10"
          value={kpi(stats.quoted)}
          label="Cotées"
        />
        <KpiCard
          icon={<Banknote className="size-5 text-[#8a6600]" />}
          iconClass="bg-[#ffc61e]/20"
          value={kpi(formatInteger(stats.premium))}
          unit={isLoading || quotationsError ? undefined : 'FCFA'}
          label="Prime TTC cumulée"
        />
      </KpiRow>

      <Toolbar
        search={
          <ToolbarSearch
            label="Rechercher une cotation"
            placeholder="Référence, client, assuré, produit…"
            value={query}
            onChange={setQuery}
          />
        }
        filters={
          <>
            <Select
              value={search.status ?? 'all'}
              onValueChange={(v) =>
                setFilters({
                  status:
                    v === 'all'
                      ? undefined
                      : (v as (typeof QUOTATION_STATUSES)[number]),
                })
              }
            >
              <SelectTrigger
                aria-label="Statut"
                className="h-10 rounded-[10px] bg-card @xl/main:w-[160px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {QUOTATION_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {QUOTATION_STATUS_META[status].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DateRangeFilter
              idPrefix="cot"
              from={search.from}
              to={search.to}
              onFromChange={(from) => setFilters({ from })}
              onToChange={(to) => setFilters({ to })}
            />
          </>
        }
        actions={
          filtering ? (
            <Button
              type="button"
              variant="ghost"
              className="rounded-[11px]"
              onClick={resetFilters}
            >
              Réinitialiser les filtres
            </Button>
          ) : undefined
        }
      />

      {/* Filtres réseau en cascade */}
      <Toolbar
        filters={
          <>
            <SearchableSelect
              label="Partenaire"
              value={partnerId}
              disabled={dir.isError}
              disabledHint={directoryHint}
              loading={dir.isLoading}
              allLabel="Tous les partenaires"
              placeholder="Nom ou code distributeur…"
              emptyLabel="Aucun partenaire trouvé."
              options={dir.partners.map((p) => ({
                value: String(p.id),
                label: p.name,
                hint: `Code ${p.distributorCode}${p.location ? ` · ${p.location}` : ''}`,
              }))}
              onChange={(v) =>
                setFilters({
                  partnerId: v === '' ? undefined : Number(v),
                  agencyId: undefined,
                  sellerId: undefined,
                })
              }
            />
            <SearchableSelect
              label="Agence"
              value={agencyId}
              disabled={partnerId === '' || dir.isError}
              disabledHint={
                directoryHint ?? 'Choisissez d’abord un partenaire.'
              }
              allLabel="Toutes les agences"
              placeholder="Nom ou code de l’agence…"
              emptyLabel="Aucune agence trouvée."
              options={agencyOptions.map((a) => ({
                value: String(a.id),
                label: a.name,
                hint: `Code ${a.distributorCode}`,
              }))}
              onChange={(v) =>
                setFilters({
                  agencyId: v === '' ? undefined : Number(v),
                  sellerId: undefined,
                })
              }
            />
            <SearchableSelect
              label="Agent"
              value={sellerId}
              disabled={partnerId === '' || dir.isError}
              disabledHint={
                directoryHint ?? 'Choisissez d’abord un partenaire.'
              }
              allLabel="Tous les agents"
              placeholder="Nom ou code de l’agent…"
              emptyLabel="Aucun agent trouvé."
              options={sellerOptions.map((s) => ({
                value: String(s.id),
                label:
                  `${s.firstName} ${s.lastName}`.trim() || s.distributorCode,
                hint: `Code ${s.distributorCode}`,
              }))}
              onChange={(v) =>
                setFilters({ sellerId: v === '' ? undefined : Number(v) })
              }
            />
          </>
        }
      />
      <ResultCount
        note={
          loaded?.capped
            ? `Affichage limité aux ${all.length} cotations les plus récentes sur ${loaded.total}.`
            : undefined
        }
      >
        {countLabel}
      </ResultCount>

      <DataTableCard
        mobileCards={
          <MobileCardList
            items={pageRows}
            getKey={(q) => q.id}
            onActivate={(q) => openQuotation(q.id)}
            isLoading={isLoading}
            error={quotationsError !== null}
            forbidden={forbidden}
            errorTitle="Impossible de charger les cotations."
            errorAction={
              <Button
                type="button"
                variant="outline"
                className="rounded-[11px]"
                onClick={() => void refetch()}
              >
                Réessayer
              </Button>
            }
            empty={{
              icon: FileText,
              title: filtering
                ? 'Aucune cotation ne correspond à votre recherche.'
                : 'Aucune cotation pour le moment.',
              action: filtering ? (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-[11px]"
                  onClick={resetFilters}
                >
                  Réinitialiser les filtres
                </Button>
              ) : undefined,
            }}
            renderCard={(q) => (
              <MobileCardContent
                title={`#${q.id} · ${
                  q.clientId == null
                    ? 'Sans client'
                    : (clientNameOf(q.clientId) ?? `Client #${q.clientId}`)
                }`}
                subtitle={
                  q.productSnapshot?.productLabel ??
                  (q.productId ? `Produit #${q.productId}` : 'Produit')
                }
                status={<QuotationStatusBadge status={q.status} />}
                value={
                  q.grossPremium == null
                    ? undefined
                    : formatFcfa(q.grossPremium)
                }
                meta={
                  <>
                    {formatDate(q.quoteAt ?? q.createdAt)}
                    {dir.isLoading
                      ? ''
                      : ` · ${dir.resolveCode(q.distributorCode).label}`}
                  </>
                }
              />
            )}
          />
        }
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <DataTableHead first sticky="left">
                Réf.
              </DataTableHead>
              <DataTableHead hideBelow="lg">Date</DataTableHead>
              <DataTableHead>Client</DataTableHead>
              <DataTableHead hideBelow="md">Produit</DataTableHead>
              <DataTableHead hideBelow="lg">Émis par</DataTableHead>
              <DataTableHead>Statut</DataTableHead>
              <DataTableHead className="text-right">Prime TTC</DataTableHead>
              <DataTableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeletonRows
                columns={[14, 22, 30, 30, 44, 20, 24]}
                hideBelow={[undefined, 'lg', undefined, 'md', 'lg']}
                trailing
              />
            ) : quotationsError ? (
              <TableErrorState
                colSpan={COLUMNS}
                forbidden={forbidden}
                title="Impossible de charger les cotations."
                action={
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-[11px]"
                    onClick={() => void refetch()}
                  >
                    Réessayer
                  </Button>
                }
              />
            ) : pageRows.length === 0 ? (
              <TableEmptyState
                colSpan={COLUMNS}
                icon={FileText}
                title={
                  filtering
                    ? 'Aucune cotation ne correspond à votre recherche.'
                    : 'Aucune cotation pour le moment.'
                }
                action={
                  filtering ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-[11px]"
                      onClick={resetFilters}
                    >
                      Réinitialiser les filtres
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              pageRows.map((q) => {
                const attribution = dir.resolveCode(q.distributorCode)
                const clientName = clientNameOf(q.clientId)
                return (
                  <ClickableRow
                    key={q.id}
                    onActivate={() => openQuotation(q.id)}
                    aria-label={`Ouvrir la cotation ${q.id}`}
                  >
                    <DataTableCell
                      first
                      sticky="left"
                      className="py-3.5 text-[13px] font-bold text-primary tabular-nums"
                    >
                      #{q.id}
                    </DataTableCell>
                    <DataTableCell
                      hideBelow="lg"
                      className="py-3.5 text-[13px] whitespace-nowrap text-muted-foreground tabular-nums"
                    >
                      {formatDate(q.quoteAt ?? q.createdAt)}
                    </DataTableCell>
                    <DataTableCell className="max-w-[180px] py-3.5">
                      {q.clientId == null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <>
                          <TruncatedText className="text-[13.5px] font-semibold">
                            {clientName ?? `Client #${q.clientId}`}
                          </TruncatedText>
                          {q.insured?.relationship &&
                            q.insured.relationship !== 'SELF' && (
                              <div className="text-[12px] text-muted-foreground">
                                Assuré :{' '}
                                {`${q.insured.firstName ?? ''} ${q.insured.lastName ?? ''}`.trim()}
                              </div>
                            )}
                        </>
                      )}
                    </DataTableCell>
                    <DataTableCell hideBelow="md" className="py-3.5">
                      <div className="text-[13.5px] font-semibold">
                        {q.productSnapshot?.productLabel ??
                          (q.productId ? `Produit #${q.productId}` : 'Produit')}
                      </div>
                      {(q.formulaSnapshot?.label ??
                        q.productSnapshot?.insuranceTypeLabel) && (
                        <div className="text-[12px] text-muted-foreground">
                          {q.formulaSnapshot?.label ??
                            q.productSnapshot?.insuranceTypeLabel}
                        </div>
                      )}
                    </DataTableCell>
                    <DataTableCell
                      hideBelow="lg"
                      className="max-w-[280px] py-3.5"
                    >
                      {dir.isLoading ? (
                        <Skeleton className="h-8 w-36 rounded-md" />
                      ) : (
                        <IssuerCell attribution={attribution} />
                      )}
                    </DataTableCell>
                    <DataTableCell className="py-3.5">
                      <QuotationStatusBadge status={q.status} />
                    </DataTableCell>
                    <DataTableCell className="py-3.5 text-right text-[13.5px] font-bold whitespace-nowrap tabular-nums">
                      {q.grossPremium == null ? (
                        <span className="font-normal text-muted-foreground">
                          —
                        </span>
                      ) : (
                        formatFcfa(q.grossPremium)
                      )}
                    </DataTableCell>
                    <RowChevron />
                  </ClickableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </DataTableCard>

      <Pagination
        page={page}
        totalPages={totalPages}
        isLast={page >= totalPages - 1}
        onPrev={() =>
          void navigate({
            search: (previous) => ({ ...previous, page: page - 1 }),
          })
        }
        onNext={() =>
          void navigate({
            search: (previous) => ({ ...previous, page: page + 1 }),
          })
        }
      />

      <QuotationDetailDrawer
        quotationId={search.open ?? null}
        onClose={closeQuotation}
        resolveCode={dir.resolveCode}
      />
    </>
  )
}
