import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Building2, Store, User } from 'lucide-react'
import { Card } from '#/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { Pagination } from '#/components/ui/Pagination'
import { cn, formatDate } from '#/lib/utils'
import { PageHeader } from '#/components/dashboard/PageHeader'
import { QuotationStatusBadge } from '#/components/quotations/QuotationStatusBadge'
import { useDistributionDirectory } from '#/components/quotations/useDistributionDirectory'
import type { Attribution } from '#/components/quotations/useDistributionDirectory'
import { getQuotations } from '#/services/quotations'

export const Route = createFileRoute('/_auth/cotations')({
  component: QuotationsPage,
})

const headCls =
  'h-auto bg-[#fafbfc] px-3 py-3 text-[11px] font-bold uppercase tracking-[0.05em] text-muted-foreground'

const ALL = '__all__'
const nf = new Intl.NumberFormat('fr-FR')

function formatFcfa(v?: number) {
  if (v == null) return ''
  return `${nf.format(v)} FCFA`
}

function MessageRow({ children }: { children: React.ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell
        colSpan={7}
        className="py-9 text-center text-[13.5px] text-muted-foreground"
      >
        {children}
      </TableCell>
    </TableRow>
  )
}

const KIND_ICON = {
  seller: User,
  agency: Building2,
  partner: Store,
  unknown: User,
} as const

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
        <div className="truncate text-[13.5px] font-semibold">
          {attribution.label}
        </div>
        <div className="text-[11.5px] text-muted-foreground tabular-nums">
          {kindLabel} · {attribution.code}
        </div>
      </div>
    </div>
  )
}

