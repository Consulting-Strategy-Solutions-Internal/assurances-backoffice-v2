import { useNavigate } from '@tanstack/react-router'
import { Share2 } from 'lucide-react'
import type { PartnerResponse } from '#/services/partners'
import { EntityAvatar } from '#/components/layout/EntityAvatar'
import { TruncatedText } from '#/components/layout/TruncatedText'
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
import {
  MobileCardContent,
  MobileCardList,
} from '#/components/layout/MobileCardList'
import { Button } from '#/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '#/components/ui/table'

interface PartnersTableProps {
  partners: PartnerResponse[]
  isLoading?: boolean
  error?: unknown
  forbidden?: boolean
  /** True when a search is active (switches the empty-state wording). */
  filtering?: boolean
  onReset?: () => void
  onRetry?: () => void
}

const COLS = 5

export function PartnersTable({
  partners,
  isLoading = false,
  error,
  forbidden,
  filtering = false,
  onReset,
  onRetry,
}: PartnersTableProps) {
  const navigate = useNavigate()
  const open = (partner: PartnerResponse) =>
    navigate({
      to: '/partners/$partnerId',
      params: { partnerId: String(partner.id) },
    })
  return (
    <DataTableCard
      mobileCards={
        <MobileCardList
          items={partners}
          getKey={(p) => p.id}
          onActivate={open}
          isLoading={isLoading}
          error={!!error}
          forbidden={forbidden}
          errorTitle="Impossible de charger les partenaires."
          errorAction={
            onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                Réessayer
              </Button>
            )
          }
          empty={{
            icon: Share2,
            title: filtering
              ? 'Aucun partenaire ne correspond à votre recherche.'
              : 'Aucun partenaire pour le moment.',
            action:
              filtering && onReset ? (
                <button
                  type="button"
                  onClick={onReset}
                  className="text-[13px] font-semibold text-primary hover:underline"
                >
                  Réinitialiser les filtres
                </button>
              ) : undefined,
          }}
          renderCard={(p) => (
            <MobileCardContent
              leading={<EntityAvatar name={p.name} />}
              title={p.name}
              subtitle={p.email || p.location || `Partenaire #${p.id}`}
              meta={`Code ${p.distributorCode}`}
            />
          )}
        />
      }
    >
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <DataTableHead first sticky="left">
              Partenaire
            </DataTableHead>
            <DataTableHead>Code distributeur</DataTableHead>
            <DataTableHead hideBelow="lg">Localisation</DataTableHead>
            <DataTableHead hideBelow="md">Email</DataTableHead>
            <DataTableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeletonRows
              columns={[40, 20, 28, 40]}
              hideBelow={[undefined, undefined, 'lg', 'md']}
              leading="avatar"
              trailing
            />
          ) : error ? (
            <TableErrorState
              colSpan={COLS}
              forbidden={forbidden}
              title="Impossible de charger les partenaires."
              action={
                onRetry && (
                  <Button variant="outline" size="sm" onClick={onRetry}>
                    Réessayer
                  </Button>
                )
              }
            />
          ) : partners.length === 0 ? (
            <TableEmptyState
              colSpan={COLS}
              icon={Share2}
              title={
                filtering
                  ? 'Aucun partenaire ne correspond à votre recherche.'
                  : 'Aucun partenaire pour le moment.'
              }
              action={
                filtering && onReset ? (
                  <button
                    type="button"
                    onClick={onReset}
                    className="text-[13px] font-semibold text-primary hover:underline"
                  >
                    Réinitialiser les filtres
                  </button>
                ) : undefined
              }
            />
          ) : (
            partners.map((partner) => (
              <ClickableRow
                key={partner.id}
                aria-label={`Voir le partenaire ${partner.name}`}
                onActivate={() => open(partner)}
              >
                <DataTableCell first sticky="left">
                  <div className="flex items-center gap-3">
                    <EntityAvatar name={partner.name} />
                    <div>
                      <div className="font-semibold">{partner.name}</div>
                      <div className="text-[12px] text-muted-foreground">
                        Partenaire #{partner.id}
                      </div>
                    </div>
                  </div>
                </DataTableCell>
                <TableCell className="font-semibold whitespace-nowrap text-muted-foreground tabular-nums">
                  <span className="mr-1 text-[12px] font-medium">Code</span>
                  {partner.distributorCode}
                </TableCell>
                <DataTableCell
                  hideBelow="lg"
                  className="max-w-[200px] text-muted-foreground"
                >
                  {partner.location ? (
                    <TruncatedText>{partner.location}</TruncatedText>
                  ) : (
                    '—'
                  )}
                </DataTableCell>
                <DataTableCell
                  hideBelow="md"
                  className="max-w-[240px] text-muted-foreground"
                >
                  {partner.email ? (
                    <TruncatedText>{partner.email}</TruncatedText>
                  ) : (
                    '—'
                  )}
                </DataTableCell>
                <RowChevron />
              </ClickableRow>
            ))
          )}
        </TableBody>
      </Table>
    </DataTableCard>
  )
}
