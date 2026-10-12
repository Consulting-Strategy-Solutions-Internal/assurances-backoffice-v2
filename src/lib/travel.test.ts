import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it } from 'vitest'
import {
  EVO_STATUS_LABELS,
  EVO_STATUS_TONES,
  decisionState,
  isGaveUp,
  isTravelContract,
  mapTravelDecisionError,
  parseAbidjanDateTime,
  travelSupervisionSearchSchema,
} from '#/lib/travel'
import { travelItem } from '#/lib/travel.fixtures'

function axiosError(status: number, data: unknown): AxiosError {
  const headers = new AxiosHeaders()
  return new AxiosError('boom', String(status), undefined, undefined, {
    status,
    statusText: '',
    headers,
    config: { headers },
    data,
  })
}

describe('parseAbidjanDateTime', () => {
  it('lit un LocalDateTime sans fuseau comme une heure UTC (Abidjan)', () => {
    expect(parseAbidjanDateTime('2026-10-13T09:30:00')?.toISOString()).toBe(
      '2026-10-13T09:30:00.000Z',
    )
  })
  it('null sur une valeur vide ou illisible', () => {
    expect(parseAbidjanDateTime(null)).toBeNull()
    expect(parseAbidjanDateTime('demain')).toBeNull()
  })
})

describe('decisionState (AC-6)', () => {
  const from = '2026-10-13T09:30:00'
  const before = new Date('2026-10-13T09:29:59Z')
  const after = new Date('2026-10-13T09:30:00Z')
  const toReconcile = travelItem({
    evoIssuanceStatus: 'TO_RECONCILE',
    reconcilableFrom: from,
  })

  it('masqué hors TO_RECONCILE, quel que soit le droit', () => {
    for (const status of [
      'PENDING',
      'SENDING',
      'ISSUED',
      'CERTIFICATE_READY',
      'REJECTED',
      null,
    ] as const) {
      expect(
        decisionState(travelItem({ evoIssuanceStatus: status }), after, true),
      ).toEqual({ kind: 'hidden' })
    }
  })

  it('masqué sans le droit subscription:reconcile', () => {
    expect(decisionState(toReconcile, after, false)).toEqual({
      kind: 'hidden',
    })
  })

  it('en attente avant reconcilableFrom, avec la date', () => {
    expect(decisionState(toReconcile, before, true)).toEqual({
      kind: 'waiting',
      from,
    })
  })

  it('prêt à partir de reconcilableFrom (borne incluse)', () => {
    expect(decisionState(toReconcile, after, true)).toEqual({ kind: 'ready' })
  })

  it('prêt quand reconcilableFrom est absent (le serveur reste juge)', () => {
    expect(
      decisionState(
        travelItem({
          evoIssuanceStatus: 'TO_RECONCILE',
          reconcilableFrom: null,
        }),
        before,
        true,
      ),
    ).toEqual({ kind: 'ready' })
  })
})

describe('isGaveUp', () => {
  it('reconnaît le plafond de renvois', () => {
    expect(isGaveUp('Gave up after 5 attempts (max 5): HTTP 500')).toBe(true)
  })
  it('ignore les autres traces', () => {
    expect(isGaveUp('Relaunched by admin after verification')).toBe(false)
    expect(isGaveUp(null)).toBe(false)
  })
})

describe('libellés et teintes EVO', () => {
  it('suivent le tableau de la mission', () => {
    expect(EVO_STATUS_TONES).toEqual({
      PENDING: 'neutral',
      SENDING: 'neutral',
      ISSUED: 'info',
      CERTIFICATE_READY: 'success',
      TO_RECONCILE: 'warning',
      REJECTED: 'danger',
    })
    expect(EVO_STATUS_LABELS.TO_RECONCILE).toBe('À trancher')
  })
})

describe('isTravelContract', () => {
  it('voyage si le bloc travel est présent ou le type TRAVEL', () => {
    expect(isTravelContract({ travel: null, productSnapshot: null })).toBe(
      false,
    )
    expect(
      isTravelContract({ productSnapshot: { insuranceType: 'TRAVEL' } }),
    ).toBe(true)
    expect(isTravelContract({ productSnapshot: { insuranceType: 'IA' } })).toBe(
      false,
    )
  })
})

