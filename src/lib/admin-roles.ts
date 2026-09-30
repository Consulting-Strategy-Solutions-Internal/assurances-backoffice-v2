import type { RoleResponse } from '#/services/roles'

/**
 * Rôles « métier » côté partenaires et clients : ce ne sont pas des
 * administrateurs du back-office. Décision (audit UX, 2026-09-30) faite à
 * partir des noms de rôles du backend (ADMIN, MANAGER, AGENT, CLIENT,
 * DEVELOPER) : tout rôle qui n'est pas dans cette liste est considéré comme
 * un rôle interne, ce qui laisse passer d'éventuels rôles internes créés plus
 * tard (SUPPORT, COMPTABLE…).
 */
const EXTERNAL_ROLES = new Set([
  'client',
  'agent',
  'seller',
  'vendeur',
  'manager',
  'developer',
  'developpeur',
  'dev',
])

function key(name: string): string {
  return name.normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase()
}

/** Vrai pour un rôle interne (donc proposé à l'invitation d'un administrateur). */
export function isAdminRole(name: string): boolean {
  return !EXTERNAL_ROLES.has(key(name))
}

/**
 * Version « entité » : s'appuie sur les champs du backend (`system`,
 * `userAssignable`) plutôt que sur le nom. Un rôle système ou non attribuable
 * à un compte back-office n'est pas un rôle d'administrateur ; à défaut de ces
 * champs (ancien backend), on retombe sur le filtre par nom.
 */
export function isAdminRoleEntity(
  role: Pick<RoleResponse, 'name' | 'system' | 'userAssignable'>,
): boolean {
  if (role.userAssignable === false || role.system === true) return false
  if (role.userAssignable === true || role.system === false) return true
  return isAdminRole(role.name)
}

/**
 * Prédicat « ce nom de rôle est-il un rôle d'administrateur ? » — une seule
 * règle pour la liste /users, la recherche globale et l'invitation. Les
 * comptes ne portent que le nom du rôle : on le résout via la liste des rôles
 * (règle « entité ») quand elle est connue, sinon on retombe sur le nom.
 */
export function makeAdminRolePredicate(
  roles: readonly RoleResponse[] | undefined,
): (name: string) => boolean {
  const byName = new Map((roles ?? []).map((r) => [key(r.name), r]))
  return (name) => {
    const role = byName.get(key(name))
    return role ? isAdminRoleEntity(role) : isAdminRole(name)
  }
}

const KNOWN: Record<string, string> = {
  admin: 'Administrateur',
  manager: 'Manager',
  agent: 'Agent',
  client: 'Client',
  developer: 'Développeur',
}

/** « ADMIN » → « Administrateur », « SUPPORT_N2 » → « Support n2 ». */
export function formatRoleName(name: string): string {
  const known = KNOWN[key(name)]
  if (known) return known
  const spaced = name.trim().replace(/[_-]+/g, ' ')
  if (spaced === spaced.toUpperCase() && spaced !== spaced.toLowerCase()) {
    const lower = spaced.toLowerCase()
    return lower.charAt(0).toUpperCase() + lower.slice(1)
  }
  return spaced
}

/** Placeholders saisis à la création (« 0000000000 ») : pas un vrai numéro. */
export function isPlaceholderPhone(raw: string | null | undefined): boolean {
  if (!raw) return true
  const digits = raw.replace(/\D/g, '')
  return digits.length === 0 || /^0+$/.test(digits)
}
