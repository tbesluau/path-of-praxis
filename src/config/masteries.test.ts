import { describe, it, expect } from 'vitest'
import { masteryXpNeeded, unearnedXpTax, previewMasteryGain, nodeToCode, codeToNode, MASTERY_LETTER } from './masteries'
import { balance } from './balance'

describe('mastery node codes', () => {
  describe('nodeToCode', () => {
    it('maps line nodes 0-5 to positions 1-6', () => {
      expect(nodeToCode('fire', 0, 0)).toBe('FD1')
      expect(nodeToCode('fire', 0, 4)).toBe('FD5')
      expect(nodeToCode('fire', 0, 5)).toBe('FD6')  // first major
    })

    it('maps line nodes 6-11 to positions 7-12', () => {
      expect(nodeToCode('fire', 0, 6)).toBe('FD7')
      expect(nodeToCode('fire', 0, 11)).toBe('FD12')  // second major
    })

    it('maps key nodes to 6a/6b and 12a/12b', () => {
      expect(nodeToCode('fire', 0, 12)).toBe('FD6a')
      expect(nodeToCode('fire', 0, 13)).toBe('FD6b')
      expect(nodeToCode('fire', 0, 14)).toBe('FD12a')
      expect(nodeToCode('fire', 0, 15)).toBe('FD12b')
    })

    it('uses the correct mastery letter', () => {
      expect(nodeToCode('action', 0, 0)).toBe('AD1')
      expect(nodeToCode('criticalHit', 1, 0)).toBe('CH1')
      expect(nodeToCode('physical', 1, 0)).toBe('PB1')
      expect(nodeToCode('life', 0, 0)).toBe('HM1')
      expect(nodeToCode('movement', 0, 0)).toBe('VS1')
    })

    it('uses treeIdx not display order (e.g. fire tree index 2 = G for Burning Ground)', () => {
      expect(nodeToCode('fire', 2, 0)).toBe('FG1')   // treeIdx=2 → G
      expect(nodeToCode('fire', 3, 0)).toBe('FI1')   // treeIdx=3 → I
    })

    it('returns empty string for unknown mastery or tree', () => {
      expect(nodeToCode('fire', 99, 0)).toBe('')
    })
  })

  describe('codeToNode', () => {
    it('round-trips line nodes', () => {
      expect(codeToNode('FD1')).toEqual({ masteryId: 'fire', treeIdx: 0, nodeIdx: 0 })
      expect(codeToNode('FD6')).toEqual({ masteryId: 'fire', treeIdx: 0, nodeIdx: 5 })
      expect(codeToNode('FD7')).toEqual({ masteryId: 'fire', treeIdx: 0, nodeIdx: 6 })
      expect(codeToNode('FD12')).toEqual({ masteryId: 'fire', treeIdx: 0, nodeIdx: 11 })
    })

    it('round-trips key nodes', () => {
      expect(codeToNode('FD6a')).toEqual({ masteryId: 'fire', treeIdx: 0, nodeIdx: 12 })
      expect(codeToNode('FD6b')).toEqual({ masteryId: 'fire', treeIdx: 0, nodeIdx: 13 })
      expect(codeToNode('FD12a')).toEqual({ masteryId: 'fire', treeIdx: 0, nodeIdx: 14 })
      expect(codeToNode('FD12b')).toEqual({ masteryId: 'fire', treeIdx: 0, nodeIdx: 15 })
    })

    it('returns null on invalid input', () => {
      expect(codeToNode('')).toBeNull()
      expect(codeToNode('ZZ1')).toBeNull()     // unknown mastery letter
      expect(codeToNode('FZ1')).toBeNull()     // unknown tree letter
      expect(codeToNode('fd1')).toBeNull()     // lowercase not matched
    })

    it('nodeToCode → codeToNode round-trip for all masteries', () => {
      const testCodes = [
        ['action', 0, 0], ['action', 1, 5], ['action', 2, 12], ['action', 3, 13],
        ['criticalHit', 0, 11], ['criticalHit', 1, 12],
        ['physical', 0, 5], ['physical', 1, 12], ['physical', 2, 0], ['physical', 3, 0],
        ['lightning', 0, 12], ['lightning', 1, 12], ['lightning', 2, 0], ['lightning', 3, 0],
        ['area', 0, 0], ['area', 3, 12],
        ['projectile', 0, 0], ['projectile', 1, 13],
        ['strike', 0, 11], ['strike', 2, 12],
        ['life', 0, 5], ['life', 1, 12], ['life', 2, 0], ['life', 3, 0],
        ['mana', 0, 11], ['mana', 1, 12], ['mana', 2, 12], ['mana', 3, 12],
        ['enemy', 0, 0], ['enemy', 1, 5], ['enemy', 2, 12], ['enemy', 3, 12],
        ['movement', 0, 0], ['movement', 1, 12], ['movement', 2, 12],
      ] as const
      for (const [masteryId, treeIdx, nodeIdx] of testCodes) {
        const code = nodeToCode(masteryId, treeIdx, nodeIdx)
        expect(code).not.toBe('')
        const back = codeToNode(code)
        expect(back).not.toBeNull()
        expect(back!.masteryId).toBe(masteryId)
        expect(back!.treeIdx).toBe(treeIdx)
        expect(back!.nodeIdx).toBe(nodeIdx)
      }
    })
  })

  it('all mastery letters are unique', () => {
    const letters = Object.values(MASTERY_LETTER)
    expect(new Set(letters).size).toBe(letters.length)
  })
})

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
      if ((penalty as number) !== 0.5) return
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
