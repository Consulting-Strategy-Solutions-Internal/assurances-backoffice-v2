import { pageHead } from '#/lib/page-title'
import { saveBlob } from '#/lib/download'
import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, FilePenLine, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { ConfirmDialog } from '#/components/dashboard/ConfirmDialog'
import { StatusPill } from '#/components/dashboard/StatusPill'
import {
  AmendmentStatusBadge,
  DeltaKindBadge,
  ReceiptStatusBadge,
} from '#/components/amendments/AmendmentBadges'
import { ClientName } from '#/components/amendments/ClientName'
import { AmendmentsGate } from '#/components/amendments/AmendmentsGate'
import { BackLink } from '#/components/layout/BackLink'
import {
  DetailHeaderCard,
  IconTile,
} from '#/components/layout/DetailHeaderCard'
import { DetailSkeleton } from '#/components/layout/DetailSkeleton'
import { EmptyState } from '#/components/layout/EmptyState'
import { InfoList, InfoRow } from '#/components/layout/InfoList'
import { SectionCard } from '#/components/layout/SectionCard'
import { WarningBanner } from '#/components/ia-products/shared/WarningBanner'
import { usePermissions } from '#/components/dashboard/use-permissions'
import {
  DEFAULT_LIST_SEARCH,
  amendmentListSearchSchema,
  AMENDMENT_PRODUCT_LABELS,
  DELTA_TITLES,
  RECEIPT_KIND_LABELS,
  RELATIONSHIP_LABELS,
  amendmentProduct,
  buildComparison,
  buildRequestedRows,
  canDelete,
  canValidate,
  deleteConfirmation,
  isReceiptDownloadable,
  mapAmendmentError,
  mapPolicyDocumentError,
  mapReceiptDocumentError,
  receiptPdfNote,
  showsComparison,
  validateConfirmation,
  validationOutcome,
} from '#/lib/amendments'
import type {
  AmendmentBeneficiary,
  AmendmentListSearch,
  AmendmentDetail,
  BeneficiaryComparison,
  ComparisonRow,
  DocumentError,
} from '#/lib/amendments'
import { formatClaimDate } from '#/lib/claims'
import { cn, formatFcfa } from '#/lib/utils'
import {
  amendmentsKeys,
  deleteAmendment,
  downloadPolicyDocument,
  downloadReceiptDocument,
  getAmendment,
  validateAmendment,
} from '#/services/amendments'
import { getSubscription, subscriptionsKeys } from '#/services/subscriptions'

export const Route = createFileRoute(
  '/_auth/contrats/modifications_/$amendmentId',
)({
  head: pageHead('Examiner la modification'),
  validateSearch: amendmentListSearchSchema,
  component: AmendmentDetailRoute,
})

function StateCard({
  title,
  description,
  tone,
  onRetry,
  backSearch,
}: {
  backSearch: AmendmentListSearch
  title: string
  description?: string
  tone?: 'muted' | 'error'
  onRetry?: () => void
}) {
  return (
    <EmptyState
      variant="card"
      icon={TriangleAlert}
      tone={tone}
      title={title}
      description={description}
      action={
        <div className="flex flex-wrap justify-center gap-2">
          {onRetry && (
            <Button className="rounded-[11px]" onClick={onRetry}>
              Réessayer
            </Button>
          )}
          <Button
            asChild
            variant={onRetry ? 'outline' : 'default'}
            className="rounded-[11px]"
          >
            <Link to="/contrats/modifications" search={backSearch}>
              Retour aux modifications
            </Link>
          </Button>
        </div>
      }
    />
  )
}

function BeneficiaryList({ items }: { items: AmendmentBeneficiary[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((beneficiary) => (
        <li
          key={`${beneficiary.name}-${beneficiary.phone}`}
          className="text-[13.5px]"
        >
          <span className="font-semibold">{beneficiary.name}</span>
          <span className="text-muted-foreground">
            {' '}
            · {RELATIONSHIP_LABELS[beneficiary.relationship]} ·{' '}
            {beneficiary.sharePercent} %
          </span>
        </li>
      ))}
    </ul>
  )
}

