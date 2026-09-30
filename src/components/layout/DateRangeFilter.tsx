import { FrDateInput } from '#/components/quotations/FrDateInput'

/**
 * « Du … au … » filter for a list (masked jj/mm/aaaa fields, ISO values).
 * Below 576 px of content it spans the whole `Toolbar` row on a
 * `[label field label field]` grid; above, it is an inline row of 130 px fields.
 */
export function DateRangeFilter({
  idPrefix,
  from,
  to,
  onFromChange,
  onToChange,
}: {
  /** Unique prefix for the input ids (`cot` → `cot-from`, `cot-to`). */
  idPrefix: string
  /** ISO « aaaa-mm-jj » or undefined. */
  from?: string
  to?: string
  onFromChange: (iso: string | undefined) => void
  onToChange: (iso: string | undefined) => void
}) {
  const fieldClass = 'h-10 w-full rounded-[10px] bg-card @xl/main:w-[130px]'
  return (
    <div className="col-span-2 grid grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 text-[13px] text-muted-foreground @xl/main:col-span-1 @xl/main:flex">
      <label htmlFor={`${idPrefix}-from`}>Du</label>
      <FrDateInput
        id={`${idPrefix}-from`}
        value={from}
        onChange={onFromChange}
        className={fieldClass}
      />
      <label htmlFor={`${idPrefix}-to`}>au</label>
      <FrDateInput
        id={`${idPrefix}-to`}
        value={to}
        onChange={onToChange}
        className={fieldClass}
      />
    </div>
  )
}
