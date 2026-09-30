import { createFileRoute } from '@tanstack/react-router'
import { LegalQualitiesScreen } from '#/components/mrh-tariff/LegalQualitiesScreen'
import { pageHead } from '#/lib/page-title'

export const Route = createFileRoute(
  '/_auth/produits-mrh/mrh-standard/situations',
)({
  head: pageHead('MRH Standard · Situations & taux'),
  component: LegalQualitiesScreen,
})
