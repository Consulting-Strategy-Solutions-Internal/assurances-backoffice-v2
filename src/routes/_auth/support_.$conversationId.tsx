import { pageHead } from '#/lib/page-title'
import { useEffect, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Headset,
  MessageSquare,
  Paperclip,
  SendHorizonal,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { ConfirmDialog } from '#/components/dashboard/ConfirmDialog'
import { StatusPill } from '#/components/dashboard/StatusPill'
import { BackLink } from '#/components/layout/BackLink'
import { DetailSkeleton } from '#/components/layout/DetailSkeleton'
import {
  DetailHeaderCard,
  IconTile,
} from '#/components/layout/DetailHeaderCard'
import { EmptyState } from '#/components/layout/EmptyState'
import { EntityAvatar } from '#/components/layout/EntityAvatar'
import { SectionCard } from '#/components/layout/SectionCard'
import { SupportNotice } from '#/components/support/SupportNotice'
import { Skeleton } from '#/components/ui/skeleton'
import { cn } from '#/lib/utils'
import { SupportMessageBubble } from '#/components/support/SupportMessageBubble'
import { SupportStatusBadge } from '#/components/support/SupportStatusBadge'
import { useSupportStream } from '#/components/support/useSupportStream'
import { formatClaimDate, validateClaimUpload } from '#/lib/claims'
import { formatPersonName } from '#/lib/people'
import {
  availableSupportTransitions,
  canReplyToSupport,
  canStreamSupport,
  mapSupportError,
  MAX_SUPPORT_ATTACHMENTS_PER_MESSAGE,
  MAX_SUPPORT_MESSAGE_LENGTH,
  SUPPORT_TRANSITION_CONFIRM,
  SUPPORT_TRANSITION_LABELS,
  needsReadReceipt,
  upsertSupportMessage,
} from '#/lib/support'
import {
  downloadSupportAttachment,
  getAllSupportMessages,
  getSupportConversation,
  markSupportConversationRead,
  postSupportMessage,
  supportKeys,
  transitionSupportConversation,
  uploadSupportAttachment,
} from '#/services/support'
import type {
  SupportAttachmentResponse,
  SupportMessageResponse,
  SupportTransition,
} from '#/services/support'

export const Route = createFileRoute('/_auth/support_/$conversationId')({
  head: pageHead('Ticket support'),
  component: SupportConversationRoute,
})

const transitionSuccess: Record<SupportTransition, string> = {
  handle: 'Ticket pris en charge.',
  release: 'Ticket libéré dans la file.',
  resolve: 'Ticket résolu.',
}

/** Délai avant l'accusé de lecture, une fois le fil affiché. */
const READ_RECEIPT_DELAY_MS = 1500

const uploadMessages = {
  FILE_REQUIRED: 'Sélectionnez un fichier.',
  FILE_TOO_LARGE: 'Une pièce dépasse 10 Mo.',
  FILE_TYPE_NOT_ALLOWED: 'Seuls les fichiers PDF, JPEG et PNG sont acceptés.',
  ATTACHMENT_LIMIT_REACHED: `Maximum ${MAX_SUPPORT_ATTACHMENTS_PER_MESSAGE} pièces par message.`,
}

export function SupportConversationContent({
  conversationId,
}: {
  conversationId: number
}) {
  const queryClient = useQueryClient()
  const fileInput = useRef<HTMLInputElement>(null)
  const threadRef = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [sendError, setSendError] = useState<string | null>(null)
  const [pendingTransition, setPendingTransition] =
    useState<SupportTransition | null>(null)
  const [tabVisible, setTabVisible] = useState(
    () =>
      typeof document === 'undefined' || document.visibilityState === 'visible',
  )
  useEffect(() => {
    const onChange = () => setTabVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [])

  const {
    data: conversation,
    isLoading,
    error,
  } = useQuery({
    queryKey: supportKeys.detail(conversationId),
    queryFn: () => getSupportConversation(conversationId),
    // Hors prise en charge il n'y a pas de flux SSE : on repolle le statut.
    refetchInterval: (query) =>
      query.state.data?.status === 'IN_PROGRESS' ? false : 15_000,
    retry: false,
  })
  const streaming = useSupportStream(
    conversationId,
    conversation !== undefined && canStreamSupport(conversation.status),
  )
  const { data: messages } = useQuery({
    queryKey: supportKeys.messages(conversationId),
    queryFn: () => getAllSupportMessages(conversationId),
    // Repli hors SSE (statut ≠ IN_PROGRESS, ou flux en cours de reconnexion).
    refetchInterval: streaming ? false : 10_000,
    retry: false,
    enabled: conversation !== undefined,
  })

  const refreshQueue = async () => {
    await queryClient.invalidateQueries({ queryKey: supportKeys.lists })
    await queryClient.invalidateQueries({ queryKey: supportKeys.unread })
  }

  // Marque les messages du client comme lus une fois le fil réellement
  // affiché (messages chargés, onglet visible) et après un court délai : un
  // simple passage (lien de notification, onglet en arrière-plan) ne change
  // pas l'état. Se relance à chaque nouveau message entrant.
  const lastClientMessageId = messages
    ?.filter((message) => message.senderType === 'CLIENT')
    .at(-1)?.id
  const receiptedRef = useRef<{ conversationId: number; id: number }>(null)
  useEffect(() => {
    if (!tabVisible) return
    const receipted =
      receiptedRef.current?.conversationId === conversationId
        ? receiptedRef.current.id
        : undefined
    if (
      lastClientMessageId === undefined ||
      !needsReadReceipt(lastClientMessageId, receipted)
    )
      return
    const timer = setTimeout(() => {
      receiptedRef.current = { conversationId, id: lastClientMessageId }
      markSupportConversationRead(conversationId)
        .then(async () => {
          await queryClient.invalidateQueries({ queryKey: supportKeys.lists })
          await queryClient.invalidateQueries({ queryKey: supportKeys.unread })
        })
        .catch(() => {
          // Échec : on autorise un nouvel essai au prochain passage.
          receiptedRef.current = null
          // Lecture non critique : le badge se resynchronisera au prochain poll.
        })
    }, READ_RECEIPT_DELAY_MS)
    return () => clearTimeout(timer)
  }, [conversationId, lastClientMessageId, tabVisible, queryClient])

  const messageCount = messages?.length ?? 0
  useEffect(() => {
    const node = threadRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [messageCount])

  const transitionMutation = useMutation({
    mutationFn: (action: SupportTransition) =>
      transitionSupportConversation(conversationId, action),
    onSuccess: async (_result, action) => {
      setPendingTransition(null)
      toast.success(transitionSuccess[action])
      await queryClient.invalidateQueries({
        queryKey: supportKeys.detail(conversationId),
      })
      await refreshQueue()
    },
    onError: async (mutationError) => {
      setPendingTransition(null)
      toast.error(mapSupportError(mutationError))
      await queryClient.invalidateQueries({
        queryKey: supportKeys.detail(conversationId),
      })
    },
  })

  const sendMutation = useMutation({
    mutationFn: async (payload: { body: string; attachments: File[] }) => {
      const message = await postSupportMessage(conversationId, payload.body)
      let uploadError: string | null = null
      for (const file of payload.attachments) {
        try {
          await uploadSupportAttachment(conversationId, message.id, file)
        } catch (attachError) {
          uploadError = mapSupportError(attachError)
          break
        }
      }
      return { message, uploadError }
    },
    onSuccess: async ({ message, uploadError }) => {
      setDraft('')
      setFiles([])
      if (fileInput.current) fileInput.current.value = ''
      setSendError(
        uploadError
          ? `Message envoyé, mais l'ajout de pièce a échoué : ${uploadError}`
          : null,
      )
      queryClient.setQueryData<SupportMessageResponse[]>(
        supportKeys.messages(conversationId),
        (current) => upsertSupportMessage(current ?? [], message),
      )
      // Récupère la version complète (pièces jointes) et l'activité de la file.
      await queryClient.invalidateQueries({
        queryKey: supportKeys.messages(conversationId),
      })
      await refreshQueue()
    },
    onError: (mutationError) =>
      setSendError(
        mapSupportError(
          mutationError,
          'Ce ticket est clôturé : il ne peut plus recevoir de message.',
        ),
      ),
  })

  const submitMessage = async () => {
    const body = draft.trim()
    if (!body) {
      setSendError('Le message est obligatoire.')
      return
    }
    if (files.length > MAX_SUPPORT_ATTACHMENTS_PER_MESSAGE) {
      setSendError(uploadMessages.ATTACHMENT_LIMIT_REACHED)
      return
    }
    for (const file of files) {
      const validation = await validateClaimUpload(file, 0)
      if (validation) {
        setSendError(uploadMessages[validation])
        return
      }
    }
    setSendError(null)
    sendMutation.mutate({ body, attachments: files })
  }

  const download = async (attachment: SupportAttachmentResponse) => {
    try {
      const blob = await downloadSupportAttachment(
        conversationId,
        attachment.id,
      )
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = attachment.name
      link.click()
      URL.revokeObjectURL(url)
    } catch (downloadError) {
      toast.error(mapSupportError(downloadError))
    }
  }

  if (isLoading) return <DetailSkeleton kpis={0} />
  if (error || !conversation)
    return (
      <div className="flex flex-col gap-[18px]">
        <BackLink to="/support" search={{ page: 0, size: 20 }}>
          Retour à la file de support
        </BackLink>
        <EmptyState
          variant="card"
          icon={Headset}
          tone="error"
          title="Ticket introuvable."
          description="Ce ticket n’existe pas ou vous n’avez pas les droits pour le consulter."
        />
      </div>
    )

  const transitions = availableSupportTransitions(conversation.status)
  const replyEnabled = canReplyToSupport(conversation.status)
  const handler = conversation.handledByName?.trim()
  const rawClientName = messages?.find(
    (message) => message.senderType === 'CLIENT',
  )?.senderLabel
  const clientName = rawClientName ? formatPersonName(rawClientName) : undefined
  const confirmCopy =
    pendingTransition === null
      ? undefined
      : SUPPORT_TRANSITION_CONFIRM[pendingTransition]

  return (
    <div className="flex flex-col gap-[18px]">
      <BackLink to="/support" search={{ page: 0, size: 20 }}>
        Retour à la file de support
      </BackLink>
      <DetailHeaderCard
        leading={
          clientName ? (
            <EntityAvatar name={clientName} className="size-[72px] text-2xl" />
          ) : (
            <IconTile>
              <Headset />
            </IconTile>
          )
        }
        title={conversation.subject}
        meta={
          <>
            {clientName ? `${clientName} · ` : ''}Ticket #{conversation.id} ·
            ouvert le {formatClaimDate(conversation.createdAt, true)} · dernière
            activité le {formatClaimDate(conversation.lastMessageAt, true)}
          </>
        }
        pills={
          <>
            <SupportStatusBadge status={conversation.status} />
            {handler ? (
              <StatusPill tone="neutral">
                Pris en charge par {handler}
              </StatusPill>
            ) : null}
          </>
        }
        actions={transitions.map((transition) => (
          <Button
            key={transition}
            variant={transition === 'resolve' ? 'default' : 'outline'}
            className={cn(
              'rounded-[11px]',
              transition === 'resolve' &&
                'shadow-[0_4px_14px_rgba(0,51,127,0.22)]',
            )}
            disabled={transitionMutation.isPending}
            onClick={() =>
              SUPPORT_TRANSITION_CONFIRM[transition]
                ? setPendingTransition(transition)
                : transitionMutation.mutate(transition)
            }
          >
            {SUPPORT_TRANSITION_LABELS[transition]}
          </Button>
        ))}
      />
      <ConfirmDialog
        open={pendingTransition !== null && confirmCopy !== undefined}
        title={confirmCopy?.title ?? ''}
        description={confirmCopy?.description}
        confirmLabel={confirmCopy?.confirmLabel}
        destructive={pendingTransition === 'resolve'}
        pending={transitionMutation.isPending}
        onConfirm={() => {
          if (pendingTransition) transitionMutation.mutate(pendingTransition)
        }}
        onOpenChange={(open) => {
          if (!open && !transitionMutation.isPending) setPendingTransition(null)
        }}
      />
      {conversation.status === 'OPEN' && (
        <SupportNotice tone="info">
          Prenez le ticket en charge pour activer le fil en temps réel. En
          attente de prise en charge, la page s’actualise périodiquement.
        </SupportNotice>
      )}
      {conversation.status === 'RESOLVED' && (
        <SupportNotice tone="success">
          Ticket résolu : un nouveau message du client le rouvrira, votre
          réponse le laissera résolu. Sans activité, il sera clôturé
          automatiquement au bout de 7 jours.
        </SupportNotice>
      )}
      {conversation.status === 'CLOSED' && (
        <SupportNotice tone="neutral">
          Ticket clôturé : il ne peut plus recevoir de message. Le client devra
          ouvrir une nouvelle demande.
        </SupportNotice>
      )}
      <SectionCard
        flush
        // Sous 672 px de contenu : la carte tient dans l'écran (100dvh moins
        // barre du haut et marges) — fil défilant + zone de réponse collée en bas.
        className="@max-2xl/main:h-[calc(100dvh-7rem)] @max-2xl/main:min-h-[26rem]"
        bodyClassName="flex min-h-0 flex-1 flex-col"
        title="Fil de discussion"
        action={
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground">
            <span
              className={cn(
                'size-2 rounded-full',
                streaming ? 'bg-[#1c8a57]' : 'bg-[#c3c9d4]',
              )}
            />
            {streaming ? 'Temps réel actif' : 'Actualisation périodique'}
          </span>
        }
      >
        <div
          ref={threadRef}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[#f7f8fb] px-4 py-5 sm:px-6 @2xl/main:max-h-[52vh] @2xl/main:min-h-[280px] @2xl/main:flex-none"
        >
          {messages === undefined ? (
            <div className="space-y-4">
              <Skeleton className="h-14 w-[46%] rounded-2xl" />
              <Skeleton className="ml-auto h-14 w-[38%] rounded-2xl" />
              <Skeleton className="h-14 w-[52%] rounded-2xl" />
            </div>
          ) : messages.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="Aucun message dans cette conversation."
            />
          ) : (
            messages.map((message) => (
              <SupportMessageBubble
                key={message.id}
                message={message}
                onDownload={download}
              />
            ))
          )}
        </div>
        {replyEnabled && (
          <div className="shrink-0 border-t px-4 py-3 sm:px-6 sm:py-4">
            <textarea
              aria-label="Réponse au client"
              rows={2}
              maxLength={MAX_SUPPORT_MESSAGE_LENGTH}
              value={draft}
              placeholder="Écrivez votre réponse…"
              onChange={(event) => {
                setDraft(event.target.value)
                setSendError(null)
              }}
              className="w-full resize-y rounded-[10px] border border-input bg-card px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
            {files.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-2">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    className="flex items-center gap-1.5 rounded-full bg-[#f0f2f6] px-3 py-1 text-xs font-semibold"
                  >
                    {file.name}
                    <button
                      type="button"
                      aria-label={`Retirer ${file.name}`}
                      onClick={() =>
                        setFiles((current) =>
                          current.filter((_, i) => i !== index),
                        )
                      }
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <input
                  ref={fileInput}
                  id="support-files"
                  type="file"
                  multiple
                  accept="application/pdf,image/jpeg,image/png"
                  className="hidden"
                  onChange={(event) => {
                    setFiles(Array.from(event.target.files ?? []))
                    setSendError(null)
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-[10px]"
                  onClick={() => fileInput.current?.click()}
                >
                  <Paperclip />
                  Joindre
                </Button>
                <span className="text-[12px] text-muted-foreground">
                  PDF, JPEG ou PNG · 10 Mo max ·{' '}
                  {MAX_SUPPORT_ATTACHMENTS_PER_MESSAGE} pièces par message ·{' '}
                  <span className="tabular-nums">
                    {draft.length}/{MAX_SUPPORT_MESSAGE_LENGTH}
                  </span>
                </span>
              </div>
              <Button
                className="rounded-[11px] shadow-[0_4px_14px_rgba(0,51,127,0.22)]"
                disabled={sendMutation.isPending}
                onClick={() => void submitMessage()}
              >
                <SendHorizonal />
                {sendMutation.isPending ? 'Envoi…' : 'Envoyer'}
              </Button>
            </div>
            {sendError && (
              <p
                role="alert"
                className="mt-2 text-[13px] font-medium text-destructive"
              >
                {sendError}
              </p>
            )}
          </div>
        )}
      </SectionCard>
    </div>
  )
}

function SupportConversationRoute() {
  const { conversationId } = Route.useParams()
  const id = Number(conversationId)
  return Number.isSafeInteger(id) && id > 0 ? (
    <SupportConversationContent conversationId={id} />
  ) : (
    <EmptyState
      variant="card"
      icon={Headset}
      tone="error"
      title="Identifiant de ticket invalide."
    />
  )
}
