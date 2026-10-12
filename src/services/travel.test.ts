import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '#/lib/api'
import { travelItem } from '#/lib/travel.fixtures'
import {
  attachTravelPolicy,
  findTravelSupervisionItem,
  getTravelSupervision,
  refuseTravelIssuance,
  retryTravelIssuance,
} from '#/services/travel'

function page(ids: number[], last: boolean) {
  return {
    data: {
      content: ids.map((id) => travelItem({ id })),
      page: 0,
      size: 100,
      totalElements: 0,
      totalPages: 0,
      last,
    },
  }
}

afterEach(() => vi.restoreAllMocks())

describe('services/travel', () => {
  it('liste sans jamais envoyer de sort (400 sinon)', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue(page([1], true))
    await getTravelSupervision({ evoIssuanceStatus: 'TO_RECONCILE', page: 2 })
    expect(get).toHaveBeenCalledWith('/subscriptions/travel', {
      params: { evoIssuanceStatus: 'TO_RECONCILE', page: 2, size: 20 },
    })
    expect(JSON.stringify(get.mock.calls)).not.toContain('sort')
  })

  it('retrouve la ligne d’un contrat en parcourant les pages de 100', async () => {
    const get = vi
      .spyOn(api, 'get')
      .mockResolvedValueOnce(page([1, 2], false))
      .mockResolvedValueOnce(page([812], true))
    expect(
      (await findTravelSupervisionItem(812, 'TO_RECONCILE'))?.id,
    ).toBe(812)
    expect(get).toHaveBeenCalledTimes(2)
    expect(get.mock.calls[1]?.[1]).toEqual({
      params: { evoIssuanceStatus: 'TO_RECONCILE', page: 1, size: 100 },
    })
  })

  it('null quand la ligne est absente', async () => {
    vi.spyOn(api, 'get').mockResolvedValue(page([1], true))
    expect(await findTravelSupervisionItem(812, 'TO_RECONCILE')).toBeNull()
  })

  it('les trois décisions', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: travelItem() })
    await attachTravelPolicy(812, 'POL-1')
    await retryTravelIssuance(812)
    await refuseTravelIssuance(812, 'Aucune police chez Cover Edge')
    expect(post.mock.calls).toEqual([
      ['/subscriptions/travel/812/reconciliation/attach', { policyId: 'POL-1' }],
      ['/subscriptions/travel/812/reconciliation/retry'],
      [
        '/subscriptions/travel/812/reconciliation/refuse',
        { reason: 'Aucune police chez Cover Edge' },
      ],
    ])
  })
})
