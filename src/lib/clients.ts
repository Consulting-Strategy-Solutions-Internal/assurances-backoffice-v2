import { formatPersonName } from '#/lib/people'
import type { ClientResponse } from '#/services/clients'

export type VerificationFilter = 'all' | 'verified' | 'unverified'
export type GenderFilter = 'all' | 'HOMME' | 'FEMME'

export interface ClientFilters {
  query: string
  verification: VerificationFilter
  gender: GenderFilter
}

/** Lowercase + strip accents so « Koné » matches « kone ». */
export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/** Formats an Ivorian number as « +225 07 17 76 39 21 »; other formats are returned as-is. */
export function formatPhone(raw: string): string {
  const compact = raw.replace(/[\s.-]/g, '')
  const match = /^(?:\+|00)?225(\d{8}|\d{10})$/.exec(compact)
  if (!match) return raw.trim()
  const digits = match[1]
  return `+225 ${digits.replace(/(\d{2})(?=\d)/g, '$1 ')}`
}

export function clientFullName(
  client: Pick<ClientResponse, 'firstName' | 'lastName'>,
): string {
  return formatPersonName(client.firstName, client.lastName)
}

export function clientInitials(
  client: Pick<ClientResponse, 'firstName' | 'lastName'>,
): string {
  return `${client.firstName.trim().charAt(0)}${client.lastName.trim().charAt(0)}`.toUpperCase()
}

/** « Adresse ligne 1 · ligne 2 » — le complément « Néant » est ignoré. */
export function clientAddress(
  client: Pick<ClientResponse, 'addressLine1' | 'addressLine2'>,
): string {
  const line2 = client.addressLine2?.trim() ?? ''
  const useLine2 = line2 !== '' && normalizeText(line2) !== 'neant'
  return [client.addressLine1?.trim() ?? '', useLine2 ? line2 : '']
    .filter(Boolean)
    .join(' · ')
}

export function clientEmail(client: Pick<ClientResponse, 'email'>): string {
  return client.email?.trim() ?? ''
}

export function filterClients(
  clients: ClientResponse[],
  filters: ClientFilters,
): ClientResponse[] {
  const q = normalizeText(filters.query)
  const qDigits = q.replace(/\D/g, '')
  return clients.filter((c) => {
    if (filters.verification === 'verified' && !c.phoneVerifiedAt) return false
    if (filters.verification === 'unverified' && c.phoneVerifiedAt) return false
    if (filters.gender !== 'all' && c.gender !== filters.gender) return false
    if (!q) return true
    const haystack = normalizeText(
      [clientFullName(c), clientEmail(c), clientAddress(c), c.phoneNumber].join(
        ' ',
      ),
    )
    if (haystack.includes(q)) return true
    return (
      qDigits.length >= 3 && c.phoneNumber.replace(/\D/g, '').includes(qDigits)
    )
  })
}

export interface ClientStats {
  total: number
  phoneVerified: number
  withEmail: number
  recent: number
}

export function computeClientStats(
  clients: ClientResponse[],
  now: Date = new Date(),
  recentDays = 30,
): ClientStats {
  const threshold = now.getTime() - recentDays * 86_400_000
  return {
    total: clients.length,
    phoneVerified: clients.filter((c) => c.phoneVerifiedAt).length,
    withEmail: clients.filter((c) => clientEmail(c) !== '').length,
    recent: clients.filter((c) => {
      const t = new Date(c.createdAt).getTime()
      return !Number.isNaN(t) && t >= threshold
    }).length,
  }
}
