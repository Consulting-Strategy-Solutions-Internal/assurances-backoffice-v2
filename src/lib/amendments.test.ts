import { describe, expect, it } from 'vitest'
import { formatFcfa } from '#/lib/utils'
import {
  amendmentProduct,
  buildComparison,
  buildRequestedRows,
  canDelete,
  canValidate,
  deleteConfirmation,
  mapAmendmentError,
  taxSignNote,
  totalSignWarning,
  isReceiptDownloadable,
  mapPolicyDocumentError,
  mapReceiptDocumentError,
  receiptPdfNote,
  sameBeneficiaries,
  showsComparison,
  validateConfirmation,
  validationOutcome,
} from './amendments'
import type { AmendmentDetail } from './amendments'
import {
  appliedUnchanged,
  asAmendment,
  awaitingPayment,
  draftIncrease,
  draftRefund,
  draftUnchanged,
  mrhDraftIncrease,
  mrhDraftRefundTaxUp,
  mrhDraftRefundTotalPositive,
  toRefundReceipt,
} from './amendments.fixtures'

const axiosError = (status: number, data?: unknown) => ({
  isAxiosError: true,
  response: { status, data },
})

describe('amendmentProduct', () => {
  it('reads the product from the snapshot', () => {
    expect(amendmentProduct(draftUnchanged)).toBe('IA_STANDARD')
    expect(
      amendmentProduct({
        formulaSnapshot: { formulaId: 1, label: 'Formule 1' },
        riskClassSnapshot: null,
      }),
    ).toBe('IA_FOR_ALL')
    expect(
      amendmentProduct({ formulaSnapshot: null, riskClassSnapshot: null }),
    ).toBeNull()
  })
})

describe('status gates', () => {
  it('shows the comparison for DRAFT and AWAITING_PAYMENT only', () => {
    expect(showsComparison('DRAFT')).toBe(true)
    expect(showsComparison('AWAITING_PAYMENT')).toBe(true)
    expect(showsComparison('APPLIED')).toBe(false)
    expect(showsComparison('DELETED')).toBe(false)
  })

  it('validates DRAFT only, deletes DRAFT or AWAITING_PAYMENT', () => {
    expect(canValidate('DRAFT')).toBe(true)
    expect(canValidate('AWAITING_PAYMENT')).toBe(false)
    expect(canDelete('DRAFT')).toBe(true)
    expect(canDelete('AWAITING_PAYMENT')).toBe(true)
    expect(canDelete('APPLIED')).toBe(false)
    expect(canDelete('DELETED')).toBe(false)
  })
})

describe('buildComparison', () => {
  it('flags only the rows that change (phone-only amendment)', () => {
    const { rows, beneficiaries } = buildComparison(draftUnchanged)
    const changed = rows.filter((row) => row.changed).map((row) => row.key)
    expect(changed).toEqual(['phone'])
    expect(beneficiaries?.changed).toBe(false)
  })

  it('compares class, capitals, modifiers and premium for IA Standard', () => {
    const { rows } = buildComparison(draftIncrease)
    const byKey = Object.fromEntries(rows.map((row) => [row.key, row]))
    expect(byKey.class.before).toContain('Classe 1')
    expect(byKey.class.after).toContain('Classe 2')
    expect(byKey.death.before).toBe(formatFcfa(100000))
    expect(byKey.death.after).toBe(formatFcfa(200000))
    expect(byKey.modifiers.before).toBe("Pratique d'un sport dangereux")
    expect(byKey.modifiers.after).toBe('Aucune')
    expect(byKey.premium.changed).toBe(true)
    expect(byKey.reduction.changed).toBe(false)
  })

  it('rounds every amount to the franc', () => {
    const detail: AmendmentDetail = {
      ...draftUnchanged,
      grossPremium: 294.4,
      current: { ...draftUnchanged.current, totalPremium: 293.6 },
    }
    const premium = buildComparison(detail).rows.find(
      (row) => row.key === 'premium',
    )
    expect(premium?.before).toBe(formatFcfa(294))
    expect(premium?.after).toBe(formatFcfa(294))
    expect(premium?.changed).toBe(false)
  })

  it('builds formula rows for IA Pour Tous', () => {
    const detail: AmendmentDetail = {
      ...draftUnchanged,
      riskClassSnapshot: null,
      formulaSnapshot: {
        formulaId: 12,
        label: 'Formule Confort',
        deathCapital: 500000,
        permanentDisabilityCapital: 500000,
        medicalExpenses: 100000,
        dailyAllowance: 5000,
      },
      current: {
        ...draftUnchanged.current,
        riskClassSnapshot: null,
        formulaSnapshot: {
          formulaId: 11,
          label: 'Formule Essentiel',
          deathCapital: 250000,
          permanentDisabilityCapital: 250000,
          medicalExpenses: 100000,
          dailyAllowance: null,
        },
      },
    }
    const { rows } = buildComparison(detail)
    const byKey = Object.fromEntries(rows.map((row) => [row.key, row]))
    expect(byKey.formula).toMatchObject({
      before: 'Formule Essentiel',
      after: 'Formule Confort',
      changed: true,
    })
    expect(byKey.medical.changed).toBe(false)
    expect(byKey.daily.before).toBe('—')
    expect(byKey.class).toBeUndefined()
  })

  it('detects changed beneficiaries regardless of order', () => {
    const all = draftUnchanged.beneficiaries ?? []
    const [first, ...rest] = all
    expect(sameBeneficiaries([first, ...rest], [...rest, first])).toBe(true)
    expect(
      sameBeneficiaries(all, [{ ...first, sharePercent: 50 }, ...rest]),
    ).toBe(false)
  })

  it('lists the requested state only (no « before ») for applied amendments', () => {
    const rows = buildRequestedRows(appliedUnchanged)
    expect(rows.find((row) => row.key === 'phone')?.value).toBe(
      appliedUnchanged.insuredPhone,
    )
    expect(rows[0]).not.toHaveProperty('before')
  })
})

