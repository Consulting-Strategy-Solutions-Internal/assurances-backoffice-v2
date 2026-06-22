import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { getUsers } from '#/services/users'
import { UsersTable } from '#/components/users/UsersTable'
import { UsersFilters } from '#/components/users/UsersFilters'
import { AddUserModal } from '#/components/users/AddUserModal'
import { Pagination } from '#/components/ui/Pagination'

export const Route = createFileRoute('/_auth/users')({ component: UsersPage })

function UsersPage() {
  const [page, setPage] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [filterVerified, setFilterVerified] = useState<'all' | 'yes' | 'no'>('all')

  const { data, isLoading, error } = useQuery({
    queryKey: ['users', page],
    queryFn: () => getUsers({ page, size: 20 }),
    retry: false,
  })

  if (error) console.error('[users]', error)

  const users = (data?.content ?? [])
    .filter((u) => u.role?.toLowerCase().includes('admin'))
    .filter((u) => {
      if (!search) return true
      const q = search.toLowerCase()
      return u.firstName?.toLowerCase().includes(q) || u.lastName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    })
    .filter((u) => {
      if (filterVerified === 'yes') return u.emailVerified
      if (filterVerified === 'no') return !u.emailVerified
      return true
    })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Administrateurs</h1>
        <button onClick={() => setShowModal(true)}>Ajouter un administrateur</button>
      </div>

      {showModal && <AddUserModal onClose={() => setShowModal(false)} />}

      <UsersFilters
        search={search}
        onSearchChange={setSearch}
        filterVerified={filterVerified}
        onFilterVerifiedChange={setFilterVerified}
      />

      {isLoading ? <p>Chargement...</p> : (
        <>
          <UsersTable users={users} />
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
