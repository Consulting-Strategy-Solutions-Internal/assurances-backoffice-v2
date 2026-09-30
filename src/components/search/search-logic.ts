import { formatPersonName } from '#/lib/people'
import { matchesWords, normalizeSearch, queryWords } from '#/lib/search'
import { formatPhone } from '#/lib/clients'
import { makeAdminRolePredicate } from '#/lib/admin-roles'
import type { RoleResponse } from '#/services/roles'
import type { ClaimResponse } from '#/services/claims'
import type { ClientResponse } from '#/services/clients'
import type { OccupationSearchResult } from '#/services/ia-standard'
import type { PartnerResponse } from '#/services/partners'
import type { SupportConversationResponse } from '#/services/support'
import type { UserResponse } from '#/services/users'

export type SearchGroupId =
  | 'pages'
  | 'clients'
  | 'partners'
  | 'admins'
  | 'tickets'
  | 'claims'
  | 'occupations'

/** Where a result leads (fed to the router's `navigate`). */
export interface SearchTarget {
  to: string
  params?: Record<string, string>
  search?: Record<string, unknown>
}

export interface SearchResult {
  /** Unique across groups (`clients:12`). */
  id: string
  group: SearchGroupId
  title: string
  subtitle?: string
  target: SearchTarget
  /** « Voir tous les clients » link rather than a record. */
  kind?: 'result' | 'seeAll'
}

export interface SearchGroup {
  id: SearchGroupId
  label: string
  results: SearchResult[]
  /** Matches before truncation to `limit`. */
  total: number
  /** Source still loading (no results yet). */
  loading?: boolean
  /** Source refused (403) or failed: shown instead of a silent « no result ». */
  error?: SearchSourceError
}

export type SearchSourceError = 'forbidden' | 'failed'

export const GROUP_LABELS: Record<SearchGroupId, string> = {
  pages: 'Pages',
  clients: 'Clients',
  partners: 'Partenaires',
  admins: 'Administrateurs',
  tickets: 'Tickets support',
  claims: 'Sinistres',
  occupations: 'Métiers IA',
}

/** Display order of the groups in the panel. */
export const GROUP_ORDER: SearchGroupId[] = [
  'pages',
  'clients',
  'claims',
  'tickets',
  'partners',
  'admins',
  'occupations',
]

/** Groups whose list page reads a `?q=` search param. */
const SEE_ALL_FILTERABLE = new Set<SearchGroupId>([
  'clients',
  'partners',
  'admins',
  'tickets',
  'claims',
])

/** « Voir tous les … » link per group (label, list page). */
export const SEE_ALL: Partial<
  Record<SearchGroupId, { label: string; target: SearchTarget }>
> = {
  clients: { label: 'Voir tous les clients', target: { to: '/clients' } },
  partners: { label: 'Voir tous les partenaires', target: { to: '/partners' } },
  admins: { label: 'Voir tous les administrateurs', target: { to: '/users' } },
  tickets: { label: 'Voir tous les tickets', target: { to: '/support' } },
  claims: { label: 'Voir tous les sinistres', target: { to: '/sinistres' } },
  occupations: {
    label: 'Voir les classes et métiers',
    target: { to: '/produits-ia/ia-standard/classes' },
  },
}

export const DEFAULT_GROUP_LIMIT = 5

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

interface PageEntry {
  title: string
  /** Section shown as subtitle (« IA Standard »). */
  section?: string
  to: string
  keywords: string
}

