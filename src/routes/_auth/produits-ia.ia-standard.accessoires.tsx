import { pageHead } from '#/lib/page-title'
import { createFileRoute } from '@tanstack/react-router'
import { IaAccessoriesScreen } from '#/components/ia-products/accessories/IaAccessoriesScreen'

export const Route = createFileRoute(
  '/_auth/produits-ia/ia-standard/accessoires',
)({
  head: pageHead('IA Standard · Accessoires'),
  component: IaAccessoriesScreen,
})
