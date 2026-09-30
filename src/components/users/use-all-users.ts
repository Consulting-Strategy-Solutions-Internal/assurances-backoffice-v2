import { useQuery } from '@tanstack/react-query'
import { getUsers } from '#/services/users'
import { fetchAllPages } from '#/lib/fetch-all-pages'

/**
 * Tous les comptes (le backend ne filtre pas par rôle) : sert à la page
 * Administrateurs et à la détection des managers d'un partenaire. Clé
 * `['users', 'all']` : invalidée par les mutations qui touchent `['users']`.
 */
export function useAllUsers() {
  return useQuery({
    queryKey: ['users', 'all'],
    queryFn: () =>
      fetchAllPages((page, size) =>
        getUsers({ page, size, sort: 'createdAt,desc' }),
      ),
    retry: false,
  })
}