describe('mapTravelDecisionError (AC-7…AC-10)', () => {
  it('TRAVEL_POLICY_MISMATCH : affiche le message du serveur sous le champ', () => {
    const e = axiosError(422, {
      status: 422,
      message: 'Coverage dates differ: 2026-10-12 ≠ 2026-10-13',
      errors: { policyId: 'TRAVEL_POLICY_MISMATCH' },
    })
    expect(mapTravelDecisionError(e)).toEqual({
      kind: 'field',
      field: 'policyId',
      message:
        'Cette police n’est pas celle du contrat : Coverage dates differ: 2026-10-12 ≠ 2026-10-13',
    })
  })

  it('TRAVEL_POLICY_NOT_CONFIRMED et ALREADY_ATTACHED, sans lire le message', () => {
    expect(
      mapTravelDecisionError(
        axiosError(422, {
          message: 'whatever',
          errors: { policyId: 'TRAVEL_POLICY_NOT_CONFIRMED' },
        }),
      ),
    ).toMatchObject({ kind: 'field', field: 'policyId' })
    const attached = mapTravelDecisionError(
      axiosError(422, {
        message: 'whatever',
        errors: { policyId: 'TRAVEL_POLICY_ALREADY_ATTACHED' },
      }),
    )
    expect(attached.message).toContain('déjà rattachée')
    expect(attached.message).not.toContain('whatever')
  })

  it('400 sur policyId ou reason : champ obligatoire', () => {
    expect(
      mapTravelDecisionError(
        axiosError(400, { errors: { policyId: 'must not be blank' } }),
      ),
    ).toMatchObject({ kind: 'field', field: 'policyId' })
    expect(
      mapTravelDecisionError(
        axiosError(400, { errors: { reason: 'must not be blank' } }),
      ),
    ).toMatchObject({ kind: 'field', field: 'reason' })
  })

  it('TRAVEL_QUOTE_EXPIRED : proposer le refus', () => {
    expect(
      mapTravelDecisionError(
        axiosError(422, { errors: { subscriptionId: 'TRAVEL_QUOTE_EXPIRED' } }),
      ),
    ).toEqual({
      kind: 'quote-expired',
      message: 'Le devis EVO a expiré : refusez l’émission.',
    })
  })

  it('TRAVEL_NOT_TO_RECONCILE : à recharger', () => {
    expect(
      mapTravelDecisionError(
        axiosError(422, {
          errors: { subscriptionId: 'TRAVEL_NOT_TO_RECONCILE' },
        }),
      ).kind,
    ).toBe('stale')
  })

  it('TRAVEL_RECONCILIATION_TOO_EARLY', () => {
    expect(
      mapTravelDecisionError(
        axiosError(422, {
          errors: { subscriptionId: 'TRAVEL_RECONCILIATION_TOO_EARLY' },
        }),
      ),
    ).toEqual({
      kind: 'too-early',
      message: 'Décision pas encore possible : attendez l’heure indiquée.',
    })
  })

  it('R1-4 : rattachement, police inconnue (500 côté EVO) → vérifier l’identifiant', () => {
    expect(mapTravelDecisionError(axiosError(500, {}), 'attach')).toEqual({
      kind: 'field',
      field: 'policyId',
      message:
        'EVO ne reconnaît pas cet identifiant ou a rencontré une erreur : rien n’a été rattaché. Vérifiez l’identifiant.',
    })
    expect(mapTravelDecisionError(axiosError(500, {}), 'retry').kind).toBe(
      'other',
    )
  })

  it('502, 404, 403', () => {
    expect(mapTravelDecisionError(axiosError(502, {})).kind).toBe(
      'evo-unavailable',
    )
    expect(mapTravelDecisionError(axiosError(404, {})).kind).toBe('not-found')
    expect(mapTravelDecisionError(axiosError(403, {}))).toEqual({
      kind: 'forbidden',
      message: 'Droit insuffisant.',
    })
  })
})

describe('travelSupervisionSearchSchema (AC-5)', () => {
  it('TO_RECONCILE par défaut, page 0', () => {
    expect(travelSupervisionSearchSchema.parse({})).toEqual({
      status: 'TO_RECONCILE',
      page: 0,
    })
  })
  it('ALL et un état valide sont gardés, le reste retombe sur le défaut', () => {
    expect(travelSupervisionSearchSchema.parse({ status: 'ALL' }).status).toBe(
      'ALL',
    )
    expect(
      travelSupervisionSearchSchema.parse({ status: 'ISSUED', page: '2' }),
    ).toEqual({ status: 'ISSUED', page: 2 })
    expect(
      travelSupervisionSearchSchema.parse({ status: 'NOPE', page: -1 }),
    ).toEqual({ status: 'TO_RECONCILE', page: 0 })
  })
})
