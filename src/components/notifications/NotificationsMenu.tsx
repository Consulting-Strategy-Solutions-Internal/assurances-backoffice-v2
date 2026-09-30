import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, BellOff } from 'lucide-react'
import { StatusPill } from '#/components/dashboard/StatusPill'
import { EmptyState } from '#/components/layout/EmptyState'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { formatClaimDate } from '#/lib/claims'
import { cn } from '#/lib/utils'
import {
  getNotifications,
  getNotificationsUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  notificationKeys,
} from '#/services/notifications'
import type { NotificationResponse } from '#/services/notifications'

/**
 * Cloche de notifications in-app (`GET /notifications`) : alerte notamment
 * les agents des nouveaux tickets de support (SUPPORT_TICKET_OPENED).
 */
export function NotificationsMenu() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const { data: unread } = useQuery({
    queryKey: notificationKeys.unread,
    queryFn: getNotificationsUnreadCount,
    refetchInterval: 30_000,
    retry: false,
  })
  const { data: page } = useQuery({
    queryKey: notificationKeys.list(false),
    queryFn: () => getNotifications({ page: 0, size: 10 }),
    enabled: open,
    retry: false,
  })

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: notificationKeys.all })

  const readAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: refresh,
  })

  const openNotification = async (notification: NotificationResponse) => {
    if (!notification.read) {
      try {
        await markNotificationRead(notification.id)
        await refresh()
      } catch {
        // Non bloquant : la navigation reste prioritaire.
      }
    }
    setOpen(false)
    if (
      notification.resourceType === 'SUPPORT_CONVERSATION' &&
      notification.resourceId != null
    ) {
      await navigate({
        to: '/support/$conversationId',
        params: { conversationId: String(notification.resourceId) },
      })
    } else if (
      notification.resourceType === 'CLAIM' &&
      notification.resourceId != null
    ) {
      await navigate({
        to: '/sinistres/$claimId',
        params: { claimId: String(notification.resourceId) },
      })
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label="Notifications"
          className="relative size-[41px] rounded-[11px] bg-card"
        >
          <Bell className="size-[18px] text-[#3a4150]" />
          {unread !== undefined && unread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#FFC61E] px-1 text-[10px] font-bold text-[#5c4500]">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[380px] overflow-hidden rounded-xl p-0"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-bold tracking-[-0.01em]">
              Notifications
            </span>
            {unread !== undefined && unread > 0 && (
              <StatusPill tone="warning">{unread}</StatusPill>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto rounded-[8px] px-2 py-1 text-[12px] font-semibold text-primary"
            disabled={readAllMutation.isPending || !unread}
            onClick={() => readAllMutation.mutate()}
          >
            Tout marquer lu
          </Button>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {page === undefined ? (
            <div className="space-y-3 px-4 py-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-3.5 w-3/5" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          ) : page.content.length === 0 ? (
            <EmptyState
              icon={BellOff}
              title="Aucune notification."
              description="Les nouveaux tickets et événements apparaîtront ici."
              className="py-10"
            />
          ) : (
            page.content.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => void openNotification(notification)}
                className={cn(
                  'block w-full border-b px-4 py-3 text-left transition-colors outline-none last:border-b-0 hover:bg-[#f6f8fc] focus-visible:bg-[#f6f8fc]',
                  !notification.read && 'bg-primary/[0.04]',
                )}
              >
                <span className="flex items-start gap-2.5">
                  <span
                    aria-hidden
                    className={cn(
                      'mt-1.5 size-2 shrink-0 rounded-full',
                      notification.read ? 'bg-transparent' : 'bg-[#ffc61e]',
                    )}
                  />
                  <span className="min-w-0">
                    <span
                      className={cn(
                        'block truncate text-[13px]',
                        notification.read ? 'font-semibold' : 'font-bold',
                      )}
                    >
                      {notification.title}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-[12.5px] text-muted-foreground">
                      {notification.body}
                    </span>
                    <span className="mt-1 block text-[11.5px] text-muted-foreground">
                      {formatClaimDate(notification.createdAt, true)}
                    </span>
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
