import { StatusPill } from '#/components/dashboard/StatusPill'
import { CLAIM_STATUS_LABELS, formatClaimDate } from '#/lib/claims'
import { cn } from '#/lib/utils'
import type { ClaimEventResponse } from '#/services/claims'

const eventLabels = {
  CREATED: 'Déclaration créée',
  STATUS_CHANGED: 'Changement de statut',
  ATTACHMENT_ADDED: 'Pièce ajoutée',
  NOTE: 'Note',
} as const

export function ClaimTimeline({ events }: { events: ClaimEventResponse[] }) {
  const ordered = [...events].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt),
  )
  return (
    <ol className="relative space-y-5 before:absolute before:top-2 before:bottom-2 before:left-[5px] before:w-px before:bg-border">
      {ordered.map((event) => (
        <li key={event.id} className="relative pl-7">
          <span
            aria-hidden="true"
            className={cn(
              'absolute top-1.5 left-0 size-[11px] rounded-full ring-4 ring-card',
              event.internal ? 'bg-[#9a7400]' : 'bg-primary',
            )}
          />
          <div
            className={cn(
              event.internal && 'rounded-[10px] bg-[#fef3da]/60 px-3 py-2.5',
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[14px] font-semibold">
                {eventLabels[event.type]}
              </span>
              {event.internal && (
                <StatusPill tone="warning">
                  Note interne · non visible du client
                </StatusPill>
              )}
            </div>
            {event.fromStatus && event.toStatus && (
              <p className="mt-1 text-[13.5px]">
                {CLAIM_STATUS_LABELS[event.fromStatus]} →{' '}
                {CLAIM_STATUS_LABELS[event.toStatus]}
              </p>
            )}
            {event.comment && (
              <p className="mt-1 text-[13.5px] whitespace-pre-wrap text-muted-foreground">
                {event.comment}
              </p>
            )}
            <p className="mt-1 text-[12px] text-muted-foreground">
              {event.actorType === 'CLIENT'
                ? 'Client'
                : event.actorType === 'BACKOFFICE'
                  ? 'Back-office'
                  : 'Système'}{' '}
              · {formatClaimDate(event.createdAt, true)}
            </p>
          </div>
        </li>
      ))}
      {!ordered.length && (
        <li className="pl-7 text-[13.5px] text-muted-foreground">
          Aucun événement.
        </li>
      )}
    </ol>
  )
}
