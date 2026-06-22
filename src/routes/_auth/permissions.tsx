import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { getPermissions } from '#/services/roles'
import { PermissionsTable } from '#/components/permissions/PermissionsTable'
import { SearchInput } from '#/components/ui/SearchInput'
import { Pagination } from '#/components/ui/Pagination'

export const Route = createFileRoute('/_auth/permissions')({ component: PermissionsPage })

function PermissionsPage() {
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['permissions', page],
    queryFn: () => getPermissions(page),
    retry: false,
  })

  if (error) console.error('[permissions]', error)

  const permissions = (data?.content ?? []).filter((p) =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div>
      <h1>Permissions</h1>

      <div style={{ margin: '12px 0' }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Rechercher par nom..." />
      </div>

      {isLoading ? <p>Chargement...</p> : (
        <>
          <PermissionsTable permissions={permissions} />
          <Pagination
            page={page}
            totalPages={data?.totalPages ?? 0}
            isLast={data?.last ?? true}
            onPrev={() => setPage((p) => p - 1)}
            onNext={() => setPage((p) => p + 1)}
          />
        </>
      )}
    </div>
  )
}
