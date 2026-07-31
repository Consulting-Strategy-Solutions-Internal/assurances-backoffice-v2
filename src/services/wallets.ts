import { api } from '#/lib/api'
import type { CommissionOwnerType } from '#/services/commission-distributions'
import type { PageResponse } from '#/services/users'

export interface WalletResponse {
  id: number | null
  ownerType: CommissionOwnerType | null
  ownerId: number | null
  ownerName: string | null
  balance: number
}

export interface WalletTransactionResponse {
  id: number
  type: string
  amount: number
  balanceAfter: number
  createdAt: string
  productName: string
  quotationId: number
  appliedLevel: number
}

export interface WalletFilters {
  ownerType?: CommissionOwnerType
  ownerId?: number
  page?: number
  size?: number
}

export async function getWallets(
  filters: WalletFilters = {},
): Promise<PageResponse<WalletResponse>> {
  const response = await api.get('/wallets', { params: filters })
  return response.data
}

export async function getWalletTransactions(
  id: number,
  page = 0,
  size = 20,
): Promise<PageResponse<WalletTransactionResponse>> {
  const response = await api.get(`/wallets/${id}/transactions`, {
    params: { page, size },
  })
  return response.data
}
