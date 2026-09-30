import { pageHead } from '#/lib/page-title'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { PremiumModifiersScreen } from '#/components/ia-products/premium-modifiers/PremiumModifiersScreen'

const searchSchema = z.object({
  /** Page courante, à partir de 0 (0 = absent de l'URL). */
  page: z.coerce.number().int().min(1).optional().catch(undefined),
})

export const Route = createFileRoute(
  '/_auth/produits-ia/ia-standard/majorations',
)({
  head: pageHead('IA Standard · Majorations & réductions'),
  validateSearch: searchSchema,
  component: MajorationsRoute,
})

function MajorationsRoute() {
  const { page } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  return (
    <PremiumModifiersScreen
      page={page ?? 0}
      onPageChange={(value) =>
        void navigate({
          search: { page: value > 0 ? value : undefined },
          replace: true,
        })
      }
    />
  )
}
