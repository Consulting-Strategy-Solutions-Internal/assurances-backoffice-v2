import type { ElementType } from 'react'
import { Ellipsis } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { cn } from '#/lib/utils'

export interface CardAction {
  label: string
  icon?: ElementType<{ className?: string }>
  onSelect: () => void
  destructive?: boolean
}

/**
 * Menu « ⋯ » des cartes mobiles (les actions en icônes du tableau n’ont pas de
 * place sur une carte). `title` = infobulle « droit manquant » quand désactivé.
 */
export function CardActionsMenu({
  label,
  actions,
  disabled,
  title,
}: {
  /** Nom accessible du bouton, ex. « Actions de la classe 3 ». */
  label: string
  actions: CardAction[]
  disabled?: boolean
  title?: string
}) {
  return (
    <span title={title} className="shrink-0">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            disabled={disabled}
            className="size-9"
          >
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" collisionPadding={8}>
          {actions.map(({ label: text, icon: Icon, onSelect, destructive }) => (
            <DropdownMenuItem
              key={text}
              onSelect={onSelect}
              className={cn(
                destructive && 'text-destructive focus:text-destructive',
              )}
            >
              {Icon && <Icon className="size-4" />}
              {text}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  )
}
