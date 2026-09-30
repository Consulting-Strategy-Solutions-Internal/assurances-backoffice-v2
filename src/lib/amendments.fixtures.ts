import type {
  Amendment,
  AmendmentDetail,
  AmendmentListItem,
  AmendmentReceipt,
  MrhAmendmentTerms,
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

/* ------------------------------------------------------------------ */
/* MRH (PR backend #119, contrat `origin/develop`)                     */
/* ------------------------------------------------------------------ */

const mrhTenantProduct = {
  productLabel: 'MRH Standard',
  insuranceType: 'MRH',
  legalQualityName: 'Locataire',
  legalQualityCode: 'TENANT',
  propertyBasis: 'LOCATIVE',
  contentsValue: 5000000,
  rentalRisks: 27000000,
  monthlyRent: 150000,
  rentMultiplier: 180,
} as const

export const mrhCurrent: MrhAmendmentTerms = {
  contentsValue: 5000000,
  buildingValue: null,
  monthlyRent: 150000,
  rooms: 4,
  selectedWarrantyIds: [301],
  productSnapshot: mrhTenantProduct,
  warrantiesSnapshot: {
    lines: [
      {
        warrantyId: 101,
        warrantyName: 'Incendie',
        premiumType: 'POURCENTAGE',
        premium: 12000,
        mandatory: true,
        taxRate: 25,
        tax: 3000,
      },
      {
        warrantyId: 301,
        warrantyName: 'Dégâts des eaux',
        premiumType: 'POURCENTAGE',
        premium: 4000,
        mandatory: false,
        taxRate: 14.5,
        tax: 580,
      },
    ],
    accessory: 5000,
    accessoryTax: 1250,
  },
}

/** Brouillon MRH : contenu ↑, vol ajouté, dégâts des eaux retiré — hausse, taxe de signe opposé. */
export const mrhDraftIncrease: AmendmentDetail = {
  ...draftUnchanged,
  id: 51,
  subscriptionId: 701,
  riskClassId: null,
  deathCapital: null,
  permanentDisabilityCapital: null,
  medicalExpensesCapital: null,
  appliedModifierCodes: null,
  reductionRate: null,
  insuredPhone: null,
  beneficiaries: null,
  riskClassSnapshot: null,
  formulaSnapshot: null,
  tariffChanged: true,
  mrh: {
    contentsValue: 6000000,
    buildingValue: null,
    monthlyRent: 150000,
    rooms: 5,
    selectedWarrantyIds: [351],
    productSnapshot: { ...mrhTenantProduct, contentsValue: 6000000 },
    warrantiesSnapshot: {
      lines: [
        {
          warrantyId: 101,
          warrantyName: 'Incendie',
          premiumType: 'POURCENTAGE',
          premium: 12500,
          mandatory: true,
          taxRate: 25,
          tax: 3125,
        },
        {
          warrantyId: 351,
          warrantyName: 'Vol par effraction',
          premiumType: 'POURCENTAGE',
          premium: 4800,
          mandatory: false,
          taxRate: 14.5,
          tax: 696,
        },
      ],
      accessory: 5000,
      accessoryTax: 1250,
    },
  },
  netPremium: 22300,
  fees: 5000,
  tax: 5071,
  grossPremium: 32371,
  // Calcul backend (`AmendmentDeltaCalculator.computeMrh`) : net
  // ceil((22 300 − 21 000) × 300/365) = 1 069 ; taxe des garanties
  // (3 821 − 3 580) × 300/365 ≈ 198 + taxe de l'accessoire 1 250 = 1 448.
  delta: {
    kind: 'INCREASE',
    effectiveDate: '2026-10-01',
    remainingDays: 300,
    termDays: 365,
    netDelta: 1069,
    fees: 5000,
    tax: 1448,
    total: 7517,
  },

  policyNumber: 'MRH-2026-000001',
  clientName: 'KONE Awa',
  current: {
    formulaSnapshot: null,
    riskClassSnapshot: null,
    mrh: mrhCurrent,
    netPremium: 21000,
    fees: 5000,
    tax: 4830,
    totalPremium: 30830,
    insuredPhone: null,
    beneficiaries: [],
    amendmentNumber: 0,
  },
}

/**
 * Ristourne MRH à taxe positive (D13) : une garantie à 14,5 % remplacée par une
 * garantie à 25 % de prime un peu plus basse — l'écart net baisse, la taxe
 * monte, et le total reste une ristourne.
 */
export const mrhDraftRefundTaxUp: AmendmentDetail = {
  ...mrhDraftIncrease,
  id: 52,
  delta: {
    kind: 'REFUND',
    effectiveDate: '2026-10-01',
    remainingDays: 300,
    termDays: 365,
    netDelta: -329,
    fees: 0,
    tax: 280,
    total: -49,
  },
}

/** Même échange, sur une prime plus forte : la taxe dépasse l'écart net et le total passe positif. */
export const mrhDraftRefundTotalPositive: AmendmentDetail = {
  ...mrhDraftRefundTaxUp,
  id: 53,
  delta: { ...mrhDraftRefundTaxUp.delta, netDelta: -400, tax: 740, total: 340 },
}
