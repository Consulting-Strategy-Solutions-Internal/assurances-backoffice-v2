import { isAxiosError } from 'axios'
import { apiErrorMessage } from '#/lib/api-error'
import type { NotificationResponse } from '#/services/notifications'
import type {
  MobileMoneyOperator,
  RefundRequestStatus,
} from '#/services/refunds'

export const MOBILE_MONEY_OPERATORS = [
  'ORANGE',
  'MTN',
  'MOOV',
  'WAVE',
] as const satisfies readonly MobileMoneyOperator[]

export const OPERATOR_LABELS: Record<MobileMoneyOperator, string> = {
  ORANGE: 'Orange',
  MTN: 'MTN',
  MOOV: 'Moov',
  WAVE: 'Wave',
}

/**
 * Préfixe (2 premiers chiffres nationaux) exigé par opérateur ; Wave accepte
 * tout préfixe. Valeurs par défaut du backend (`WithdrawalProperties`).
 */
export const OPERATOR_PREFIXES: Record<MobileMoneyOperator, string> = {
  ORANGE: '07',
  MTN: '05',
  MOOV: '01',
  WAVE: '',
}

export const REFUND_STATUS_LABELS: Record<RefundRequestStatus, string> = {
  REQUESTED: 'Demandé',
  AWAITING_DESTINATION: 'En attente d’un numéro',
  AWAITING_FUNDS: 'En attente de fonds',
  SENDING: 'Envoi en cours',
  SUBMITTED: 'Transmis à FineoPay',
  PAID: 'Versé',
  FAILED: 'En échec',
}

/** « +2250544001122 » → « +225 05 44 00 11 22 » ; autre valeur rendue telle quelle. */
export function formatIvorianNumber(value: string | null): string {
  if (!value) return '—'
  const m = /^\+225(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(value)
  return m ? `+225 ${m.slice(1).join(' ')}` : value
}

/** `destination` `@Size(max = 30)` côté backend (L-011). */
export const DESTINATION_MAX = 30

/**
 * Même lecture que `PhoneNumberNormalizer` : retire espaces, points, tirets
 * et parenthèses ; `00…` → `+…` ; `225…` → `+225…` ; `0…` → `+225` + numéro.
 * Renvoie `+225` + 10 chiffres, ou `null` si ce n'est pas un numéro ivoirien.
 */
export function normalizeIvorianNumber(input: string): string | null {
  let n = input.replace(/[\s.\-()]/g, '')
  if (n.startsWith('00')) n = `+${n.slice(2)}`
  else if (n.startsWith('225')) n = `+${n}`
  else if (n.startsWith('0')) n = `+225${n}`
  return /^\+225\d{10}$/.test(n) ? n : null
}

export interface DestinationErrors {
  operator?: string
  destination?: string
}

/** Contrôle avant envoi : opérateur choisi, numéro ivoirien, préfixe cohérent. */
export function validateRefundDestination(
  operator: MobileMoneyOperator | null,
  destination: string,
): DestinationErrors {
  if (!operator) return { operator: 'Choisissez l’opérateur.' }
  const normalized = normalizeIvorianNumber(destination)
  if (!normalized)
    return {
      destination:
        'Numéro ivoirien attendu : 10 chiffres (0X XX XX XX XX), avec ou sans +225.',
    }
  const prefix = OPERATOR_PREFIXES[operator]
  if (prefix && !normalized.slice(4).startsWith(prefix))
    return {
      destination: `Un numéro ${OPERATOR_LABELS[operator]} commence par ${prefix}.`,
    }
  return {}
}

export type RefundDestinationError =
  | { kind: 'field'; field: 'operator' | 'destination'; message: string }
  | { kind: 'invalid-status'; message: string }
  | { kind: 'not-found'; message: string }
  | { kind: 'forbidden'; message: string }
  | { kind: 'other'; message: string }

/** Erreur de `PUT /refunds/{id}/destination`, lue par `status` et `errors.*`. */
export function mapRefundDestinationError(
  error: unknown,
): RefundDestinationError {
  if (isAxiosError(error)) {
    const status = error.response?.status
    const data: unknown = error.response?.data
    const raw =
      data && typeof data === 'object'
        ? (data as { errors?: unknown }).errors
        : undefined
    const errors =
      raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}

    if (errors.status === 'REFUND_INVALID_STATUS')
      return {
        kind: 'invalid-status',
        message: 'Ce remboursement n’attend pas de numéro.',
      }
    if (errors.destination === 'WITHDRAWAL_OPERATOR_MISMATCH')
      return {
        kind: 'field',
        field: 'destination',
        message: 'Le préfixe du numéro ne correspond pas à l’opérateur.',
      }
    if (errors.destination !== undefined)
      return {
        kind: 'field',
        field: 'destination',
        message:
          'Numéro inutilisable : un numéro ivoirien est attendu (0X XX XX XX XX ou +225…).',
      }
    // Opérateur absent (`errors.operator`) ou inconnu (corps illisible, sans `errors`).
    if (errors.operator !== undefined || status === 400)
      return {
        kind: 'field',
        field: 'operator',
        message: 'Choisissez l’opérateur.',
      }
    if (status === 404)
      return { kind: 'not-found', message: 'Remboursement introuvable.' }
    if (status === 403)
      return { kind: 'forbidden', message: 'Droit insuffisant.' }
  }
  return { kind: 'other', message: apiErrorMessage(error) }
}

/**
 * Alerte `REFUND_ATTENTION` la plus récente d'un remboursement : son texte
 * est la seule source de la cause (pas de route de lecture).
 */
export function findRefundAlert(
  notifications: NotificationResponse[],
  refundId: number,
): NotificationResponse | null {
  let latest: NotificationResponse | null = null
  for (const n of notifications) {
    if (
      n.type !== 'REFUND_ATTENTION' ||
      n.resourceType !== 'REFUND_REQUEST' ||
      n.resourceId !== refundId
    )
      continue
    if (!latest || n.createdAt > latest.createdAt) latest = n
  }
  return latest
}
