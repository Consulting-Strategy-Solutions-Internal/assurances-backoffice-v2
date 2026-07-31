// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AppliedCommissionLevel,
  CommissionBeneficiary,
  CommissionSchemeRate,
  CommissionSchemeShares,
  WalletStatementAction,
} from '#/components/commissions/CommissionDisplays'
import type { CommissionLineResponse } from '#/services/commission-distributions'
import type { CommissionSchemeResponse } from '#/services/commission-schemes'
import type { WalletResponse } from '#/services/wallets'

describe('commission null displays', () => {
  afterEach(cleanup)

  it('rend les parts absentes sans afficher zéro', () => {
    const scheme: CommissionSchemeResponse = {
      id: 1,
      partnerId: 1,
      productId: 4,
      commissionRate: 12.5,
      maxLevel: 2,
      level2PartnerShare: null,
      level2SellerShare: null,
      level3PartnerShare: null,
      level3AgencyShare: null,
      level3SellerShare: null,
      createdAt: '2026-07-31T10:00:00Z',
      updatedAt: '2026-07-31T10:00:00Z',
    }

    render(<CommissionSchemeShares scheme={scheme} />)
    expect(screen.getByText(/partenaire —/)).toBeTruthy()
    expect(screen.queryByText(/0,00/)).toBeNull()
  })

  it('signale un ancien schéma dont le taux est absent', () => {
    render(<CommissionSchemeRate rate={null} />)
    expect(screen.getByText('À configurer')).toBeTruthy()
  })

  it('rend un niveau appliqué absent par un tiret', () => {
    render(<AppliedCommissionLevel level={null} />)
    expect(screen.getByText('—')).toBeTruthy()
  })

  it('rend un bénéficiaire supprimé sans dépendre de son identité', () => {
    const line: CommissionLineResponse = {
      id: 3,
      ownerType: null,
      ownerId: null,
      ownerName: null,
      shareRate: 40,
      amount: 200,
      createdAt: '2026-07-31T10:00:00Z',
    }
    render(<CommissionBeneficiary line={line} />)
    expect(screen.getByText('Bénéficiaire supprimé')).toBeTruthy()
  })

  it("n'affiche aucun bouton de relevé pour un wallet sans id", () => {
    const wallet: WalletResponse = {
      id: null,
      ownerType: 'SELLER',
      ownerId: 8,
      ownerName: 'Awa Koné',
      balance: 0,
    }
    render(<WalletStatementAction wallet={wallet} onOpen={vi.fn()} />)
    expect(screen.getByText('Jamais crédité')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })
})
