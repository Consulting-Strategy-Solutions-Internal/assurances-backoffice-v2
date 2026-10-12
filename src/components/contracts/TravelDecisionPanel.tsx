import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link2, RotateCcw, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '#/components/dashboard/ConfirmDialog'
import { usePermissions } from '#/components/dashboard/use-permissions'
import { FormDialog } from '#/components/forms/FormDialog'
import { FormField } from '#/components/forms/FormField'
import { TextareaField } from '#/components/ia-products/shared/TextareaField'
import { WarningBanner } from '#/components/ia-products/shared/WarningBanner'
import { InfoList, InfoRow } from '#/components/layout/InfoList'
import { SectionCard } from '#/components/layout/SectionCard'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { apiErrorMessage, isForbidden } from '#/lib/api-error'
import { formatClaimDate } from '#/lib/claims'
import {
  POLICY_ID_MAX,
  REFUSAL_REASON_MAX,
  decisionState,
  isGaveUp,
  mapTravelDecisionError,
} from '#/lib/travel'
import type { TravelDecisionError } from '#/lib/travel'
import { subscriptionsKeys } from '#/services/subscriptions'
import {
  attachTravelPolicy,
  findTravelSupervisionItem,
  refuseTravelIssuance,
  retryTravelIssuance,
  travelKeys,
} from '#/services/travel'
import type { TravelSupervisionItem } from '#/services/travel'

/** Heure courante, rafraîchie chaque minute : les boutons s'activent seuls à `reconcilableFrom`. */
function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}

type Decision = 'attach' | 'retry' | 'refuse'

/**
 * Après une décision : la ligne renvoyée par le serveur va dans le cache
 * (L-004), puis le contrat et la liste de supervision sont relus.
 */
function useDecisionDone(subscriptionId: number) {
  const queryClient = useQueryClient()
  return {
    done: (item: TravelSupervisionItem) => {
      queryClient.setQueryData(travelKeys.item(subscriptionId), item)
      void queryClient.invalidateQueries({
        queryKey: subscriptionsKeys.detail(subscriptionId),
      })
      void queryClient.invalidateQueries({
        queryKey: ['travel', 'supervision'],
      })
    },
    reload: () => {
      void queryClient.invalidateQueries({
        queryKey: subscriptionsKeys.detail(subscriptionId),
      })
      void queryClient.invalidateQueries({ queryKey: travelKeys.all })
    },
  }
}

function AttachDialog({
  subscriptionId,
  onClose,
}: {
  subscriptionId: number
  onClose: () => void
}) {
  const { done, reload } = useDecisionDone(subscriptionId)
  const [policyId, setPolicyId] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const mutation = useMutation({
    mutationFn: (id: string) => attachTravelPolicy(subscriptionId, id),
    onSuccess: (item) => {
      done(item)
      toast.success('Police rattachée : le contrat est émis.')
      onClose()
    },
    onError: (e) => {
      const mapped = mapTravelDecisionError(e)
      if (mapped.kind === 'field') setFieldError(mapped.message)
      else if (mapped.kind === 'stale') {
        reload()
        toast.error(mapped.message)
        onClose()
      } else setError(mapped.message)
    },
  })
  const submit = () => {
    const value = policyId.trim()
    setError(null)
    if (!value) {
      setFieldError('Saisissez l’identifiant de la police EVO.')
      return
    }
    if (value.length > POLICY_ID_MAX) {
      setFieldError(`${String(POLICY_ID_MAX)} caractères au plus.`)
      return
    }
    setFieldError(null)
    mutation.mutate(value)
  }
  return (
    <FormDialog
      onClose={onClose}
      eyebrow="Décision"
      title="Rattacher la police EVO"
      description="Cover Edge a confirmé qu’une police existe pour ce client. NSIA la relit chez EVO et ne la rattache que si elle est active et correspond au contrat (produit, prime, dates, voyageurs)."
      onSubmit={submit}
      submitLabel="Rattacher"
      pending={mutation.isPending}
      error={error}
      dirty={policyId.trim() !== ''}
    >
      <FormField
        id="evo-policy-id"
        label="Identifiant de la police chez EVO"
        required
        value={policyId}
        onChange={(v) => {
          setPolicyId(v)
          setFieldError(null)
        }}
        error={fieldError ?? undefined}
        hint="L’identifiant communiqué par Cover Edge."
      />
    </FormDialog>
  )
}

