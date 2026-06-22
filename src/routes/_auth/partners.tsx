import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { getPartners } from '#/services/partners'
import { PartnersTable } from '#/components/partners/PartnersTable'
import { AddPartnerModal } from '#/components/partners/AddPartnerModal'
import { SearchInput } from '#/components/ui/SearchInput'
import { Pagination } from '#/components/ui/Pagination'

export const Route = createFileRoute('/_auth/partners')({ component: PartnersPage })

function PartnersPage() {
  const [page, setPage] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['partners', page],
    queryFn: () => getPartners(page),
    retry: false,
  })

  if (error) console.error('[partners]', error)

  const partners = (data?.content ?? []).filter((p) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      p.name?.toLowerCase().includes(q) ||
      p.distributorCode?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.location?.toLowerCase().includes(q)
    )
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Partenaires</h1>
        <button onClick={() => setShowModal(true)}>Ajouter un partenaire</button>
      </div>

      {showModal && <AddPartnerModal onClose={() => setShowModal(false)} />}

      <div style={{ margin: '12px 0' }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Rechercher par nom, code, email ou localisation..." />
      </div>

      {isLoading ? <p>Chargement...</p> : (
        <>
          <PartnersTable partners={partners} />
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
