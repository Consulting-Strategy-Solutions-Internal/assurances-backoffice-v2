import { isAxiosError } from 'axios'
import { z } from 'zod'
import { apiErrorMessage } from '#/lib/api-error'
import type { PillTone } from '#/lib/dashboard-theme'
import { EVO_ISSUANCE_STATUSES } from '#/services/subscriptions'
import type {
  EvoIssuanceStatus,
  SubscriptionProductSnapshot,
  TravelContractResponse,
  TravelerRole,
} from '#/services/subscriptions'
import type { TravelSupervisionItem } from '#/services/travel'

/* ------------------------------------------------------------------ */
/* Libellés                                                            */
/* ------------------------------------------------------------------ */

export const EVO_STATUS_LABELS: Record<EvoIssuanceStatus, string> = {
  PENDING: 'En attente d’envoi',
  SENDING: 'Envoi en cours',
  ISSUED: 'Police créée',
  CERTIFICATE_READY: 'Attestation prête',
  TO_RECONCILE: 'À trancher',
  REJECTED: 'Refusée',
}

/** Sens de chaque état, en une phrase (infobulle, page contrat). */
export const EVO_STATUS_HINTS: Record<EvoIssuanceStatus, string> = {
  PENDING: 'En attente d’envoi à EVO (contrat payé et signé).',
  SENDING: 'Envoi de la police à EVO en cours.',
  ISSUED: 'Police créée chez EVO, attestation pas encore reçue.',
  CERTIFICATE_READY: 'Police et attestation reçues.',
  TO_RECONCILE: 'Issue incertaine chez EVO : une décision est requise.',
  REJECTED: 'Refusée : contrat annulé et remboursement demandé.',
}

export const EVO_STATUS_TONES = {
  PENDING: 'neutral',
  SENDING: 'neutral',
  ISSUED: 'info',
  CERTIFICATE_READY: 'success',
  TO_RECONCILE: 'warning',
  REJECTED: 'danger',
} as const satisfies Record<EvoIssuanceStatus, PillTone>

/** Badge d'un état éventuellement nul (contrat pas encore payé). */
export function evoStatusBadge(status: EvoIssuanceStatus | null): {
  label: string
  tone: PillTone
} {
  if (!status) return { label: 'Non payé', tone: 'neutral' }
  return { label: EVO_STATUS_LABELS[status], tone: EVO_STATUS_TONES[status] }
}

export const TRAVELER_ROLE_LABELS: Record<TravelerRole, string> = {
  PRINCIPAL: 'Souscripteur',
  SPOUSE: 'Conjoint',
  CHILD: 'Enfant',
  ADULT: 'Adulte',
}

export const TRAVEL_COMPOSITION_LABELS: Record<
  NonNullable<TravelContractResponse['composition']>,
  string
> = {
  SINGLE: 'Individuel',
  GROUP: 'Groupe',
}

/** « AFRIQUE » → « Afrique » ; les codes EVO arrivent en majuscules. */
export function humanizeEvoCode(value: string | null): string {
  if (!value?.trim()) return '—'
  const lower = value.trim().toLowerCase().replaceAll('_', ' ')
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

export function isTravelContract(contract: {
  travel?: TravelContractResponse | null
  productSnapshot?: Pick<SubscriptionProductSnapshot, 'insuranceType'> | null
}): boolean {
  return (
    contract.travel != null ||
    contract.productSnapshot?.insuranceType === 'TRAVEL'
  )
}

/* ------------------------------------------------------------------ */
/* Décision sur un contrat TO_RECONCILE                                */
/* ------------------------------------------------------------------ */

/**
 * `LocalDateTime` du backend (sans fuseau, heure d'Abidjan = UTC) en instant ;
 * lu en UTC quel que soit le fuseau du navigateur.
 */
export function parseAbidjanDateTime(value: string | null): Date | null {
  if (!value) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(value)
  if (!m) return null
  return new Date(
    Date.UTC(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3]),
      Number(m[4]),
      Number(m[5]),
      m[6] ? Number(m[6]) : 0,
    ),
  )
}

export type DecisionState =
  | { kind: 'hidden' }
  | { kind: 'waiting'; from: string }
  | { kind: 'ready' }

/**
 * Les trois décisions ne s'affichent que sur un contrat `TO_RECONCILE` à qui
 * a le droit `subscription:reconcile`, et ne s'activent qu'à partir de
 * `reconcilableFrom`. Sans cette date, on laisse le serveur juger.
 */
export function decisionState(
  item: Pick<TravelSupervisionItem, 'evoIssuanceStatus' | 'reconcilableFrom'>,
  now: Date,
  canReconcile: boolean,
): DecisionState {
  if (item.evoIssuanceStatus !== 'TO_RECONCILE' || !canReconcile)
    return { kind: 'hidden' }
  const from = parseAbidjanDateTime(item.reconcilableFrom)
  if (from && now.getTime() < from.getTime() && item.reconcilableFrom)
    return { kind: 'waiting', from: item.reconcilableFrom }
  return { kind: 'ready' }
}

