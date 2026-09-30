import { createFileRoute } from '@tanstack/react-router'
import { LineWarrantiesScreen } from '#/components/mrh-tariff/LineWarrantiesScreen'
import { pageHead } from '#/lib/page-title'

export const Route = createFileRoute('/_auth/produits-mrh/mrh-standard/tarifs')(
  {
    head: pageHead('MRH Standard · Garanties par situation'),
    component: LineWarrantiesScreen,
  },
)
