import { describe, expect, it } from 'vitest'
import {
  centsToPercent,
  defaultSplit,
  partsToThumbs,
  thumbsToParts,
} from './ShareSplitter'

describe('ShareSplitter helpers', () => {
  it('formate les centièmes de pourcent', () => {
    expect(centsToPercent(6_000)).toBe('60')
    expect(centsToPercent(6_250)).toBe('62,5')
    expect(centsToPercent(3_333)).toBe('33,33')
    expect(centsToPercent(0)).toBe('0')
  })

  it('propose une répartition par défaut à 100 %', () => {
    for (const n of [2, 3]) {
      expect(defaultSplit(n).reduce((a, b) => a + b, 0)).toBe(10_000)
    }
  })

  it('convertit parts ↔ positions des curseurs', () => {
    expect(partsToThumbs([4_000, 3_000, 3_000])).toEqual([4_000, 7_000])
    expect(thumbsToParts([4_000, 7_000])).toEqual([4_000, 3_000, 3_000])
    expect(thumbsToParts([2_500])).toEqual([2_500, 7_500])
  })

  it('garde toujours un total de 100 %, curseurs confondus compris', () => {
    const parts = thumbsToParts([5_000, 5_000])
    expect(parts).toEqual([5_000, 0, 5_000])
    expect(parts.reduce((a, b) => a + b, 0)).toBe(10_000)
  })
})
