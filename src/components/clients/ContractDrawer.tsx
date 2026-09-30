import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, FileText, TriangleAlert, X } from 'lucide-react'
import { StatusPill } from '#/components/dashboard/StatusPill'
import { EmptyState } from '#/components/layout/EmptyState'
import { Button } from '#/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'
import { Skeleton } from '#/components/ui/skeleton'
import {
  mapPolicyDocumentError,
  mapReceiptDocumentError,
} from '#/lib/amendments'
import { apiErrorMessage, isForbidden } from '#/lib/api-error'
import { saveBlob } from '#/lib/download'
import {
  contractDocuments,
  contractReceipts,
  describeIdentityDocument,
  policyDocumentFileName,
} from '#/lib/contract-documents'
import { formatFcfa } from '#/lib/utils'
import {
  downloadPolicyDocument,
  downloadReceiptDocument,
  amendmentsKeys,
  getAllAppliedAmendments,
} from '#/services/amendments'
import {
  getSubscription,
  getSubscriptionRenewal,
  subscriptionsKeys,
} from '#/services/subscriptions'
import {
  SUBSCRIPTION_STATUS_LABELS,
  SUBSCRIPTION_TONES,
} from '#/services/subscriptions-by-client'

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="border-b px-[26px] py-5 last:border-b-0">
      <h3 className="mb-3 text-[13.5px] font-bold">{title}</h3>
      {children}
    </section>
  )
}

/** Ligne « nom du document + Télécharger », avec son erreur éventuelle dessous. */
function DownloadRow({
  label,
  detail,
  ariaLabel,
  download,
  mapError,
}: {
  label: string
  detail?: string
  ariaLabel: string
  download: () => Promise<void>
  mapError: (err: unknown) => { message: string }
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <li className="py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <div className="text-[13.5px] font-semibold break-words">
              {label}
            </div>
            {detail && (
              <div className="text-[12px] text-muted-foreground tabular-nums">
                {detail}
              </div>
            )}
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 rounded-[10px]"
          aria-label={ariaLabel}
          disabled={pending}
          onClick={() => {
            setPending(true)
            setError(null)
            download()
              .catch((err: unknown) => setError(mapError(err).message))
              .finally(() => setPending(false))
          }}
        >
          <Download className="size-3.5" />
          {pending ? 'Téléchargement…' : 'Télécharger'}
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-[12.5px] text-destructive">
          {error}
        </p>
      )}
    </li>
  )
}

/**
 * Panneau d'un contrat ouvert depuis la fiche client : signature et pièces
 * d'identité (état seulement — les images sont réservées au client et à son
 * vendeur), PDF de la police et des avenants, quittances retrouvables.
 */
