import type {
  Amendment,
  AmendmentDetail,
  AmendmentListItem,
  AmendmentReceipt,
  RiskClassSnapshot,
} from '#/lib/amendments'

// Calquées sur les réponses réelles de la démo (`GET /subscription-amendments`
// et `/{id}`, contrat 402), puis déclinées en DRAFT / INCREASE / REFUND /
// AWAITING_PAYMENT avec quittance.

const beneficiaries = [
  {
    name: 'Yann Konaté',
    phone: '+2250506723878',
    relationship: 'SELF' as const,
    sharePercent: 66,
  },
  {
    name: 'Hjkm Yan',
    phone: '+2250505050505',
    relationship: 'SIBLING' as const,
    sharePercent: 1,
  },
  {
    name: 'Test Gh',
    phone: '+2250505050501',
    relationship: 'SPOUSE' as const,
    sharePercent: 33,
  },
]

export const classOne: RiskClassSnapshot = {
  riskClassId: 152,
  classNumber: 1,
  description:
    'PROFESSIONS SANS AUCUN TRAVAIL MANUEL PROFESSIONNEL, MÊME  OCCASIONNEL ET AVEC DEPLACEMENTS PROFESSIONNELS PEU FREQUENTS',
  deathRate: 0.25,
  permanentDisabilityRate: 0.3,
  medicalExpensesRate: 1.5,
  deathCapital: 100000,
  permanentDisabilityCapital: 100000,
  medicalExpensesCapital: 100000,
  deathPremium: 25,
  permanentDisabilityPremium: 30,
  medicalExpensesPremium: 150,
  assistancePremium: 0,
  surchargeRate: 25,
  reductionRate: 0,
  appliedModifiers: [
    {
      code: 'SPORT_DANGEREUX',
      label: "Pratique d'un sport dangereux",
      modifierType: 'SURCHARGE',
      rate: 25,
    },
  ],
  appliedAgeSurcharge: null,
  insuredAge: 0,
  premiumBeforeProration: 293.41,
  durationMonths: 12,
  prorationCoefficient: 1,
}

export const classTwo: RiskClassSnapshot = {
  ...classOne,
  riskClassId: 153,
  classNumber: 2,
  description: 'PROFESSIONS AVEC TRAVAIL MANUEL LÉGER',
  deathCapital: 200000,
  permanentDisabilityCapital: 200000,
  medicalExpensesCapital: 200000,
  appliedModifiers: [],
}

/** Modification DRAFT sans écart (téléphone seulement) — forme de la démo. */
export const draftUnchanged: AmendmentDetail = {
  id: 1,
  subscriptionId: 402,
  status: 'DRAFT',
  formulaId: null,
  riskClassId: 152,
  deathCapital: 100000,
  permanentDisabilityCapital: 100000,
  medicalExpensesCapital: 100000,
  appliedModifierCodes: ['SPORT_DANGEREUX'],
  reductionRate: 0,
  insuredPhone: '+2250700000002',
  beneficiaries,
  tariffChanged: false,
  formulaSnapshot: null,
  riskClassSnapshot: classOne,
  netPremium: 256.25,
  fees: 0,
  tax: 37.16,
  grossPremium: 294,
  delta: {
    kind: 'UNCHANGED',
    effectiveDate: '2026-09-30',
    remainingDays: 364,
    termDays: 365,
    netDelta: 0,
    fees: 0,
    tax: 0,
    total: 0,
  },
  amendmentNumber: null,
  createdAt: '2026-09-29T20:22:20.010125',
  updatedAt: '2026-09-29T20:22:20.010125',
  appliedAt: null,
  deletedAt: null,
  validatedAt: null,
  receipt: null,
  policyNumber: 'IA-2026-000002',
  clientName: 'KONATÉ Yann',
  current: {
    formulaSnapshot: null,
    riskClassSnapshot: classOne,
    netPremium: 256.25,
    fees: 0,
    tax: 37.16,
    totalPremium: 294,
    insuredPhone: '+2250506723878',
    beneficiaries,
    amendmentNumber: null,
  },
}

