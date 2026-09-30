import { pageHead } from '#/lib/page-title'
import { createFileRoute } from '@tanstack/react-router'
import { CommissionSchemeFormPage } from '#/components/commissions/CommissionSchemeFormPage'

export const Route = createFileRoute('/_auth/commissions/schemes_/new')({
  head: pageHead('Nouveau schéma de commission'),
  component: CommissionSchemeFormPage,
})
