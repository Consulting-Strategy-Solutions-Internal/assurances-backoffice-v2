import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import { TruncatedText } from '#/components/layout/TruncatedText'
import { Button } from '#/components/ui/button'
import { formatPercent2 } from '#/lib/commission-format'
import { formatPersonName } from '#/lib/people'
import type {
  CommissionLineResponse,
  CommissionOwnerType,
} from '#/services/commission-distributions'
import type { CommissionSchemeResponse } from '#/services/commission-schemes'
import type { WalletResponse } from '#/services/wallets'

export function CommissionSchemeShares({
  scheme,
}: {
  scheme: CommissionSchemeResponse
}) {
  if (scheme.maxLevel === 1) return <>N1 : 100 % partenaire (implicite)</>
  return (
    <>
      N2 : partenaire {formatPercent2(scheme.level2PartnerShare)}, vendeur{' '}
      {formatPercent2(scheme.level2SellerShare)}
      {scheme.maxLevel === 3 && (
        <>
          {' · '}N3 : partenaire {formatPercent2(scheme.level3PartnerShare)},
          agence {formatPercent2(scheme.level3AgencyShare)}, vendeur{' '}
          {formatPercent2(scheme.level3SellerShare)}
        </>
      )}
    </>
  )
}

export function CommissionSchemeRate({ rate }: { rate: number | null }) {
  return rate === null ? (
    <span className="text-destructive">À configurer</span>
  ) : (
    <>{formatPercent2(rate)}</>
  )
}

export function AppliedCommissionLevel({ level }: { level: number | null }) {
  return <>{level === null ? '—' : `N${level}`}</>
}

export function CommissionBeneficiary({
  line,
}: {
  line: CommissionLineResponse
}) {
  if (line.ownerName === null) return <>Bénéficiaire supprimé</>
  return (
    <>
      {line.ownerType === 'SELLER'
        ? formatPersonName(line.ownerName)
        : line.ownerName}
    </>
  )
}

export function WalletStatementAction({
  wallet,
  onOpen,
}: {
  wallet: WalletResponse
  onOpen: () => void
}) {
  if (wallet.id === null) {
    return (
      <span className="text-[12px] text-muted-foreground">Jamais crédité</span>
    )
  }
  return (
    <Button type="button" size="sm" variant="outline" onClick={onOpen}>
      Voir le relevé
    </Button>
  )
}

/** « PAY-e28f4a…5df74 » : keeps the start and the end of a long reference. */
export function middleEllipsis(value: string, head = 8, tail = 6): string {
  if (value.length <= head + tail + 1) return value
  return `${value.slice(0, head)}…${value.slice(-tail)}`
}

/**
 * Payment reference shortened (monospace, middle ellipsis) with the full value
 * in the tooltip and a copy button.
 */
export function PaymentReference({ reference }: { reference: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(reference)
      toast.success('Référence copiée.')
    } catch {
      toast.error('Copie impossible : sélectionnez la référence à la main.')
    }
  }
  return (
    <span className="inline-flex items-center gap-1">
      <span
        title={reference}
        className="font-mono text-[12.5px] font-medium tabular-nums"
      >
        {middleEllipsis(reference)}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Copier la référence ${reference}`}
        title="Copier la référence complète"
        onClick={(event) => {
          event.stopPropagation()
          void copy()
        }}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <Copy />
      </Button>
    </span>
  )
}

export interface DistributorDisplay {
  name: string
  /** « Vendeur », « Agence », « Partenaire » or null when unknown. */
  kindLabel: string | null
  code: string
  /** Partner the distributor belongs to (when it is not itself a partner). */
  partnerName?: string
}

/** Distributor name + « Type · code · partner » sub-line. */
export function DistributorCell({
  distributor,
}: {
  distributor: DistributorDisplay
}) {
  const details = [
    distributor.kindLabel,
    `code ${distributor.code}`,
    distributor.partnerName,
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <div className="max-w-[220px] min-w-0">
      <TruncatedText className="font-semibold">
        {distributor.name}
      </TruncatedText>
      <TruncatedText className="text-[12px] text-muted-foreground">
        {details}
      </TruncatedText>
    </div>
  )
}

export const OWNER_TYPE_LABELS: Record<CommissionOwnerType, string> = {
  PARTNER: 'Partenaire',
  AGENCY: 'Agence',
  SELLER: 'Vendeur',
}
