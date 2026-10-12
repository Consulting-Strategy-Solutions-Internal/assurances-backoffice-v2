import { describe, expect, it } from 'vitest'
import { notificationTarget } from '#/lib/notifications'
import type { NotificationResponse } from '#/services/notifications'

function n(
  type: string,
  resourceType: string | null,
  resourceId: number | null,
): NotificationResponse {
  return {
    id: 1,
    type,
    title: 't',
    body: 'b',
    resourceType,
    resourceId,
    read: false,
    createdAt: '2026-10-12T10:00:00',
  }
}

describe('notificationTarget (AC-11)', () => {
  it('alertes voyage → page contrat, retour vers la supervision filtrée', () => {
    expect(
      notificationTarget(
        n('TRAVEL_ISSUANCE_TO_RECONCILE', 'SUBSCRIPTION', 812),
      ),
    ).toEqual({
      to: '/contrats/$subscriptionId',
      params: { subscriptionId: '812' },
      search: { from: 'voyage', status: 'TO_RECONCILE', page: 0 },
    })
    expect(
      notificationTarget(n('TRAVEL_ISSUANCE_REJECTED', 'SUBSCRIPTION', 812)),
    ).toMatchObject({ search: { from: 'voyage', status: 'REJECTED' } })
    expect(
      notificationTarget(n('TRAVEL_CERTIFICATE_MISSING', 'SUBSCRIPTION', 812)),
    ).toMatchObject({ search: { from: 'voyage', status: 'ISSUED' } })
  })

  it('autre ressource SUBSCRIPTION → page contrat sans supervision', () => {
    expect(notificationTarget(n('POLICY_ISSUED', 'SUBSCRIPTION', 7))).toEqual({
      to: '/contrats/$subscriptionId',
      params: { subscriptionId: '7' },
      search: {},
    })
  })

  it('REFUND_ATTENTION → page remboursement', () => {
    expect(
      notificationTarget(n('REFUND_ATTENTION', 'REFUND_REQUEST', 12)),
    ).toEqual({
      to: '/remboursements/$refundId',
      params: { refundId: '12' },
    })
  })

  it('PAYOUT_FUNDS_INSUFFICIENT → information, sans lien', () => {
    expect(
      notificationTarget(n('PAYOUT_FUNDS_INSUFFICIENT', 'REFUND_REQUEST', 12)),
    ).toBeNull()
    expect(
      notificationTarget(n('PAYOUT_FUNDS_INSUFFICIENT', 'WITHDRAWAL', 3)),
    ).toBeNull()
  })

  it('support et sinistres inchangés', () => {
    expect(
      notificationTarget(n('SUPPORT_TICKET_OPENED', 'SUPPORT_CONVERSATION', 4)),
    ).toEqual({
      to: '/support/$conversationId',
      params: { conversationId: '4' },
    })
    expect(notificationTarget(n('CLAIM_TO_REVIEW', 'CLAIM', 9))).toEqual({
      to: '/sinistres/$claimId',
      params: { claimId: '9' },
    })
  })

  it('sans resourceId ou ressource inconnue → null', () => {
    expect(
      notificationTarget(n('REFUND_ATTENTION', 'REFUND_REQUEST', null)),
    ).toBeNull()
    expect(notificationTarget(n('X', 'WALLET', 1))).toBeNull()
  })
})
