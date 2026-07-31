import { Badge } from '#/components/ui/badge'
import { CLAIM_STATUS_LABELS, formatClaimDate } from '#/lib/claims'
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
    <ol className="space-y-4">
      {ordered.map((event) => (
        <li
          key={event.id}
          className={`border-l-2 pl-4 ${event.internal ? 'border-violet-500 bg-violet-50/60 py-3 pr-3' : 'border-primary/30'}`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{eventLabels[event.type]}</span>
            {event.internal && (
              <Badge
                variant="outline"
                className="border-violet-300 text-violet-800"
              >
                Note interne · non visible du client
              </Badge>
            )}
          </div>
          {event.fromStatus && event.toStatus && (
            <p className="mt-1 text-sm">
              {CLAIM_STATUS_LABELS[event.fromStatus]} →{' '}
              {CLAIM_STATUS_LABELS[event.toStatus]}
            </p>
          )}
          {event.comment && (
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
              {event.comment}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {event.actorType === 'CLIENT'
              ? 'Client'
              : event.actorType === 'BACKOFFICE'
                ? 'Back-office'
                : 'Système'}{' '}
            · {formatClaimDate(event.createdAt, true)}
          </p>
        </li>
      ))}
      {!ordered.length && (
        <li className="text-sm text-muted-foreground">Aucun événement.</li>
      )}
    </ol>
  )
}