export const PAGES: PageEntry[] = [
  {
    title: "Vue d'ensemble",
    to: '/dashboard',
    keywords: 'tableau de bord dashboard accueil kpi statistiques indicateurs',
  },
  {
    title: 'Sinistres',
    to: '/sinistres',
    keywords: 'declaration sinistre claims dossier',
  },
  {
    title: 'Types de sinistre',
    section: 'Sinistres',
    to: '/sinistres/types',
    keywords: 'catalogue types sinistre pieces justificatives',
  },
  {
    title: 'Clients',
    to: '/clients',
    keywords: 'assures souscripteurs telephone email',
  },
  {
    title: 'Support client',
    to: '/support',
    keywords: 'tickets chat conversations messages aide',
  },
  {
    title: 'Cotations',
    to: '/cotations',
    keywords: 'devis simulation prime quotation',
  },
  {
    title: 'Classes & métiers',
    section: 'IA Standard',
    to: '/produits-ia/ia-standard/classes',
    keywords:
      'classes de risque metiers professions occupations individuel accident',
  },
  {
    title: 'Barèmes',
    section: 'IA Standard',
    to: '/produits-ia/ia-standard/baremes',
    keywords: 'bareme taux prime tarif grille permille',
  },
  {
    title: 'Majorations & réductions',
    section: 'IA Standard',
    to: '/produits-ia/ia-standard/majorations',
    keywords: 'majoration reduction surcharge remise age modificateurs',
  },
  {
    title: 'Accessoires',
    section: 'IA Standard',
    to: '/produits-ia/ia-standard/accessoires',
    keywords: 'frais accessoire tranches csv import',
  },
  {
    title: 'Prorata court terme',
    section: 'IA Standard',
    to: '/produits-ia/ia-standard/prorata',
    keywords: 'prorata coefficients duree mois court terme',
  },
  {
    title: 'Réglages IA Standard',
    section: 'IA Standard',
    to: '/produits-ia/ia-standard/reglages',
    keywords: 'reglages parametres duree age bornes',
  },
  {
    title: 'Formules',
    section: 'IA Pour Tous',
    to: '/produits-ia/ia-pour-tous',
    keywords: 'ia pour tous formules garanties forfaitaires',
  },
  {
    title: 'Situations & taux de base',
    section: 'MRH Standard',
    to: '/produits-mrh/mrh-standard/situations',
    keywords:
      'multirisque habitation mrh situations qualites juridiques locataire proprietaire taux base permille loyer multiplicateur',
  },
  {
    title: 'Garanties',
    section: 'MRH Standard',
    to: '/produits-mrh/mrh-standard/garanties',
    keywords: 'multirisque habitation mrh garanties taxe incendie',
  },
  {
    title: 'Garanties par situation',
    section: 'MRH Standard',
    to: '/produits-mrh/mrh-standard/tarifs',
    keywords:
      'multirisque habitation mrh grille tarif garanties obligatoire forfait pourcentage capital inondation',
  },
  {
    title: 'Accessoires',
    section: 'MRH Standard',
    to: '/produits-mrh/mrh-standard/accessoires',
    keywords: 'multirisque habitation mrh frais accessoire tranches csv import',
  },
  {
    title: 'Schémas de commission',
    section: 'Commissions',
    to: '/commissions/schemes',
    keywords: 'schema commission taux niveaux partage',
  },
  {
    title: 'Distributions',
    section: 'Commissions',
    to: '/commissions/distributions',
    keywords: 'distribution commission rejeu en attente encaissements',
  },
  {
    title: 'Portefeuilles',
    section: 'Commissions',
    to: '/commissions/wallets',
    keywords: 'wallets portefeuille solde mouvements',
  },
  {
    title: 'Partenaires',
    to: '/partners',
    keywords: 'distributeurs agences agents reseau',
  },
  {
    title: 'Administrateurs',
    to: '/users',
    keywords: 'utilisateurs comptes admin back-office',
  },
  {
    title: 'Rôles & permissions',
    to: '/roles',
    keywords: 'roles droits acces habilitations iam',
  },
  {
    title: 'Catalogue des permissions',
    section: 'Rôles & permissions',
    to: '/permissions',
    keywords: 'permissions droits ressources catalogue',
  },
  {
    title: 'Mon profil',
    to: '/profil',
    keywords: 'compte mot de passe informations personnelles',
  },
]

