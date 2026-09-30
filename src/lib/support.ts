import { isAxiosError } from 'axios'
import { normalizeText } from '#/lib/clients'
import type {
  SupportConversationResponse,
  SupportMessageResponse,
  SupportStatus,
  SupportTransition,
} from '#/services/support'

export const MAX_SUPPORT_MESSAGE_LENGTH = 4000
/** `app.support.max-attachments-per-message` côté backend. */
export const MAX_SUPPORT_ATTACHMENTS_PER_MESSAGE = 5

export const SUPPORT_STATUS_LABELS: Record<SupportStatus, string> = {
  OPEN: 'Ouvert',
  IN_PROGRESS: 'En cours',
  RESOLVED: 'Résolu',
  CLOSED: 'Clôturé',
}

export const SUPPORT_TRANSITION_LABELS: Record<SupportTransition, string> = {
  handle: 'Prendre en charge',
  release: 'Libérer',
  resolve: 'Résoudre',
}

/** Transitions offertes au back-office selon le statut (machine à états §2 de la spec). */
export function availableSupportTransitions(
  status: SupportStatus,
): SupportTransition[] {
  if (status === 'OPEN') return ['handle']
  if (status === 'IN_PROGRESS') return ['release', 'resolve']
  return []
}

/** Un agent peut répondre partout sauf sur un ticket clôturé (409 côté backend). */
export function canReplyToSupport(status: SupportStatus): boolean {
  return status !== 'CLOSED'
}

/** Le flux SSE n'est accepté que pendant la prise en charge ; sinon, polling. */
export function canStreamSupport(status: SupportStatus): boolean {
  return status === 'IN_PROGRESS'
}

/**
 * Accusé de lecture : seulement s'il existe un message client plus récent que
 * le dernier déjà acquitté (un retour d'onglet ne rejoue pas l'accusé).
 */
export function needsReadReceipt(
  lastClientMessageId: number | undefined,
  receiptedId: number | undefined,
): boolean {
  if (lastClientMessageId === undefined) return false
  return receiptedId === undefined || lastClientMessageId > receiptedId
}

/**
 * L'événement SSE `message` est un upsert, pas un ajout : un message est
 * repoussé complet à chaque pièce jointe attachée. Empiler afficherait le
 * message en double (spec §6.2).
 */
export function upsertSupportMessage(
  messages: SupportMessageResponse[],
  incoming: SupportMessageResponse,
): SupportMessageResponse[] {
  const index = messages.findIndex((message) => message.id === incoming.id)
  if (index === -1) return [...messages, incoming]
  const next = [...messages]
  next[index] = incoming
  return next
}

function serverMessage(data: unknown): string | undefined {
  if (data && typeof data === 'object') {
    const body = data as Record<string, unknown>
    if (typeof body.message === 'string' && body.message.trim())
      return body.message.trim()
  }
  return undefined
}

/**
 * Message utilisateur pour une erreur du module support. Pass `conflict` to
 * describe what a 409 means for the action at hand (invalid state transition).
 */
export function mapSupportError(error: unknown, conflict?: string): string {
  if (!isAxiosError(error)) return 'Impossible de contacter le serveur.'
  const status = error.response?.status
  if (status === 401) return 'Session expirée. Veuillez vous reconnecter.'
  if (status === 403)
    return 'Droits insuffisants : la permission support est requise.'
  if (status === 404) return 'Ticket introuvable.'
  if (status === 409)
    return (
      conflict ??
      "L'état du ticket ne permet plus cette action. Actualisez la page."
    )
  if (status === 422)
    return (
      serverMessage(error.response?.data) ??
      'La règle métier empêche cette action.'
    )
  if (status === 502) return 'Service de stockage momentanément indisponible.'
  if (status !== undefined && status >= 500)
    return 'Une erreur serveur est survenue.'
  return (
    serverMessage(error.response?.data) ??
    'Une erreur est survenue. Veuillez réessayer.'
  )
}

export type SupportAgentFilter = 'all' | 'me' | 'unassigned'

/** Texte de confirmation des transitions sensibles (les autres s'exécutent directement). */
export const SUPPORT_TRANSITION_CONFIRM: Partial<
  Record<
    SupportTransition,
    { title: string; description: string; confirmLabel: string }
  >
> = {
  release: {
    title: 'Libérer ce ticket ?',
    description:
      'Le ticket retourne dans la file commune : il n’est plus à votre nom et n’importe quel agent pourra le prendre en charge.',
    confirmLabel: 'Libérer',
  },
  resolve: {
    title: 'Marquer ce ticket comme résolu ?',
    description:
      'Le statut « Résolu » est terminal : vous ne pourrez plus le repasser en cours. Un nouveau message du client le rouvrira ; sans activité, il sera clôturé au bout de 7 jours.',
    confirmLabel: 'Résoudre',
  },
}

/**
 * Filtre la file de support (déjà chargée) : recherche sur l'objet, le n° de
 * ticket (« 52 », « #52 ») et l'agent en charge ; filtre « moi / non assignés ».
 * `myName` = nom complet de l'agent connecté (le backend n'expose que
 * `handledByName`, pas d'identifiant).
 */
export function filterSupportConversations(
  rows: SupportConversationResponse[],
  {
    query,
    agent,
    myName,
  }: { query: string; agent: SupportAgentFilter; myName?: string },
): SupportConversationResponse[] {
  const words = normalizeText(query.replace(/#/g, ''))
    .split(/\s+/)
    .filter(Boolean)
  const me = myName ? normalizeText(myName) : undefined
  return rows.filter((row) => {
    const handler = row.handledByName?.trim()
    if (agent === 'unassigned' && handler) return false
    if (agent === 'me' && (!handler || normalizeText(handler) !== me))
      return false
    if (words.length === 0) return true
    const haystack = normalizeText(`${row.subject} ${row.id} ${handler ?? ''}`)
    return words.every((word) => haystack.includes(word))
  })
}
