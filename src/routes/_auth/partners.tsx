import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { CirclePlus, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { getPartners } from '#/services/partners'
import type { PartnerResponse } from '#/services/partners'
import { PartnersTable } from '#/components/partners/PartnersTable'
import { AddPartnerModal } from '#/components/partners/AddPartnerModal'
import { EditPartnerModal } from '#/components/partners/EditPartnerModal'
import { Pagination } from '#/components/ui/Pagination'
import { Card } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { PageHeader } from '#/components/dashboard/PageHeader'
import { useShell } from '#/components/dashboard/shell'

export const Route = createFileRoute('/_auth/partners')({
  component: PartnersPage,
})

function PartnersPage() {
  const { search } = useShell()
  const [page, setPage] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [editingPartner, setEditingPartner] = useState<PartnerResponse | null>(
    null,
  )

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
      p.name.toLowerCase().includes(q) ||
      p.distributorCode.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.location?.toLowerCase().includes(q)
    )
  })

  return (
    <>
      <PageHeader
        title="Partenaires"
        subtitle="Réseau de distribution · courtiers, agences & bancassurance"
      />

      {showModal && <AddPartnerModal onClose={() => setShowModal(false)} />}
      {editingPartner && (
        <EditPartnerModal
          partner={editingPartner}
          onClose={() => setEditingPartner(null)}
        />
      )}

      <div className="mb-[18px] grid grid-cols-2 gap-4">
        <Card className="gap-0 rounded-2xl border-[#00255e] bg-[linear-gradient(150deg,#013a8f_0%,#00255e_100%)] p-6 text-white shadow-[0_8px_22px_rgba(0,37,94,0.22)]">
          <div className="mb-3.5 flex size-[42px] items-center justify-center rounded-[11px] bg-white/10">
            <CirclePlus className="size-[21px] text-[#FFC61E]" />
          </div>
          <div className="mb-[5px] text-[16.5px] font-bold">
            Recruter un partenaire
          </div>
          <div className="mb-[18px] text-[13px] leading-relaxed text-white/70">
            Ajoutez un nouveau courtier ou une agence à votre réseau de
            distribution.
          </div>
          <Button
            onClick={() => setShowModal(true)}
            className="w-fit rounded-[10px] bg-[#FFC61E] font-bold text-[#0c2c5e] hover:bg-[#ffcf45]"
          >
            <CirclePlus />
            Démarrer l'intégration
          </Button>
        </Card>

        <Card className="gap-0 p-6">
          <div className="mb-3.5 flex size-[42px] items-center justify-center rounded-[11px] bg-[#ffc61e]/20">
            <Upload className="size-[21px] text-[#9a7400]" />
          </div>
          <div className="mb-[5px] text-[16.5px] font-bold">
            Importer depuis la CIMA
          </div>
          <div className="mb-[18px] text-[13px] leading-relaxed text-muted-foreground">
            42 intermédiaires agréés ne sont pas encore importés dans votre
            réseau.
          </div>
          <Button
            variant="outline"
            onClick={() => toast('Import des agréments CIMA')}
            className="w-fit rounded-[10px]"
          >
            <Upload />
            Importer les agréments
          </Button>
        </Card>
      </div>

      {isLoading ? (
        <Card className="gap-0 py-0">
          <div className="p-9 text-center text-sm text-muted-foreground">
            Chargement…
          </div>
        </Card>
      ) : (
        <>
          <Card className="gap-0 overflow-hidden py-0">
            <PartnersTable partners={partners} onEditInfo={setEditingPartner} />
          </Card>
          <Pagination
            page={page}
            totalPages={data?.totalPages ?? 0}
            isLast={data?.last ?? true}
            onPrev={() => setPage((p) => p - 1)}
            onNext={() => setPage((p) => p + 1)}
          />
        </>
      )}
    </>
  )
}
