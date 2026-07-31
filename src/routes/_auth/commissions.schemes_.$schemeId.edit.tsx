import { createFileRoute } from '@tanstack/react-router'
import { CommissionSchemeFormPage } from '#/components/commissions/CommissionSchemeFormPage'

export const Route = createFileRoute(
  '/_auth/commissions/schemes_/$schemeId/edit',
)({
  component: EditCommissionSchemePage,
})

function EditCommissionSchemePage() {
  const { schemeId } = Route.useParams()
  return <CommissionSchemeFormPage schemeId={Number(schemeId)} />
}
