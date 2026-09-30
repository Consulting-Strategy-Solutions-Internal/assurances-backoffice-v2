import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { clientFullName } from '#/lib/clients'
import { formatPersonName } from '#/lib/people'
import { clientsKeys, getAllClients } from '#/services/clients'

/**
 * Display names of clients keyed by id, taken from the full client list
 * (shared cache with `ClientPicker`) so every screen shows « Prénom Nom ».
 * `nameOf` falls back to the backend-provided `clientName`, cleaned by
 * `formatPersonName`, while the list loads or when the client is missing.
 */
export function useClientNames() {
  const { data } = useQuery({
    queryKey: clientsKeys.everyone('lastName,asc'),
    queryFn: () => getAllClients('lastName,asc'),
    staleTime: 60_000,
    retry: false,
  })
  const names = useMemo(
    () => new Map((data?.items ?? []).map((c) => [c.id, clientFullName(c)])),
    [data],
  )
  return {
    nameOf: (clientId: number, fallback?: string | null): string =>
      names.get(clientId) ?? formatPersonName(fallback),
  }
}
