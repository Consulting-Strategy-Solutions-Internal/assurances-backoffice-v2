import { createFileRoute } from '@tanstack/react-router'
import { AccessoriesScreen } from '#/components/accessories/AccessoriesScreen'
import { pageHead } from '#/lib/page-title'

export const Route = createFileRoute(
  '/_auth/produits-mrh/mrh-standard/accessoires',
)({
  head: pageHead('MRH Standard · Accessoires'),
  component: () => <AccessoriesScreen product="MRH_STANDARD" />,
})
