import { Skeleton } from '#/components/ui/skeleton'
import { KpiRow } from './KpiRow'

/**
 * Loading placeholder of a detail page (header card, KPI row, two blocks).
 * The KPI grid is the real `KpiRow`, so the skeleton follows the same
 * breakpoints as the page and nothing jumps when the data arrives.
 * `kpis` = number of KPI cards (3 or 4), 0 to omit the row.
 */
export function DetailSkeleton({ kpis = 3 }: { kpis?: 0 | 3 | 4 }) {
  return (
    <div className="flex flex-col gap-[18px]" aria-busy="true">
      <Skeleton className="h-36 rounded-xl" />
      {kpis !== 0 && (
        <KpiRow cols={kpis} className="mb-0">
          {Array.from({ length: kpis }, (_, i) => (
            <Skeleton
              key={i}
              className="h-[76px] rounded-2xl @xl/main:h-[122px]"
            />
          ))}
        </KpiRow>
      )}
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}
