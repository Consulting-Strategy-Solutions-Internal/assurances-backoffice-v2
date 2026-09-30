import { TriangleAlert } from 'lucide-react'
import { isForbidden } from '#/lib/api-error'
import { EmptyState } from '#/components/layout/EmptyState'
import { Skeleton } from '#/components/ui/skeleton'

/** Small in-card message for a block whose request failed (403 or other). */
export function BlockError({ error }: { error: unknown }) {
  const forbidden = isForbidden(error)
  return (
    <EmptyState
      className="py-8"
      icon={TriangleAlert}
      tone="error"
      title={forbidden ? 'Accès refusé.' : 'Impossible de charger ce bloc.'}
      description={
        forbidden
          ? 'Vous n’avez pas les droits nécessaires pour consulter ces données.'
          : 'Rechargez la page pour réessayer.'
      }
    />
  )
}

export function BlockSkeleton({ height = 'h-[200px]' }: { height?: string }) {
  return <Skeleton className={`${height} w-full`} />
}
