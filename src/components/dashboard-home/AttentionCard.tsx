import type { ElementType, ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronRight, Coins, Headset } from 'lucide-react'
import { SectionCard } from '#/components/layout/SectionCard'
import { isForbidden } from '#/lib/api-error'
import { Skeleton } from '#/components/ui/skeleton'
import { translateBackendMessage } from '#/lib/backend-messages'
import { ACTION_LINK_CLASS } from '#/lib/dashboard-theme'
import { cn } from '#/lib/utils'
import {
  useDashboardHeldCommissions,
  useDashboardSupport,
  useDashboardSupportUnread,
} from './queries'

function Row({
  icon: Icon,
  tone,
  title,
  detail,
  children,
  loading,
  error,
  link,
}: {
  icon: ElementType<{ className?: string }>
  tone: string
  title: string
  detail?: ReactNode
  children?: ReactNode
  loading: boolean
  error: unknown
  link: ReactNode
}) {
  return (
    <div className="flex items-start gap-3.5 border-b py-4 first:pt-0 last:border-b-0 last:pb-0">
      <div
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-[11px]',
          tone,
        )}
      >
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-semibold">{title}</div>
        {loading ? (
          <Skeleton className="mt-1.5 h-4 w-40" />
        ) : error ? (
          <div className="mt-0.5 text-[12.5px] text-muted-foreground">
            {isForbidden(error)
              ? 'Accès refusé pour votre rôle.'
              : 'Données indisponibles.'}
          </div>
        ) : (
          <>
            <div className="mt-0.5 text-[22px] leading-tight font-extrabold tracking-[-0.03em]">
              {children}
            </div>
            {detail && (
              <div className="mt-0.5 text-[12.5px] text-muted-foreground">
                {detail}
              </div>
            )}
          </>
        )}
      </div>
      {!loading && !error && link}
    </div>
  )
}

const goLink = cn(ACTION_LINK_CLASS, 'shrink-0')

export function AttentionCard() {
  const support = useDashboardSupport()
  const unread = useDashboardSupportUnread()
  const held = useDashboardHeldCommissions()

  const tickets = support.data ? support.data.open + support.data.inProgress : 0
  const unreadCount = unread.data ?? 0

  return (
    <SectionCard title="À surveiller" description="Support et commissions">
      <Row
        icon={Headset}
        tone="bg-[#1f53b0]/10 text-[#1f53b0]"
        title="Tickets support ouverts"
        loading={support.isLoading}
        error={support.error}
        detail={
          support.data && tickets > 0 ? (
            <>
              {support.data.open} à prendre · {support.data.inProgress} en cours
              {unread.data !== undefined && unreadCount > 0 && (
                <>
                  {' · '}
                  <strong className="text-destructive">
                    {unreadCount} message{unreadCount > 1 ? 's' : ''} non lu
                    {unreadCount > 1 ? 's' : ''}
                  </strong>
                </>
              )}
            </>
          ) : (
            'Aucun ticket en attente.'
          )
        }
        link={
          <Link to="/support" search={{ page: 0, size: 20 }} className={goLink}>
            Ouvrir
            <ChevronRight className="size-4" />
          </Link>
        }
      >
        {tickets}
      </Row>
      <Row
        icon={Coins}
        tone="bg-[#ffc61e]/20 text-[#8a6600]"
        title="Commissions en attente"
        loading={held.isLoading}
        error={held.error}
        detail={
          held.data && held.data.total > 0
            ? `${held.data.reasons[0] ? translateBackendMessage(held.data.reasons[0]) : 'Motif non précisé'}${held.data.total > 1 ? ` (+ ${held.data.total - 1} autre${held.data.total > 2 ? 's' : ''})` : ''}`
            : 'Aucune distribution bloquée.'
        }
        link={
          <Link to="/commissions/distributions" className={goLink}>
            Voir
            <ChevronRight className="size-4" />
          </Link>
        }
      >
        {held.data?.total ?? 0}
      </Row>
    </SectionCard>
  )
}
