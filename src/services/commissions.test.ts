import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '#/lib/api'
import {
  createCommissionScheme,
  deleteCommissionScheme,
  getCommissionScheme,
  getCommissionSchemes,
  updateCommissionScheme,
} from '#/services/commission-schemes'
import {
  getCommissionDistributions,
  retryCommissionDistribution,
} from '#/services/commission-distributions'
import { getWallets, getWalletTransactions } from '#/services/wallets'
import type { CommissionSchemePayload } from '#/services/commission-schemes'

vi.mock('#/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

const payload: CommissionSchemePayload = {
  partnerId: 1,
  productId: 4,
  commissionRate: 12.5,
  maxLevel: 2,
  level2PartnerShare: 40,
  level2SellerShare: 60,
  level3PartnerShare: null,
  level3AgencyShare: null,
  level3SellerShare: null,
}

describe('commission services', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockResolvedValue({ data: {} })
    vi.mocked(api.post).mockResolvedValue({ data: {} })
    vi.mocked(api.put).mockResolvedValue({ data: {} })
    vi.mocked(api.delete).mockResolvedValue({ data: undefined })
  })

  it('utilise uniquement les routes de schémas documentées', async () => {
    await getCommissionSchemes({
      partnerId: 1,
      productId: 4,
      page: 0,
      size: 20,
    })
    await getCommissionScheme(7)
    await createCommissionScheme(payload)
    await updateCommissionScheme(7, payload)
    await deleteCommissionScheme(7)

    expect(api.get).toHaveBeenNthCalledWith(1, '/commission-schemes', {
      params: { partnerId: 1, productId: 4, page: 0, size: 20 },
    })
    expect(api.get).toHaveBeenNthCalledWith(2, '/commission-schemes/7')
    expect(api.post).toHaveBeenCalledWith('/commission-schemes', payload)
    expect(api.put).toHaveBeenCalledWith('/commission-schemes/7', payload)
    expect(api.delete).toHaveBeenCalledWith('/commission-schemes/7')
  })

  it('utilise les routes documentées de distribution et de rejeu', async () => {
    await getCommissionDistributions({ status: 'ON_HOLD', page: 0, size: 20 })
    await retryCommissionDistribution(9)

    expect(api.get).toHaveBeenCalledWith('/commission-distributions', {
      params: { status: 'ON_HOLD', page: 0, size: 20 },
    })
    expect(api.post).toHaveBeenCalledWith('/commission-distributions/9/retry')
  })

  it('utilise les deux routes wallets documentées', async () => {
    await getWallets({ ownerType: 'SELLER', ownerId: 12, page: 0, size: 20 })
    await getWalletTransactions(5, 2, 20)

    expect(api.get).toHaveBeenNthCalledWith(1, '/wallets', {
      params: { ownerType: 'SELLER', ownerId: 12, page: 0, size: 20 },
    })
    expect(api.get).toHaveBeenNthCalledWith(2, '/wallets/5/transactions', {
      params: { page: 2, size: 20 },
    })
  })
})
