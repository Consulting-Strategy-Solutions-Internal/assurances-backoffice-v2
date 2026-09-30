import { pageHead } from '#/lib/page-title'
import { createFileRoute } from '@tanstack/react-router'
import { AccessoriesScreen } from '#/components/accessories/AccessoriesScreen'

export const Route = createFileRoute(
  '/_auth/produits-ia/ia-standard/accessoires',
)({
  head: pageHead('IA Standard · Accessoires'),
  component: () => <AccessoriesScreen product="IA_STANDARD" />,
})