const GAVE_UP_PREFIX = 'Gave up after '

/** L'émission a atteint le plafond de renvois : EVO n'a rien créé. */
export function isGaveUp(evoLastError: string | null): boolean {
  return evoLastError?.startsWith(GAVE_UP_PREFIX) ?? false
}

/** Longueurs des DTO backend (L-011). */
export const POLICY_ID_MAX = 100
export const REFUSAL_REASON_MAX = 400

/* ------------------------------------------------------------------ */
/* Erreurs des décisions                                               */
/* ------------------------------------------------------------------ */

export type TravelDecisionError =
  | { kind: 'field'; field: 'policyId' | 'reason'; message: string }
  | { kind: 'quote-expired'; message: string }
  | { kind: 'stale'; message: string }
  | { kind: 'too-early'; message: string }
  | { kind: 'evo-unavailable'; message: string }
  | { kind: 'not-found'; message: string }
  | { kind: 'forbidden'; message: string }
  | { kind: 'other'; message: string }

function errorsOf(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== 'object') return {}
  const errors = (data as { errors?: unknown }).errors
  return errors && typeof errors === 'object'
    ? (errors as Record<string, unknown>)
    : {}
}

function messageOf(data: unknown): string {
  if (!data || typeof data !== 'object') return ''
  const message = (data as { message?: unknown }).message
  return typeof message === 'string' ? message.trim() : ''
}

/**
 * Traduit une erreur des trois décisions d'après `status` et `errors.*` ;
 * seul `TRAVEL_POLICY_MISMATCH` affiche le `message` (il nomme l'écart).
 */
export function mapTravelDecisionError(error: unknown): TravelDecisionError {
  if (isAxiosError(error)) {
    const status = error.response?.status
    const data: unknown = error.response?.data
    const errors = errorsOf(data)
    const policyCode = errors.policyId
    const subscriptionCode = errors.subscriptionId

    if (policyCode === 'TRAVEL_POLICY_MISMATCH') {
      const detail = messageOf(data)
      return {
        kind: 'field',
        field: 'policyId',
        message: detail
          ? `Cette police n’est pas celle du contrat : ${detail}`
          : 'Cette police n’est pas celle du contrat.',
      }
    }
    if (policyCode === 'TRAVEL_POLICY_NOT_CONFIRMED')
      return {
        kind: 'field',
        field: 'policyId',
        message:
          'EVO n’a pas confirmé cette police : rien n’a été rattaché. Vérifiez l’identifiant.',
      }
    if (policyCode === 'TRAVEL_POLICY_ALREADY_ATTACHED')
      return {
        kind: 'field',
        field: 'policyId',
        message: 'Cette police est déjà rattachée à un autre contrat.',
      }
    if (subscriptionCode === 'TRAVEL_QUOTE_EXPIRED')
      return {
        kind: 'quote-expired',
        message: 'Le devis EVO a expiré : refusez l’émission.',
      }
    if (subscriptionCode === 'TRAVEL_NOT_TO_RECONCILE')
      return {
        kind: 'stale',
        message:
          'Ce contrat n’est plus à trancher : ses données ont été rechargées.',
      }
    if (subscriptionCode === 'TRAVEL_RECONCILIATION_TOO_EARLY')
      return {
        kind: 'too-early',
        message: 'Décision pas encore possible : attendez l’heure indiquée.',
      }
    if (status === 400 && policyCode !== undefined)
      return {
        kind: 'field',
        field: 'policyId',
        message: 'Saisissez l’identifiant de la police EVO.',
      }
    if (status === 400 && errors.reason !== undefined)
      return {
        kind: 'field',
        field: 'reason',
        message: 'Indiquez ce qui a été vérifié.',
      }
    if (status === 502)
      return {
        kind: 'evo-unavailable',
        message: 'EVO ne répond pas : rien n’a été fait. Réessayez plus tard.',
      }
    if (status === 404)
      return { kind: 'not-found', message: 'Contrat voyage introuvable.' }
    if (status === 403)
      return { kind: 'forbidden', message: 'Droit insuffisant.' }
  }
  return { kind: 'other', message: apiErrorMessage(error) }
}

/* ------------------------------------------------------------------ */
/* Liste de supervision : paramètres d'URL                             */
/* ------------------------------------------------------------------ */

export const TRAVEL_FILTERS = ['ALL', ...EVO_ISSUANCE_STATUSES] as const
export type TravelFilter = (typeof TRAVEL_FILTERS)[number]

/** `?status=` (défaut `TO_RECONCILE`) et `?page=` ; jamais de tri (le serveur le refuse). */
export const travelSupervisionSearchSchema = z.object({
  status: z.enum(TRAVEL_FILTERS).catch('TO_RECONCILE'),
  page: z.coerce.number().int().min(0).catch(0),
})

export type TravelSupervisionSearch = z.output<
  typeof travelSupervisionSearchSchema
>

export const DEFAULT_TRAVEL_SEARCH: TravelSupervisionSearch = {
  status: 'TO_RECONCILE',
  page: 0,
}
