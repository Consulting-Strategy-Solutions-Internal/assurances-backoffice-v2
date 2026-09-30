import { createFileRoute } from '@tanstack/react-router'
import { WarrantiesScreen } from '#/components/mrh-tariff/WarrantiesScreen'
import { pageHead } from '#/lib/page-title'

export const Route = createFileRoute(
  '/_auth/produits-mrh/mrh-standard/garanties',
)({
  head: pageHead('MRH Standard · Garanties'),
  component: WarrantiesScreen,
})
