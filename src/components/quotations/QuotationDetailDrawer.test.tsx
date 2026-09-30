// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import type { Attribution } from '#/components/quotations/useDistributionDirectory'
import type { QuotationResponse } from '#/services/quotations'
import { QuotationDetailDrawer } from './QuotationDetailDrawer'

const mocks = vi.hoisted(() => ({
  getQuotation: vi.fn(),
  getClient: vi.fn(),
}))

vi.mock('#/services/quotations', () => ({
  getQuotation: mocks.getQuotation,
}))
vi.mock('#/services/clients', () => ({
  clientsKeys: { detail: (id: number) => ['client', id] },
  getClient: mocks.getClient,
}))

const attribution: Attribution = {
  kind: 'seller',
  label: 'Agent Test',
  code: '10001',
}

/** Réponse réelle de GET /quotations/313 (IA Standard, serveur de démo). */
const iaStandard: QuotationResponse = {
  id: 313,
  productId: 151,
  status: 'QUOTED',
  quoteAt: '2026-09-28',
  netPremium: 2050.0,
  fees: 0.0,
  tax: 297.25,
  grossPremium: 2347.25,
  distributorCode: '10001',
  clientId: 2,
  productSnapshot: {
    productId: 151,
    productLabel: 'IA Standard',
    productCode: 1,
    insuranceType: 'IA',
    insuranceTypeLabel: 'Individuel Accident',
    legalQualityId: null,
    legalQualityName: null,
    propertyBasis: null,
    contentsRate: null,
    buildingRate: null,
    rentalValueRate: null,
    minimumContentsValue: null,
    contentsValue: null,
    buildingValue: null,
    rentalValue: null,
  },
  warrantiesSnapshot: null,
  riskClassSnapshot: {
    riskClassId: 152,
    classNumber: 1,
    description:
      'PROFESSIONS SANS AUCUN TRAVAIL MANUEL PROFESSIONNEL, MÊME  OCCASIONNEL ET AVEC DEPLACEMENTS PROFESSIONNELS PEU FREQUENTS',
    deathRate: 0.25,
    permanentDisabilityRate: 0.3,
    medicalExpensesRate: 1.5,
    deathCapital: 1000000,
    permanentDisabilityCapital: 1000000,
    medicalExpensesCapital: 1000000,
    deathPremium: 250.0,
    permanentDisabilityPremium: 300.0,
    medicalExpensesPremium: 1500.0,
    assistancePremium: 0.0,
    surchargeRate: 0,
    reductionRate: 0,
    appliedModifiers: [],
    appliedAgeSurcharge: null,
    insuredAge: 11,
    premiumBeforeProration: 2347.25,
    durationMonths: 12,
    prorationCoefficient: 1.0,
  },
  formulaSnapshot: null,
  insured: {
    relationship: 'CHILD',
    lastName: 'Kone',
    firstName: 'Ali',
    birthDate: '2015-03-14',
    phone: '+2250700000002',
  },
  beneficiaries: [
    {
      name: 'Awa Kone',
      phone: '+2250700000003',
      relationship: 'SPOUSE',
      sharePercent: 70,
    },
    {
      name: 'Issa Kone',
      phone: '+2250700000004',
      relationship: 'PARENT',
      sharePercent: 30,
    },
  ],
  createdAt: '2026-09-28T06:17:43.358884',
  updatedAt: '2026-09-28T06:17:43.358898',
} as unknown as QuotationResponse

const mrh = {
  ...iaStandard,
  id: 400,
  riskClassSnapshot: null,
  warrantiesSnapshot: {
    lines: [
      {
        warrantyId: 1,
        warrantyName: 'Incendie',
        premiumType: 'RATE',
        base: 5000000,
        premium: 12500,
        mandatory: true,
        taxRate: 14.5,
        tax: 1812,
      },
      { warrantyId: 2, warrantyName: 'Dégâts des eaux', premium: 4000 },
    ],
    accessory: 3000,
    accessoryTax: 435,
  },
} as unknown as QuotationResponse

function renderDrawer(quotation: QuotationResponse) {
  mocks.getQuotation.mockResolvedValue(quotation)
  mocks.getClient.mockResolvedValue({
    id: 2,
    firstName: 'Ali',
    lastName: 'Kone',
    phoneNumber: '+2250700000001',
  })
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <QuotationDetailDrawer
        quotationId={quotation.id}
        onClose={() => {}}
        resolveCode={() => attribution}
      />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('QuotationDetailDrawer', () => {
  it('affiche la classe, les capitaux, la durée et la surcharge d’une cotation IA Standard', async () => {
    renderDrawer(iaStandard)
    const risk = await screen.findByTestId('risk-class-detail')
    expect(risk.textContent).toContain('Classe n° 1')
    expect(risk.textContent).toContain('12 mois')
    expect(risk.textContent).toMatch(/1\s000\s000\sFCFA/)
    expect(risk.textContent).toContain('0 %')
    expect(risk.textContent).toContain('PROFESSIONS SANS AUCUN TRAVAIL')
  })

  it('liste les majorations appliquées', async () => {
    renderDrawer({
      ...iaStandard,
      riskClassSnapshot: {
        ...iaStandard.riskClassSnapshot,
        surchargeRate: 25,
        appliedModifiers: [
          {
            code: 'DEUX_ROUES_49CM3',
            label: 'Usage d’un engin à deux roues',
            modifierType: 'SURCHARGE',
            rate: 25,
          },
        ],
      },
    })
    const risk = await screen.findByTestId('risk-class-detail')
    expect(risk.textContent).toContain('Usage d’un engin à deux roues')
    expect(risk.textContent).toContain('+25 %')
  })

  it('affiche les lignes de garanties MRH et les accessoires', async () => {
    renderDrawer(mrh)
    const block = await screen.findByTestId('warranties-detail')
    expect(block.textContent).toContain('Incendie')
    expect(block.textContent).toContain('Obligatoire')
    expect(block.textContent).toContain('Dégâts des eaux')
    expect(block.textContent).toMatch(/12\s500\sFCFA/)
    expect(block.textContent).toContain('Accessoires')
    await waitFor(() =>
      expect(screen.queryByTestId('risk-class-detail')).toBeNull(),
    )
  })

  it('n’affiche aucun bloc de risque ni de garanties quand les instantanés sont null', async () => {
    renderDrawer({
      ...iaStandard,
      riskClassSnapshot: null,
      warrantiesSnapshot: null,
    })
    await screen.findByText('Décomposition de la prime')
    expect(screen.queryByTestId('risk-class-detail')).toBeNull()
    expect(screen.queryByTestId('warranties-detail')).toBeNull()
  })

  it('traduit les liens SIBLING et EMPLOYEE', async () => {
    renderDrawer({
      ...iaStandard,
      insured: { ...iaStandard.insured, relationship: 'EMPLOYEE' },
      beneficiaries: [
        {
          name: 'Zoé Kone',
          relationship: 'SIBLING',
          sharePercent: 100,
        },
      ],
    })
    await screen.findByText('Zoé Kone')
    expect(screen.getByText('Frère / sœur')).toBeTruthy()
    expect(screen.getByText('Salarié')).toBeTruthy()
    expect(screen.queryByText('SIBLING')).toBeNull()
    expect(screen.queryByText('EMPLOYEE')).toBeNull()
  })
})
