import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card } from '#/components/ui/card'
import { getMe } from '#/services/auth'
import type { MeResponse } from '#/services/auth'

export function ClaimsAdminGate({ children }: { children: ReactNode }) {
  const { data, isLoading } = useQuery<MeResponse>({
    queryKey: ['me'],
    queryFn: getMe,
  })

  if (isLoading) {
    return (
      <Card className="p-8 text-center text-muted-foreground">Chargement…</Card>
    )
  }
  if (data?.role.toUpperCase() !== 'ADMIN') {
    return (
      <Card className="p-8 text-center">
        <h1 className="text-xl font-bold">Droits insuffisants</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Le module Sinistres est réservé aux administrateurs.
        </p>
      </Card>
    )
  }
  return children
}
