import { pageHead } from '#/lib/page-title'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { PremiumRatesScreen } from '#/components/ia-products/premium-rates/PremiumRatesScreen'

const searchSchema = z.object({
  filter: z.enum(['QUOTABLE', 'MISSING']).optional().catch(undefined),
})

export const Route = createFileRoute('/_auth/produits-ia/ia-standard/baremes')({
  head: pageHead('IA Standard · Barèmes'),
  validateSearch: searchSchema,
  component: BaremesRoute,
})

function BaremesRoute() {
  const { filter } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  return (
    <PremiumRatesScreen
      filter={filter ?? 'ALL'}
      onFilterChange={(value) =>
        void navigate({
          search: { filter: value === 'ALL' ? undefined : value },
          replace: true,
        })
      }
    />
  )
}