function QuotationsPage() {
  const dir = useDistributionDirectory()

  const [partnerId, setPartnerId] = useState<string>(ALL)
  const [agencyId, setAgencyId] = useState<string>(ALL)
  const [sellerId, setSellerId] = useState<string>(ALL)
  const [page, setPage] = useState(0)

  // Cascade option lists derived from the current selection.
  const partnerOptions = dir.partners
  const agencyOptions = useMemo(
    () => (partnerId === ALL ? [] : dir.agenciesOf(Number(partnerId))),
    [dir, partnerId],
  )
  const sellerOptions = useMemo(() => {
    if (partnerId === ALL) return []
    return dir.sellersOf({
      partnerId: Number(partnerId),
      agencyId: agencyId === ALL ? undefined : Number(agencyId),
    })
  }, [dir, partnerId, agencyId])

  // The most specific selection wins — that is the code we filter quotations by.
  const activeCode = useMemo(() => {
    if (sellerId !== ALL) {
      return dir.sellers.find((s) => String(s.id) === sellerId)?.distributorCode
    }
    if (agencyId !== ALL) {
      return dir.agencies.find((a) => String(a.id) === agencyId)
        ?.distributorCode
    }
    if (partnerId !== ALL) {
      return dir.partners.find((p) => String(p.id) === partnerId)
        ?.distributorCode
    }
    return undefined
  }, [dir, partnerId, agencyId, sellerId])

  // Any filter change goes back to the first page.
  useEffect(() => {
    setPage(0)
  }, [activeCode])

  const {
    data,
    isLoading,
    error: quotationsError,
  } = useQuery({
    queryKey: ['quotations', activeCode ?? null, page],
    queryFn: () => getQuotations({ distributorCode: activeCode, page }),
    retry: false,
  })

  const rows = data?.content ?? []

  const resetFilters = () => {
    setPartnerId(ALL)
    setAgencyId(ALL)
    setSellerId(ALL)
  }

  return (
    <>
      <PageHeader
        title="Cotations"
        subtitle="Devis émis par le réseau · filtrez par partenaire, agence ou agent"
      />

      {/* Filtres en cascade */}
      <Card className="mb-[18px] gap-0 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FilterSelect
            label="Partenaire"
            value={partnerId}
            disabled={dir.isError}
            allLabel="Tous les partenaires"
            options={partnerOptions.map((p) => ({
              value: String(p.id),
              label: p.name,
            }))}
            onChange={(v) => {
              setPartnerId(v)
              setAgencyId(ALL)
              setSellerId(ALL)
            }}
          />
          <FilterSelect
            label="Agence"
            value={agencyId}
            disabled={partnerId === ALL || dir.isError}
            allLabel="Toutes les agences"
            options={agencyOptions.map((a) => ({
              value: String(a.id),
              label: a.name,
            }))}
            onChange={(v) => {
              setAgencyId(v)
              setSellerId(ALL)
            }}
          />
          <FilterSelect
            label="Agent"
            value={sellerId}
            disabled={partnerId === ALL || dir.isError}
            allLabel="Tous les agents"
            options={sellerOptions.map((s) => ({
              value: String(s.id),
              label: `${s.firstName} ${s.lastName}`.trim() || s.distributorCode,
            }))}
            onChange={setSellerId}
          />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-[12px] text-muted-foreground">
            {dir.isError
              ? "Réseau indisponible (droits insuffisants) : la liste reste filtrable une fois les permissions accordées."
              : activeCode
                ? `Filtre actif · code distributeur ${activeCode}`
                : 'Toutes les cotations du réseau'}
          </p>
          {activeCode && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-[12px] font-semibold text-primary hover:underline"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </Card>

      <Card className="gap-0 overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={cn(headCls, 'pl-[22px]')}>Réf.</TableHead>
              <TableHead className={headCls}>Date</TableHead>
              <TableHead className={headCls}>Produit</TableHead>
              <TableHead className={headCls}>Émis par</TableHead>
              <TableHead className={headCls}>Partenaire</TableHead>
              <TableHead className={headCls}>Statut</TableHead>
              <TableHead className={cn(headCls, 'pr-[22px] text-right')}>
                Prime TTC
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <MessageRow>Chargement…</MessageRow>
            ) : quotationsError ? (
              <MessageRow>Impossible de charger les cotations.</MessageRow>
            ) : rows.length === 0 ? (
              <MessageRow>
                {activeCode
                  ? 'Aucune cotation pour ce filtre.'
                  : 'Aucune cotation pour le moment.'}
              </MessageRow>
            ) : (
              rows.map((q) => {
                const attribution = dir.resolveCode(q.distributorCode)
                const partner = attribution.partner
                return (
                  <TableRow key={q.id} className="hover:bg-transparent">
                    <TableCell className="py-3.5 pl-[22px] text-[13px] font-bold text-primary tabular-nums">
                      #{q.id}
                    </TableCell>
                    <TableCell className="py-3.5 text-[13px] text-muted-foreground tabular-nums">
                      {formatDate(q.quoteAt ?? q.createdAt)}
                    </TableCell>
                    <TableCell className="py-3.5">
                      <div className="text-[13.5px] font-semibold">
                        {q.productSnapshot?.productLabel ??
                          (q.productId ? `Produit #${q.productId}` : 'Produit')}
                      </div>
                      {q.productSnapshot?.categoryName && (
                        <div className="text-[12px] text-muted-foreground">
                          {q.productSnapshot.categoryName}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[230px] py-3.5">
                      <IssuerCell attribution={attribution} />
                    </TableCell>
                    <TableCell className="py-3.5">
                      {partner ? (
                        <div className="leading-tight">
                          <div className="text-[13px] font-semibold">
                            {partner.name}
                          </div>
                          <div className="text-[11.5px] text-muted-foreground tabular-nums">
                            Site {partner.idSite}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[13px] text-muted-foreground">
                          {dir.isLoading ? '…' : 'Non rattaché'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-3.5">
                      <QuotationStatusBadge status={q.status} />
                    </TableCell>
                    <TableCell className="py-3.5 pr-[22px] text-right text-[13.5px] font-bold tabular-nums">
                      {formatFcfa(q.grossPremium)}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <Pagination
        page={page}
        totalPages={data?.totalPages ?? 0}
        isLast={data?.last ?? true}
        onPrev={() => setPage((p) => p - 1)}
        onNext={() => setPage((p) => p + 1)}
      />
    </>
  )
}

interface FilterSelectProps {
  label: string
  value: string
  allLabel: string
  options: { value: string; label: string }[]
  disabled?: boolean
  onChange: (value: string) => void
}

function FilterSelect({
  label,
  value,
  allLabel,
  options,
  disabled,
  onChange,
}: FilterSelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] font-semibold text-muted-foreground">
        {label}
      </span>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="h-10 w-full rounded-[10px]">
          <SelectValue placeholder={allLabel} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
