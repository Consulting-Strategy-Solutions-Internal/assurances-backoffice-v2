import { Badge } from '#/components/ui/badge'
import { cn } from '#/lib/utils'
import type { QuotationStatus } from '#/services/quotations'

export const QUOTATION_STATUS_META: Record<
  QuotationStatus,
  { label: string; cls: string }
> = {
  DRAFT: { label: 'Brouillon', cls: 'bg-[#f0f1f4] text-[#6b7585]' },
  QUOTED: { label: 'Cotée', cls: 'bg-[#e7eefb] text-[#1f53b0]' },
  EXPIRED: { label: 'Expirée', cls: 'bg-[#fbe9e9] text-[#c0392b]' },
  CONVERTED: { label: 'Convertie', cls: 'bg-[#e7f6ee] text-[#1c8a57]' },
}

export function QuotationStatusBadge({ status }: { status: QuotationStatus }) {
  const meta = QUOTATION_STATUS_META[status] ?? {
    label: status,
    cls: 'bg-[#f0f1f4] text-[#6b7585]',
  }
  return (
    <Badge
      className={cn(
        'border-transparent px-2.5 py-0.5 text-[12px] font-bold',
        meta.cls,
      )}
    >
      {meta.label}
    </Badge>
  )
}
