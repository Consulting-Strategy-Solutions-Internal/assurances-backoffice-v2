import { useRef, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Download, FileUp } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { Label } from '#/components/ui/label'
import { ClaimActionDialog } from '#/components/claims/ClaimActionDialog'
import { ClaimsAdminGate } from '#/components/claims/ClaimsAdminGate'
import { ClaimStatusBadge } from '#/components/claims/ClaimStatusBadge'
import { ClaimTimeline } from '#/components/claims/ClaimTimeline'
import {
  availableActions,
  canUploadAttachment,
  formatClaimDate,
  formatFileSize,
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
  component: ClaimDetailRoute,
})

const actionLabels: Record<ClaimTransition, string> = {
  review: 'Prendre en charge',
  'request-info': 'Demander des pièces',
  approve: 'Approuver',
  reject: 'Rejeter',
}

export function ClaimDetailContent({ claimId }: { claimId: number }) {
  const queryClient = useQueryClient()
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
      <Card className="p-8 text-center text-muted-foreground">
        Chargement du sinistre…
      </Card>
    )
  if (error || !claim)
    return (
      <Card className="p-8 text-center">
        <h1 className="text-xl font-bold">Sinistre introuvable</h1>
        <Button asChild className="mt-4">
          <Link
            to="/sinistres"
            search={{ page: 0, size: 20, sort: 'createdAt,desc' }}
          >
            Retour à la liste
          </Link>
        </Button>
      </Card>
    )
  const actions = availableActions(claim.status)
  const terminal = ['APPROVED', 'REJECTED', 'CANCELLED'].includes(claim.status)

  return (
    <>
      <Button asChild variant="ghost" className="mb-4">
        <Link
          to="/sinistres"
          search={{ page: 0, size: 20, sort: 'createdAt,desc' }}
        >
          <ArrowLeft />
          Retour aux sinistres
        </Link>
      </Button>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold">{claim.claimNumber}</h1>
            <ClaimStatusBadge status={claim.status} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Déclaré le {formatClaimDate(claim.createdAt, true)} · mis à jour le{' '}
            {formatClaimDate(claim.updatedAt, true)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.map((available) => (
            <Button
              key={available}
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
        </div>
      </div>
      {claim.status === 'INFO_REQUESTED' && (
        <p className="mb-4 rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm text-violet-900">
          Le dossier attend une pièce. Aucune transition back-office n’est
          disponible; le dépôt d’une pièce le replacera automatiquement en
          instruction.
        </p>
      )}
      {terminal && (
        <p className="mb-4 rounded-lg border bg-muted/40 p-3 text-sm">
          Ce statut est terminal : aucune transition et aucun dépôt de pièce ne
          sont possibles. Les notes internes restent disponibles.
        </p>
      )}
      <div className="grid gap-5 xl:grid-cols-[1fr_1.15fr]">
        <div className="space-y-5">
          <Card>
            <h2 className="text-lg font-bold">Déclaration</h2>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Client déclarant</dt>
                <dd className="font-semibold">
                  {claim.clientName?.trim() ? (
                    <Link
                      to="/clients/$clientId"
                      params={{ clientId: String(claim.clientId) }}
                      className="text-primary hover:underline"
                    >
                      {claim.clientName}
                    </Link>
                  ) : (
                    `Client supprimé (#${claim.clientId})`
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Type</dt>
                <dd className="font-semibold">{claim.claimTypeName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Survenance</dt>
                <dd>{formatClaimDate(claim.occurredOn)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Lieu</dt>
                <dd>{claim.location || 'Non renseigné'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Déclaré par</dt>
                <dd>
                  {claim.declaredBy === 'CLIENT' ? 'Client' : 'Back-office'}
                </dd>
              </div>
            </dl>
            <p className="mt-4 whitespace-pre-wrap text-sm">
              {claim.description}
            </p>
          </Card>
          <Card>
            <h2 className="text-lg font-bold">
              Contexte du contrat à la déclaration
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Snapshot figé, non synchronisé avec l’état actuel du contrat.
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Produit</dt>
                <dd className="font-semibold">{claim.productLabel}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Contrat</dt>
                <dd>#{claim.subscriptionId}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Début de couverture</dt>
                <dd>{formatClaimDate(claim.coverageStart)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Fin de couverture</dt>
                <dd>{formatClaimDate(claim.coverageEnd)}</dd>
              </div>
            </dl>
          </Card>
          <Card>
            <h2 className="text-lg font-bold">Note interne</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Cette note ne sera pas visible du client.
            </p>
            <textarea
              aria-label="Commentaire de la note interne"
              rows={4}
              maxLength={1000}
              value={note}
              onChange={(event) => {
                setNote(event.target.value)
                setNoteError(null)
              }}
              className="mt-3 w-full rounded-[10px] border bg-transparent px-3 py-2 text-sm"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {note.length}/1000
              </span>
              <Button
                size="sm"
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
          </Card>
          <Card>
            <h2 className="text-lg font-bold">Pièces jointes</h2>
            {canUploadAttachment(claim.status) && (
              <div className="mt-3 rounded-xl border border-dashed p-3">
                <Label htmlFor="claim-file">
                  PDF, JPEG ou PNG · 10 Mo maximum ·{' '}
                  {claim.attachments?.length ?? 0}/20
                </Label>
                <input
                  ref={fileInput}
                  id="claim-file"
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  className="mt-2 block w-full text-sm"
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
                  className="mt-3 h-10 w-full rounded-[10px] border bg-transparent px-3 text-sm"
                />
                <Button
                  className="mt-3"
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
            <ul className="mt-4 divide-y">
              {(claim.attachments ?? []).map((attachment) => (
                <li
                  key={attachment.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {attachment.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {attachment.contentType} ·{' '}
                      {formatFileSize(attachment.sizeBytes)} ·{' '}
                      {attachment.uploadedBy === 'CLIENT'
                        ? 'Client'
                        : 'Back-office'}{' '}
                      · {formatClaimDate(attachment.createdAt, true)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={`Télécharger ${attachment.name}`}
                    onClick={() => download(attachment)}
                  >
                    <Download />
                  </Button>
                </li>
              ))}
              {!(claim.attachments ?? []).length && (
                <li className="py-3 text-sm text-muted-foreground">
                  Aucune pièce jointe.
                </li>
              )}
            </ul>
          </Card>
        </div>
        <Card>
          <h2 className="mb-5 text-lg font-bold">Historique du dossier</h2>
          <ClaimTimeline events={claim.events ?? []} />
        </Card>
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
    </>
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
        <Card className="p-8 text-center">
          Identifiant de sinistre invalide.
        </Card>
      )}
    </ClaimsAdminGate>
  )
}
