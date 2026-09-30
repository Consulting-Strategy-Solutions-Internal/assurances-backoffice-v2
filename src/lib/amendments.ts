import { isAxiosError } from 'axios'
import { z } from 'zod'
import { apiErrorMessage } from '#/lib/api-error'
import { formatPercent } from '#/lib/format'
import { formatFcfa } from '#/lib/utils'
import type { PillTone } from '#/lib/dashboard-theme'

// Formes calquées sur la collection Postman « NSIA Connect » (Commun ›
// Validation des modifications), générée depuis l'OpenAPI du backend (L-002).

export const AMENDMENT_STATUSES = [
  'DRAFT',
  'AWAITING_PAYMENT',
  'APPLIED',
  'DELETED',
] as const
export type AmendmentStatus = (typeof AMENDMENT_STATUSES)[number]

/** Produits filtrables (le backend accepte aussi MRH_STANDARD, non proposé). */
export const AMENDMENT_PRODUCTS = ['IA_STANDARD', 'IA_FOR_ALL'] as const
export type AmendmentProduct = (typeof AMENDMENT_PRODUCTS)[number]

export type DeltaKind = 'UNCHANGED' | 'INCREASE' | 'REFUND'
export type ReceiptKind = 'SUPPLEMENTARY_CALL' | 'REFUND'
export type ReceiptStatus =
  | 'TO_PAY'
  | 'PAID'
  | 'TO_REFUND'
  | 'CANCELLED'
  | 'PAID_NOT_APPLIED'
export type BeneficiaryRelationship =
  | 'SELF'
  | 'SPOUSE'
  | 'CHILD'
  | 'PARENT'
  | 'SIBLING'
  | 'OTHER'

export interface AmendmentBeneficiary {
  name: string
  phone: string
  relationship: BeneficiaryRelationship
  sharePercent: number
}

export interface FormulaSnapshot {
  formulaId?: number | null
  label?: string | null
  deathCapital?: number | null
  permanentDisabilityCapital?: number | null
  medicalExpenses?: number | null
  dailyAllowance?: number | null
  netPremium?: number | null
  fees?: number | null
  tax?: number | null
  grossPremium?: number | null
  durationMonths?: number | null
}

export interface AppliedModifier {
  code: string
  label: string
  modifierType: 'SURCHARGE' | 'DISCOUNT'
  rate: number
}

export interface RiskClassSnapshot {
  riskClassId?: number | null
  classNumber?: number | null
  description?: string | null
  deathRate?: number | null
  permanentDisabilityRate?: number | null
  medicalExpensesRate?: number | null
  deathCapital?: number | null
  permanentDisabilityCapital?: number | null
  medicalExpensesCapital?: number | null
  deathPremium?: number | null
  permanentDisabilityPremium?: number | null
  medicalExpensesPremium?: number | null
  assistancePremium?: number | null
  surchargeRate?: number | null
  reductionRate?: number | null
  appliedModifiers?: AppliedModifier[] | null
  appliedAgeSurcharge?: {
    minAge: number
    maxAge: number
    rate: number
  } | null
  insuredAge?: number | null
  premiumBeforeProration?: number | null
  durationMonths?: number | null
  prorationCoefficient?: number | null
}

/** Écart de prime, signé, en francs entiers. */
export interface AmendmentDelta {
  kind: DeltaKind
  effectiveDate: string
  remainingDays: number
  termDays: number
  netDelta: number
  fees: number
  tax: number
  total: number
}

export interface AmendmentReceipt {
  receiptNumber: string
  kind: ReceiptKind
  status: ReceiptStatus
  netAmount: number
  fees: number
  tax: number
  total: number
  effectiveDate?: string | null
  expiryDate?: string | null
  remainingDays?: number | null
}

