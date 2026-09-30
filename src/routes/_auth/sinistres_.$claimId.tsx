import { pageHead } from '#/lib/page-title'
import { useRef, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CalendarDays,
  CalendarRange,
  Download,
  FileText,
  FileUp,
  FileWarning,
  History,
  MapPin,
  Paperclip,
  TriangleAlert,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { Label } from '#/components/ui/label'
import { Skeleton } from '#/components/ui/skeleton'
import { KpiCard } from '#/components/dashboard/KpiCard'
import { StatusPill } from '#/components/dashboard/StatusPill'
import { BackLink } from '#/components/layout/BackLink'
import {
  DetailHeaderCard,
  IconTile,
} from '#/components/layout/DetailHeaderCard'
import { EmptyState } from '#/components/layout/EmptyState'
import { InfoList, InfoRow } from '#/components/layout/InfoList'
import { KpiRow } from '#/components/layout/KpiRow'
import { SectionCard } from '#/components/layout/SectionCard'
import { ClaimActionDialog } from '#/components/claims/ClaimActionDialog'
import { ClaimsAdminGate } from '#/components/claims/ClaimsAdminGate'
import { ClaimStatusBadge } from '#/components/claims/ClaimStatusBadge'
import { ClaimTimeline } from '#/components/claims/ClaimTimeline'
import { useClientNames } from '#/components/claims/use-client-names'
import {
  availableActions,
  canUploadAttachment,
  formatClaimDate,
  formatFileSize,
  MAX_ATTACHMENTS,
  mapClaimError,
  validateClaimUpload,
} from '#/lib/claims'
import {
  addClaimNote,
  claimsKeys,
  downloadClaimAttachment,
  getClaim,
  transitionClaim,
  uploadClaimAttachment,
} from '#/services/claims'
import type {
  ClaimAttachmentResponse,
  ClaimTransition,
} from '#/services/claims'

export const Route = createFileRoute('/_auth/sinistres_/$claimId')({
  head: pageHead('Détail du sinistre'),
  component: ClaimDetailRoute,
})

const backSearch = { page: 0, size: 20, sort: 'createdAt,desc' } as const

const TEXTAREA_CLASS =
  'w-full rounded-[10px] border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'

function StateCard({
  title,
  description,
  tone,
  onRetry,
}: {
  title: string
  description?: string
  tone?: 'muted' | 'error'
  onRetry?: () => void
}) {
  return (
    <EmptyState
      variant="card"
      icon={TriangleAlert}
      tone={tone}
      title={title}
      description={description}
      action={
        <div className="flex flex-wrap justify-center gap-2">
          {onRetry && (
            <Button className="rounded-[11px]" onClick={onRetry}>
              Réessayer
            </Button>
          )}
          <Button
            asChild
            variant={onRetry ? 'outline' : 'default'}
            className="rounded-[11px]"
          >
            <Link to="/sinistres" search={backSearch}>
              Retour aux sinistres
            </Link>
          </Button>
        </div>
      }
    />
  )
}

const actionLabels: Record<ClaimTransition, string> = {
  review: 'Prendre en charge',
  'request-info': 'Demander des pièces',
  approve: 'Approuver',
  reject: 'Rejeter',
}

export function ClaimDetailContent({ claimId }: { claimId: number }) {
  const queryClient = useQueryClient()
  const { nameOf } = useClientNames()
  const fileInput = useRef<HTMLInputElement>(null)
  const [action, setAction] = useState<ClaimTransition | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [noteError, setNoteError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploadComment, setUploadComment] = useState('')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const {
    data: claim,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: claimsKeys.detail(claimId),
    queryFn: () => getClaim(claimId),
    retry: false,
  })
  const refresh = async () => {
    await refetch()
    await queryClient.invalidateQueries({ queryKey: claimsKeys.all })
  }
  const transitionMutation = useMutation({
    mutationFn: ({
      selected,
      comment,
    }: {
      selected: ClaimTransition
      comment?: string
    }) => transitionClaim(claimId, selected, { comment }),
    onSuccess: async () => {
      setAction(null)
      setActionError(null)
      await refresh()
      toast.success('Sinistre mis à jour.')
    },
    onError: (mutationError) =>
      setActionError(mapClaimError(mutationError).message),
  })
  const noteMutation = useMutation({
    mutationFn: (comment: string) => addClaimNote(claimId, comment),
    onSuccess: async () => {
      setNote('')
      setNoteError(null)
      await refresh()
      toast.success('Note interne ajoutée.')
    },
    onError: (mutationError) =>
      setNoteError(mapClaimError(mutationError).message),
  })
  const uploadMutation = useMutation({
    mutationFn: ({
      selectedFile,
      comment,
    }: {
      selectedFile: File
      comment?: string
    }) => uploadClaimAttachment(claimId, selectedFile, comment),
    onSuccess: async () => {
      setFile(null)
      setUploadComment('')
      setUploadError(null)
      if (fileInput.current) fileInput.current.value = ''
      await refresh()
      toast.success('Pièce ajoutée.')
    },
    onError: (mutationError) =>
      setUploadError(mapClaimError(mutationError).message),
  })
  const submitNote = () => {
    const trimmed = note.trim()
    if (!trimmed) {
      setNoteError('Le commentaire est obligatoire.')
      return
    }
    noteMutation.mutate(trimmed)
  }
  const submitUpload = async () => {
    const validation = await validateClaimUpload(
      file,
      claim?.attachments?.length ?? 0,
    )
    if (validation) {
      const messages = {
        FILE_REQUIRED: 'Sélectionnez un fichier.',
        FILE_TOO_LARGE: 'Le fichier dépasse 10 Mo.',
        FILE_TYPE_NOT_ALLOWED:
          'Seuls les fichiers PDF, JPEG et PNG sont acceptés.',
        ATTACHMENT_LIMIT_REACHED:
          'Ce sinistre contient déjà le maximum de 20 pièces.',
      }
      setUploadError(messages[validation])
      return
    }
    uploadMutation.mutate({
      selectedFile: file as File,
      comment: uploadComment.trim() || undefined,
    })
  }
  const download = async (attachment: ClaimAttachmentResponse) => {
    try {
      const blob = await downloadClaimAttachment(claimId, attachment.id)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = attachment.name
      link.click()
      URL.revokeObjectURL(url)
    } catch (downloadError) {
      toast.error(mapClaimError(downloadError).message)
    }
  }

  if (isLoading)
    return (
      <div className="flex flex-col gap-[18px]" aria-busy="true">
        <Skeleton className="h-36 rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-[122px] rounded-2xl" />
          <Skeleton className="h-[122px] rounded-2xl" />
          <Skeleton className="h-[122px] rounded-2xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  if (error || !claim) {
    const kind = error ? mapClaimError(error).kind : 'not-found'
    if (kind === 'forbidden')
      return (
        <StateCard
          tone="error"
          title="Accès refusé."
          description="Vous n’avez pas les droits nécessaires pour consulter ce sinistre."
        />
      )
    if (kind === 'not-found' || !error)
      return (
        <StateCard
          title="Sinistre introuvable"
          description="Ce sinistre n’existe pas ou a été supprimé."
        />
      )
    return (
      <StateCard
        tone="error"
        title="Impossible de charger le sinistre"
        description="Une erreur est survenue. Réessayez dans un instant."
        onRetry={() => void refetch()}
      />
    )
  }
  const actions = availableActions(claim.status)
  const terminal = ['APPROVED', 'REJECTED', 'CANCELLED'].includes(claim.status)
  const attachments = claim.attachments ?? []
  const events = claim.events ?? []

  return (
    <div className="flex flex-col gap-[18px]">
      <BackLink to="/sinistres" search={backSearch}>
        Retour aux sinistres
      </BackLink>
      <DetailHeaderCard
        leading={
          <IconTile>
            <FileWarning />
          </IconTile>
        }
        title={claim.claimNumber}
        meta={
          <>
            {claim.claimTypeName} · {claim.productLabel} · Déclaré le{' '}
            {formatClaimDate(claim.createdAt, true)} · mis à jour le{' '}
            {formatClaimDate(claim.updatedAt, true)}
          </>
        }
        pills={
          <>
            <ClaimStatusBadge status={claim.status} />
            <StatusPill tone="neutral">
              Déclaré par{' '}
              {claim.declaredBy === 'CLIENT' ? 'le client' : 'le back-office'}
            </StatusPill>
          </>
        }
        actions={actions.map((available) => (
          <Button
            key={available}
            className={
              available === 'approve'
                ? 'rounded-[11px] shadow-[0_4px_14px_rgba(0,51,127,0.22)]'
                : 'rounded-[11px]'
            }
            variant={
              available === 'reject'
                ? 'destructive'
                : available === 'approve'
                  ? 'default'
                  : 'outline'
            }
            onClick={() => setAction(available)}
          >
            {actionLabels[available]}
          </Button>
        ))}
      />

      <KpiRow cols={3} className="mb-0">
        <KpiCard
          icon={<CalendarDays className="size-5 text-primary" />}
          iconClass="bg-primary/[0.08]"
          value={
            <span className="text-[24px]">
              {formatClaimDate(claim.occurredOn)}
            </span>
          }
          label="Date de survenance"
        />
        <KpiCard
          icon={<Paperclip className="size-5 text-[#1f53b0]" />}
          iconClass="bg-[#1f53b0]/10"
          value={`${attachments.length}/${MAX_ATTACHMENTS}`}
          label="Pièces jointes"
        />
        <KpiCard
          icon={<History className="size-5 text-[#8a6600]" />}
          iconClass="bg-[#ffc61e]/20"
          value={events.length}
          label="Événements au dossier"
        />
      </KpiRow>

      {claim.status === 'INFO_REQUESTED' && (
        <p className="rounded-lg bg-[#fef3da] px-4 py-3 text-[13px] text-[#8a6600]">
          Le dossier attend une pièce. Aucune transition back-office n’est
          disponible; le dépôt d’une pièce le replacera automatiquement en
          instruction.
        </p>
      )}
      {terminal && (
        <p className="rounded-lg bg-[#f0f1f4] px-4 py-3 text-[13px] text-muted-foreground">
          Ce statut est terminal : aucune transition et aucun dépôt de pièce ne
          sont possibles. Les notes internes restent disponibles.
        </p>
      )}

      <div className="grid items-start gap-[18px] xl:grid-cols-[1fr_1.15fr]">
        <div className="flex flex-col gap-[18px]">
          <SectionCard title="Déclaration">
            <InfoList columns={2}>
              <InfoRow icon={<User />} label="Client déclarant">
                {claim.clientName?.trim() ? (
                  <Link
                    to="/clients/$clientId"
                    params={{ clientId: String(claim.clientId) }}
                    className="text-primary hover:underline"
                  >
                    {nameOf(claim.clientId, claim.clientName)}
                  </Link>
                ) : (
                  `Client supprimé (#${claim.clientId})`
                )}
              </InfoRow>
              <InfoRow icon={<FileWarning />} label="Type">
                {claim.claimTypeName}
              </InfoRow>
              <InfoRow icon={<CalendarDays />} label="Survenance">
                {formatClaimDate(claim.occurredOn)}
              </InfoRow>
              <InfoRow
                icon={<MapPin />}
                label="Lieu"
                placeholder="Non renseigné"
              >
                {claim.location}
              </InfoRow>
              <InfoRow icon={<User />} label="Déclaré par">
                {claim.declaredBy === 'CLIENT' ? 'Client' : 'Back-office'}
              </InfoRow>
            </InfoList>
            <div className="mt-5 border-t pt-4">
              <p className="mb-1 text-[12.5px] text-muted-foreground">
                Description
              </p>
              <p className="text-[13.5px] whitespace-pre-wrap">
                {claim.description}
              </p>
            </div>
          </SectionCard>

          <SectionCard
            title="Contexte du contrat à la déclaration"
            description="Snapshot figé, non synchronisé avec l’état actuel du contrat."
          >
            <InfoList columns={2}>
              <InfoRow icon={<FileText />} label="Produit">
                {claim.productLabel}
              </InfoRow>
              <InfoRow icon={<FileText />} label="Contrat">
                {claim.policyNumber ?? `#${claim.subscriptionId}`}
              </InfoRow>
              <InfoRow icon={<CalendarRange />} label="Début de couverture">
                {formatClaimDate(claim.coverageStart)}
              </InfoRow>
              <InfoRow icon={<CalendarRange />} label="Fin de couverture">
                {formatClaimDate(claim.coverageEnd)}
              </InfoRow>
            </InfoList>
          </SectionCard>

          <SectionCard
            title="Note interne"
            description="Cette note ne sera pas visible du client."
          >
            <textarea
              aria-label="Commentaire de la note interne"
              rows={4}
              maxLength={1000}
              value={note}
              onChange={(event) => {
                setNote(event.target.value)
                setNoteError(null)
              }}
              className={TEXTAREA_CLASS}
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[12px] text-muted-foreground">
                {note.length}/1000
              </span>
              <Button
                size="sm"
                className="rounded-[10px]"
                disabled={noteMutation.isPending}
                onClick={submitNote}
              >
                {noteMutation.isPending ? 'Ajout…' : 'Ajouter la note'}
              </Button>
            </div>
            {noteError && (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {noteError}
              </p>
            )}
          </SectionCard>

          <SectionCard
            title="Pièces jointes"
            description={`${attachments.length}/${MAX_ATTACHMENTS} pièces au dossier`}
          >
            {canUploadAttachment(claim.status) && (
              <div className="mb-4 rounded-xl border border-dashed bg-[#fafbfc] p-4">
                <Label htmlFor="claim-file" className="text-[13px]">
                  PDF, JPEG ou PNG · 10 Mo maximum · {attachments.length}/
                  {MAX_ATTACHMENTS}
                </Label>
                <input
                  ref={fileInput}
                  id="claim-file"
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  className="mt-2 block w-full text-sm file:mr-3 file:rounded-[9px] file:border-0 file:bg-primary/[0.08] file:px-3 file:py-1.5 file:text-[12.5px] file:font-semibold file:text-primary"
                  onChange={(event) => {
                    setFile(event.target.files?.[0] ?? null)
                    setUploadError(null)
                  }}
                />
                <input
                  aria-label="Commentaire de la pièce"
                  value={uploadComment}
                  maxLength={1000}
                  placeholder="Commentaire optionnel"
                  onChange={(event) => setUploadComment(event.target.value)}
                  className="mt-3 h-10 w-full rounded-[10px] border bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
                <Button
                  className="mt-3 rounded-[10px]"
                  size="sm"
                  disabled={uploadMutation.isPending}
                  onClick={submitUpload}
                >
                  <FileUp />
                  {uploadMutation.isPending
                    ? 'Envoi…'
                    : uploadError ===
                        'Service de stockage momentanément indisponible.'
                      ? 'Réessayer'
                      : 'Ajouter la pièce'}
                </Button>
                {uploadError && (
                  <p role="alert" className="mt-2 text-sm text-destructive">
                    {uploadError}
                  </p>
                )}
              </div>
            )}
            <ul className="divide-y">
              {attachments.map((attachment) => (
                <li
                  key={attachment.id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary/[0.08] text-primary">
                      <FileText className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-semibold">
                        {attachment.name}
                      </p>
                      <p className="text-[12px] text-muted-foreground">
                        {attachment.contentType} ·{' '}
                        {formatFileSize(attachment.sizeBytes)} ·{' '}
                        {attachment.uploadedBy === 'CLIENT'
                          ? 'Client'
                          : 'Back-office'}{' '}
                        · {formatClaimDate(attachment.createdAt, true)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-[10px]"
                    aria-label={`Télécharger ${attachment.name}`}
                    onClick={() => download(attachment)}
                  >
                    <Download />
                  </Button>
                </li>
              ))}
              {!attachments.length && (
                <li className="text-[13.5px] text-muted-foreground">
                  Aucune pièce jointe.
                </li>
              )}
            </ul>
          </SectionCard>
        </div>
        <SectionCard
          title="Historique du dossier"
          description="Changements de statut, pièces et notes, du plus ancien au plus récent."
        >
          <ClaimTimeline events={events} />
        </SectionCard>
      </div>
      {action && (
        <ClaimActionDialog
          action={action}
          pending={transitionMutation.isPending}
          error={actionError}
          onClose={() => {
            setAction(null)
            setActionError(null)
          }}
          onConfirm={(comment) =>
            transitionMutation.mutate({ selected: action, comment })
          }
        />
      )}
    </div>
  )
}

function ClaimDetailRoute() {
  const { claimId } = Route.useParams()
  const id = Number(claimId)
  return (
    <ClaimsAdminGate>
      {Number.isSafeInteger(id) && id > 0 ? (
        <ClaimDetailContent claimId={id} />
      ) : (
        <StateCard
          title="Identifiant de sinistre invalide."
          description="Vérifiez l’adresse de la page ou revenez à la liste."
        />
      )}
    </ClaimsAdminGate>
  )
}
