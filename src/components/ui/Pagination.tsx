interface PaginationProps {
  page: number
  totalPages: number
  isLast: boolean
  onPrev: () => void
  onNext: () => void
}

export function Pagination({ page, totalPages, isLast, onPrev, onNext }: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div>
      <button disabled={page === 0} onClick={onPrev}>Précédent</button>
      <span>Page {page + 1} / {totalPages}</span>
      <button disabled={isLast} onClick={onNext}>Suivant</button>
    </div>
  )
}