export interface Amendment {
  id: number
  subscriptionId: number
  status: AmendmentStatus
  formulaId?: number | null
  riskClassId?: number | null
  deathCapital?: number | null
  permanentDisabilityCapital?: number | null
  medicalExpensesCapital?: number | null
  appliedModifierCodes?: string[] | null
  reductionRate?: number | null
  insuredPhone: string
  beneficiaries: AmendmentBeneficiary[]
  tariffChanged: boolean
  formulaSnapshot?: FormulaSnapshot | null
  riskClassSnapshot?: RiskClassSnapshot | null
  /** Peuvent porter des centimes : toujours affichés au franc (spec E3). */
  netPremium: number
  fees: number
  tax: number
  grossPremium: number
  delta: AmendmentDelta
  amendmentNumber?: number | null
  createdAt: string
  updatedAt: string
  appliedAt?: string | null
  deletedAt?: string | null
  validatedAt?: string | null
  receipt?: AmendmentReceipt | null
}

/** Contrat tel qu'il est aujourd'hui (comparatif « Avant »). */
export interface AmendmentCurrent {
  formulaSnapshot?: FormulaSnapshot | null
  riskClassSnapshot?: RiskClassSnapshot | null
  netPremium: number
  fees: number
  tax: number
  totalPremium: number
  insuredPhone: string
  beneficiaries: AmendmentBeneficiary[]
  amendmentNumber?: number | null
}

export interface AmendmentDetail extends Amendment {
  policyNumber?: string | null
  /** « NOM Prénom ». */
  clientName?: string | null
  current: AmendmentCurrent
}

/* ------------------------------------------------------------------ */
/* Recherche de la liste (URL), reportée au détail pour le « Retour */
/* ------------------------------------------------------------------ */

export const AMENDMENT_SORTS = [
  'createdAt,desc',
  'createdAt,asc',
  'updatedAt,desc',
  'updatedAt,asc',
] as const

/** Paramètres d'URL de la liste ; le détail les reçoit pour que « Retour » retrouve la même vue. */
export const amendmentListSearchSchema = z.object({
  status: z.enum(AMENDMENT_STATUSES).catch('DRAFT'),
  product: z.enum(AMENDMENT_PRODUCTS).optional().catch(undefined),
  page: z.coerce.number().int().min(0).catch(0),
  size: z.coerce.number().int().min(1).max(100).catch(20),
  sort: z.enum(AMENDMENT_SORTS).catch('createdAt,desc'),
})

export type AmendmentListSearch = z.output<typeof amendmentListSearchSchema>

/** Vue par défaut de la liste : onglet « À traiter ». */
export const DEFAULT_LIST_SEARCH: AmendmentListSearch = {
  status: 'DRAFT',
  page: 0,
  size: 20,
  sort: 'createdAt,desc',
}

/* ------------------------------------------------------------------ */
/* Libellés                                                            */
/* ------------------------------------------------------------------ */

export const AMENDMENT_STATUS_LABELS: Record<AmendmentStatus, string> = {
  DRAFT: 'À traiter',
  AWAITING_PAYMENT: 'En attente de paiement',
  APPLIED: 'Appliquée',
  DELETED: 'Supprimée',
}

export const AMENDMENT_STATUS_TONES: Record<AmendmentStatus, PillTone> = {
  DRAFT: 'warning',
  AWAITING_PAYMENT: 'info',
  APPLIED: 'success',
  DELETED: 'neutral',
}

export const RECEIPT_STATUS_LABELS: Record<ReceiptStatus, string> = {
  TO_PAY: 'À payer',
  PAID: 'Payée',
  TO_REFUND: 'À rembourser',
  CANCELLED: 'Annulée',
  PAID_NOT_APPLIED: 'Payée après suppression, à traiter par NSIA',
}

export const RECEIPT_STATUS_TONES: Record<ReceiptStatus, PillTone> = {
  TO_PAY: 'warning',
  PAID: 'success',
  TO_REFUND: 'info',
  CANCELLED: 'neutral',
  PAID_NOT_APPLIED: 'danger',
}

export const RECEIPT_KIND_LABELS: Record<ReceiptKind, string> = {
  SUPPLEMENTARY_CALL: 'Appel de prime supplémentaire',
  REFUND: 'Ristourne',
}

