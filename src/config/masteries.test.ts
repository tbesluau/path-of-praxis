import { describe, it, expect } from 'vitest'
import { masteryXpNeeded, unearnedXpTax, previewMasteryGain } from './masteries'
import { balance } from './balance'

describe('mastery soft cap (unearned-level XP gain penalty)', () => {
  const penalty = balance.mastery.unearnedLevelXpPenalty

  describe('unearnedXpTax', () => {
    it('leaves the first level above the committed baseline untaxed', () => {
      expect(unearnedXpTax(0)).toBe(1)
    })

    it('compounds the tax per unearned level', () => {
      expect(unearnedXpTax(1)).toBeCloseTo(1 + penalty)
      expect(unearnedXpTax(2)).toBeCloseTo((1 + penalty) ** 2)
    })

    it('matches the spec example (+0%, +50%, +125%) at penalty 0.5', () => {
      if (penalty !== 0.5) return
      expect(Math.round((unearnedXpTax(0) - 1) * 100)).toBe(0)
      expect(Math.round((unearnedXpTax(1) - 1) * 100)).toBe(50)
      expect(Math.round((unearnedXpTax(2) - 1) * 100)).toBe(125)
    })
  })

  describe('previewMasteryGain', () => {
    it('reaching the first level past the baseline costs the natural amount', () => {
      const pv = previewMasteryGain(0, 20, masteryXpNeeded(20))
      expect(pv.levelsGained).toBe(1)
      expect(pv.toLv).toBe(21)
    })

    it('taxes raw XP per unearned level (reaching 22 needs natural ×(1+penalty))', () => {
      // Enough raw XP for level 21 (natural) plus exactly the taxed cost of 22.
      const raw = masteryXpNeeded(20) + masteryXpNeeded(21) * (1 + penalty)
      const pv = previewMasteryGain(0, 20, raw)
      expect(pv.levelsGained).toBe(2)
      expect(pv.toLv).toBe(22)
      expect(pv.newXp).toBeCloseTo(0, 5)
    })

    it('throttles multi-level gains because each level taxes XP harder', () => {
      const fourUnscaled = masteryXpNeeded(20) + masteryXpNeeded(21) + masteryXpNeeded(22) + masteryXpNeeded(23)
      const pv = previewMasteryGain(0, 20, fourUnscaled)
      expect(pv.levelsGained).toBeLessThan(4)
      expect(pv.levelsGained).toBeGreaterThan(0)
    })

    it('carries leftover XP in natural units (no discard, never > next requirement)', () => {
      const pv = previewMasteryGain(0, 20, masteryXpNeeded(20) + 123)
      expect(pv.toLv).toBe(21)
      // Reaching 21 used the untaxed tier; the remaining 123 raw is progress toward
      // 22 (tier 1), so it's taxed down to 123/(1+penalty) natural units.
      expect(pv.newXp).toBeCloseTo(123 / (1 + penalty), 5)
      expect(pv.newXp).toBeLessThan(masteryXpNeeded(pv.toLv))
    })

    it('stored leftover never exceeds the next level requirement even after several gains', () => {
      // Pour in a big pool; whatever level we stop at, leftover stays sub-requirement.
      const pv = previewMasteryGain(0, 20, masteryXpNeeded(20) * 50)
      expect(pv.newXp).toBeLessThan(masteryXpNeeded(pv.toLv))
      expect(pv.newXp).toBeGreaterThanOrEqual(0)
    })

    it('flushes legacy over-requirement carryover at natural cost', () => {
      // Simulate a pre-existing banked value above the natural requirement.
      const over = masteryXpNeeded(20) + masteryXpNeeded(21) + 7
      const pv = previewMasteryGain(over, 20, 0)
      expect(pv.toLv).toBe(22)
      expect(pv.newXp).toBeCloseTo(7, 5)
    })
  })
})
