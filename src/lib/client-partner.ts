import { isAxiosError } from 'axios'
import type { SearchableOption } from '#/lib/search'
import type { ClientPartnerFilter } from '#/services/clients'
import type { PartnerResponse } from '#/services/partners'

/** Value of the « Aucun partenaire » / « Sans partenaire » entry in the pickers. */
export const NO_PARTNER = 'none'

/** `?partner=` of `/clients`: a partner id or `none`; anything else is dropped. */
export function parsePartnerFilter(
  value: unknown,
): ClientPartnerFilter | undefined {
  if (value === NO_PARTNER) return NO_PARTNER
  const id = typeof value === 'number' ? value : Number(value)
  return typeof value !== 'boolean' &&
    value !== '' &&
    value !== null &&
    Number.isInteger(id) &&
    id > 0
    ? id
    : undefined
}

export function partnerOptions(
  partners: PartnerResponse[],
): SearchableOption[] {
  return [...partners]
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
    .map((partner) => ({
      value: String(partner.id),
      label: partner.name,
      hint: partner.distributorCode,
    }))
}

/**
 * Text naming the partner filter in the list header: « partenaire Sunu », or
 * « sans partenaire ». A partner missing from the loaded list keeps its id.
 */
export function partnerFilterLabel(
  filter: ClientPartnerFilter,
  partners: PartnerResponse[] | undefined,
): string {
  if (filter === NO_PARTNER) return 'sans partenaire'
  const partner = partners?.find((p) => p.id === filter)
  return `partenaire ${partner ? partner.name : `#${filter}`}`
}

/** Body of `PUT /clients/{id}/owner-partner` from the picker's value. */
export function ownerPartnerId(value: string): number | null {
  return value === NO_PARTNER ? null : Number(value)
}

export interface OwnerPartnerError {
  message: string
  /** The chosen partner no longer exists: the partner list must be reloaded. */
  partnerGone?: boolean
}

/** French message for a failed `PUT /clients/{id}/owner-partner`. */
export function mapOwnerPartnerError(error: unknown): OwnerPartnerError {
  if (!isAxiosError(error) || !error.response) {
    return { message: 'Impossible de contacter le serveur. Réessayez.' }
  }
  const { status, data } = error.response
  const serverMessage =
    data && typeof data === 'object' && 'message' in data
      ? String((data as { message: unknown }).message)
      : ''
  if (status === 400) {
    return { message: 'Choisissez un partenaire ou « Aucun partenaire ».' }
  }
  if (status === 403) {
    return {
      message:
        'Seule l’administration NSIA peut changer le partenaire d’un client.',
    }
  }
  if (status === 404) {
    return /partner/i.test(serverMessage)
      ? {
          message:
            'Ce partenaire n’existe plus. La liste a été rechargée : choisissez-en un autre.',
          partnerGone: true,
        }
      : { message: 'Ce client n’existe plus ou a été supprimé.' }
  }
  if (status === 401) {
    return { message: 'Session expirée. Veuillez vous reconnecter.' }
  }
  return { message: 'Le partenaire n’a pas pu être changé. Réessayez.' }
}