export const RELATIONSHIP_LABELS: Record<BeneficiaryRelationship, string> = {
  SELF: 'Assuré lui-même',
  SPOUSE: 'Conjoint',
  CHILD: 'Enfant',
  PARENT: 'Parent',
  SIBLING: 'Frère/sœur',
  OTHER: 'Autre',
}

export const DELTA_KIND_LABELS: Record<DeltaKind, string> = {
  INCREASE: 'Hausse',
  REFUND: 'Baisse',
  UNCHANGED: 'Inchangée',
}

export const DELTA_KIND_TONES: Record<DeltaKind, PillTone> = {
  INCREASE: 'warning',
  REFUND: 'info',
  UNCHANGED: 'neutral',
}

/** Titre de l'encadré d'écart. */
export const DELTA_TITLES: Record<DeltaKind, string> = {
  INCREASE: 'Prime supplémentaire à payer',
  REFUND: 'Ristourne au client',
  UNCHANGED: 'Prime inchangée : avenant seul',
}

export const AMENDMENT_PRODUCT_LABELS: Record<AmendmentProduct, string> = {
  IA_STANDARD: 'IA Standard',
  IA_FOR_ALL: 'IA Pour Tous',
}

/** Produit d'une modification : `formulaSnapshot` ⇒ IA Pour Tous, `riskClassSnapshot` ⇒ IA Standard. */
export function amendmentProduct(
  amendment: Pick<Amendment, 'formulaSnapshot' | 'riskClassSnapshot'>,
): AmendmentProduct | null {
  if (amendment.formulaSnapshot) return 'IA_FOR_ALL'
  if (amendment.riskClassSnapshot) return 'IA_STANDARD'
  return null
}

/** Le comparatif n'a de sens que tant que la modification n'est pas appliquée (spec E7). */
export function showsComparison(status: AmendmentStatus): boolean {
  return status === 'DRAFT' || status === 'AWAITING_PAYMENT'
}

export const canValidate = (status: AmendmentStatus) => status === 'DRAFT'
export const canDelete = (status: AmendmentStatus) =>
  status === 'DRAFT' || status === 'AWAITING_PAYMENT'

/* ------------------------------------------------------------------ */
/* Comparatif avant / après                                            */
/* ------------------------------------------------------------------ */

export interface ComparisonRow {
  key: string
  label: string
  before: string
  after: string
  changed: boolean
}

export interface BeneficiaryComparison {
  before: AmendmentBeneficiary[]
  after: AmendmentBeneficiary[]
  changed: boolean
}

const NONE = '—'

const fcfa = (value?: number | null) =>
  value == null ? NONE : formatFcfa(value)

function riskClassLabel(snapshot?: RiskClassSnapshot | null): string {
  if (!snapshot) return NONE
  const number =
    snapshot.classNumber == null ? '' : `Classe ${snapshot.classNumber}`
  const description = snapshot.description?.replace(/\s+/g, ' ').trim()
  if (number && description) return `${number} — ${description}`
  return number || description || NONE
}

function modifiersLabel(snapshot?: RiskClassSnapshot | null): string {
  if (!snapshot) return NONE
  const modifiers = snapshot.appliedModifiers ?? []
  if (modifiers.length === 0) return 'Aucune'
  return modifiers.map((modifier) => modifier.label).join(', ')
}

function row(
  key: string,
  label: string,
  before: string,
  after: string,
): ComparisonRow {
  return { key, label, before, after, changed: before !== after }
}

export function sameBeneficiaries(
  a: AmendmentBeneficiary[],
  b: AmendmentBeneficiary[],
): boolean {
  if (a.length !== b.length) return false
  const key = (x: AmendmentBeneficiary) =>
    `${x.name}|${x.phone}|${x.relationship}|${x.sharePercent}`
  const left = a.map(key).sort()
  const right = b.map(key).sort()
  return left.every((value, index) => value === right[index])
}

