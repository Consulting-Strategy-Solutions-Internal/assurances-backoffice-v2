import { Button } from '#/components/ui/button'
import { formatPercent2 } from '#/lib/commission-format'
import type { CommissionLineResponse } from '#/services/commission-distributions'
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
  return <>{line.ownerName ?? 'Bénéficiaire supprimé'}</>
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