/** 0 = starts with, 1 = a word starts with, 2 = contains, 3 = keyword only, -1 = no match. */
function scoreText(
  title: string,
  haystack: string,
  query: string,
  extraMatch = false,
): number {
  if (!matchesWords(haystack, query)) return extraMatch ? 3 : -1
  const t = normalizeSearch(title)
  const q = normalizeSearch(query)
  if (t.startsWith(q)) return 0
  if (t.split(/[\s'’\-&]+/).some((w) => w.startsWith(q))) return 1
  if (t.includes(q)) return 2
  return 3
}

function rank<T>(
  items: T[],
  query: string,
  title: (item: T) => string,
  haystack: (item: T) => string,
  /** Another way for an item to match (e.g. phone digits); ranked as keyword-only. */
  extraMatch?: (item: T) => boolean,
): T[] {
  return items
    .map((item, index) => ({
      item,
      index,
      score: scoreText(
        title(item),
        haystack(item),
        query,
        extraMatch?.(item) ?? false,
      ),
    }))
    .filter((e) => e.score >= 0)
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map((e) => e.item)
}

export function searchPages(query: string): SearchResult[] {
  if (queryWords(query).length === 0) return []
  return rank(
    PAGES,
    query,
    (p) => p.title,
    (p) => `${p.title} ${p.section ?? ''} ${p.keywords}`,
  ).map(pageResult)
}

/** Pages suggested when the field is empty. */
export function suggestedPages(): SearchResult[] {
  return PAGES.slice(0, 8).map(pageResult)
}

function pageResult(p: PageEntry): SearchResult {
  return {
    id: `pages:${p.to}`,
    group: 'pages',
    title: p.title,
    ...(p.section ? { subtitle: p.section } : {}),
    target: { to: p.to },
  }
}

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

function digits(value: string): string {
  return value.replace(/\D/g, '')
}

/** Phone numbers match on digits only (« 07 17 » finds « +225 0717… »), from 3 digits. */
function phoneMatches(phone: string, query: string): boolean {
  const q = digits(query)
  return q.length >= 3 && digits(phone).includes(q)
}

export function searchClients(
  clients: ClientResponse[],
  query: string,
): SearchResult[] {
  if (queryWords(query).length === 0) return []
  const name = (c: ClientResponse) => formatPersonName(c.firstName, c.lastName)
  const hay = (c: ClientResponse) =>
    `${name(c)} ${c.lastName} ${c.firstName} ${c.email ?? ''} ${c.phoneNumber}`
  const matched = clients.filter(
    (c) => matchesWords(hay(c), query) || phoneMatches(c.phoneNumber, query),
  )
  return rank(matched, query, name, hay, (c) =>
    phoneMatches(c.phoneNumber, query),
  ).map((c) => ({
    id: `clients:${c.id}`,
    group: 'clients' as const,
    title: name(c),
    subtitle: [formatPhone(c.phoneNumber), c.email?.trim()]
      .filter(Boolean)
      .join(' · '),
    target: { to: '/clients/$clientId', params: { clientId: String(c.id) } },
  }))
}

export function searchPartners(
  partners: PartnerResponse[],
  query: string,
): SearchResult[] {
  if (queryWords(query).length === 0) return []
  const hay = (p: PartnerResponse) =>
    `${p.name} ${p.distributorCode} ${p.email ?? ''} ${p.location ?? ''}`
  return rank(partners, query, (p) => p.name, hay).map((p) => ({
    id: `partners:${p.id}`,
    group: 'partners' as const,
    title: p.name,
    subtitle: [`Code ${p.distributorCode}`, p.location?.trim()]
      .filter(Boolean)
      .join(' · '),
    target: { to: '/partners/$partnerId', params: { partnerId: String(p.id) } },
  }))
}

export function searchAdmins(
  users: UserResponse[],
  query: string,
  roles?: readonly RoleResponse[],
): SearchResult[] {
  if (queryWords(query).length === 0) return []
  const isAdmin = makeAdminRolePredicate(roles)
  const admins = users.filter((u) => isAdmin(u.role))
  const name = (u: UserResponse) => formatPersonName(u.firstName, u.lastName)
  const hay = (u: UserResponse) =>
    `${name(u)} ${u.lastName} ${u.firstName} ${u.email}`
  return rank(admins, query, name, hay).map((u) => ({
    id: `admins:${u.id}`,
    group: 'admins' as const,
    title: name(u),
    subtitle: u.email,
    target: { to: '/users', search: { userId: u.id } },
  }))
}

export function searchTickets(
  conversations: SupportConversationResponse[],
  query: string,
): SearchResult[] {
  if (queryWords(query).length === 0) return []
  const hay = (c: SupportConversationResponse) =>
    `${c.subject} ${c.handledByName ?? ''} #${c.id} ${c.id}`
  return rank(conversations, query, (c) => c.subject, hay).map((c) => ({
    id: `tickets:${c.id}`,
    group: 'tickets' as const,
    title: c.subject,
    subtitle: `Ticket #${c.id}${c.handledByName ? ` · pris en charge par ${formatPersonName(c.handledByName)}` : ''}`,
    target: {
      to: '/support/$conversationId',
      params: { conversationId: String(c.id) },
    },
  }))
}

export function searchClaims(
  claims: ClaimResponse[],
  query: string,
): SearchResult[] {
  if (queryWords(query).length === 0) return []
  const hay = (c: ClaimResponse) =>
    `${c.claimNumber} #${c.id} ${c.id} ${c.clientName ?? ''} ${c.policyNumber ?? ''} ${c.claimTypeName}`
  return rank(claims, query, (c) => c.claimNumber, hay).map((c) => ({
    id: `claims:${c.id}`,
    group: 'claims' as const,
    title: c.claimNumber,
    subtitle: [
      c.clientName ? formatPersonName(c.clientName) : '',
      c.claimTypeName,
    ]
      .filter(Boolean)
      .join(' · '),
    target: { to: '/sinistres/$claimId', params: { claimId: String(c.id) } },
  }))
}

/** Server results (`/ia-standard/occupations/search`) → results opening the class drawer. */
export function occupationResults(
  occupations: OccupationSearchResult[],
): SearchResult[] {
  return occupations.map((o) => ({
    id: `occupations:${o.id}`,
    group: 'occupations' as const,
    title: o.description,
    subtitle: `Classe ${o.classNumber}`,
    target: {
      to: '/produits-ia/ia-standard/classes',
      search: { classId: o.riskClassId },
    },
  }))
}

// ---------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------

export interface SectionInput {
  id: SearchGroupId
  /** All matches (untruncated). */
  results: SearchResult[]
  loading?: boolean
  error?: SearchSourceError
}

/**
 * Builds the panel groups: display order, at most `limit` records per group,
 * a « Voir tous les … » link after a non-empty group, and empty settled groups
 * dropped (a loading group is kept so its skeleton shows).
 */
export function buildGroups(
  sections: SectionInput[],
  limit: number = DEFAULT_GROUP_LIMIT,
  /** When given, « Voir tous » opens the list pre-filtered (`?q=`). */
  query?: string,
): SearchGroup[] {
  const q = query?.trim() ?? ''
  const byId = new Map(sections.map((s) => [s.id, s]))
  const groups: SearchGroup[] = []
  for (const id of GROUP_ORDER) {
    const section = byId.get(id)
    if (!section) continue
    const hasResults = section.results.length > 0
    if (!hasResults && !section.loading && !section.error) continue
    const shown = section.results.slice(0, limit)
    const seeAll = SEE_ALL[id]
    const results: SearchResult[] = [...shown]
    if (hasResults && seeAll) {
      results.push({
        id: `${id}:see-all`,
        group: id,
        title: seeAll.label,
        target:
          q && SEE_ALL_FILTERABLE.has(id)
            ? { ...seeAll.target, search: { q } }
            : seeAll.target,
        kind: 'seeAll',
      })
    }
    groups.push({
      id,
      label: GROUP_LABELS[id],
      results,
      total: section.results.length,
      ...(section.loading && !hasResults ? { loading: true } : {}),
      ...(section.error && !hasResults ? { error: section.error } : {}),
    })
  }
  return groups
}

/** Flat keyboard-navigable list (every group's results, in display order). */
export function flattenGroups(groups: SearchGroup[]): SearchResult[] {
  return groups.flatMap((g) => g.results)
}
