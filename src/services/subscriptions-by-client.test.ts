import { describe, expect, it } from 'vitest'
import {
  subscriptionLabel,
  subscriptionsOfClient,
} from './subscriptions-by-client'
import type { SubscriptionResponse } from './subscriptions'

const base: SubscriptionResponse = {
  id: 7,
  quotationId: 1,
  clientId: 3,
  paymentMode: 'MOBILE',
  status: 'ACTIVE',
  totalPremium: 1000,
  currency: 'XOF',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

describe('subscriptions by client', () => {
  it('keeps only the contracts of the client', () => {
    const all = [base, { ...base, id: 8, clientId: 4 }]
    expect(subscriptionsOfClient(all, 3).map((s) => s.id)).toEqual([7])
  })

  it('labels a contract with policy, product, status and coverage', () => {
    expect(
      subscriptionLabel({
        ...base,
        policyNumber: 'POL-1',
        productSnapshot: { productLabel: 'IA Standard' },
        coverageStart: '2026-01-01',
        coverageEnd: '2026-12-31',
      }),
    ).toBe('POL-1 · IA Standard · Actif · 01/01/2026 → 31/12/2026')
  })

  it('falls back to the contract id', () => {
    expect(subscriptionLabel(base)).toBe('Contrat #7 · Actif')
  })
})