const CHANGED_CLASS = 'rounded-md bg-[#e7eefb] px-2 py-1'

/** Comparatif « Avant / Après » : chaque ligne est un petit bloc, lisible à toute largeur. */
function ComparisonBlock({
  rows,
  beneficiaries,
}: {
  rows: ComparisonRow[]
  beneficiaries: BeneficiaryComparison
}) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 pb-2 text-[11.5px] font-bold tracking-[0.05em] text-muted-foreground uppercase">
        <span>Avant (contrat actuel)</span>
        <span>Après (modification)</span>
      </div>
      <ul className="divide-y">
        {rows.map((row) => (
          <li key={row.key} data-changed={row.changed} className="py-3">
            <p className="mb-1 text-[12.5px] text-muted-foreground">
              {row.label}
              {row.changed && (
                <span className="ml-2 font-semibold text-[#1f53b0]">
                  modifié
                </span>
              )}
            </p>
            <div className="grid grid-cols-2 gap-3 text-[13.5px] font-semibold [overflow-wrap:anywhere]">
              <span>{row.before}</span>
              <span className={cn(row.changed && CHANGED_CLASS)}>
                {row.after}
              </span>
            </div>
          </li>
        ))}
        <li data-changed={beneficiaries.changed} className="py-3">
          <p className="mb-1 text-[12.5px] text-muted-foreground">
            Bénéficiaires
            {beneficiaries.changed && (
              <span className="ml-2 font-semibold text-[#1f53b0]">modifié</span>
            )}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <BeneficiaryList items={beneficiaries.before} />
            <div className={cn(beneficiaries.changed && CHANGED_CLASS)}>
              <BeneficiaryList items={beneficiaries.after} />
            </div>
          </div>
        </li>
      </ul>
    </div>
  )
}

function RequestedState({ detail }: { detail: AmendmentDetail }) {
  const rows = buildRequestedRows(detail)
  return (
    <>
      <WarningBanner tone="info" className="mb-4">
        Voici ce que la modification demandait. L’état du contrat avant elle
        n’est pas conservé : aucun comparatif n’est affiché.
      </WarningBanner>
      <InfoList columns={2}>
        {rows.map((row) => (
          <InfoRow key={row.key} label={row.label}>
            {row.value}
          </InfoRow>
        ))}
      </InfoList>
      <div className="mt-5 border-t pt-4">
        <p className="mb-1.5 text-[12.5px] text-muted-foreground">
          Bénéficiaires
        </p>
        <BeneficiaryList items={detail.beneficiaries} />
      </div>
    </>
  )
}

