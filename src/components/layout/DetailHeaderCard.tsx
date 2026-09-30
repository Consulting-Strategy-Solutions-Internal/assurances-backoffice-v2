import type { ReactNode } from 'react'
import { Card } from '#/components/ui/card'

/**
 * Hero card of a detail page: leading visual (an `EntityAvatar size-[72px]` or
 * an icon tile), H1 title, a muted meta line, status pills, and right-aligned actions.
 */
export function DetailHeaderCard({
  leading,
  title,
  meta,
  pills,
  actions,
}: {
  leading?: ReactNode
  title: string
  /** Muted line under the title, e.g. « Femme · Client #12 · Client depuis 03/02/2025 ». */
  meta?: ReactNode
  /** Row of `Badge`/`StatusPill`s. */
  pills?: ReactNode
  /** Buttons (outline secondary + one primary). */
  actions?: ReactNode
}) {
  return (
    <Card className="gap-0 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div className="flex min-w-0 flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-5">
          {leading && (
            <div className="shrink-0 max-sm:[&>*]:size-14!">{leading}</div>
          )}
          <div className="min-w-0">
            <h1 className="text-[22px] leading-tight sm:text-[26px] font-extrabold tracking-[-0.03em] [overflow-wrap:anywhere]">
              {title}
            </h1>
            {meta && (
              <p className="mt-1 text-sm text-muted-foreground">{meta}</p>
            )}
            {pills && (
              <div className="mt-2.5 flex flex-wrap gap-2">{pills}</div>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex flex-wrap gap-2.5 max-sm:w-full max-sm:[&>*]:flex-1">
            {actions}
          </div>
        )}
      </div>
    </Card>
  )
}

/** Rounded icon tile for `DetailHeaderCard.leading` when the entity has no initials (product, table…). */
export function IconTile({ children }: { children: ReactNode }) {
  return (
    <div className="flex size-[72px] shrink-0 items-center justify-center rounded-2xl bg-primary/[0.08] text-primary [&>svg]:size-8">
      {children}
    </div>
  )
}