describe('validateConfirmation', () => {
  it('announces an immediate application when nothing changes', () => {
    expect(validateConfirmation(draftUnchanged.delta)).toContain(
      'L’avenant sera appliqué immédiatement.',
    )
  })

  it('announces the refund amount as a positive figure', () => {
    const text = validateConfirmation(draftRefund.delta)
    expect(text).toContain(
      `une ristourne de ${formatFcfa(8000)} sera à rembourser au client`,
    )
    expect(text).not.toContain('-')
  })

  it('announces the receipt to pay for an increase', () => {
    expect(validateConfirmation(draftIncrease.delta)).toContain(
      `Une quittance de ${formatFcfa(12345)} sera envoyée au client. Le contrat changera après son paiement.`,
    )
  })

  it('always recalls the recomputation rule', () => {
    for (const { delta } of [draftUnchanged, draftRefund, draftIncrease]) {
      expect(validateConfirmation(delta)).toContain(
        'seul le nombre de jours restants change, pas la prime annuelle.',
      )
    }
  })
})

describe('validationOutcome (server response is authoritative)', () => {
  it('uses the receipt total of the response', () => {
    const response = {
      ...asAmendment(awaitingPayment),
      receipt: { ...awaitingPayment.receipt!, total: 13000 },
    }
    expect(validationOutcome(response)).toContain(formatFcfa(13000))
  })

  it('mentions the amendment number and the refund', () => {
    const refunded = {
      ...asAmendment(draftRefund),
      status: 'APPLIED' as const,
      amendmentNumber: 2,
      receipt: toRefundReceipt,
    }
    const text = validationOutcome(refunded)
    expect(text).toContain('avenant n° 2')
    expect(text).toContain(`Ristourne de ${formatFcfa(8000)}`)
  })
})

describe('deleteConfirmation', () => {
  it('warns about the cancelled receipt for AWAITING_PAYMENT', () => {
    expect(deleteConfirmation('AWAITING_PAYMENT')).toContain(
      'La quittance sera annulée et le client ne pourra plus la payer.',
    )
    expect(deleteConfirmation('DRAFT')).not.toContain('quittance')
  })
})

describe('mapAmendmentError', () => {
  it.each([
    [
      'AMENDMENT_NOT_DRAFT',
      'not-draft',
      'Cette modification a déjà été traitée.',
    ],
    [
      'SUBSCRIPTION_NOT_AMENDABLE',
      'not-amendable',
      'Le contrat ne peut plus être modifié (inactif, échu ou résilié).',
    ],
    [
      'AMENDMENT_ALREADY_APPLIED',
      'already-applied',
      'Modification déjà appliquée : suppression impossible.',
    ],
  ])('translates %s', (code, kind, message) => {
    expect(
      mapAmendmentError(axiosError(422, { errors: { status: code } })),
    ).toEqual({ kind, message })
  })

  it('translates 404 and 403', () => {
    expect(mapAmendmentError(axiosError(404))).toEqual({
      kind: 'not-found',
      message: 'Modification introuvable.',
    })
    expect(mapAmendmentError(axiosError(403))).toEqual({
      kind: 'forbidden',
      message: 'Vous n’avez pas le droit d’effectuer cette action.',
    })
  })

  it('falls back to the generic API message', () => {
    expect(mapAmendmentError(axiosError(500)).kind).toBe('other')
    expect(mapAmendmentError(new Error('x')).message).toBe(
      'Impossible de contacter le serveur.',
    )
  })
})