/** Réponse réelle de la démo : APPLIED, UNCHANGED, avenant n° 1. */
export const appliedUnchanged: AmendmentDetail = {
  ...draftUnchanged,
  status: 'APPLIED',
  insuredPhone: '+2250506723878',
  tariffChanged: true,
  amendmentNumber: 1,
  appliedAt: '2026-09-30T00:50:18.745875',
  validatedAt: '2026-09-30T00:50:18.745875',
  updatedAt: '2026-09-30T00:50:18.97439',
  current: { ...draftUnchanged.current, amendmentNumber: 1 },
}

/** Hausse : classe 2, prime annuelle plus élevée, 12 345 FCFA à payer. */
export const draftIncrease: AmendmentDetail = {
  ...draftUnchanged,
  riskClassId: 153,
  deathCapital: 200000,
  permanentDisabilityCapital: 200000,
  medicalExpensesCapital: 200000,
  appliedModifierCodes: [],
  tariffChanged: true,
  riskClassSnapshot: classTwo,
  netPremium: 500.4,
  grossPremium: 600,
  delta: {
    kind: 'INCREASE',
    effectiveDate: '2026-09-30',
    remainingDays: 300,
    termDays: 365,
    netDelta: 10000,
    fees: 500,
    tax: 1845,
    total: 12345,
  },
}

/** Baisse : 8 000 FCFA à rembourser. */
export const draftRefund: AmendmentDetail = {
  ...draftUnchanged,
  tariffChanged: true,
  grossPremium: 200,
  delta: {
    kind: 'REFUND',
    effectiveDate: '2026-09-30',
    remainingDays: 300,
    termDays: 365,
    netDelta: -6987,
    fees: 0,
    tax: -1013,
    total: -8000,
  },
}

export const toPayReceipt: AmendmentReceipt = {
  receiptNumber: 'Q-2026-000010',
  kind: 'SUPPLEMENTARY_CALL',
  status: 'TO_PAY',
  netAmount: 10000,
  fees: 500,
  tax: 1845,
  total: 12345,
  effectiveDate: '2026-09-30',
  expiryDate: '2027-09-29',
  remainingDays: 300,
}

export const toRefundReceipt: AmendmentReceipt = {
  receiptNumber: 'Q-2026-000011',
  kind: 'REFUND',
  status: 'TO_REFUND',
  netAmount: -6987,
  fees: 0,
  tax: -1013,
  total: -8000,
  effectiveDate: '2026-09-30',
  expiryDate: '2027-09-29',
  remainingDays: 300,
}

export const awaitingPayment: AmendmentDetail = {
  ...draftIncrease,
  status: 'AWAITING_PAYMENT',
  validatedAt: '2026-09-30T09:00:00',
  receipt: toPayReceipt,
}

/** Réponse de `POST …/validate` : champs de `Amendment`, sans `current`. */
export function asAmendment(detail: AmendmentDetail): Amendment {
  const { policyNumber, clientName, current, ...amendment } = detail
  void policyNumber
  void clientName
  void current
  return amendment
}

/** Ligne de `GET /subscription-amendments` : champs de `Amendment` + n° de police et client. */
export function asListItem(
  detail: AmendmentDetail,
  overrides: Partial<AmendmentListItem> = {},
): AmendmentListItem {
  const { current, ...rest } = detail
  void current
  return {
    ...rest,
    policyNumber: detail.policyNumber ?? 'IA-2026-000002',
    clientName: detail.clientName ?? null,
    ...overrides,
  }
}

export const paidReceipt: AmendmentReceipt = { ...toPayReceipt, status: 'PAID' }

/** Hausse payée par le client : le contrat a changé, quittance PAID. */
export const appliedPaid: AmendmentDetail = {
  ...awaitingPayment,
  status: 'APPLIED',
  amendmentNumber: 3,
  appliedAt: '2026-09-30T11:00:00',
  receipt: paidReceipt,
}