export function AmendmentDetailContent({
  amendmentId,
  backSearch = DEFAULT_LIST_SEARCH,
}: {
  amendmentId: number
  backSearch?: AmendmentListSearch
}) {
  const queryClient = useQueryClient()
  // Droit inconnu = on laisse le serveur trancher : le 403 est traduit (L-005).
  const { can } = usePermissions()
  const [confirm, setConfirm] = useState<'validate' | 'delete' | null>(null)
  const [pdfError, setPdfError] = useState<DocumentError | null>(null)
  const [pdfPending, setPdfPending] = useState(false)
  const [receiptError, setReceiptError] = useState<DocumentError | null>(null)
  const [receiptPending, setReceiptPending] = useState(false)
  const {
    data: amendment,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: amendmentsKeys.detail(amendmentId),
    queryFn: () => getAmendment(amendmentId),
    retry: false,
  })
  // Sans page « fiche contrat » au back-office : on ne sert la fiche que pour
  // retrouver le client (lien vers sa page). Échec silencieux : pas de lien.
  const subscriptionId = amendment?.subscriptionId
  const { data: subscription } = useQuery({
    queryKey: subscriptionsKeys.detail(subscriptionId ?? 0),
    queryFn: () => getSubscription(subscriptionId as number),
    enabled: subscriptionId !== undefined,
    retry: false,
  })

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: amendmentsKeys.all })
  }
  const onActionError = async (actionError: unknown) => {
    const { kind, message } = mapAmendmentError(actionError)
    setConfirm(null)
    toast.error(message)
    // Le dossier a changé de main : on recharge l'état réel.
    if (kind !== 'forbidden' && kind !== 'other') await refresh()
  }
  const validateMutation = useMutation({
    mutationFn: () => validateAmendment(amendmentId),
    onSuccess: async (result) => {
      setConfirm(null)
      // La réponse fait foi : on l'écrit dans le cache avant le rechargement (L-004).
      queryClient.setQueryData<AmendmentDetail>(
        amendmentsKeys.detail(amendmentId),
        (previous) => (previous ? { ...previous, ...result } : previous),
      )
      toast.success(validationOutcome(result))
      await refresh()
    },
    onError: onActionError,
  })
  const deleteMutation = useMutation({
    mutationFn: () => deleteAmendment(amendmentId),
    onSuccess: async () => {
      setConfirm(null)
      toast.success('Modification supprimée.')
      await refresh()
    },
    onError: onActionError,
  })

  const downloadPdf = async (number: number) => {
    if (subscriptionId === undefined) return
    setPdfPending(true)
    setPdfError(null)
    try {
      const blob = await downloadPolicyDocument(subscriptionId, number)
      saveBlob(blob, `Avenant ${number}.pdf`)
    } catch (downloadError) {
      setPdfError(mapPolicyDocumentError(downloadError))
    } finally {
      setPdfPending(false)
    }
  }

  const downloadReceipt = async (receiptNumber: string) => {
    if (subscriptionId === undefined) return
    setReceiptPending(true)
    setReceiptError(null)
    try {
      const blob = await downloadReceiptDocument(subscriptionId, receiptNumber)
      saveBlob(blob, `Quittance ${receiptNumber}.pdf`)
    } catch (downloadError) {
      setReceiptError(mapReceiptDocumentError(downloadError))
    } finally {
      setReceiptPending(false)
    }
  }

  if (isLoading) return <DetailSkeleton kpis={0} />
  if (error || !amendment) {
    const kind = error ? mapAmendmentError(error).kind : 'not-found'
    if (kind === 'forbidden')
      return (
        <StateCard
          backSearch={backSearch}
          tone="error"
          title="Accès refusé."
          description="Vous n’avez pas les droits nécessaires pour consulter cette modification."
        />
      )
    if (kind === 'not-found')
      return (
        <StateCard
          backSearch={backSearch}
          title="Modification introuvable"
          description="Cette modification n’existe pas ou a été supprimée."
        />
      )
    return (
      <StateCard
        backSearch={backSearch}
        tone="error"
        title="Impossible de charger la modification"
        description="Une erreur est survenue. Réessayez dans un instant."
        onRetry={() => void refetch()}
      />
    )
  }

  const product = amendmentProduct(amendment)
  const mayValidate = can('amendment:validate')
  const comparison = showsComparison(amendment.status)
    ? buildComparison(amendment)
    : null
  const receipt = amendment.receipt
  const delta = amendment.delta
  const clientId = subscription?.clientId
  const policy =
    amendment.policyNumber ?? `Contrat n° ${amendment.subscriptionId}`

  return (
    <div className="flex flex-col gap-[18px]">
      <BackLink to="/contrats/modifications" search={backSearch}>
        Retour aux modifications
      </BackLink>
      <DetailHeaderCard
        leading={
          <IconTile>
            <FilePenLine />
          </IconTile>
        }
        title={policy}
        meta={
          <>
            {clientId !== undefined && amendment.clientName ? (
              <Link
                to="/clients/$clientId"
                params={{ clientId: String(clientId) }}
                className="text-primary hover:underline"
              >
                {amendment.clientName}
              </Link>
            ) : (
              <ClientName name={amendment.clientName} />
            )}
            {amendment.amendmentNumber != null &&
              ` · Avenant n° ${amendment.amendmentNumber}`}{' '}
            · Créée le {formatClaimDate(amendment.createdAt, true)}
          </>
        }
        pills={
          <>
            <AmendmentStatusBadge status={amendment.status} />
            <DeltaKindBadge kind={delta.kind} />
            {product && (
              <StatusPill tone="neutral">
                {AMENDMENT_PRODUCT_LABELS[product]}
              </StatusPill>
            )}
          </>
        }
        actions={
          mayValidate &&
          (canValidate(amendment.status) || canDelete(amendment.status)) ? (
            <>
              {canDelete(amendment.status) && (
                <Button
                  variant="outline"
                  className="rounded-[11px] text-destructive"
                  onClick={() => setConfirm('delete')}
                >
                  Supprimer
                </Button>
              )}
              {canValidate(amendment.status) && (
                <Button
                  className="rounded-[11px] shadow-[0_4px_14px_rgba(0,51,127,0.22)]"
                  onClick={() => setConfirm('validate')}
                >
                  Valider
                </Button>
              )}
            </>
          ) : undefined
        }
      />

      {!amendment.tariffChanged && (
        <WarningBanner tone="info">
          Changement administratif : la prime ne change pas.
        </WarningBanner>
      )}
      {amendment.status === 'AWAITING_PAYMENT' && (
        <WarningBanner>
          La quittance est envoyée au client : le contrat change dès son
          paiement (par le client ou par l’agent).
        </WarningBanner>
      )}
      {receipt?.status === 'PAID_NOT_APPLIED' && (
        <WarningBanner tone="danger">
          La quittance a été payée après la suppression de la modification : le
          contrat n’a pas changé. NSIA doit traiter ce paiement.
        </WarningBanner>
      )}

      <div className="grid items-start gap-[18px] @5xl/main:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-[18px]">
          {comparison ? (
            <SectionCard
              title="Avant / après"
              description="Le contrat actuel face à la modification demandée ; les lignes qui changent sont surlignées."
            >
              <ComparisonBlock
                rows={comparison.rows}
                beneficiaries={comparison.beneficiaries}
              />
            </SectionCard>
          ) : (
            <SectionCard title="Modification demandée">
              <RequestedState detail={amendment} />
            </SectionCard>
          )}
        </div>

        <div className="flex flex-col gap-[18px]">
          <SectionCard title="Contrat">
            <InfoList>
              <InfoRow label="N° de police">{amendment.policyNumber}</InfoRow>
              <InfoRow label="Contrat">{`n° ${amendment.subscriptionId}`}</InfoRow>
              <InfoRow label="Référence">{`#${amendment.id}`}</InfoRow>
              <InfoRow label="Client">
                {clientId !== undefined && amendment.clientName ? (
                  <Link
                    to="/clients/$clientId"
                    params={{ clientId: String(clientId) }}
                    className="text-primary hover:underline"
                  >
                    {amendment.clientName}
                  </Link>
                ) : (
                  <ClientName name={amendment.clientName} />
                )}
              </InfoRow>
              <InfoRow label="Créée le">
                {formatClaimDate(amendment.createdAt, true)}
              </InfoRow>
              <InfoRow label="Validée le">
                {amendment.validatedAt
                  ? formatClaimDate(amendment.validatedAt, true)
                  : undefined}
              </InfoRow>
              {amendment.appliedAt && (
                <InfoRow label="Appliquée le">
                  {formatClaimDate(amendment.appliedAt, true)}
                </InfoRow>
              )}
              {amendment.deletedAt && (
                <InfoRow label="Supprimée le">
                  {formatClaimDate(amendment.deletedAt, true)}
                </InfoRow>
              )}
            </InfoList>
          </SectionCard>

          <SectionCard
            title={DELTA_TITLES[delta.kind]}
            description={
              amendment.status === 'DRAFT'
                ? 'Estimation à aujourd’hui : recalculée à la validation.'
                : undefined
            }
          >
            <InfoList columns={2}>
              <InfoRow label="Date d’effet">
                {formatClaimDate(delta.effectiveDate)}
              </InfoRow>
              <InfoRow label="Jours restants">
                {`${delta.remainingDays} / ${delta.termDays} jours`}
              </InfoRow>
              <InfoRow label="Écart net">{formatFcfa(delta.netDelta)}</InfoRow>
              <InfoRow label="Accessoires">{formatFcfa(delta.fees)}</InfoRow>
              <InfoRow label="Taxe">{formatFcfa(delta.tax)}</InfoRow>
              <InfoRow label="Total">{formatFcfa(delta.total)}</InfoRow>
            </InfoList>
          </SectionCard>

          {receipt && (
            <SectionCard title="Quittance">
              <InfoList columns={2}>
                <InfoRow label="N°">{receipt.receiptNumber}</InfoRow>
                <InfoRow label="Type">
                  {RECEIPT_KIND_LABELS[receipt.kind]}
                </InfoRow>
                <InfoRow label="Statut">
                  <ReceiptStatusBadge status={receipt.status} />
                </InfoRow>
                <InfoRow label="Montant net">
                  {formatFcfa(receipt.netAmount)}
                </InfoRow>
                <InfoRow label="Accessoires">
                  {formatFcfa(receipt.fees)}
                </InfoRow>
                <InfoRow label="Taxe">{formatFcfa(receipt.tax)}</InfoRow>
                <InfoRow label="Total">{formatFcfa(receipt.total)}</InfoRow>
                <InfoRow label="Date d’effet">
                  {formatClaimDate(receipt.effectiveDate)}
                </InfoRow>
                <InfoRow label="Expire le">
                  {formatClaimDate(receipt.expiryDate)}
                </InfoRow>
              </InfoList>
              <div className="mt-4">
                {isReceiptDownloadable(receipt) ? (
                  <>
                    <Button
                      variant="outline"
                      className="rounded-[11px]"
                      disabled={receiptPending}
                      onClick={() =>
                        void downloadReceipt(receipt.receiptNumber)
                      }
                    >
                      <Download />
                      {receiptPending
                        ? 'Téléchargement…'
                        : receiptError?.retry
                          ? 'Réessayer'
                          : 'Télécharger la quittance'}
                    </Button>
                    {receiptError && (
                      <p role="alert" className="mt-2 text-sm text-destructive">
                        {receiptError.message}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-[13px] text-muted-foreground">
                    {receiptPdfNote(receipt)}
                  </p>
                )}
              </div>
            </SectionCard>
          )}

          {amendment.amendmentNumber != null && (
            <SectionCard title="Document">
              <Button
                variant="outline"
                className="rounded-[11px]"
                disabled={pdfPending}
                onClick={() =>
                  void downloadPdf(amendment.amendmentNumber as number)
                }
              >
                <Download />
                {pdfPending
                  ? 'Téléchargement…'
                  : pdfError?.retry
                    ? 'Réessayer'
                    : `Avenant n° ${amendment.amendmentNumber}`}
              </Button>
              {pdfError && (
                <p role="alert" className="mt-2 text-sm text-destructive">
                  {pdfError.message}
                </p>
              )}
            </SectionCard>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirm === 'validate'}
        title="Valider la modification"
        description={validateConfirmation(delta)}
        confirmLabel="Valider"
        pending={validateMutation.isPending}
        onConfirm={() => validateMutation.mutate()}
        onOpenChange={(open) => !open && setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === 'delete'}
        title="Supprimer la modification"
        description={deleteConfirmation(amendment.status)}
        confirmLabel="Supprimer"
        destructive
        pending={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onOpenChange={(open) => !open && setConfirm(null)}
      />
    </div>
  )
}

function AmendmentDetailRoute() {
  const { amendmentId } = Route.useParams()
  const backSearch = Route.useSearch()
  const id = Number(amendmentId)
  return (
    <AmendmentsGate>
      {Number.isSafeInteger(id) && id > 0 ? (
        <AmendmentDetailContent amendmentId={id} backSearch={backSearch} />
      ) : (
        <StateCard
          backSearch={backSearch}
          title="Identifiant de modification invalide."
          description="Vérifiez l’adresse de la page ou revenez à la liste."
        />
      )}
    </AmendmentsGate>
  )
}