function RefuseDialog({
  subscriptionId,
  onClose,
}: {
  subscriptionId: number
  onClose: () => void
}) {
  const { done, reload } = useDecisionDone(subscriptionId)
  const [reason, setReason] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const mutation = useMutation({
    mutationFn: (text: string) => refuseTravelIssuance(subscriptionId, text),
    onSuccess: (item) => {
      done(item)
      toast.success(
        'Refus enregistré : le contrat est annulé et le remboursement demandé.',
      )
      onClose()
    },
    onError: (e) => {
      const mapped = mapTravelDecisionError(e)
      setConfirming(false)
      if (mapped.kind === 'field') {
        setFieldError(mapped.message)
        return
      }
      if (mapped.kind === 'stale') {
        reload()
        onClose()
      }
      toast.error(mapped.message)
    },
  })
  const next = () => {
    const value = reason.trim()
    if (!value) {
      setFieldError('Indiquez ce qui a été vérifié.')
      return
    }
    if (value.length > REFUSAL_REASON_MAX) {
      setFieldError(`${String(REFUSAL_REASON_MAX)} caractères au plus.`)
      return
    }
    setFieldError(null)
    setConfirming(true)
  }
  return (
    <FormDialog
      onClose={onClose}
      eyebrow="Décision"
      title="Refuser l’émission"
      description="Aucune police chez Cover Edge et devis expiré, ou décision de ne pas émettre."
      onSubmit={next}
      submitLabel="Continuer"
      pending={mutation.isPending}
      dirty={reason.trim() !== ''}
    >
      <TextareaField
        id="refusal-reason"
        label="Ce qui a été vérifié"
        required
        rows={4}
        maxLength={REFUSAL_REASON_MAX}
        value={reason}
        onChange={(v) => {
          setReason(v)
          setFieldError(null)
        }}
        error={fieldError ?? undefined}
      />
      {/* Dans le dialogue qu'elle protège : sinon le clic est un « outside click » (gotcha Radix). */}
      <ConfirmDialog
        open={confirming}
        title="Refuser définitivement ?"
        description="Cette décision est irréversible : le contrat passe Refusé et Annulé, le client est remboursé automatiquement et aucune commission n’est versée."
        confirmLabel="Refuser définitivement"
        destructive
        pending={mutation.isPending}
        onConfirm={() => mutation.mutate(reason.trim())}
        onOpenChange={(open) => !open && setConfirming(false)}
      />
    </FormDialog>
  )
}

function decisionErrorBanner(error: TravelDecisionError | null) {
  return error ? (
    <WarningBanner tone="danger">{error.message}</WarningBanner>
  ) : null
}

/**
 * « Décision à prendre » sur un contrat voyage `TO_RECONCILE` : rappel de la
 * vérification chez Cover Edge, puis rattacher / relancer / refuser — ouverts
 * à partir de `reconcilableFrom`, au porteur de `subscription:reconcile`.
 */
