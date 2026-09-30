/**
 * Traduction française des messages que le backend renvoie en anglais
 * (motifs `holdReason` des distributions de commission, messages d'erreur
 * 400/403/404/409, lignes d'erreur d'import CSV, descriptions de rôles).
 *
 * Source des textes : `assurances-backend-v2` (`CommissionService`,
 * `GlobalExceptionHandler`, `AccessoryService`…). Un message inconnu est
 * renvoyé tel quel : il vaut mieux un texte anglais qu'un texte perdu.
 */

/** Messages figés (comparaison exacte, insensible à la casse et à la ponctuation finale). */
const EXACT: Record<string, string> = {
  // holdReason — distributions de commission
  'the quotation of this collection is not readable: it has been deleted':
    'La cotation de cet encaissement a été supprimée.',
  'the product of the collected quotation is not readable: it has been deleted':
    'Le produit de la cotation encaissée a été supprimé.',
  'quotation gross premium is not positive: the collected net premium cannot be prorated':
    'La prime brute de la cotation n’est pas positive : la prime nette encaissée ne peut pas être proratisée.',
  'distributor code matches no active seller and is not the house partner code':
    'Le code distributeur ne correspond à aucun vendeur actif et n’est pas celui du partenaire maison.',
  'distributor code belongs to a partner other than the house partner: no commission chain':
    'Le code distributeur appartient à un partenaire autre que le partenaire maison : aucune chaîne de commission.',
  'distributor code belongs to an agency: an agency is never the origin of a sale':
    'Le code distributeur est celui d’une agence : une agence n’est jamais à l’origine d’une vente.',
  'house partner is not registered for the configured house partner code':
    'Le partenaire maison n’est pas enregistré pour le code configuré.',
  'the agency of the selling seller is not readable: it has been deleted':
    'L’agence du vendeur a été supprimée.',
  'the agency of the selling seller is not attached to any partner':
    'L’agence du vendeur n’est rattachée à aucun partenaire.',
  'the partner of the commission chain is not readable: it has been deleted':
    'Le partenaire de la chaîne de commission a été supprimé.',
  'the selling seller is attached to neither an agency nor a partner':
    'Le vendeur n’est rattaché ni à une agence ni à un partenaire.',
  'the commission scheme of this partner and product has no commission rate configured: nothing can be distributed yet':
    'Le schéma de commission de ce partenaire et de ce produit n’a pas de taux configuré : rien ne peut être réparti pour l’instant.',
  'no commission scheme for this partner and product':
    'Aucun schéma de commission pour ce partenaire et ce produit.',
  'level 3 sale is not covered by the commission scheme':
    'Une vente de niveau 3 n’est pas couverte par le schéma de commission.',
  'level 3 shares are missing from the commission scheme':
    'Les parts du niveau 3 sont absentes du schéma de commission.',
  'level 2 sale is not covered by the commission scheme':
    'Une vente de niveau 2 n’est pas couverte par le schéma de commission.',
  'level 2 shares are missing from the commission scheme':
    'Les parts du niveau 2 sont absentes du schéma de commission.',
  'commission scheme shares of the applied level do not total 100':
    'Les parts du schéma de commission pour ce niveau ne totalisent pas 100 %.',
  'commission split produced a negative amount on at least one line':
    'La répartition de la commission produit un montant négatif sur au moins une ligne.',
  'only an on-hold commission distribution can be retried':
    'Seule une distribution en attente peut être rejouée.',
  'commission rate is required on a commission scheme':
    'Le taux de commission est obligatoire sur un schéma.',
  'commission rate must be between 0.00 and 100.00':
    'Le taux de commission doit être compris entre 0 et 100.',
  'commission rate must have at most two decimals':
    'Le taux de commission accepte au plus deux décimales.',
  'level 1 scheme cannot define commission shares':
    'Un schéma de niveau 1 ne peut pas définir de parts de commission.',
  'level 2 scheme requires a direct seller':
    'Un schéma de niveau 2 nécessite un vendeur direct.',
  'level 3 scheme requires an agency with a seller':
    'Un schéma de niveau 3 nécessite une agence avec un vendeur.',
  'level 2 shares must total exactly 100':
    'Les parts du niveau 2 doivent totaliser exactement 100 %.',
  'level 3 shares must total exactly 100':
    'Les parts du niveau 3 doivent totaliser exactement 100 %.',
  'commission scheme already exists for this partner and product':
    'Un schéma de commission existe déjà pour ce partenaire et ce produit.',
  'level 3 shares require maxlevel 3':
    'Les parts de niveau 3 nécessitent un niveau maximum de 3.',

  // Import CSV
  'csv file is empty or missing': 'Le fichier CSV est vide ou absent.',
  'csv file is empty': 'Le fichier CSV est vide.',
  'invalid header, expected columns: productcode,minpremium,maxpremium,amount':
    'En-tête invalide : les colonnes attendues sont productCode,minPremium,maxPremium,amount.',
  'expected 4 columns: productcode,minpremium,maxpremium,amount':
    'Quatre colonnes attendues : productCode,minPremium,maxPremium,amount.',
  'maxpremium must be greater than or equal to minpremium':
    'maxPremium doit être supérieur ou égal à minPremium.',
  'a non-empty file is required': 'Un fichier non vide est requis.',
  'could not read the uploaded file': 'Le fichier envoyé est illisible.',
  'failed to read csv file': 'Le fichier CSV est illisible.',
  'unsupported or unrecognised file type':
    'Type de fichier non pris en charge.',

  // Authentification / droits
  'account not activated — please verify your email address first':
    'Compte non activé : vérifiez d’abord votre adresse e-mail.',
  'authentication failed': 'Échec de l’authentification.',
  'bad credentials': 'Identifiants incorrects.',
  'invalid credentials': 'Identifiants incorrects.',
  'access denied': 'Accès refusé.',
  forbidden: 'Accès refusé.',
  'this account does not have access to this login endpoint':
    'Ce compte n’a pas accès à cette interface.',
  'back-office account required': 'Un compte back-office est requis.',
  'seller account required': 'Un compte vendeur est requis.',
  'client account required': 'Un compte client est requis.',
  'current password is incorrect': 'Le mot de passe actuel est incorrect.',
  'too many attempts': 'Trop de tentatives. Réessayez plus tard.',
  'expired refresh token': 'Session expirée. Veuillez vous reconnecter.',
  'invalid refresh token': 'Session invalide. Veuillez vous reconnecter.',
  'revoked refresh token': 'Session révoquée. Veuillez vous reconnecter.',
  'missing refresh token': 'Session absente. Veuillez vous reconnecter.',
  'invalid password reset token':
    'Lien de réinitialisation invalide ou expiré.',
  'user not found': 'Utilisateur introuvable.',
  'no user found with this email':
    'Aucun utilisateur avec cette adresse e-mail.',

  // Conflits / contraintes
  'a record with these details already exists':
    'Un enregistrement avec ces informations existe déjà.',
  'the request violates a data constraint':
    'La requête viole une contrainte de données.',
  'internal server error': 'Une erreur serveur est survenue.',
  'system documents cannot be deleted':
    'Les documents système ne peuvent pas être supprimés.',
  'system documents cannot be renamed':
    'Les documents système ne peuvent pas être renommés.',
  'partner and product cannot be changed':
    'Le partenaire et le produit ne peuvent pas être modifiés.',
  'base rate already exists for this legal quality':
    'Un tarif de base existe déjà pour cette qualité juridique.',
  'product already added to this rate table':
    'Ce produit est déjà dans cette grille tarifaire.',
  'warranty already assigned to this legal quality':
    'Cette garantie est déjà affectée à cette qualité juridique.',
  'risk class cannot be deleted while it is still in use':
    'Une classe de risque encore utilisée ne peut pas être supprimée.',
  'occupations cannot be added to an inactive risk class':
    'Impossible d’ajouter un métier à une classe de risque inactive.',
  'occupations cannot be moved to an inactive risk class':
    'Impossible de déplacer un métier vers une classe de risque inactive.',
  'risk class number cannot change once a contract is attached to the class':
    'Le numéro d’une classe ne peut plus changer dès qu’un contrat y est rattaché.',
  'the age surcharge is required for product ia_standard':
    'La majoration d’âge est obligatoire pour IA Standard.',
  'the age surcharge only applies to product ia_standard':
    'La majoration d’âge ne s’applique qu’à IA Standard.',
  'only quoted quotations can be modified':
    'Seules les cotations au statut « Cotée » peuvent être modifiées.',
  'only quoted quotations can be subscribed':
    'Seules les cotations au statut « Cotée » peuvent être souscrites.',
  'this conversation is closed': 'Cette conversation est clôturée.',
  'claims can only be declared on an active contract':
    'Un sinistre ne peut être déclaré que sur un contrat actif.',
  'a claim cannot be declared for a future date':
    'Un sinistre ne peut pas être déclaré à une date future.',
  'no active verification code': 'Aucun code de vérification actif.',
  'verification code expired': 'Le code de vérification a expiré.',
  'invalid verification code': 'Code de vérification invalide.',
  'unknown claim type': 'Type de sinistre inconnu.',

  // Validation Jakarta
  'must not be blank': 'Ce champ est obligatoire.',
  'must not be null': 'Ce champ est obligatoire.',
  'must not be empty': 'Ce champ est obligatoire.',
  'must be a well-formed email address': 'Adresse e-mail invalide.',
  'must be greater than 0': 'Doit être supérieur à 0.',
  'must be greater than or equal to 0': 'Doit être supérieur ou égal à 0.',
  'must be a positive number': 'Doit être un nombre positif.',
}

