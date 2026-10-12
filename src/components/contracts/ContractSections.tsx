import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, FileText } from 'lucide-react'
import { StatusPill } from '#/components/dashboard/StatusPill'
import { SectionCard } from '#/components/layout/SectionCard'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import {
  mapPolicyDocumentError,
  mapReceiptDocumentError,
} from '#/lib/amendments'
import { isForbidden } from '#/lib/api-error'
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
  getSubscriptionRenewal,
  subscriptionsKeys,
} from '#/services/subscriptions'
import type { SubscriptionDetailResponse } from '#/services/subscriptions'

/** Ligne « nom du document + Télécharger », avec son erreur éventuelle dessous. */
export function DownloadRow({
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
 * Signature et pièces d'identité : état seulement — les images sont réservées
 * au client et à son vendeur.
 */
export function SignatureCard({
  contract,
}: {
  contract: SubscriptionDetailResponse
}) {
  return (
    <SectionCard title="Signature et pièces d’identité">
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
        Les images de la signature et des pièces sont réservées au client et à
        son vendeur. La signature figure sur le PDF de la police.
      </p>
    </SectionCard>
  )
}

/** PDF de la police et de ses avenants (IA, MRH). */
export function DocumentsCard({
  contract,
}: {
  contract: SubscriptionDetailResponse
}) {
  const documents = contractDocuments(contract)
  return (
    <SectionCard title="Documents du contrat">
      {documents.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">
          La police est émise après le paiement et la signature du contrat.
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
    </SectionCard>
  )
}

/** Quittances retrouvables : modifications appliquées et dernier renouvellement. */
export function ReceiptsCard({ subscriptionId }: { subscriptionId: number }) {
  const renewal = useQuery({
    queryKey: subscriptionsKeys.renewal(subscriptionId),
    queryFn: () => getSubscriptionRenewal(subscriptionId),
    retry: false,
  })
  const applied = useQuery({
    queryKey: amendmentsKeys.allApplied,
    queryFn: getAllAppliedAmendments,
    staleTime: 60_000,
    retry: false,
  })

  // Chaque source compte seule : un rôle sans `amendment:read-all` (403 sur
  // les modifications) garde la quittance de renouvellement, et inversement.
  const receipts = contractReceipts(
    subscriptionId,
    applied.data?.items ?? [],
    renewal.data?.receipt,
  )
  const receiptsLoading = applied.isPending || renewal.isPending
  const amendmentsForbidden = applied.isError && isForbidden(applied.error)
  const amendmentsFailed = applied.isError && !amendmentsForbidden

  return (
    <SectionCard title="Quittances">
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
                  subscriptionId,
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
          Les quittances des modifications demandent le droit de consulter les
          modifications de contrat.
        </p>
      )}
      {applied.data?.capped && (
        <p className="mt-3 text-[12px] text-muted-foreground">
          Au-delà de 2 000 modifications appliquées, seules les 2 000
          modifications les plus récentes sont examinées.
        </p>
      )}
      <p className="mt-3 text-[12px] text-muted-foreground">
        Quittances des modifications appliquées et du dernier renouvellement :
        le serveur ne liste pas encore toutes les quittances d’un contrat.
      </p>
    </SectionCard>
  )
}