/**
 * Lignes « avant / après » d'une modification (avant = `current`, après = la
 * modification) selon son produit, et comparaison des bénéficiaires. Les
 * montants sont arrondis au franc (spec E3).
 */
export function buildComparison(detail: AmendmentDetail): {
  rows: ComparisonRow[]
  beneficiaries: BeneficiaryComparison
} {
  const product = amendmentProduct(detail)
  const rows: ComparisonRow[] = []
  if (product === 'IA_FOR_ALL') {
    const before = detail.current.formulaSnapshot
    const after = detail.formulaSnapshot
    rows.push(
      row('formula', 'Formule', before?.label ?? NONE, after?.label ?? NONE),
      row(
        'death',
        'Capital décès',
        fcfa(before?.deathCapital),
        fcfa(after?.deathCapital),
      ),
      row(
        'disability',
        'Capital invalidité permanente',
        fcfa(before?.permanentDisabilityCapital),
        fcfa(after?.permanentDisabilityCapital),
      ),
      row(
        'medical',
        'Frais médicaux',
        fcfa(before?.medicalExpenses),
        fcfa(after?.medicalExpenses),
      ),
    )
    if (before?.dailyAllowance != null || after?.dailyAllowance != null) {
      rows.push(
        row(
          'daily',
          'Indemnité journalière',
          fcfa(before?.dailyAllowance),
          fcfa(after?.dailyAllowance),
        ),
      )
    }
  } else if (product === 'IA_STANDARD') {
    const before = detail.current.riskClassSnapshot
    const after = detail.riskClassSnapshot
    rows.push(
      row(
        'class',
        'Classe de risque',
        riskClassLabel(before),
        riskClassLabel(after),
      ),
      row(
        'death',
        'Capital décès',
        fcfa(before?.deathCapital),
        fcfa(after?.deathCapital),
      ),
      row(
        'disability',
        'Capital invalidité permanente',
        fcfa(before?.permanentDisabilityCapital),
        fcfa(after?.permanentDisabilityCapital),
      ),
      row(
        'medical',
        'Frais médicaux',
        fcfa(before?.medicalExpensesCapital),
        fcfa(after?.medicalExpensesCapital),
      ),
      row(
        'modifiers',
        'Majorations cochées',
        modifiersLabel(before),
        modifiersLabel(after),
      ),
      row(
        'reduction',
        'Remise',
        before ? formatPercent(before.reductionRate ?? 0) : NONE,
        after ? formatPercent(after.reductionRate ?? 0) : NONE,
      ),
    )
  }
  rows.push(
    row(
      'premium',
      'Prime annuelle',
      fcfa(detail.current.totalPremium),
      fcfa(detail.grossPremium),
    ),
    row(
      'phone',
      'Téléphone de l’assuré',
      detail.current.insuredPhone,
      detail.insuredPhone,
    ),
  )
  return {
    rows,
    beneficiaries: {
      before: detail.current.beneficiaries,
      after: detail.beneficiaries,
      changed: !sameBeneficiaries(
        detail.current.beneficiaries,
        detail.beneficiaries,
      ),
    },
  }
}

/** Lignes de l'état demandé seul (modification appliquée ou supprimée, spec E7). */
export function buildRequestedRows(
  detail: AmendmentDetail,
): Array<{ key: string; label: string; value: string }> {
  return buildComparison(detail).rows.map(({ key, label, after }) => ({
    key,
    label,
    value: after,
  }))
}

/* ------------------------------------------------------------------ */
/* Validation : textes de confirmation et d'issue                      */
/* ------------------------------------------------------------------ */

const RECOMPUTE_NOTE =
  'Le montant est recalculé à la date du jour : seul le nombre de jours restants change, pas la prime annuelle.'