type Rule = [RegExp, (...groups: string[]) => string]

/** Motifs avec valeur variable (identifiant, code, numéro de ligne…). */
const PATTERNS: Rule[] = [
  [
    /^product not found for productCode: (.+)$/i,
    (code) => `Produit introuvable pour le code produit ${code}.`,
  ],
  [
    /^productCode must be an integer: '?(.*?)'?$/i,
    (raw) => `productCode doit être un nombre entier (reçu « ${raw} »).`,
  ],
  [
    /^(\w+) must be a number: '?(.*?)'?$/i,
    (field, raw) => `${field} doit être un nombre (reçu « ${raw} »).`,
  ],
  [
    /^(\w+) must be positive or zero$/i,
    (field) => `${field} doit être positif ou nul.`,
  ],
  [
    /^(.+?) not found with id: (\d+)$/i,
    (entity, id) => `${entityLabel(entity)} introuvable (n° ${id}).`,
  ],
  [
    /^(.+?) not found with phone number: (.+)$/i,
    (entity, phone) =>
      `${entityLabel(entity)} introuvable pour le numéro ${phone}.`,
  ],
  [
    /^Csv import failed with (\d+) error\(s\)$/i,
    (n) => `L’import a échoué : ${n} erreur${Number(n) > 1 ? 's' : ''}.`,
  ],
  [
    /^Quotation cannot be converted from status (.+)$/i,
    (status) =>
      `Cette cotation ne peut pas être convertie depuis le statut ${status}.`,
  ],
  [
    /^Subscription cannot be activated from status (.+)$/i,
    (status) =>
      `Ce contrat ne peut pas être activé depuis le statut ${status}.`,
  ],
  [
    /^File exceeds the maximum size of (.+)$/i,
    (size) => `Le fichier dépasse la taille maximale autorisée (${size}).`,
  ],
  [
    /^size must be between (\d+) and (\d+)$/i,
    (min, max) =>
      `La longueur doit être comprise entre ${min} et ${max} caractères.`,
  ],
  [
    /^must be greater than or equal to (-?[\d.]+)$/i,
    (n) => `Doit être supérieur ou égal à ${n}.`,
  ],
  [
    /^must be less than or equal to (-?[\d.]+)$/i,
    (n) => `Doit être inférieur ou égal à ${n}.`,
  ],
]

