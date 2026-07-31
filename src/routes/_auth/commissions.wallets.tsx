import { useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '#/components/dashboard/PageHeader'
import { WalletStatementAction } from '#/components/commissions/CommissionDisplays'
import { FormSelect } from '#/components/forms/FormSelect'
import { Card } from '#/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Pagination } from '#/components/ui/Pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { formatDecimal2 } from '#/lib/commission-format'
import { cn, formatDate } from '#/lib/utils'
import type { CommissionOwnerType } from '#/services/commission-distributions'
import {
  getAllAgencySellers,
  getAllPartnerAgencies,
  getAllPartners,
  getAllPartnerSellers,
} from '#/services/commission-reference-data'
import { getWallets, getWalletTransactions } from '#/services/wallets'
import type { WalletResponse } from '#/services/wallets'

export const Route = createFileRoute('/_auth/commissions/wallets')({
  component: WalletsPage,
})

const headClass =
  'h-auto bg-[#fafbfc] px-3 py-3 text-[11px] font-bold uppercase tracking-[0.05em] text-muted-foreground'

export function walletOwnerLabel(wallet: WalletResponse): string {
  return wallet.ownerName ?? 'Propriétaire supprimé'
}

function WalletsPage() {
  const [ownerType, setOwnerType] = useState<CommissionOwnerType | ''>('')
  const [partnerId, setPartnerId] = useState('')
  const [agencyId, setAgencyId] = useState('')
  const [sellerScope, setSellerScope] = useState<'DIRECT' | 'AGENCY'>('DIRECT')
  const [sellerId, setSellerId] = useState('')
  const [page, setPage] = useState(0)
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
    queryKey: ['wallets', ownerType, ownerId, page],
    queryFn: () =>
      getWallets({
        ownerType: ownerType || undefined,
        ownerId: ownerId ? Number(ownerId) : undefined,
        page,
        size: 20,
      }),
    retry: false,
  })

  useEffect(() => setPage(0), [ownerType, ownerId])
  const resetDescendants = () => {
    setAgencyId('')
    setSellerId('')
  }
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
      label: `${item.firstName} ${item.lastName}`,
    }))
  }, [ownerType, partners.data, agencies.data, sellers.data])

  return (
    <>
      <PageHeader
        title="Wallets de commission"
        subtitle="Soldes et relevés en lecture seule"
      />
      <Card className="mb-4 grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
        <FormSelect
          id="wallet-owner-type"
          label="Type de propriétaire"
          value={ownerType}
          includeNone
          noneLabel="Tous les types"
          options={[
            { value: 'PARTNER', label: 'Partenaire' },
            { value: 'AGENCY', label: 'Agence' },
            { value: 'SELLER', label: 'Vendeur' },
          ]}
          onChange={(value) => {
            setOwnerType(value as CommissionOwnerType | '')
            setPartnerId('')
            resetDescendants()
          }}
        />
        {ownerType !== '' && (
          <FormSelect
            id="wallet-partner"
            label={
              ownerType === 'PARTNER'
                ? 'Partenaire propriétaire'
                : 'Partenaire de rattachement'
            }
            value={partnerId}
            includeNone
            noneLabel={
              ownerType === 'PARTNER'
                ? 'Tous les partenaires'
                : 'Sélectionner un partenaire'
            }
            options={(partners.data ?? []).map((item) => ({
              value: String(item.id),
              label: item.name,
            }))}
            onChange={(value) => {
              setPartnerId(value)
              resetDescendants()
            }}
          />
        )}
        {ownerType === 'SELLER' && partnerId !== '' && (
          <FormSelect
            id="wallet-seller-scope"
            label="Rattachement du vendeur"
            value={sellerScope}
            options={[
              { value: 'DIRECT', label: 'Directement au partenaire' },
              { value: 'AGENCY', label: 'Dans une agence' },
            ]}
            onChange={(value) => {
              setSellerScope(value as 'DIRECT' | 'AGENCY')
              resetDescendants()
            }}
          />
        )}
        {((ownerType === 'AGENCY' && partnerId !== '') ||
          (ownerType === 'SELLER' &&
            sellerScope === 'AGENCY' &&
            partnerId !== '')) && (
          <FormSelect
            id="wallet-agency"
            label={
              ownerType === 'AGENCY'
                ? 'Agence propriétaire'
                : 'Agence de rattachement'
            }
            value={agencyId}
            includeNone
            noneLabel={
              ownerType === 'AGENCY'
                ? 'Toutes les agences'
                : 'Sélectionner une agence'
            }
            options={(agencies.data ?? []).map((item) => ({
              value: String(item.id),
              label: item.name,
            }))}
            onChange={(value) => {
              setAgencyId(value)
              setSellerId('')
            }}
          />
        )}
        {ownerType === 'SELLER' &&
          partnerId !== '' &&
          (sellerScope === 'DIRECT' || agencyId !== '') && (
            <FormSelect
              id="wallet-seller"
              label="Vendeur propriétaire"
              value={sellerId}
              includeNone
              noneLabel="Tous les vendeurs de ce rattachement"
              options={ownerOptions}
              onChange={setSellerId}
            />
          )}
      </Card>
      <p className="mb-4 text-[12px] text-muted-foreground">
        Les soldes ne peuvent être ni ajustés ni retirés depuis le back-office :
        aucun endpoint d'écriture n'est exposé.
      </p>
      <Card className="gap-0 overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={cn(headClass, 'pl-[22px]')}>
                Propriétaire
              </TableHead>
              <TableHead className={headClass}>Type</TableHead>
              <TableHead className={headClass}>Identifiant</TableHead>
              <TableHead className={headClass}>Solde</TableHead>
              <TableHead className={cn(headClass, 'pr-[22px] text-right')}>
                Relevé
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {wallets.isLoading ? (
              <WalletMessage>Chargement…</WalletMessage>
            ) : wallets.error ? (
              <WalletMessage destructive>
                Impossible de charger les wallets.
              </WalletMessage>
            ) : wallets.data?.content.length === 0 ? (
              <WalletMessage>
                Aucun wallet ne correspond aux filtres.
              </WalletMessage>
            ) : (
              wallets.data?.content.map((wallet, index) => (
                <TableRow
                  key={wallet.id ?? `empty-${index}`}
                  className="hover:bg-transparent"
                >
                  <TableCell className="pl-[22px] font-semibold">
                    {walletOwnerLabel(wallet)}
                  </TableCell>
                  <TableCell>{wallet.ownerType ?? '—'}</TableCell>
                  <TableCell>
                    {wallet.ownerId === null ? '—' : `#${wallet.ownerId}`}
                  </TableCell>
                  <TableCell className="text-[15px] font-extrabold tabular-nums">
                    {formatDecimal2(wallet.balance)}
                  </TableCell>
                  <TableCell className="pr-[22px] text-right">
                    <WalletStatementAction
                      wallet={wallet}
                      onOpen={() => setSelectedWallet(wallet)}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
      <Pagination
        page={page}
        totalPages={wallets.data?.totalPages ?? 0}
        isLast={wallets.data?.last ?? true}
        onPrev={() => setPage((current) => current - 1)}
        onNext={() => setPage((current) => current + 1)}
      />
      <WalletTransactionsDialog
        wallet={selectedWallet}
        onClose={() => setSelectedWallet(null)}
      />
    </>
  )
}

function WalletMessage({
  children,
  destructive,
}: {
  children: React.ReactNode
  destructive?: boolean
}) {
  return (
    <TableRow>
      <TableCell
        colSpan={5}
        className={cn(
          'py-9 text-center text-muted-foreground',
          destructive && 'text-destructive',
        )}
      >
        {children}
      </TableCell>
    </TableRow>
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
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            Relevé de {wallet ? walletOwnerLabel(wallet) : ''}
          </DialogTitle>
          <DialogDescription>
            Transactions les plus récentes en premier. Le sens est porté par le
            type ; les montants sont toujours positifs.
          </DialogDescription>
        </DialogHeader>
        {transactions.isLoading ? (
          <p className="py-8 text-center text-muted-foreground">Chargement…</p>
        ) : transactions.error ? (
          <p className="py-8 text-center text-destructive">
            Impossible de charger le relevé.
          </p>
        ) : transactions.data?.content.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            Aucune transaction.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Produit</TableHead>
                <TableHead>Cotation</TableHead>
                <TableHead>Niveau</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Solde après</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.data?.content.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{formatDate(transaction.createdAt)}</TableCell>
                  <TableCell>{transaction.type}</TableCell>
                  <TableCell>{transaction.productName}</TableCell>
                  <TableCell>#{transaction.quotationId}</TableCell>
                  <TableCell>N{transaction.appliedLevel}</TableCell>
                  <TableCell className="font-semibold tabular-nums">
                    {formatDecimal2(transaction.amount)}
                  </TableCell>
                  <TableCell className="font-bold tabular-nums">
                    {formatDecimal2(transaction.balanceAfter)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
