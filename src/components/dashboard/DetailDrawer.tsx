import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { Separator } from '#/components/ui/separator'
import { cn } from '#/lib/utils'
import { statusBadgeClass } from '#/lib/dashboard-theme'

export interface DrawerDetail {
  label: string
  value: string
}

export interface DrawerContent {
  title: string
  subtitle: string
  statut: string
  rows: DrawerDetail[]
  actionLabel: string
}

interface DetailDrawerProps {
  content: DrawerContent | null
  onClose: () => void
  onAction: (content: DrawerContent) => void
}

/** Right-hand detail panel (shadcn Sheet). Driven by `content`: non-null = open. */
export function DetailDrawer({ content, onClose, onAction }: DetailDrawerProps) {
  // Latch the last content so the body survives Radix's slide-out animation
  // instead of blanking the moment `content` is set back to null.
  const [shown, setShown] = useState<DrawerContent | null>(content)
  useEffect(() => {
    if (content) setShown(content)
  }, [content])
  const data = content ?? shown

  return (
    <Sheet open={!!content} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-[430px] gap-0 p-0 sm:max-w-[430px]"
      >
        {data && (
          <>
            <SheetHeader className="flex-row items-start justify-between gap-3.5 border-b p-[26px] py-[22px]">
              <div className="flex flex-col gap-0">
                <div className="mb-[7px] text-[11.5px] font-bold tracking-[0.06em] text-muted-foreground uppercase">
                  Détail
                </div>
                <SheetTitle className="text-[21px] font-extrabold tracking-[-0.025em]">
                  {data.title}
                </SheetTitle>
                <SheetDescription className="mt-[3px] text-[13.5px]">
                  {data.subtitle}
                </SheetDescription>
              </div>
              <SheetClose asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Fermer"
                  className="size-[34px] shrink-0 rounded-[9px]"
                >
                  <X className="size-[17px]" />
                </Button>
              </SheetClose>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-[26px] py-6">
              <div className="mb-[22px]">
                <Badge
                  className={cn(
                    'border-transparent px-2.5 py-0.5 text-[12px] font-bold',
                    statusBadgeClass(data.statut),
                  )}
                >
                  {data.statut}
                </Badge>
              </div>
              <div className="flex flex-col">
                {data.rows.map((d, i) => (
                  <div key={d.label}>
                    {i > 0 && <Separator />}
                    <div className="flex items-center justify-between gap-4 py-[14px]">
                      <span className="text-[13px] font-medium text-muted-foreground">
                        {d.label}
                      </span>
                      <span className="text-right text-[13.5px] font-semibold">
                        {d.value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <SheetFooter className="flex-row gap-2.5 border-t p-[26px] py-[18px]">
              <SheetClose asChild>
                <Button variant="outline" className="rounded-[11px]">
                  Fermer
                </Button>
              </SheetClose>
              <Button
                className="flex-1 rounded-[11px] shadow-[0_4px_14px_rgba(0,51,127,0.22)]"
                onClick={() => onAction(data)}
              >
                {data.actionLabel}
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
