import { pageHead } from '#/lib/page-title'
import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { Banknote, TriangleAlert, Wallet, WalletCards } from 'lucide-react'
import { PageHeader } from '#/components/dashboard/PageHeader'
import {
  OWNER_TYPE_LABELS,
  WalletStatementAction,
} from '#/components/commissions/CommissionDisplays'
import { SearchableSelect } from '#/components/layout/SearchableSelect'
import { KpiCard } from '#/components/dashboard/KpiCard'
import { StatusPill } from '#/components/dashboard/StatusPill'
import {
  DataTableCard,
  DataTableCell,
  DataTableHead,
  FIRST_CELL_CLASS,
  TableEmptyState,
  TableErrorState,
  TableSkeletonRows,
} from '#/components/layout/DataTable'
import { EmptyState } from '#/components/layout/EmptyState'
import { KpiRow } from '#/components/layout/KpiRow'
import { SegmentedPills } from '#/components/layout/SegmentedPills'
import { ResultCount, Toolbar } from '#/components/layout/Toolbar'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Pagination } from '#/components/ui/Pagination'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { mapClaimError } from '#/lib/claims'
import { fetchAllPages } from '#/lib/fetch-all-pages'
import { formatPersonName } from '#/lib/people'
import { formatDate, formatFcfa, formatInteger } from '#/lib/utils'
import type { CommissionOwnerType } from '#/services/commission-distributions'
import {
  getAllAgencySellers,
  getAllPartnerAgencies,
  getAllPartners,
  getAllPartnerSellers,
} from '#/services/commission-reference-data'
import { getWallets, getWalletTransactions } from '#/services/wallets'
import type { WalletResponse } from '#/services/wallets'

const PAGE_SIZE = 20

const searchSchema = z.object({
  ownerType: z
    .enum(['PARTNER', 'AGENCY', 'SELLER'])
    .optional()
    .catch(undefined),
  partnerId: z.coerce.number().int().positive().optional().catch(undefined),
  agencyId: z.coerce.number().int().positive().optional().catch(undefined),
  sellerScope: z.enum(['DIRECT', 'AGENCY']).optional().catch(undefined),
  sellerId: z.coerce.number().int().positive().optional().catch(undefined),
  page: z.coerce.number().int().min(0).optional().catch(undefined),
})

export const Route = createFileRoute('/_auth/commissions/wallets')({
  head: pageHead('Portefeuilles'),
  validateSearch: searchSchema,
  component: WalletsPage,
})

const COLUMNS = 5

export function walletOwnerLabel(wallet: WalletResponse): string {
  if (wallet.ownerName === null) return 'Propriétaire supprimé'
  return wallet.ownerType === 'SELLER'
    ? formatPersonName(wallet.ownerName)
    : wallet.ownerName
}

