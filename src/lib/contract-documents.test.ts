import { describe, expect, it } from 'vitest'
import {
  contractDocuments,
  contractReceipts,
  describeIdentityDocument,
  policyDocumentFileName,
} from './contract-documents'
import type { AmendmentListItem } from '#/lib/amendments'

describe('contractDocuments', () => {
  it('police puis un avenant par numéro, jusqu’à amendmentNumber', () => {
    expect(
      contractDocuments({ policyNumber: 'IA-2026-000042', amendmentNumber: 2 }),
    ).toEqual([
      { amendment: 0, label: 'Police' },
      { amendment: 1, label: 'Avenant n° 1' },
      { amendment: 2, label: 'Avenant n° 2' },
    ])
  })
  it('aucun document tant que la police n’est pas émise', () => {
    expect(
      contractDocuments({ policyNumber: null, amendmentNumber: 0 }),
    ).toEqual([])
  })
})

describe('policyDocumentFileName', () => {
  it('nomme la police et les avenants', () => {
    expect(policyDocumentFileName('IA-2026-000042', 0)).toBe(
      'Police IA-2026-000042.pdf',
    )
    expect(policyDocumentFileName('IA-2026-000042', 3)).toBe(
      'Avenant 3 — IA-2026-000042.pdf',
    )
  })
})

describe('describeIdentityDocument', () => {
  it('type et faces fournies', () => {
    expect(
      describeIdentityDocument({
        type: 'NATIONAL_ID',
        front: true,
        back: true,
      }),
    ).toBe('Carte nationale d’identité — recto et verso')
    expect(
      describeIdentityDocument({ type: 'PASSPORT', front: true, back: false }),
    ).toBe('Passeport — recto seulement')
    expect(
      describeIdentityDocument({ type: 'RCCM', front: false, back: true }),
    ).toBe('Registre du commerce (RCCM) — verso seulement')
  })
})

function amendment(
  id: number,
  subscriptionId: number,
  receipt: AmendmentListItem['receipt'],
): AmendmentListItem {
  return { id, subscriptionId, status: 'APPLIED', receipt } as AmendmentListItem
}

describe('contractReceipts', () => {
  it('garde les quittances des modifications appliquées de ce contrat dont le PDF existe, et la quittance de renouvellement payée', () => {
    const receipts = contractReceipts(
      7,
      [
        amendment(1, 7, {
          receiptNumber: 'Q-1',
          kind: 'REFUND',
          status: 'TO_REFUND',
          total: -5000,
        } as never),
        // Autre contrat.
        amendment(2, 8, {
          receiptNumber: 'Q-2',
          kind: 'REFUND',
          status: 'TO_REFUND',
          total: -1,
        } as never),
        // Appel à payer non payé : pas de PDF.
        amendment(3, 7, {
          receiptNumber: 'Q-3',
          kind: 'SUPPLEMENTARY_CALL',
          status: 'TO_PAY',
          total: 2000,
        } as never),
        amendment(4, 7, null),
      ],
      { receiptNumber: 'Q-9', status: 'PAID', total: 30000, documentId: 12 },
    )
    expect(receipts).toEqual([
      {
        receiptNumber: 'Q-1',
        label: 'Ristourne — modification n° 1',
        total: -5000,
      },
      { receiptNumber: 'Q-9', label: 'Renouvellement', total: 30000 },
    ])
  })

  it('quittance de renouvellement sans PDF (documentId nul) ignorée', () => {
    expect(
      contractReceipts(7, [], {
        receiptNumber: 'Q-9',
        status: 'PAID',
        total: 1,
        documentId: null,
      }),
    ).toEqual([])
  })
})