/** Texte de la confirmation de validation, selon l'écart estimé. */
export function validateConfirmation(delta: AmendmentDelta): string {
  const amount = formatFcfa(Math.abs(delta.total))
  const outcome =
    delta.kind === 'UNCHANGED'
      ? 'L’avenant sera appliqué immédiatement.'
      : delta.kind === 'REFUND'
        ? `L’avenant sera appliqué et une ristourne de ${amount} sera à rembourser au client.`
        : `Une quittance de ${amount} sera envoyée au client. Le contrat changera après son paiement.`
  return `${outcome} ${RECOMPUTE_NOTE}`
}

/** Message de succès d'après la **réponse** du serveur, qui fait foi pour le montant. */
export function validationOutcome(amendment: Amendment): string {
  const amount = formatFcfa(
    Math.abs(amendment.receipt?.total ?? amendment.delta.total),
  )
  if (amendment.status === 'AWAITING_PAYMENT') {
    return `Quittance de ${amount} envoyée au client : le contrat changera après son paiement.`
  }
  const numbered =
    amendment.amendmentNumber != null
      ? `Modification appliquée (avenant n° ${amendment.amendmentNumber}).`
      : 'Modification appliquée.'
  return amendment.delta.kind === 'REFUND'
    ? `${numbered} Ristourne de ${amount} à rembourser au client.`
    : numbered
}

/** Avertissement avant suppression. */
export function deleteConfirmation(status: AmendmentStatus): string {
  return status === 'AWAITING_PAYMENT'
    ? 'La quittance sera annulée et le client ne pourra plus la payer. La modification sera conservée dans l’historique comme supprimée.'
    : 'La modification sera conservée dans l’historique comme supprimée.'
}

/* ------------------------------------------------------------------ */
/* Erreurs                                                             */
/* ------------------------------------------------------------------ */

export type AmendmentErrorKind =
  | 'not-draft'
  | 'not-amendable'
  | 'already-applied'
  | 'not-found'
  | 'forbidden'
  | 'other'

function errorCode(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined
  const errors = (data as { errors?: unknown }).errors
  if (!errors || typeof errors !== 'object') return undefined
  const status = (errors as { status?: unknown }).status
  return typeof status === 'string' ? status : undefined
}

/** Traduit une erreur des routes de modification (codes `errors.status` du backend). */
export function mapAmendmentError(error: unknown): {
  kind: AmendmentErrorKind
  message: string
} {
  if (isAxiosError(error)) {
    const status = error.response?.status
    const code = errorCode(error.response?.data)
    if (code === 'AMENDMENT_NOT_DRAFT')
      return {
        kind: 'not-draft',
        message: 'Cette modification a déjà été traitée.',
      }
    if (code === 'SUBSCRIPTION_NOT_AMENDABLE')
      return {
        kind: 'not-amendable',
        message:
          'Le contrat ne peut plus être modifié (inactif, échu ou résilié).',
      }
    if (code === 'AMENDMENT_ALREADY_APPLIED')
      return {
        kind: 'already-applied',
        message: 'Modification déjà appliquée : suppression impossible.',
      }
    if (status === 404)
      return { kind: 'not-found', message: 'Modification introuvable.' }
    if (status === 403)
      return {
        kind: 'forbidden',
        message: 'Vous n’avez pas le droit d’effectuer cette action.',
      }
  }
  return { kind: 'other', message: apiErrorMessage(error) }
}

/** Erreur du téléchargement du PDF (corps de réponse en blob : seul le statut est lisible). */
export function mapPolicyDocumentError(error: unknown): {
  retry: boolean
  message: string
} {
  if (isAxiosError(error)) {
    const status = error.response?.status
    if (status === 404)
      return {
        retry: true,
        message:
          'Le PDF n’est pas encore disponible : il suit l’émission de quelques minutes. Réessayez plus tard.',
      }
    if (status === 502)
      return {
        retry: true,
        message:
          'Stockage des documents momentanément indisponible. Réessayez plus tard.',
      }
    if (status === 403)
      return {
        retry: false,
        message: 'Vous n’avez pas le droit de consulter ce document.',
      }
  }
  return {
    retry: true,
    message: 'Impossible de télécharger le PDF. Réessayez plus tard.',
  }
}
