import { useQuery } from '@tanstack/react-query'
import { getMe } from '#/services/auth'
import type { MeResponse } from '#/services/auth'
import { getRoles } from '#/services/roles'

/**
 * Resolves the current user's permission set from their role.
 *
 * `/auth/me` only returns the role *name*, so we match it against `/roles`
 * (which carries each role's permissions) to derive the authorities used by the
 * backend's `@PreAuthorize("hasAuthority('xxx:write')")` guards.
 */
export function usePermissions() {
  const { data: me } = useQuery<MeResponse>({
    queryKey: ['me'],
    queryFn: getMe,
  })
  const { data: rolesData } = useQuery({
    queryKey: ['roles-all'],
    queryFn: () => getRoles(0, 200),
    retry: false,
  })

  const roleName = me?.role?.toLowerCase()
  const role = rolesData?.content.find((r) => r.name.toLowerCase() === roleName)
  // null while we can't resolve the set yet (me/roles still loading, or the
  // role isn't readable) — callers treat null as "unknown → allow".
  const permissions = role ? new Set(role.permissions.map((p) => p.name)) : null

  return {
    permissions,
    /**
     * True if the user has the authority, OR if the permission set is still
     * unknown — so we never hide/disable an action we're unsure about. The
     * backend remains the real guard either way.
     */
    can: (authority: string) =>
      permissions === null || permissions.has(authority),
  }
}
