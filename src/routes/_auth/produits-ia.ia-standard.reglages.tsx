import { pageHead } from '#/lib/page-title'
import { createFileRoute } from '@tanstack/react-router'
import { IaSettingsScreen } from '#/components/ia-products/settings/IaSettingsScreen'

export const Route = createFileRoute('/_auth/produits-ia/ia-standard/reglages')(
  {
    head: pageHead('IA Standard · Réglages'),
    component: IaSettingsScreen,
  },
)