export function TravelDecisionPanel({
  subscriptionId,
}: {
  subscriptionId: number
}) {
  const { can, permissions } = usePermissions()
  const now = useNow()
  const { done, reload } = useDecisionDone(subscriptionId)
  const [open, setOpen] = useState<Decision | null>(null)
  const [retryError, setRetryError] = useState<TravelDecisionError | null>(null)

  const itemQuery = useQuery({
    queryKey: travelKeys.item(subscriptionId),
    queryFn: () => findTravelSupervisionItem(subscriptionId, 'TO_RECONCILE'),
    retry: false,
  })
  const retry = useMutation({
    mutationFn: () => retryTravelIssuance(subscriptionId),
    onSuccess: (item) => {
      done(item)
      setOpen(null)
      toast.success('Émission relancée : un nouvel envoi part vers EVO.')
    },
    onError: (e) => {
      const mapped = mapTravelDecisionError(e)
      setOpen(null)
      if (mapped.kind === 'stale') reload()
      setRetryError(mapped)
      toast.error(mapped.message)
    },
  })

  // L'action est gardée par le serveur : proposée tant que le droit n'est pas connu absent (L-005).
  const mayReconcile = can('subscription:reconcile')
  const item = itemQuery.data

  return (
    <SectionCard
      title="Décision à prendre"
      description="L’issue de l’envoi à EVO est incertaine : un administrateur doit trancher."
    >
      <div className="flex flex-col gap-4">
        <WarningBanner title="Avant de décider">
          Demandez à Cover Edge si une police existe pour ce client (nom,
          passeport, dates, prime). Police trouvée : rattachez-la. Aucune police
          et devis encore valable : relancez. Sinon : refusez.
        </WarningBanner>

        {itemQuery.isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : itemQuery.isError ? (
          <p role="alert" className="text-[13px] text-destructive">
            {isForbidden(itemQuery.error)
              ? 'Droit insuffisant pour lire la supervision voyage.'
              : apiErrorMessage(itemQuery.error)}
          </p>
        ) : !item ? (
          <p className="text-[13px] text-muted-foreground">
            Contrat introuvable dans la supervision des contrats à trancher : il
            vient peut-être d’être traité. Rechargez la page.
          </p>
        ) : (
          <DecisionBody
            item={item}
            now={now}
            mayReconcile={mayReconcile}
            reserved={permissions !== null && !mayReconcile}
            onOpen={(decision) => {
              setRetryError(null)
              setOpen(decision)
            }}
          />
        )}
        {decisionErrorBanner(retryError)}
      </div>

      {open === 'attach' && (
        <AttachDialog
          subscriptionId={subscriptionId}
          onClose={() => setOpen(null)}
        />
      )}
      {open === 'refuse' && (
        <RefuseDialog
          subscriptionId={subscriptionId}
          onClose={() => setOpen(null)}
        />
      )}
      <ConfirmDialog
        open={open === 'retry'}
        title="Relancer l’émission ?"
        description="À faire seulement si Cover Edge confirme qu’aucune police n’existe et que le devis EVO est encore valable : un seul nouvel envoi part vers EVO."
        confirmLabel="Relancer l’émission"
        pending={retry.isPending}
        onConfirm={() => retry.mutate()}
        onOpenChange={(o) => !o && setOpen(null)}
      />
    </SectionCard>
  )
}

function DecisionBody({
  item,
  now,
  mayReconcile,
  reserved,
  onOpen,
}: {
  item: TravelSupervisionItem
  now: Date
  mayReconcile: boolean
  reserved: boolean
  onOpen: (decision: Decision) => void
}) {
  const state = decisionState(item, now, mayReconcile)
  const waiting = state.kind === 'waiting'
  return (
    <>
      {isGaveUp(item.evoLastError) && (
        <WarningBanner tone="danger" title="Plafond de renvois atteint">
          EVO n’a rien créé après {item.evoIssuanceAttempts} tentatives, souvent
          à cause d’une mauvaise configuration. Vérifiez la configuration EVO
          avant de relancer.
        </WarningBanner>
      )}
      <InfoList columns={2}>
        <InfoRow label="Envois à EVO">{item.evoIssuanceAttempts}</InfoRow>
        <InfoRow label="Dernier envoi">
          {formatClaimDate(item.evoSentAt, true)}
        </InfoRow>
      </InfoList>
      {item.evoLastError && (
        <div>
          <div className="text-[12.5px] text-muted-foreground">
            Dernière erreur ou décision
          </div>
          <p className="mt-[3px] text-[13px] break-words">
            {item.evoLastError}
          </p>
        </div>
      )}

      {reserved ? (
        <p className="text-[13px] text-muted-foreground">
          Décision réservée à l’administration (droit « Contrats — Trancher une
          émission »).
        </p>
      ) : (
        state.kind !== 'hidden' && (
          <div className="flex flex-col gap-2.5">
            {waiting && item.reconcilableFrom && (
              <p className="text-[13px] font-semibold">
                Décision possible à partir du{' '}
                {formatClaimDate(item.reconcilableFrom, true)} (heure
                d’Abidjan).
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                className="rounded-[11px]"
                disabled={waiting}
                onClick={() => onOpen('attach')}
              >
                <Link2 />
                Rattacher une police
              </Button>
              <Button
                variant="outline"
                className="rounded-[11px]"
                disabled={waiting}
                onClick={() => onOpen('retry')}
              >
                <RotateCcw />
                Relancer
              </Button>
              <Button
                variant="outline"
                className="rounded-[11px] text-destructive"
                disabled={waiting}
                onClick={() => onOpen('refuse')}
              >
                <XCircle />
                Refuser
              </Button>
            </div>
          </div>
        )
      )}
    </>
  )
}