describe('mapPolicyDocumentError', () => {
  it('asks to retry when the PDF is not issued yet (404)', () => {
    const result = mapPolicyDocumentError(axiosError(404))
    expect(result.retry).toBe(true)
    expect(result.message).toContain('pas encore disponible')
  })

  it('reports unavailable storage (502)', () => {
    expect(mapPolicyDocumentError(axiosError(502)).message).toContain(
      'Stockage des documents momentanément indisponible',
    )
  })

  it('does not offer a retry on 403', () => {
    expect(mapPolicyDocumentError(axiosError(403)).retry).toBe(false)
  })
})

describe('isReceiptDownloadable', () => {
  it.each([
    ['REFUND', 'TO_REFUND', true],
    ['SUPPLEMENTARY_CALL', 'PAID', true],
    ['SUPPLEMENTARY_CALL', 'TO_PAY', false],
    ['SUPPLEMENTARY_CALL', 'CANCELLED', false],
    ['SUPPLEMENTARY_CALL', 'PAID_NOT_APPLIED', false],
    ['REFUND', 'CANCELLED', false],
  ] as const)('%s / %s → %s', (kind, status, expected) => {
    expect(isReceiptDownloadable({ kind, status })).toBe(expected)
  })

  it('explains the missing PDF', () => {
    expect(
      receiptPdfNote({ kind: 'SUPPLEMENTARY_CALL', status: 'TO_PAY' }),
    ).toBe('PDF disponible après le paiement')
    expect(receiptPdfNote({ kind: 'REFUND', status: 'CANCELLED' })).toContain(
      'Pas de PDF',
    )
    expect(receiptPdfNote({ kind: 'REFUND', status: 'TO_REFUND' })).toBeNull()
  })
})

describe('mapReceiptDocumentError', () => {
  const err = (status: number, message?: string) =>
    axiosError(status, message ? { status, message } : undefined)

  it('reads the 404 message, not only the status', () => {
    expect(
      mapReceiptDocumentError(
        err(404, 'The receipt document is not issued yet'),
      ),
    ).toEqual({
      retry: true,
      message:
        'Quittance en cours de production, réessayez dans quelques minutes.',
    })
    expect(
      mapReceiptDocumentError(err(404, 'Receipt not found: Q-2026-000011')),
    ).toEqual({ retry: false, message: 'Quittance introuvable.' })
    expect(
      mapReceiptDocumentError(err(404, 'Subscription not found with id: 402')),
    ).toEqual({ retry: false, message: 'Contrat introuvable.' })
  })

  it('maps 403 and 502, and falls back to a generic retryable message', () => {
    expect(mapReceiptDocumentError(err(403))).toEqual({
      retry: false,
      message: 'Accès refusé.',
    })
    expect(mapReceiptDocumentError(err(502))).toEqual({
      retry: true,
      message: 'Service de documents indisponible, réessayez.',
    })
    // 404 sans message connu (ancienne démo : « Resource not found »).
    expect(
      mapReceiptDocumentError(err(404, 'Resource not found')),
    ).toMatchObject({
      retry: true,
      message: expect.stringContaining('Impossible'),
    })
    expect(mapReceiptDocumentError(new Error('boom')).retry).toBe(true)
  })
})

describe('mapPolicyDocumentError by message', () => {
  it('keeps the « not issued yet » message with retry', () => {
    const result = mapPolicyDocumentError(
      axiosError(404, { message: 'The policy document is not issued yet' }),
    )
    expect(result.retry).toBe(true)
    expect(result.message).toContain('pas encore disponible')
  })

  it('says « Contrat introuvable » without retry for an unknown subscription', () => {
    expect(
      mapPolicyDocumentError(
        axiosError(404, { message: 'Subscription not found with id: 402' }),
      ),
    ).toEqual({ retry: false, message: 'Contrat introuvable.' })
  })
})

