import { describe, it, expect } from 'vitest'
import { ascentsGainedFor, isRelicId } from './relics'

describe('ascentsGainedFor', () => {
  // required level to REACH count N is 30 + (N−1)·5; margin is 5.
  it("matches the spec example: count 2 at max level 56 → jump to count 5 (gain 3)", () => {
    expect(ascentsGainedFor(56, 2)).toBe(3)
  })

  it('never grants less than the normal single ascent', () => {
    expect(ascentsGainedFor(36, 0)).toBe(1)  // 31 → maxN 1, gain 1
    expect(ascentsGainedFor(10, 3)).toBe(1)  // far below requirement → still 1
  })

  it('respects the −5 margin edge', () => {
    // maxLevel 55 → 50 → maxN 5; maxLevel 54 → 49 → maxN 4
    expect(ascentsGainedFor(55, 2)).toBe(3)
    expect(ascentsGainedFor(54, 2)).toBe(2)
  })

  it('scales to high levels', () => {
    // maxLevel 105 → 100 → maxN 15
    expect(ascentsGainedFor(105, 10)).toBe(5)
  })
})

describe('isRelicId', () => {
  it('accepts known relics and rejects junk', () => {
    expect(isRelicId('freeRebirth')).toBe(true)
    expect(isRelicId('onslaught')).toBe(true)
    expect(isRelicId('unknown')).toBe(false)
    expect(isRelicId(42)).toBe(false)
  })
})
