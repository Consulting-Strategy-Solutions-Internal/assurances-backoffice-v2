import type { UserResponse } from '#/services/users'
import { StatusPill } from '#/components/dashboard/StatusPill'
import { EmptyState } from '#/components/layout/EmptyState'
import { EntityAvatar } from '#/components/layout/EntityAvatar'
import { Skeleton } from '#/components/ui/skeleton'
import { Link } from '@tanstack/react-router'
import { Plus, UserRound } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { formatPersonName } from '#/lib/people'
import { formatRoleName } from '#/lib/admin-roles'

interface PartnerManagerListProps {
  managers: UserResponse[]
  isLoading: boolean
  /** When set, the empty state offers a link to the relations wizard. */
  attachToPartnerId?: number
}

/**
 * Managers rattachés à un partenaire — partagé par la vue d'ensemble et
 * l'étape « Manager » du parcours de rattachement.
 */
export function PartnerManagerList({
  managers,
  isLoading,
  attachToPartnerId,
}: PartnerManagerListProps) {
  if (isLoading) return <Skeleton className="h-[62px] rounded-xl" />
  if (managers.length === 0) {
    return (
      <EmptyState
        icon={UserRound}
        title="Aucun manager rattaché."
        description="Ce partenaire n’a pas encore de manager."
        className="py-4"
        action={
          attachToPartnerId !== undefined ? (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="rounded-[10px]"
            >
              <Link
                to="/partners/$partnerId/relations"
                params={{ partnerId: String(attachToPartnerId) }}
              >
                <Plus />
                Rattacher un manager
              </Link>
            </Button>
          ) : undefined
        }
      />
    )
  }
  return (
    <div className="flex flex-col gap-2">
      {managers.map((m) => (
        <div
          key={m.id}
          className="flex items-center gap-3 rounded-xl border bg-[#fafbfc] px-3 py-2.5"
        >
          <EntityAvatar name={formatPersonName(m.firstName, m.lastName)} />
          <div className="min-w-0 flex-1 leading-[1.3]">
            <div className="text-[13.5px] font-semibold">
              {formatPersonName(m.firstName, m.lastName)}
            </div>
            <div className="truncate text-[12px] text-muted-foreground">
              {m.email}
            </div>
          </div>
          <StatusPill tone="info">{formatRoleName(m.role)}</StatusPill>
        </div>
      ))}
    </div>
  )
}