describe('400 on a PDF download', () => {
  it('gives a generic message without retry (receipt and policy)', () => {
    const receipt = mapReceiptDocumentError(axiosError(400))
    expect(receipt.retry).toBe(false)
    expect(receipt.message).toContain('invalide')
    const policy = mapPolicyDocumentError(axiosError(400))
    expect(policy.retry).toBe(false)
    expect(policy.message).toContain('invalide')
  })
})

describe('avenants MRH', () => {
  it('AC-1 : produit MRH Standard lu dans le bloc mrh', () => {
    expect(amendmentProduct(mrhDraftIncrease)).toBe('MRH_STANDARD')
  })

  it('AC-2 : avant/après MRH — contenu, loyer, pièces, garanties, prime ; sans téléphone ni bénéficiaires', () => {
    const { rows, beneficiaries } = buildComparison(mrhDraftIncrease)
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r]))
    expect(Object.keys(byKey)).toEqual([
      'situation',
      'contents',
      'rent',
      'rentalRisks',
      'rooms',
      'warranties',
      'premium',
    ])
    expect(byKey.situation).toMatchObject({
      before: 'Locataire',
      after: 'Locataire',
      changed: false,
    })
    expect(byKey.contents.changed).toBe(true)
    expect(byKey.contents.after).toBe(formatFcfa(6000000))
    expect(byKey.rent.changed).toBe(false)
    expect(byKey.rooms).toMatchObject({
      before: '4',
      after: '5',
      changed: true,
    })
    expect(byKey.warranties).toMatchObject({
      before: 'Dégâts des eaux, Incendie',
      after: 'Incendie, Vol par effraction',
      changed: true,
    })
    expect(byKey.premium.after).toBe(formatFcfa(32371))
    expect(beneficiaries).toBeNull()
  })

  it('AC-2 : bâtiment affiché seulement s’il existe d’un côté', () => {
    const { rows } = buildComparison(mrhDraftIncrease)
    expect(rows.some((r) => r.key === 'building')).toBe(false)
  })

  it('état demandé seul (appliqué) : lignes MRH', () => {
    const rows = buildRequestedRows({ ...mrhDraftIncrease, status: 'APPLIED' })
    expect(rows.find((r) => r.key === 'rooms')?.value).toBe('5')
  })

  it('AC-3 : note quand la taxe est de signe opposé à l’écart net (D13)', () => {
    expect(taxSignNote(mrhDraftRefundTaxUp.delta)).toMatch(/25 % et 14,5 %/)
    expect(taxSignNote(mrhDraftIncrease.delta)).toBeNull()
    expect(
      taxSignNote({ ...mrhDraftIncrease.delta, netDelta: 0, tax: 0 }),
    ).toBeNull()
  })

  it('R1 : total de signe opposé à l’écart net → alerte et confirmation qui le dit', () => {
    expect(totalSignWarning(mrhDraftRefundTaxUp.delta)).toBeNull()
    const warning = totalSignWarning(mrhDraftRefundTotalPositive.delta)
    expect(warning).toMatch(/total/)
    expect(warning).toContain(formatFcfa(340))
    const text = validateConfirmation(mrhDraftRefundTotalPositive.delta)
    expect(text).not.toMatch(/ristourne de/)
    expect(text).toContain(formatFcfa(340))
  })

  it('R1 : refus au code inconnu → message du backend', () => {
    expect(
      mapAmendmentError(
        axiosError(422, {
          status: 422,
          message: 'A renewal payment is in progress',
          errors: { subscription: 'RENEWAL_PAYMENT_IN_PROGRESS' },
        }),
      ),
    ).toMatchObject({ kind: 'other' })
    expect(
      mapAmendmentError(
        axiosError(422, {
          status: 422,
          message: 'A renewal payment is in progress',
          errors: { subscription: 'RENEWAL_PAYMENT_IN_PROGRESS' },
        }),
      ).message,
    ).not.toBe('')
  })

  it('AC-4 : AMENDMENT_IN_PROGRESS traduit', () => {
    expect(
      mapAmendmentError(
        axiosError(422, {
          status: 422,
          message: 'x',
          errors: { subscription: 'AMENDMENT_IN_PROGRESS' },
        }),
      ).message,
    ).toMatch(/autre modification de ce contrat est déjà en cours/)
  })

  it('AC-6 : IA inchangé — IA Standard reste IA Standard', () => {
    expect(amendmentProduct(draftUnchanged)).toBe('IA_STANDARD')
  })
})