function WalletsPage() {
  const navigate = useNavigate({ from: Route.fullPath })
  const search = Route.useSearch()
  const ownerType: CommissionOwnerType | '' = search.ownerType ?? ''
  const partnerId = search.partnerId ? String(search.partnerId) : ''
  const agencyId = search.agencyId ? String(search.agencyId) : ''
  const sellerScope: 'DIRECT' | 'AGENCY' = search.sellerScope ?? 'DIRECT'
  const sellerId = search.sellerId ? String(search.sellerId) : ''
  const requestedPage = search.page ?? 0
  const setSearch = (next: z.input<typeof searchSchema>) =>
    void navigate({
      search: (prev) => ({ ...prev, ...next }),
      replace: true,
    })
  const num = (value: string) => (value ? Number(value) : undefined)
  const [selectedWallet, setSelectedWallet] = useState<WalletResponse | null>(
    null,
  )
  const partners = useQuery({
    queryKey: ['partners', 'wallet-filter'],
    queryFn: getAllPartners,
    retry: false,
  })
  const agencies = useQuery({
    queryKey: ['partner-agencies', 'wallet-filter', partnerId],
    queryFn: () => getAllPartnerAgencies(Number(partnerId)),
    enabled:
      partnerId !== '' &&
      (ownerType === 'AGENCY' ||
        (ownerType === 'SELLER' && sellerScope === 'AGENCY')),
    retry: false,
  })
  const sellers = useQuery({
    queryKey: ['sellers', 'wallet-filter', sellerScope, partnerId, agencyId],
    queryFn: () =>
      sellerScope === 'DIRECT'
        ? getAllPartnerSellers(Number(partnerId))
        : getAllAgencySellers(Number(agencyId)),
    enabled:
      ownerType === 'SELLER' &&
      partnerId !== '' &&
      (sellerScope === 'DIRECT' || agencyId !== ''),
    retry: false,
  })
  const ownerId =
    ownerType === 'PARTNER'
      ? partnerId
      : ownerType === 'AGENCY'
        ? agencyId
        : ownerType === 'SELLER'
          ? sellerId
          : ''
  const wallets = useQuery({
    // All wallets of the selection are loaded so the KPIs cover the whole
    // selection and not just the visible page.
    queryKey: ['wallets', ownerType, ownerId],
    queryFn: () =>
      fetchAllPages((page, size) =>
        getWallets({
          ownerType: ownerType || undefined,
          ownerId: ownerId ? Number(ownerId) : undefined,
          page,
          size,
        }),
      ),
    retry: false,
  })

  const ownerOptions = useMemo(() => {
    if (ownerType === 'PARTNER')
      return (partners.data ?? []).map((item) => ({
        value: String(item.id),
        label: item.name,
      }))
    if (ownerType === 'AGENCY')
      return (agencies.data ?? []).map((item) => ({
        value: String(item.id),
        label: item.name,
      }))
    return (sellers.data ?? []).map((item) => ({
      value: String(item.id),
      label: formatPersonName(item.firstName, item.lastName),
    }))
  }, [ownerType, partners.data, agencies.data, sellers.data])

  const all = wallets.data?.items ?? []
  const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE))
  const page = Math.min(requestedPage, totalPages - 1)
  const content = all.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const total = wallets.data?.total ?? all.length
  const failure = wallets.error
  const forbidden =
    failure !== null && mapClaimError(failure).kind === 'forbidden'
  const loading = wallets.isLoading
  const pageBalance = all.reduce((sum, item) => sum + item.balance, 0)
  const neverCredited = all.filter((item) => item.id === null).length
  const filtering = ownerType !== ''
  const kpi = (value: number | string) =>
    loading ? '…' : failure ? '—' : value
  const reset = () =>
    setSearch({
      ownerType: undefined,
      partnerId: undefined,
      agencyId: undefined,
      sellerScope: undefined,
      sellerId: undefined,
      page: undefined,
    })

  return (
    <>
      <PageHeader
        title="Portefeuilles de commission"
        subtitle="Soldes et relevés en lecture seule : aucun ajustement de solde n’est possible depuis le back-office."
      />

      <KpiRow cols={3}>
        <KpiCard
          icon={<Wallet className="size-5 text-primary" />}
          iconClass="bg-primary/[0.08]"
          value={kpi(total)}
          label="Portefeuilles"
        />
        <KpiCard
          icon={<Banknote className="size-5 text-[#167347]" />}
          iconClass="bg-[#1c8a57]/10"
          value={kpi(formatInteger(pageBalance))}
          unit={loading || failure ? undefined : 'FCFA'}
          label="Solde cumulé"
        />
        <KpiCard
          icon={<WalletCards className="size-5 text-[#8a6600]" />}
          iconClass="bg-[#ffc61e]/20"
          value={kpi(neverCredited)}
          label="Jamais crédités"
        />
      </KpiRow>

      <Toolbar
        filters={
          <>
            <SegmentedPills<CommissionOwnerType | ''>
              label="Type de propriétaire"
              value={ownerType}
              options={[
                { value: '', label: 'Tous' },
                { value: 'PARTNER', label: 'Partenaires' },
                { value: 'AGENCY', label: 'Agences' },
                { value: 'SELLER', label: 'Vendeurs' },
              ]}
              onChange={(value) =>
                setSearch({
                  ownerType: value || undefined,
                  partnerId: undefined,
                  agencyId: undefined,
                  sellerScope: undefined,
                  sellerId: undefined,
                  page: undefined,
                })
              }
            />
            {ownerType !== '' && (
              <SearchableSelect
                id="wallet-partner"
                label={
                  ownerType === 'PARTNER'
                    ? 'Partenaire propriétaire'
                    : 'Partenaire de rattachement'
                }
                value={partnerId}
                allLabel={
                  ownerType === 'PARTNER'
                    ? 'Tous les partenaires'
                    : 'Sélectionner un partenaire'
                }
                options={(partners.data ?? []).map((item) => ({
                  value: String(item.id),
                  label: item.name,
                }))}
                loading={partners.isLoading}
                onChange={(value) =>
                  setSearch({
                    partnerId: num(value),
                    agencyId: undefined,
                    sellerId: undefined,
                    page: undefined,
                  })
                }
              />
            )}
            {ownerType === 'SELLER' && partnerId !== '' && (
              <SearchableSelect
                id="wallet-seller-scope"
                label="Rattachement du vendeur"
                value={sellerScope}
                allLabel="Directement au partenaire"
                fluid
                options={[
                  { value: 'DIRECT', label: 'Directement au partenaire' },
                  { value: 'AGENCY', label: 'Dans une agence' },
                ]}
                onChange={(value) =>
                  setSearch({
                    sellerScope: value === 'AGENCY' ? 'AGENCY' : undefined,
                    agencyId: undefined,
                    sellerId: undefined,
                    page: undefined,
                  })
                }
              />
            )}
            {((ownerType === 'AGENCY' && partnerId !== '') ||
              (ownerType === 'SELLER' &&
                sellerScope === 'AGENCY' &&
                partnerId !== '')) && (
              <SearchableSelect
                id="wallet-agency"
                label={
                  ownerType === 'AGENCY'
                    ? 'Agence propriétaire'
                    : 'Agence de rattachement'
                }
                value={agencyId}
                allLabel={
                  ownerType === 'AGENCY'
                    ? 'Toutes les agences'
                    : 'Sélectionner une agence'
                }
                options={(agencies.data ?? []).map((item) => ({
                  value: String(item.id),
                  label: item.name,
                }))}
                loading={agencies.isLoading}
                onChange={(value) =>
                  setSearch({
                    agencyId: num(value),
                    sellerId: undefined,
                    page: undefined,
                  })
                }
              />
            )}
            {ownerType === 'SELLER' &&
              partnerId !== '' &&
              (sellerScope === 'DIRECT' || agencyId !== '') && (
                <SearchableSelect
                  id="wallet-seller"
                  label="Vendeur propriétaire"
                  value={sellerId}
                  allLabel="Tous les vendeurs"
                  options={ownerOptions}
                  loading={sellers.isLoading}
                  onChange={(value) =>
                    setSearch({ sellerId: num(value), page: undefined })
                  }
                />
              )}
          </>
        }
        actions={
          filtering ? (
            <Button
              type="button"
              variant="ghost"
              className="rounded-[11px]"
              onClick={reset}
            >
              Réinitialiser les filtres
            </Button>
          ) : undefined
        }
      />
      <ResultCount>
        {loading
          ? 'Chargement…'
          : failure
            ? ''
            : `${total} portefeuille${total > 1 ? 's' : ''}${wallets.data?.capped ? ` (${all.length} chargés)` : ''}`}
      </ResultCount>

      <DataTableCard>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <DataTableHead first sticky="left" stickyFrom="sm">
                Propriétaire
              </DataTableHead>
              <DataTableHead>Type</DataTableHead>
              <DataTableHead hideBelow="md">Identifiant</DataTableHead>
              <DataTableHead className="text-right">Solde</DataTableHead>
              <DataTableHead sticky="right" className="pr-[22px] text-right">
                Relevé
              </DataTableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeletonRows
                columns={[40, 20, 14, 24, 28]}
                hideBelow={[undefined, undefined, 'md']}
              />
            ) : failure ? (
              <TableErrorState
                colSpan={COLUMNS}
                forbidden={forbidden}
                title="Impossible de charger les portefeuilles."
                action={
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-[11px]"
                    onClick={() => void wallets.refetch()}
                  >
                    Réessayer
                  </Button>
                }
              />
            ) : content.length === 0 ? (
              <TableEmptyState
                colSpan={COLUMNS}
                icon={Wallet}
                title={
                  filtering
                    ? 'Aucun portefeuille ne correspond à ces filtres.'
                    : 'Aucun portefeuille pour le moment.'
                }
                action={
                  filtering ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-[11px]"
                      onClick={reset}
                    >
                      Réinitialiser les filtres
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              content.map((wallet, index) => (
                <TableRow
                  key={wallet.id ?? `empty-${index}`}
                  className="hover:bg-[#f6f8fc]"
                >
                  <DataTableCell
                    first
                    sticky="left"
                    stickyFrom="sm"
                    className="font-semibold"
                  >
                    {walletOwnerLabel(wallet)}
                  </DataTableCell>
                  <TableCell>
                    {wallet.ownerType ? (
                      <StatusPill tone="info">
                        {OWNER_TYPE_LABELS[wallet.ownerType]}
                      </StatusPill>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <DataTableCell
                    hideBelow="md"
                    className="text-muted-foreground tabular-nums"
                  >
                    {wallet.ownerId === null ? '—' : `#${wallet.ownerId}`}
                  </DataTableCell>
                  <TableCell className="text-right text-[15px] font-extrabold whitespace-nowrap tabular-nums">
                    {formatFcfa(wallet.balance)}
                  </TableCell>
                  <DataTableCell
                    sticky="right"
                    className="pr-[22px] text-right"
                  >
                    <WalletStatementAction
                      wallet={wallet}
                      onOpen={() => setSelectedWallet(wallet)}
                    />
                  </DataTableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </DataTableCard>
      <Pagination
        page={page}
        totalPages={totalPages}
        isLast={page >= totalPages - 1}
        onPrev={() => setSearch({ page: page - 1 || undefined })}
        onNext={() => setSearch({ page: page + 1 })}
      />
      <WalletTransactionsDialog
        wallet={selectedWallet}
        onClose={() => setSelectedWallet(null)}
      />
    </>
  )
}

function WalletTransactionsDialog({
  wallet,
  onClose,
}: {
  wallet: WalletResponse | null
  onClose: () => void
}) {
  const [page, setPage] = useState(0)
  const transactions = useQuery({
    queryKey: ['wallet-transactions', wallet?.id, page],
    queryFn: () => getWalletTransactions(wallet?.id as number, page, 20),
    enabled: wallet?.id !== null && wallet !== null,
    retry: false,
  })
  useEffect(() => {
    if (wallet) setPage(0)
  }, [wallet])
  return (
    <Dialog
      open={wallet !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent size="xl" className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <p className="text-[11.5px] font-bold tracking-[0.06em] text-muted-foreground uppercase">
            Relevé du portefeuille
          </p>
          <DialogTitle className="text-[20px] font-extrabold tracking-[-0.02em]">
            {wallet ? walletOwnerLabel(wallet) : ''}
          </DialogTitle>
          <DialogDescription>
            Transactions les plus récentes en premier. Le sens est porté par le
            type ; les montants sont toujours positifs.
          </DialogDescription>
        </DialogHeader>
        {transactions.isLoading ? (
          <div className="space-y-2.5 py-2">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : transactions.error ? (
          <EmptyState
            icon={TriangleAlert}
            tone="error"
            title="Impossible de charger le relevé."
            description="Réessayez dans un instant."
            action={
              <Button
                type="button"
                variant="outline"
                className="rounded-[11px]"
                onClick={() => void transactions.refetch()}
              >
                Réessayer
              </Button>
            }
          />
        ) : transactions.data?.content.length === 0 ? (
          <EmptyState icon={Wallet} title="Aucune transaction." />
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <DataTableHead first>Date</DataTableHead>
                  <DataTableHead>Type</DataTableHead>
                  <DataTableHead>Produit</DataTableHead>
                  <DataTableHead>Cotation</DataTableHead>
                  <DataTableHead>Niveau</DataTableHead>
                  <DataTableHead className="text-right">Montant</DataTableHead>
                  <DataTableHead className="pr-[22px] text-right">
                    Solde après
                  </DataTableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.data?.content.map((transaction) => (
                  <TableRow key={transaction.id} className="hover:bg-[#f6f8fc]">
                    <TableCell
                      className={`${FIRST_CELL_CLASS} whitespace-nowrap text-muted-foreground`}
                    >
                      {formatDate(transaction.createdAt)}
                    </TableCell>
                    <TableCell>
                      <StatusPill
                        tone={
                          transaction.type === 'CREDIT'
                            ? 'success'
                            : transaction.type === 'DEBIT'
                              ? 'warning'
                              : 'neutral'
                        }
                      >
                        {transaction.type === 'CREDIT'
                          ? 'Crédit'
                          : transaction.type === 'DEBIT'
                            ? 'Débit'
                            : transaction.type}
                      </StatusPill>
                    </TableCell>
                    <TableCell>{transaction.productName}</TableCell>
                    <TableCell className="tabular-nums">
                      #{transaction.quotationId}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      N{transaction.appliedLevel}
                    </TableCell>
                    <TableCell className="text-right font-semibold whitespace-nowrap tabular-nums">
                      {formatFcfa(transaction.amount)}
                    </TableCell>
                    <TableCell className="pr-[22px] text-right font-bold whitespace-nowrap tabular-nums">
                      {formatFcfa(transaction.balanceAfter)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <Pagination
          page={page}
          totalPages={transactions.data?.totalPages ?? 0}
          isLast={transactions.data?.last ?? true}
          onPrev={() => setPage((current) => current - 1)}
          onNext={() => setPage((current) => current + 1)}
        />
      </DialogContent>
    </Dialog>
  )
}
