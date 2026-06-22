import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { getRoles } from '#/services/roles'
import { RolesTable } from '#/components/roles/RolesTable'
import { AddRoleForm } from '#/components/roles/AddRoleForm'
import { SearchInput } from '#/components/ui/SearchInput'
import { Pagination } from '#/components/ui/Pagination'

export const Route = createFileRoute('/_auth/roles')({ component: RolesPage })

function RolesPage() {
  const [page, setPage] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['roles', page],
    queryFn: () => getRoles(page),
    retry: false,
  })

  if (error) console.error('[roles]', error)

  const roles = (data?.content ?? []).filter((r) => {
    if (!search) return true
    const q = search.toLowerCase()
    return r.name?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q)
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Rôles</h1>
        <button onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Annuler' : 'Ajouter un rôle'}
        </button>
      </div>

      {showForm && <AddRoleForm onCancel={() => setShowForm(false)} />}

      <div style={{ margin: '12px 0' }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Rechercher par nom ou description..." />
      </div>

      {isLoading ? <p>Chargement...</p> : (
        <>
          <RolesTable roles={roles} />
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