const ENTITY_LABELS: Record<string, string> = {
  accessory: 'Accessoire',
  agency: 'Agence',
  claim: 'Sinistre',
  claimtype: 'Type de sinistre',
  client: 'Client',
  commissionscheme: 'Schéma de commission',
  formula: 'Formule',
  legalquality: 'Qualité juridique',
  notification: 'Notification',
  occupation: 'Métier',
  partner: 'Partenaire',
  permission: 'Permission',
  premiummodifier: 'Majoration',
  product: 'Produit',
  prorationcoefficient: 'Coefficient de prorata',
  quotation: 'Cotation',
  ratetable: 'Grille tarifaire',
  riskclass: 'Classe de risque',
  riskclasspremiumrate: 'Barème de prime',
  role: 'Rôle',
  seller: 'Vendeur',
  subscription: 'Contrat',
  user: 'Utilisateur',
  wallet: 'Portefeuille',
  warranty: 'Garantie',
}

function entityLabel(raw: string): string {
  const key = raw.replace(/[\s_-]/g, '').toLowerCase()
  return ENTITY_LABELS[key] ?? raw
}

function normalizeKey(message: string): string {
  return message
    .trim()
    .replace(/[.\s]+$/, '')
    .toLowerCase()
}

/**
 * Traduit un message backend connu en français ; renvoie le message d'origine
 * (nettoyé) s'il n'est pas reconnu. Ne jamais l'appliquer à un texte déjà
 * français : il est alors renvoyé tel quel.
 */
export function translateBackendMessage(message: string): string {
  const trimmed = message.trim()
  if (!trimmed) return trimmed
  const exact = EXACT[normalizeKey(trimmed)]
  if (exact) return exact
  const core = trimmed.replace(/[.\s]+$/, '')
  for (const [pattern, build] of PATTERNS) {
    const match = pattern.exec(core)
    if (match) return build(...match.slice(1))
  }
  return trimmed
}

/** Vrai si `translateBackendMessage` reconnaît le message. */
export function isKnownBackendMessage(message: string): boolean {
  return translateBackendMessage(message) !== message.trim()
}

/** Descriptions des rôles système renvoyées en anglais par `GET /roles`. */
const ROLE_DESCRIPTIONS: Partial<Record<string, string>> = {
  'full access to all resources': 'Accès complet à toutes les ressources.',
  'seller agent — quotations and clients':
    'Agent vendeur : cotations et clients.',
  'self-service client account': 'Compte client en libre-service.',
  'front-end developer - api documentation only':
    'Développeur front-end : documentation de l’API uniquement.',
  'manages agencies and sellers within their scope':
    'Gère les agences et les vendeurs de son périmètre.',
}

/** Traduit la description d'un rôle (repli : le texte d'origine ; `null` → chaîne vide). */
export function translateRoleDescription(
  description: string | null | undefined,
): string {
  if (!description) return ''
  const known = ROLE_DESCRIPTIONS[normalizeKey(description)]
  return known ?? translateBackendMessage(description)
}
