import { isAxiosError } from 'axios'
import type { ClaimStatus, ClaimTransition } from '#/services/claims'

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
export const MAX_ATTACHMENTS = 20

export function availableActions(status: ClaimStatus): ClaimTransition[] {
  if (status === 'SUBMITTED') return ['review']
  if (status === 'UNDER_REVIEW') return ['request-info', 'approve', 'reject']
  return []
}

export function canUploadAttachment(status: ClaimStatus): boolean {
  return !['APPROVED', 'REJECTED', 'CANCELLED'].includes(status)
}

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  SUBMITTED: 'Déclaré',
  UNDER_REVIEW: 'En instruction',
  INFO_REQUESTED: 'Pièces demandées',
  APPROVED: 'Approuvé',
  REJECTED: 'Rejeté',
  CANCELLED: 'Annulé par le client',
}

/** Claims still awaiting a decision (the dashboard's « Sinistres en cours »). */
export const OPEN_CLAIM_STATUSES: readonly ClaimStatus[] = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'INFO_REQUESTED',
]

/** List status filter: one status, or `OPEN` for every undecided claim. */
export type ClaimStatusFilter = ClaimStatus | 'OPEN'

export function matchesStatusFilter(
  status: ClaimStatus,
  filter: ClaimStatusFilter | undefined,
): boolean {
  if (filter === undefined) return true
  if (filter === 'OPEN') return OPEN_CLAIM_STATUSES.includes(status)
  return status === filter
}

export type UploadValidationCode =
  | 'FILE_REQUIRED'
  | 'FILE_TOO_LARGE'
  | 'FILE_TYPE_NOT_ALLOWED'
  | 'ATTACHMENT_LIMIT_REACHED'

export async function validateClaimUpload(
  file: File | null,
  attachmentCount: number,
): Promise<UploadValidationCode | null> {
  if (!file) return 'FILE_REQUIRED'
  if (attachmentCount >= MAX_ATTACHMENTS) return 'ATTACHMENT_LIMIT_REACHED'
  if (file.size > MAX_ATTACHMENT_BYTES) return 'FILE_TOO_LARGE'

  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer())
  const pdf =
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  const png =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  return pdf || jpeg || png ? null : 'FILE_TYPE_NOT_ALLOWED'
}

export type ClaimErrorState =
  | { kind: 'validation'; message: string; fields: Record<string, string> }
  | { kind: 'session'; message: string }
  | { kind: 'forbidden'; message: string }
  | { kind: 'not-found'; message: string }
  | { kind: 'conflict'; message: string }
  | { kind: 'business'; message: string }
  | { kind: 'storage'; message: string; retryable: true }
  | { kind: 'unknown'; message: string }

export function mapClaimError(error: unknown): ClaimErrorState {
  if (!isAxiosError(error)) {
    return { kind: 'unknown', message: 'Impossible de contacter le serveur.' }
  }
  const status = error.response?.status
  const data = error.response?.data
  const body =
    data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
  const serverMessage =
    typeof body.message === 'string' ? body.message : undefined
  const fields =
    body.errors && typeof body.errors === 'object'
      ? (body.errors as Record<string, string>)
      : {}
  if (status === 400)
    return {
      kind: 'validation',
      message: serverMessage ?? 'Les données envoyées sont invalides.',
      fields,
    }
  if (status === 401)
    return {
      kind: 'session',
      message: 'Session expirée. Veuillez vous reconnecter.',
    }
  if (status === 403)
    return {
      kind: 'forbidden',
      message: 'Droits insuffisants pour effectuer cette action.',
    }
  if (status === 404)
    return { kind: 'not-found', message: 'Ressource introuvable.' }
  if (status === 409)
    return {
      kind: 'conflict',
      message: serverMessage ?? 'Cette ressource existe déjà.',
    }
  if (status === 422)
    return {
      kind: 'business',
      message: serverMessage ?? 'La règle métier empêche cette action.',
    }
  if (status === 502)
    return {
      kind: 'storage',
      message: 'Service de stockage momentanément indisponible.',
      retryable: true,
    }
  return {
    kind: 'unknown',
    message:
      status && status >= 500
        ? 'Une erreur serveur est survenue.'
        : (serverMessage ?? 'Une erreur est survenue.'),
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Ko`
  return `${(bytes / (1024 * 1024)).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mo`
}

export function formatClaimDate(
  value?: string | null,
  withTime = false,
): string {
  if (!value) return '—'
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(value)
  if (!match) return '—'
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    match[4] ? Number(match[4]) : 0,
    match[5] ? Number(match[5]) : 0,
  )
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date)
}

/** Live mask for a French date field: « 03092026 » → « 03/09/2026 ». */
export function maskFrDate(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

/**
 * « jj/mm/aaaa » → « aaaa-mm-jj » (what the API expects), or `null` when the
 * text is not a real calendar date.
 */
export function parseFrDate(text: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text.trim())
  if (!match) return null
  const [, dd, mm, yyyy] = match
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd))
  const real =
    date.getFullYear() === Number(yyyy) &&
    date.getMonth() === Number(mm) - 1 &&
    date.getDate() === Number(dd)
  return real ? `${yyyy}-${mm}-${dd}` : null
}

/** « aaaa-mm-jj » → « jj/mm/aaaa » (inverse of `parseFrDate`); '' if not an ISO date. */
export function isoToFrDate(iso?: string | null): string {
  const match = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null
  return match ? `${match[3]}/${match[2]}/${match[1]}` : ''
}

/** Error message for the « date de survenance » field, or `undefined` when valid. */
export function validateOccurredOn(
  text: string,
  today: Date = new Date(),
): string | undefined {
  if (!text.trim()) return 'La date de survenance est requise'
  const iso = parseFrDate(text)
  if (!iso) return 'Date invalide : saisissez jj/mm/aaaa'
  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, '0')
  const d = String(today.getDate()).padStart(2, '0')
  if (iso > `${y}-${m}-${d}`) return 'La date ne peut pas être dans le futur'
  return undefined
}
