import type { ReactNode } from 'react'
import { ShieldAlert } from 'lucide-react'
import { usePermissions } from '#/components/dashboard/use-permissions'
import { EmptyState } from '#/components/layout/EmptyState'

/**
 * Refuse la page quand le rôle est connu et n'a pas `amendment:read-all`.
 * Permissions inconnues : on laisse passer, le serveur tranche (403 affiché
 * par la liste / le détail).
 */
export function AmendmentsGate({ children }: { children: ReactNode }) {
  const { permissions } = usePermissions()
  if (permissions && !permissions.has('amendment:read-all')) {
    return (
      <EmptyState
        variant="card"
        icon={ShieldAlert}
        tone="error"
        title="Droits insuffisants"
        description="Vous n’avez pas le droit de consulter les modifications de contrat."
      />
    )
  }
  return children
}
