import type { ComponentProps, ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { buttonVariants } from '#/components/ui/button'
import { cn } from '#/lib/utils'

/**
 * « ← Retour aux clients » ghost link at the top of a detail page. Typed like
 * `Link` (`to`, `params`, `search`); children = label (plain content).
 */
export const BackLink = ((props: {
  children?: ReactNode
  className?: string
}) => {
  const { children, className, ...rest } = props
  const linkProps = {
    ...rest,
    className: cn(
      buttonVariants({ variant: 'ghost', size: 'sm' }),
      '-ml-2',
      className,
    ),
  } as ComponentProps<typeof Link>
  return (
    <div>
      <Link {...linkProps}>
        <ArrowLeft />
        {children}
      </Link>
    </div>
  )
}) as unknown as typeof Link
