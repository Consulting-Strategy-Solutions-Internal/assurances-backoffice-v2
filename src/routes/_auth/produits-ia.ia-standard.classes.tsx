import { pageHead } from '#/lib/page-title'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { RiskClassesScreen } from '#/components/ia-products/risk-classes/RiskClassesScreen'

const searchSchema = z.object({
  /** Opens this class's drawer on arrival (global search deep link). */
  classId: z.coerce.number().int().positive().optional().catch(undefined),
  /** Filtre de statut (« Actives » par défaut, donc absent de l'URL). */
  status: z.enum(['INACTIVE', 'ALL']).optional().catch(undefined),
  /** Page courante, à partir de 0 (0 = absent de l'URL). */
  page: z.coerce.number().int().min(1).optional().catch(undefined),
})

export const Route = createFileRoute('/_auth/produits-ia/ia-standard/classes')({
  head: pageHead('IA Standard · Classes & métiers'),
  validateSearch: searchSchema,
  component: ClassesRoute,
})

function ClassesRoute() {
  const { classId, status, page } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  return (
    <RiskClassesScreen
      initialClassId={classId}
      onInitialConsumed={() =>
        void navigate({
          search: (prev) => ({ ...prev, classId: undefined }),
          replace: true,
        })
      }
      status={status ?? 'ACTIVE'}
      page={page ?? 0}
      onFiltersChange={({ status: nextStatus, page: nextPage }) =>
        void navigate({
          search: (prev) => ({
            ...prev,
            status: nextStatus === 'ACTIVE' ? undefined : nextStatus,
            page: nextPage > 0 ? nextPage : undefined,
          }),
          replace: true,
        })
      }
    />
  )
}
