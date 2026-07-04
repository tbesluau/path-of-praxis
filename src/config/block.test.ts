import { describe, it, expect } from 'vitest'
import { computeBlockBonuses, getBlockNodeEffect } from './mastery-nodes'
import { masteryXpNeeded } from './masteries'
import { balance } from './balance'

// All 12 line nodes of both trees assigned.
const FULL_TREES: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  [], [], [],
]

describe('Block mastery', () => {
  it('full trees total per spec: chance 48, amount 58, recovery 800, both flags', () => {
    const b = computeBlockBonuses(FULL_TREES)
    expect(b.chanceIncrease).toBe(48)     // 4·6 + 6·2 + 10·2 (Block Chance tree)
    expect(b.amountIncrease).toBe(58)     // 5+5 (Chance tree) + 6·4 + 12·2 (Efficiency tree)
    expect(b.recoveryIncrease).toBe(800)  // 8 × 100%
    expect(b.noAfflictions).toBe(true)
    expect(b.healOnBlockPct).toBe(20)
  })

  it('full recovery yields 9 blocks per second', () => {
    const b = computeBlockBonuses(FULL_TREES)
    const cooldownMs = balance.block.baseCooldownMs / (1 + b.recoveryIncrease / 100)
    expect(1000 / cooldownMs).toBeCloseTo(9, 10)
  })

  it('dumped points seed the more-chance multiplier at 0.5 per point', () => {
    const b = computeBlockBonuses([[], [], [], [], []], 10)
    expect(b.moreChance).toBe(5)
  })

  it('has no key-node effects (indices 12-15 empty on both trees)', () => {
    for (const tree of [0, 1]) {
      for (const idx of [12, 13, 14, 15]) {
        expect(Object.keys(getBlockNodeEffect(tree, idx)).length, `tree ${tree} node ${idx}`).toBe(0)
      }
    }
  })

  it('uses the life mastery XP requirement curve', () => {
    for (const level of [1, 2, 5, 10, 25]) {
      expect(masteryXpNeeded(level, 'block')).toBe(masteryXpNeeded(level, 'life'))
    }
    // ...which is slower than the standard mastery curve at higher levels
    expect(masteryXpNeeded(10, 'block')).toBeLessThan(masteryXpNeeded(10, 'fire'))
  })
})
