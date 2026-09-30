import { RECEIPT_KIND_LABELS, isReceiptDownloadable } from '#/lib/amendments'
import type { AmendmentListItem } from '#/lib/amendments'
import type {
  IdentityDocumentStatus,
  IdentityDocumentType,
  RenewalReceipt,
} from '#/services/subscriptions'

export const IDENTITY_DOCUMENT_LABELS: Record<IdentityDocumentType, string> = {
  NATIONAL_ID: 'Carte nationale d’identité',
  PASSPORT: 'Passeport',
  DRIVING_LICENSE: 'Permis de conduire',
  CONSULAR_CARD: 'Carte consulaire',
  RCCM: 'Registre du commerce (RCCM)',
}

/** « Carte nationale d’identité — recto et verso ». */
export function describeIdentityDocument(doc: IdentityDocumentStatus): string {
  const sides =
    doc.front && doc.back
      ? 'recto et verso'
      : doc.front
        ? 'recto seulement'
        : 'verso seulement'
  return `${IDENTITY_DOCUMENT_LABELS[doc.type]} — ${sides}`
}

export interface ContractDocument {
  /** Paramètre `amendment` de `GET /subscriptions/{id}/policy-document`. */
  amendment: number
  label: string
}

/**
 * PDF d'un contrat : la police (avenant 0), puis un avenant par numéro jusqu'à
 * `amendmentNumber`. Rien tant que la police n'est pas émise (`policyNumber`
 * nul : contrat pas encore payé et signé).
 */
export function contractDocuments(detail: {
  policyNumber?: string | null
  amendmentNumber: number
}): ContractDocument[] {
  if (!detail.policyNumber) return []
  return Array.from({ length: detail.amendmentNumber + 1 }, (_, n) => ({
    amendment: n,
    label: n === 0 ? 'Police' : `Avenant n° ${n}`,
  }))
}

export function policyDocumentFileName(
  policyNumber: string,
  amendment: number,
): string {
  return amendment === 0
    ? `Police ${policyNumber}.pdf`
    : `Avenant ${amendment} — ${policyNumber}.pdf`
}

export interface ContractReceipt {
  receiptNumber: string
  label: string
  total: number
}

/**
 * Quittances téléchargeables d'un contrat : celles des modifications
 * appliquées de ce contrat dont le PDF existe, puis celle du dernier
 * renouvellement payé (dont le PDF est émis). Le backend n'a pas de liste des
 * quittances d'un contrat : ce sont les seules qu'on sait retrouver.
 */
export function contractReceipts(
  subscriptionId: number,
  amendments: AmendmentListItem[],
  renewal: RenewalReceipt | null | undefined,
): ContractReceipt[] {
  const receipts: ContractReceipt[] = []
  for (const a of amendments) {
    if (a.subscriptionId !== subscriptionId || !a.receipt) continue
    if (!isReceiptDownloadable(a.receipt)) continue
    receipts.push({
      receiptNumber: a.receipt.receiptNumber,
      label: `${RECEIPT_KIND_LABELS[a.receipt.kind]} — modification n° ${a.id}`,
      total: a.receipt.total,
    })
  }
  if (renewal && renewal.status === 'PAID' && renewal.documentId != null) {
    receipts.push({
      receiptNumber: renewal.receiptNumber,
      label: 'Renouvellement',
      total: renewal.total,
    })
  }
  return receipts
}
