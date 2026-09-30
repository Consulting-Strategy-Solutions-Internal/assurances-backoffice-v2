import { pageHead } from '#/lib/page-title'
import { createFileRoute } from '@tanstack/react-router'
import { ProrationScreen } from '#/components/ia-products/proration/ProrationScreen'

export const Route = createFileRoute('/_auth/produits-ia/ia-standard/prorata')({
  head: pageHead('IA Standard · Prorata court terme'),
  component: ProrationScreen,
})
