import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { LineWarrantiesScreen } from '#/components/mrh-tariff/LineWarrantiesScreen'
import { pageHead } from '#/lib/page-title'
import { MRH_LEGAL_QUALITY_CODES } from '#/services/mrh-tariff'

const searchSchema = z.object({
  situation: z.enum(MRH_LEGAL_QUALITY_CODES).optional().catch(undefined),
})

export const Route = createFileRoute('/_auth/produits-mrh/mrh-standard/tarifs')(
  {
    head: pageHead('MRH Standard · Garanties par situation'),
    validateSearch: searchSchema,
    component: TarifsRoute,
  },
)

function TarifsRoute() {
  const { situation } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  return (
    <LineWarrantiesScreen
      situation={situation}
      onSituationChange={(code) =>
        void navigate({ search: { situation: code }, replace: true })
      }
    />
  )
}