export function ContractDrawer({
  subscriptionId,
  onClose,
}: {
  subscriptionId: number | null
  onClose: () => void
}) {
  // Garde le dernier contrat pendant l'animation de fermeture.
  const [shownId, setShownId] = useState(subscriptionId)
  useEffect(() => {
    if (subscriptionId !== null) setShownId(subscriptionId)
  }, [subscriptionId])
  const id = subscriptionId ?? shownId

  const detail = useQuery({
    queryKey: subscriptionsKeys.detail(id ?? 0),
    queryFn: () => getSubscription(id ?? 0),
    enabled: id !== null,
    retry: false,
  })
  const renewal = useQuery({
    queryKey: subscriptionsKeys.renewal(id ?? 0),
    queryFn: () => getSubscriptionRenewal(id ?? 0),
    enabled: id !== null,
    retry: false,
  })
  const applied = useQuery({
    queryKey: amendmentsKeys.allApplied,
    queryFn: getAllAppliedAmendments,
    enabled: id !== null,
    staleTime: 60_000,
    retry: false,
  })

  const contract = detail.data
  const documents = contract ? contractDocuments(contract) : []
  // Chaque source compte seule : un rôle sans `amendment:read-all` (403 sur
  // les modifications) garde la quittance de renouvellement, et inversement.
  const receipts =
    id !== null
      ? contractReceipts(id, applied.data?.items ?? [], renewal.data?.receipt)
      : []
  const receiptsLoading = applied.isPending || renewal.isPending
  const amendmentsForbidden = applied.isError && isForbidden(applied.error)
  const amendmentsFailed = applied.isError && !amendmentsForbidden

  return (
    <Sheet
      open={subscriptionId !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <SheetContent
        side="right"
        showCloseButton={false}
        size="md"
        className="gap-0 overflow-y-auto p-0"
      >
        <SheetHeader className="flex-row items-start justify-between gap-3.5 border-b p-[26px] py-[22px]">
          <div className="min-w-0">
            <div className="mb-[3px] text-[11.5px] font-bold tracking-[0.06em] text-muted-foreground uppercase">
              Contrat
            </div>
            <SheetTitle className="text-[19px] font-extrabold tracking-[-0.02em] break-words">
              {contract?.policyNumber?.trim() ||
                (id !== null ? `Contrat #${id}` : 'Contrat')}
            </SheetTitle>
            <SheetDescription className="mt-1 flex flex-wrap items-center gap-2 text-[13px]">
              {contract?.productSnapshot?.productLabel && (
                <span>{contract.productSnapshot.productLabel}</span>
              )}
              {contract && (
                <StatusPill tone={SUBSCRIPTION_TONES[contract.status]}>
                  {SUBSCRIPTION_STATUS_LABELS[contract.status]}
                </StatusPill>
              )}
            </SheetDescription>
          </div>
          <SheetClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Fermer"
            >
              <X className="size-4" />
            </Button>
          </SheetClose>
        </SheetHeader>

        {detail.isPending ? (
          <div className="flex flex-col gap-3 p-[26px]">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        ) : detail.isError || !contract ? (
          <div className="p-[26px]">
            <EmptyState
              icon={TriangleAlert}
              tone="error"
              title="Impossible de charger le contrat."
              description={apiErrorMessage(detail.error)}
              action={
                <Button
                  variant="outline"
                  className="rounded-[11px]"
                  onClick={() => void detail.refetch()}
                >
                  Réessayer
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <Section title="Signature et pièces d’identité">
              <div className="mb-3">
                <StatusPill tone={contract.signed ? 'success' : 'warning'}>
                  {contract.signed ? 'Signé' : 'Non signé'}
                </StatusPill>
              </div>
              {contract.identityDocuments.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">
                  Aucune pièce fournie
                </p>
              ) : (
                <ul className="flex flex-col gap-1 text-[13.5px]">
                  {contract.identityDocuments.map((doc) => (
                    <li key={doc.type}>{describeIdentityDocument(doc)}</li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-[12px] text-muted-foreground">
                Les images de la signature et des pièces sont réservées au
                client et à son vendeur. La signature figure sur le PDF de la
                police.
              </p>
            </Section>

            <Section title="Documents du contrat">
              {documents.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">
                  La police est émise après le paiement et la signature du
                  contrat.
                </p>
              ) : (
                <ul className="divide-y">
                  {documents.map((doc) => (
                    <DownloadRow
                      key={doc.amendment}
                      label={doc.label}
                      ariaLabel={`Télécharger ${doc.label}`}
                      mapError={mapPolicyDocumentError}
                      download={async () => {
                        const blob = await downloadPolicyDocument(
                          contract.id,
                          doc.amendment,
                        )
                        saveBlob(
                          blob,
                          policyDocumentFileName(
                            contract.policyNumber ?? `contrat-${contract.id}`,
                            doc.amendment,
                          ),
                        )
                      }}
                    />
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Quittances">
              {receiptsLoading ? (
                <Skeleton className="h-5 w-2/3" />
              ) : receipts.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">
                  Aucune quittance disponible.
                </p>
              ) : (
                <ul className="divide-y">
                  {receipts.map((r) => (
                    <DownloadRow
                      key={r.receiptNumber}
                      label={r.label}
                      detail={`${r.receiptNumber} · ${formatFcfa(Math.abs(r.total))}`}
                      ariaLabel={`Télécharger la quittance ${r.receiptNumber}`}
                      mapError={mapReceiptDocumentError}
                      download={async () => {
                        const blob = await downloadReceiptDocument(
                          contract.id,
                          r.receiptNumber,
                        )
                        saveBlob(blob, `Quittance ${r.receiptNumber}.pdf`)
                      }}
                    />
                  ))}
                </ul>
              )}
              {amendmentsFailed && (
                <p role="alert" className="mt-3 text-[12.5px] text-destructive">
                  Impossible de charger les quittances des modifications.{' '}
                  <button
                    type="button"
                    className="font-semibold underline"
                    onClick={() => void applied.refetch()}
                  >
                    Réessayer
                  </button>
                </p>
              )}
              {renewal.isError && (
                <p role="alert" className="mt-3 text-[12.5px] text-destructive">
                  Impossible de charger la quittance de renouvellement.
                </p>
              )}
              {amendmentsForbidden && (
                <p className="mt-3 text-[12px] text-muted-foreground">
                  Les quittances des modifications demandent le droit de
                  consulter les modifications de contrat.
                </p>
              )}
              {applied.data?.capped && (
                <p className="mt-3 text-[12px] text-muted-foreground">
                  Au-delà de 2 000 modifications appliquées, seules les 2 000
                  modifications les plus récentes sont examinées.
                </p>
              )}
              <p className="mt-3 text-[12px] text-muted-foreground">
                Quittances des modifications appliquées et du dernier
                renouvellement : le serveur ne liste pas encore toutes les
                quittances d’un contrat.
              </p>
            </Section>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
