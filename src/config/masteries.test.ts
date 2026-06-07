import { describe, it, expect } from 'vitest'
import { masteryXpNeeded, masteryXpNeededScaled, previewMasteryGain } from './masteries'
import { balance } from './balance'

describe('mastery soft cap (unearned-level XP penalty)', () => {
  const penalty = balance.mastery.unearnedLevelXpPenalty

  describe('masteryXpNeededScaled', () => {
    it('leaves the first level above the committed baseline unscaled', () => {
      const base = 20
      expect(masteryXpNeededScaled(20, base)).toBe(masteryXpNeeded(20))
    })

    it('compounds the penalty per unearned level', () => {
      const base = 20
      // reaching 22 (one unearned level already gained) costs (1+penalty)×
      expect(masteryXpNeededScaled(21, base)).toBe(Math.round(masteryXpNeeded(21) * (1 + penalty)))
      // reaching 23 costs (1+penalty)²× → +125% at penalty 0.5
      expect(masteryXpNeededScaled(22, base)).toBe(Math.round(masteryXpNeeded(22) * (1 + penalty) ** 2))
    })

    it('matches the spec example (+0%, +50%, +125%) at penalty 0.5', () => {
      // Only meaningful for the default tuning.
      if (penalty !== 0.5) return
      const base = 20
      const pct = (lvl: number): number =>
        Math.round((masteryXpNeededScaled(lvl, base) / masteryXpNeeded(lvl) - 1) * 100)
      expect(pct(20)).toBe(0)
      expect(pct(21)).toBe(50)
      expect(pct(22)).toBe(125)
    })

    it('resets to unscaled once the baseline advances (post-rebirth)', () => {
      // After rebirthing at 22, base becomes 22 → reaching 23 is unscaled again.
      expect(masteryXpNeededScaled(22, 22)).toBe(masteryXpNeeded(22))
    })
  })

  describe('previewMasteryGain', () => {
    it('gains exactly one level when XP covers only the unscaled first level', () => {
      const need = masteryXpNeeded(20)
      const pv = previewMasteryGain(0, 20, need)
      expect(pv.levelsGained).toBe(1)
      expect(pv.toLv).toBe(21)
    })

    it('throttles multi-level gains because each level costs more than the last', () => {
      // Enough raw XP for ~4 unscaled levels is far short once the penalty compounds.
      const fourUnscaled = masteryXpNeeded(20) + masteryXpNeeded(21) + masteryXpNeeded(22) + masteryXpNeeded(23)
      const pv = previewMasteryGain(0, 20, fourUnscaled)
      expect(pv.levelsGained).toBeLessThan(4)
      expect(pv.levelsGained).toBeGreaterThan(0)
    })

    it('carries leftover XP rather than discarding it (no hard cap)', () => {
      const pv = previewMasteryGain(0, 20, masteryXpNeeded(20) + 123)
      expect(pv.toLv).toBe(21)
      expect(pv.newXp).toBe(123)
    })
  })
})
