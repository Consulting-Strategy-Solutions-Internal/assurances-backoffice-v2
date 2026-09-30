import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ShieldAlert } from 'lucide-react'
import { EmptyState } from '#/components/layout/EmptyState'
import { Skeleton } from '#/components/ui/skeleton'
import { getMe } from '#/services/auth'
import type { MeResponse } from '#/services/auth'

export function ClaimsAdminGate({ children }: { children: ReactNode }) {
  const { data, isLoading } = useQuery<MeResponse>({
    queryKey: ['me'],
    queryFn: getMe,
  })

  if (isLoading) {
    return (
      <div className="flex flex-col gap-[18px]" aria-busy="true">
        <Skeleton className="h-12 w-72 rounded-xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }
  if (data?.role.toUpperCase() !== 'ADMIN') {
    return (
      <EmptyState
        variant="card"
        icon={ShieldAlert}
        tone="error"
        title="Droits insuffisants"
        description="Le module Sinistres est réservé aux administrateurs."
      />
    )
  }
  return children
}
