import type { ReactNode } from 'react'
import { ShieldAlert } from 'lucide-react'
import { usePermissions } from '#/components/dashboard/use-permissions'
import { EmptyState } from '#/components/layout/EmptyState'

/**
 * Refuse la page quand le rôle est connu et n'a pas `subscription:read-all`.
 * Permissions inconnues : on laisse passer, le serveur tranche (403 affiché
 * par la page).
 */
export function ContractGate({ children }: { children: ReactNode }) {
  const { permissions } = usePermissions()
  if (permissions && !permissions.has('subscription:read-all')) {
    return (
      <EmptyState
        variant="card"
        icon={ShieldAlert}
        tone="error"
        title="Droit insuffisant"
        description="Vous n’avez pas le droit de consulter les contrats."
      />
    )
  }
  return children
}
