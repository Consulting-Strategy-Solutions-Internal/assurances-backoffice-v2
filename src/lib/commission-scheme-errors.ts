import { isAxiosError } from 'axios'
import { apiErrorMessage } from '#/lib/api-error'
import { translateBackendMessage } from '#/lib/backend-messages'
import type { CommissionSchemeDraft } from '#/lib/commission-scheme-validation'

type SchemeField = keyof CommissionSchemeDraft

/** French names of the scheme fields, as the administrator sees them. */
export const SCHEME_FIELD_LABELS: Record<SchemeField, string> = {
  partnerId: 'Partenaire',
  product: 'Produit',
  commissionRate: 'Taux de commission',
  maxLevel: 'Niveau',
  level2PartnerShare: 'Part du partenaire (niveau 2)',
  level2SellerShare: 'Part du vendeur direct (niveau 2)',
  level3PartnerShare: 'Part du partenaire (niveau 3)',
  level3AgencyShare: 'Part de l’agence (niveau 3)',
  level3SellerShare: 'Part du vendeur d’agence (niveau 3)',
}

/** Wizard step holding each field, to send the administrator back to it. */
export const SCHEME_FIELD_STEP: Record<SchemeField, 1 | 2 | 3> = {
  partnerId: 1,
  product: 1,
  commissionRate: 1,
  maxLevel: 2,
  level2PartnerShare: 3,
  level2SellerShare: 3,
  level3PartnerShare: 3,
  level3AgencyShare: 3,
  level3SellerShare: 3,
}

/** Business-rule messages of the scheme service (422), in French. */
const RULE_MESSAGES: Partial<Record<string, string>> = {
  'Level 2 scheme requires a direct seller':
    'Le niveau 2 exige au moins un vendeur rattaché directement au partenaire.',
  'Level 2 scheme is forbidden for a partner with agency sellers: their sales are level 3':
    "Le niveau 2 est impossible : ce partenaire possède des vendeurs d'agence, dont les ventes relèvent du niveau 3.",
  'Level 3 scheme requires an agency with a seller':
    'Le niveau 3 exige au moins une agence contenant au moins un vendeur.',
}

export interface SchemeServerError {
  /** Short toast title. */
  title: string
  /** One line per problem, already in French (toast description + banner). */
  details: string[]
  /** Messages to show under the matching fields. */
  fields: Partial<Record<SchemeField, string>>
  /** Earliest wizard step holding a faulty field, if any. */
  step: 1 | 2 | 3 | null
}

function isSchemeField(key: string): key is SchemeField {
  return key in SCHEME_FIELD_LABELS
}

/**
 * Turns a failed create/update of a commission scheme into an explicit,
 * French error: which field is wrong and why (400 binding / validation), or
 * which business rule was broken (422), instead of the raw « Validation
 * failed ».
 */
export function parseSchemeError(error: unknown): SchemeServerError {
  if (!isAxiosError(error) || !error.response) {
    return {
      title: 'Le schéma n’a pas été enregistré',
      details: [apiErrorMessage(error)],
      fields: {},
      step: null,
    }
  }
  const { status } = error.response
  const data: unknown = error.response.data
  const body =
    data && typeof data === 'object'
      ? (data as { message?: unknown; errors?: unknown })
      : {}
  const message = typeof body.message === 'string' ? body.message : ''

  if (status === 403) {
    return {
      title: 'Action non autorisée',
      details: [
        'Votre rôle n’a pas la permission commissionscheme:write : demandez-la à un administrateur IAM.',
      ],
      fields: {},
      step: null,
    }
  }

  const fields: Partial<Record<SchemeField, string>> = {}
  const details: string[] = []
  if (body.errors && typeof body.errors === 'object') {
    for (const [key, raw] of Object.entries(body.errors)) {
      if (typeof raw !== 'string') continue
      const text = translateBackendMessage(raw)
      if (isSchemeField(key)) {
        fields[key] = text
        details.push(`${SCHEME_FIELD_LABELS[key]} : ${text}`)
      } else {
        // A field the form doesn't know: say it plainly rather than hide it.
        details.push(`Champ « ${key} » : ${text}`)
      }
    }
  }

  if (details.length === 0) {
    const rule = RULE_MESSAGES[message]
    details.push(
      rule ??
        (message && message !== 'Validation failed'
          ? translateBackendMessage(message)
          : apiErrorMessage(error)),
    )
  }

  const steps = Object.keys(fields)
    .filter(isSchemeField)
    .map((key) => SCHEME_FIELD_STEP[key])
  return {
    title:
      status === 400
        ? 'Le schéma n’a pas été enregistré : des champs sont invalides'
        : status === 422
          ? 'Le schéma enfreint une règle de commissionnement'
          : status === 409
            ? 'Ce schéma existe déjà'
            : 'Le schéma n’a pas été enregistré',
    details,
    fields,
    step: steps.length ? (Math.min(...steps) as 1 | 2 | 3) : null,
  }
}
