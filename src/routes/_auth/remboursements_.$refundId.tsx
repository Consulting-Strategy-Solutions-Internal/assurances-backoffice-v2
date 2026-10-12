import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { BellRing, ShieldAlert, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { usePermissions } from '#/components/dashboard/use-permissions'
import { FormField } from '#/components/forms/FormField'
import { WarningBanner } from '#/components/ia-products/shared/WarningBanner'
import {
  DetailHeaderCard,
  IconTile,
} from '#/components/layout/DetailHeaderCard'
import { EmptyState } from '#/components/layout/EmptyState'
import { SectionCard } from '#/components/layout/SectionCard'
import { Button } from '#/components/ui/button'
import { Label } from '#/components/ui/label'
import { Skeleton } from '#/components/ui/skeleton'
import { apiErrorMessage } from '#/lib/api-error'
import { formatClaimDate } from '#/lib/claims'
import { pageHead } from '#/lib/page-title'
import {
  DESTINATION_MAX,
  MOBILE_MONEY_OPERATORS,
  OPERATOR_LABELS,
  OPERATOR_PREFIXES,
  REFUND_STATUS_LABELS,
  findRefundAlert,
  formatIvorianNumber,
  mapRefundDestinationError,
  normalizeIvorianNumber,
  validateRefundDestination,
} from '#/lib/refunds'
import type { DestinationErrors } from '#/lib/refunds'
import {
  getRecentNotifications,
  refundKeys,
  setRefundDestination,
} from '#/services/refunds'
import type { MobileMoneyOperator, RefundResponse } from '#/services/refunds'

export const Route = createFileRoute('/_auth/remboursements_/$refundId')({
  head: pageHead('Remboursement à traiter'),
  component: RefundDetailRoute,
})

/** Causes possibles d'une alerte `REFUND_ATTENTION`, et la conduite à tenir. */
const CAUSES: Array<{ cause: string; todo: string }> = [
  {
    cause: 'Numéro payeur illisible (attend un numéro de remboursement)',
    todo: 'Saisir l’opérateur et le numéro ci-dessous ; le client peut aussi le faire depuis l’application. Le versement repart seul.',
  },
  {
    cause: 'Versement refusé, échoué ou introuvable chez FineoPay',
    todo: 'Vérifier chez FineoPay qu’aucun versement n’est parti, puis rembourser à la main. Jamais renvoyé automatiquement.',
  },
  {
    cause: 'Versement toujours en attente chez FineoPay (plus de 24 h)',
    todo: 'Vérifier son état chez FineoPay. Alerte au plus une fois par jour.',
  },
  {
    cause: 'Montant au-dessus du plafond FineoPay (1 000 000 F par versement)',
    todo: 'Rembourser à la main, par virement.',
  },
  {
    cause: 'Aucun fournisseur de versement réel activé',
    todo: 'Information : les remboursements partiront seuls dès l’activation du versement réel.',
  },
]

function AlertCard({ refundId }: { refundId: number }) {
  const alerts = useQuery({
    queryKey: refundKeys.alerts,
    queryFn: getRecentNotifications,
    retry: false,
  })
  const alert = alerts.data ? findRefundAlert(alerts.data, refundId) : null
  return (
    <SectionCard title="Alerte reçue">
      {alerts.isPending ? (
        <Skeleton className="h-10 w-full" />
      ) : alerts.isError ? (
        <p role="alert" className="text-[13px] text-destructive">
          Impossible de charger l’alerte : {apiErrorMessage(alerts.error)}
        </p>
      ) : alert ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-[14px] leading-relaxed font-medium">
            {alert.body}
          </p>
          <p className="text-[12px] text-muted-foreground">
            Reçue le {formatClaimDate(alert.createdAt, true)}
          </p>
        </div>
      ) : (
        <p className="text-[13px] text-muted-foreground">
          Alerte introuvable parmi vos 500 dernières notifications : la cause
          n’est pas connue ici. Utilisez l’aide-mémoire ci-dessous.
        </p>
      )}
    </SectionCard>
  )
}

