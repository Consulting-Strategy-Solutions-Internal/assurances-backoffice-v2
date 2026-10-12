import type {
  SubscriptionDetailResponse,
  TravelContractResponse,
} from '#/services/subscriptions'
import type { TravelSupervisionItem } from '#/services/travel'

/** Ligne de supervision, modelée sur `TravelSupervisionItemResponse` (backend cfe620a). */
export function travelItem(
  overrides: Partial<TravelSupervisionItem> = {},
): TravelSupervisionItem {
  return {
    id: 812,
    productCode: 'TRAVEL_STANDARD',
    clientId: 106,
    status: 'ACTIVE',
    evoIssuanceStatus: 'TO_RECONCILE',
    evoIssuanceAttempts: 1,
    evoPolicyId: null,
    policyNumber: null,
    evoSentAt: '2026-10-12T09:30:00',
    evoLastError:
      'No outcome recorded for the EVO policy request sent at 2026-10-12T09:30: the call is deemed lost',
    reconcilableFrom: '2026-10-13T09:30:00',
    coverageStart: '2026-10-20',
    coverageEnd: '2026-10-30',
    createdAt: '2026-10-12T09:00:00',
    ...overrides,
  }
}

export function travelBlock(
  overrides: Partial<TravelContractResponse> = {},
): TravelContractResponse {
  return {
    category: 'STANDARD',
    destinationArea: 'AFRIQUE',
    startDate: '2026-10-20',
    endDate: '2026-10-30',
    composition: 'SINGLE',
    formulaCode: '988',
    formulaName: 'Standard Afrique',
    evoIssuanceStatus: 'CERTIFICATE_READY',
    policyNumber: 'NSIACIVO00000056',
    certificateDocumentId: 4501,
    travelers: [
      {
        role: 'PRINCIPAL',
        lastName: 'Kouassi',
        firstName: 'Awa',
        birthDate: '1991-03-14',
        gender: 'F',
        nationality: 'CI',
        residenceCountry: 'CI',
        passportNumber: '20AB12345',
        email: 'awa.kouassi@example.com',
        phone: '+2250700000000',
        otherFields: null,
      },
    ],
    ...overrides,
  }
}

/** Contrat voyage tel que `GET /subscriptions/{id}`. */
export function travelContract(
  overrides: Partial<SubscriptionDetailResponse> = {},
  travel: Partial<TravelContractResponse> = {},
): SubscriptionDetailResponse {
  return {
    id: 812,
    clientId: 106,
    status: 'ACTIVE',
    policyNumber: 'NSIACIVO00000056',
    amendmentNumber: 0,
    signed: true,
    identityDocuments: [{ type: 'PASSPORT', front: true, back: false }],
    policyDocumentId: null,
    productSnapshot: {
      productId: 9,
      productLabel: 'Voyage Standard',
      productCode: 4,
      insuranceType: 'TRAVEL',
      insuranceTypeLabel: 'Voyage',
    },
    totalPremium: 45250,
    coverageStart: '2026-10-20',
    coverageEnd: '2026-10-30',
    travel: travelBlock(travel),
    ...overrides,
  }
}
