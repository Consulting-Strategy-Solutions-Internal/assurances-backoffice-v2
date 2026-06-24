import { isAxiosError } from 'axios'

/** Pulls a meaningful message out of a backend error body, if it has one. */
function serverMessage(data: unknown): string | undefined {
  if (typeof data === 'string' && data.trim()) return data.trim()
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>
    // `message`/`detail` are the human-facing fields; `error` is just the HTTP
    // status text ("Forbidden", "Bad Request") so we intentionally skip it.
    const m = d.message ?? d.detail
    if (typeof m === 'string' && m.trim()) return m.trim()
  }
  return undefined
}

/**
 * Maps an unknown error (typically from an axios mutation) to a user-facing
 * French message. Pass `conflict` to override the message for a 409. When the
 * backend includes a `message`/`detail`, it is surfaced for 4xx responses.
 */
export function apiErrorMessage(
  error: unknown,
  messages: { conflict?: string } = {},
): string {
  if (isAxiosError(error)) {
    const status = error.response?.status
    const fromServer = serverMessage(error.response?.data)
    if (status === 409 && messages.conflict) return messages.conflict
    if (status === 401)
      return 'Session expirée. Veuillez vous reconnecter.'
    if (status === 403)
      return (
        fromServer ??
        "Accès refusé : vous n'avez pas l'autorisation d'effectuer cette action."
      )
    if (status === 400) return fromServer ?? 'Les données envoyées sont invalides.'
    // Don't surface raw 5xx bodies (may contain stack traces).
    if (status && status >= 500) return 'Une erreur serveur est survenue.'
    return fromServer ?? 'Une erreur est survenue. Veuillez réessayer.'
  }
  return 'Impossible de contacter le serveur.'
}