function CausesCard() {
  return (
    <SectionCard
      title="Que faire selon la cause"
      description="La cause est écrite dans le texte de l’alerte."
    >
      <ul className="divide-y">
        {CAUSES.map((c) => (
          <li key={c.cause} className="py-2.5 first:pt-0 last:pb-0">
            <div className="text-[13.5px] font-semibold">{c.cause}</div>
            <div className="mt-0.5 text-[13px] text-muted-foreground">
              {c.todo}
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  )
}

function OperatorChoice({
  value,
  onChange,
  error,
}: {
  value: MobileMoneyOperator | null
  onChange: (operator: MobileMoneyOperator) => void
  error?: string
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-[13px] font-medium">
        Opérateur<span className="text-destructive">*</span>
      </legend>
      <div className="flex flex-wrap gap-2" aria-invalid={!!error}>
        {MOBILE_MONEY_OPERATORS.map((op) => (
          <Label
            key={op}
            className="flex cursor-pointer items-center gap-2 rounded-[10px] border px-3 py-2 text-[13.5px] has-[:checked]:border-primary has-[:checked]:bg-primary/[0.06]"
          >
            <input
              type="radio"
              name="refund-operator"
              value={op}
              checked={value === op}
              onChange={() => onChange(op)}
              aria-label={OPERATOR_LABELS[op]}
              className="accent-primary"
            />
            {OPERATOR_LABELS[op]}
            <span className="text-[12px] text-muted-foreground">
              {OPERATOR_PREFIXES[op] ? `${OPERATOR_PREFIXES[op]}…` : 'tout'}
            </span>
          </Label>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-[12px] font-medium text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  )
}

function DestinationForm({ refundId }: { refundId: number }) {
  const [operator, setOperator] = useState<MobileMoneyOperator | null>(null)
  const [destination, setDestination] = useState('')
  const [errors, setErrors] = useState<DestinationErrors>({})
  const [banner, setBanner] = useState<string | null>(null)
  const [saved, setSaved] = useState<RefundResponse | null>(null)
  const mutation = useMutation({
    mutationFn: (body: {
      operator: MobileMoneyOperator
      destination: string
    }) => setRefundDestination(refundId, body),
    onSuccess: (refund) => {
      setSaved(refund)
      toast.success(
        `Numéro enregistré pour ${refund.reference} : le versement repart.`,
      )
    },
    onError: (e) => {
      const mapped = mapRefundDestinationError(e)
      if (mapped.kind === 'field') setErrors({ [mapped.field]: mapped.message })
      else setBanner(mapped.message)
    },
  })

  const submit = () => {
    setBanner(null)
    const found = validateRefundDestination(operator, destination)
    setErrors(found)
    const normalized = normalizeIvorianNumber(destination)
    if (found.operator || found.destination || !operator || !normalized) return
    mutation.mutate({ operator, destination: normalized })
  }

  if (saved)
    return (
      <WarningBanner tone="info" title="Numéro enregistré">
        {saved.reference} : {formatIvorianNumber(saved.destination)} (
        {saved.operator ? OPERATOR_LABELS[saved.operator] : '—'}) — statut «{' '}
        {REFUND_STATUS_LABELS[saved.status]} », le versement repart
        automatiquement.
      </WarningBanner>
    )

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <OperatorChoice
        value={operator}
        onChange={(op) => {
          setOperator(op)
          setErrors({})
        }}
        error={errors.operator}
      />
      <FormField
        id="refund-destination"
        label="Numéro de remboursement"
        type="tel"
        required
        autoComplete="off"
        value={destination}
        onChange={(v) => {
          setDestination(v.slice(0, DESTINATION_MAX))
          setErrors((prev) => ({ ...prev, destination: undefined }))
        }}
        error={errors.destination}
        hint="Numéro ivoirien, avec ou sans +225 : 07 Orange, 05 MTN, 01 Moov, tout préfixe pour Wave."
      />
      {banner && <WarningBanner tone="danger">{banner}</WarningBanner>}
      <div>
        <Button
          type="submit"
          className="rounded-[11px]"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? 'Enregistrement…' : 'Enregistrer le numéro'}
        </Button>
      </div>
    </form>
  )
}

/**
 * Remboursement signalé par une alerte `REFUND_ATTENTION` : pas de route de
 * lecture, donc la cause vient du texte de l'alerte ; le numéro peut être
 * saisi (`withdrawal:write`), le serveur refusant s'il n'en attend pas.
 */
export function RefundDetailContent({ refundId }: { refundId: number }) {
  // Action gardée par le serveur : proposée tant que le droit n'est pas connu absent (L-005).
  const { can } = usePermissions()
  return (
    <div className="flex flex-col gap-[18px]">
      <DetailHeaderCard
        leading={
          <IconTile>
            <Wallet />
          </IconTile>
        }
        title={`Remboursement RF-${refundId}`}
        meta="Remboursement d’un contrat voyage annulé, signalé par une alerte."
      />
      <div className="grid items-start gap-[18px] lg:grid-cols-2">
        <div className="flex flex-col gap-[18px]">
          <AlertCard refundId={refundId} />
          <SectionCard
            title="Numéro de remboursement"
            description="Seulement si le remboursement attend un numéro (numéro payeur illisible)."
          >
            {can('withdrawal:write') ? (
              <DestinationForm refundId={refundId} />
            ) : (
              <p className="text-[13px] text-muted-foreground">
                Le droit de saisir le numéro de remboursement d’un client («
                Retraits et remboursements — Modifier ») est nécessaire.
              </p>
            )}
          </SectionCard>
        </div>
        <CausesCard />
      </div>
    </div>
  )
}

function RefundDetailRoute() {
  const { refundId } = Route.useParams()
  const { permissions } = usePermissions()
  const id = Number(refundId)
  if (
    permissions &&
    !permissions.has('withdrawal:read') &&
    !permissions.has('withdrawal:write')
  )
    return (
      <EmptyState
        variant="card"
        icon={ShieldAlert}
        tone="error"
        title="Droit insuffisant"
        description="Vous n’avez pas le droit de traiter les remboursements."
      />
    )
  if (!Number.isSafeInteger(id) || id <= 0)
    return (
      <EmptyState
        variant="card"
        icon={BellRing}
        title="Identifiant de remboursement invalide."
        description="Ouvrez le remboursement depuis son alerte."
      />
    )
  return <RefundDetailContent refundId={id} />
}
