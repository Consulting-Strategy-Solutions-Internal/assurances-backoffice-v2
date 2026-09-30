import { Download, FileText } from 'lucide-react'
import { formatPersonName } from '#/lib/people'
import { EntityAvatar } from '#/components/layout/EntityAvatar'
import { Button } from '#/components/ui/button'
import { formatClaimDate, formatFileSize } from '#/lib/claims'
import { cn } from '#/lib/utils'
import type {
  SupportAttachmentResponse,
  SupportMessageResponse,
} from '#/services/support'

export function SupportMessageBubble({
  message,
  onDownload,
}: {
  message: SupportMessageResponse
  onDownload: (attachment: SupportAttachmentResponse) => void
}) {
  const fromClient = message.senderType === 'CLIENT'
  const senderLabel = fromClient
    ? formatPersonName(message.senderLabel)
    : message.senderLabel
  const attachments = message.attachments ?? []
  return (
    <div
      className={cn(
        'flex items-end gap-2.5',
        fromClient ? 'justify-start' : 'justify-end',
      )}
    >
      {fromClient && (
        <EntityAvatar
          name={senderLabel}
          className="size-8 shrink-0 text-[11px]"
        />
      )}
      <div
        className={cn(
          'flex max-w-[78%] flex-col gap-1',
          fromClient ? 'items-start' : 'items-end',
        )}
      >
        <span className="px-1 text-[11.5px] font-semibold text-muted-foreground">
          {senderLabel} · {formatClaimDate(message.createdAt, true)}
        </span>
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm shadow-sm',
            fromClient
              ? 'rounded-bl-sm border border-border bg-card'
              : 'rounded-br-sm bg-primary text-primary-foreground',
          )}
        >
          <p className="whitespace-pre-wrap break-words">{message.body}</p>
          {attachments.length > 0 && (
            <ul
              className={cn(
                'mt-2 space-y-1.5 border-t pt-2',
                fromClient ? 'border-border' : 'border-white/20',
              )}
            >
              {attachments.map((attachment) => (
                <li
                  key={attachment.id}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="size-4 shrink-0 opacity-70" />
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-semibold">
                        {attachment.name}
                      </p>
                      <p
                        className={cn(
                          'text-[11px]',
                          fromClient
                            ? 'text-muted-foreground'
                            : 'text-primary-foreground/70',
                        )}
                      >
                        {attachment.contentType} ·{' '}
                        {formatFileSize(attachment.sizeBytes)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="size-8 shrink-0 rounded-[9px] bg-card p-0 text-foreground"
                    aria-label={`Télécharger ${attachment.name}`}
                    onClick={() => onDownload(attachment)}
                  >
                    <Download className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
