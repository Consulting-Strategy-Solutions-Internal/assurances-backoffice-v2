import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '#/components/ui/button'

interface PaginationProps {
  page: number
  totalPages: number
  isLast: boolean
  onPrev: () => void
  onNext: () => void
}

export function Pagination({
  page,
  totalPages,
  isLast,
  onPrev,
  onNext,
}: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className="mt-4 flex items-center justify-end gap-3">
      <Button
        variant="outline"
        size="sm"
        className="rounded-[10px]"
        disabled={page === 0}
        onClick={onPrev}
      >
        <ChevronLeft />
        Précédent
      </Button>
      <span className="text-[13px] font-medium text-muted-foreground tabular-nums">
        Page {page + 1} / {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        className="rounded-[10px]"
        disabled={isLast}
        onClick={onNext}
      >
        Suivant
        <ChevronRight />
      </Button>
    </div>
  )
}
