import { describe, it, expect } from 'vitest'
import {
  rollValue, rollLineCount, drawPositives, drawNegatives,
  rollArtifact, computeArtifactMods, maxEquippedArtifacts,
  ZERO_ARTIFACT_MODS, type Artifact,
} from './artifacts'

// Deterministic LCG RNG for seeded tests
function makeLcg(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x100000000
  }
}

describe('rollValue', () => {
  it('stays within [min, max]', () => {
    const rng = makeLcg(42)
    for (let i = 0; i < 1000; i++) {
      const v = rollValue(10, 20, rng)
      expect(v).toBeGreaterThanOrEqual(10)
      expect(v).toBeLessThanOrEqual(20)
    }
  })

  it('rounds to 1 decimal', () => {
    const rng = makeLcg(7)
    for (let i = 0; i < 100; i++) {
      const v = rollValue(5, 10, rng)
      expect(v).toBe(Math.round(v * 10) / 10)
    }
  })

  it('mean is approximately midpoint', () => {
    const rng = makeLcg(123)
    let sum = 0
    const N = 10000
    for (let i = 0; i < N; i++) sum += rollValue(10, 20, rng)
    expect(sum / N).toBeCloseTo(15, 0)
  })
})

describe('rollLineCount', () => {
  it('returns 0,1,2,3 with correct approximate frequencies', () => {
    const rng = makeLcg(99)
    const counts = [0, 0, 0, 0]
    const N = 10000
    for (let i = 0; i < N; i++) counts[rollLineCount(rng)]++
    expect(counts[0] / N).toBeCloseTo(0.60, 1)
    expect(counts[1] / N).toBeCloseTo(0.25, 1)
    expect(counts[2] / N).toBeCloseTo(0.10, 1)
    expect(counts[3] / N).toBeCloseTo(0.05, 1)
  })

  it('maps exact boundaries correctly', () => {
    expect(rollLineCount(() => 0.00)).toBe(0)
    expect(rollLineCount(() => 0.59)).toBe(0)
    expect(rollLineCount(() => 0.60)).toBe(1)
    expect(rollLineCount(() => 0.84)).toBe(1)
    expect(rollLineCount(() => 0.85)).toBe(2)
    expect(rollLineCount(() => 0.94)).toBe(2)
    expect(rollLineCount(() => 0.95)).toBe(3)
    expect(rollLineCount(() => 0.99)).toBe(3)
  })

  it('folds capped tiers into the no-drop pool', () => {
    // maxLines=1: the 2- and 3-line bands become no drop (0), 1-line unchanged.
    expect(rollLineCount(() => 0.70, 1)).toBe(1)
    expect(rollLineCount(() => 0.90, 1)).toBe(0)  // was 2
    expect(rollLineCount(() => 0.97, 1)).toBe(0)  // was 3
    // maxLines=2: only the 3-line band folds to no drop.
    expect(rollLineCount(() => 0.90, 2)).toBe(2)
    expect(rollLineCount(() => 0.97, 2)).toBe(0)  // was 3
    // maxLines=3 keeps the full distribution.
    expect(rollLineCount(() => 0.97, 3)).toBe(3)
  })

  it('capping never downgrades a tier — only removes it', () => {
    const rng = makeLcg(7)
    const N = 5000
    const capped = [0, 0, 0, 0]
    for (let i = 0; i < N; i++) capped[rollLineCount(rng, 1)]++
    // No 2- or 3-line results survive; their mass moved to 0, not to 1.
    expect(capped[2]).toBe(0)
    expect(capped[3]).toBe(0)
    expect(capped[1] / N).toBeCloseTo(0.25, 1)   // 1-line share unchanged
    expect(capped[0] / N).toBeCloseTo(0.75, 1)   // 0.60 + 0.10 + 0.05
  })
})

describe('drawPositives', () => {
  it('returns n distinct types', () => {
    const rng = makeLcg(1)
    for (let n = 1; n <= 3; n++) {
      const positives = drawPositives(n, rng)
      expect(positives).toHaveLength(n)
      const types = positives.map(p => `${p.type}:${p.source ?? ''}`)
      expect(new Set(types).size).toBe(n)
    }
  })

  it('source-lock: all source positives belong to one source', () => {
    const rng = makeLcg(42)
    for (let trial = 0; trial < 200; trial++) {
      const positives = drawPositives(3, rng)
      const sourcePositives = positives.filter(p => p.source)
      if (sourcePositives.length >= 2) {
        const sources = new Set(sourcePositives.map(p => p.source))
        expect(sources.size).toBe(1)
      }
    }
  })
})

describe('drawNegatives', () => {
  it('returns n distinct types', () => {
    const rng = makeLcg(5)
    for (let n = 1; n <= 3; n++) {
      const negs = drawNegatives(n, rng)
      expect(negs).toHaveLength(n)
      const types = negs.map(n => n.type)
      expect(new Set(types).size).toBe(n)
    }
  })
})

describe('rollArtifact', () => {
  it('returns null on 0-line roll', () => {
    expect(rollArtifact(() => 0.1)).toBeNull()
  })

  it('returns artifact with correct line count for 1-line', () => {
    const art = rollArtifact(() => 0.70)
    expect(art).not.toBeNull()
    expect(art!.lines).toHaveLength(1)
  })

  it('respects the maxLines cap (gated tiers become null)', () => {
    // A roll that would be a 3-line artifact is suppressed when capped to 1 or 2.
    expect(rollArtifact(() => 0.97, 1)).toBeNull()
    expect(rollArtifact(() => 0.97, 2)).toBeNull()
    expect(rollArtifact(() => 0.97, 3)!.lines).toHaveLength(3)
    // A 2-line roll is suppressed at cap 1 but allowed at cap 2.
    expect(rollArtifact(() => 0.90, 1)).toBeNull()
    expect(rollArtifact(() => 0.90, 2)!.lines).toHaveLength(2)
  })

  it('artifact values are in valid ranges', () => {
    const rng = makeLcg(77)
    for (let i = 0; i < 100; i++) {
      const art = rollArtifact(rng)
      if (!art) continue
      for (const line of art.lines) {
        expect(line.positive.value).toBeGreaterThan(0)
        expect(line.negative.value).toBeGreaterThan(0)
      }
    }
  })

  it('is deterministic for the same seed', () => {
    const a = rollArtifact(makeLcg(42))
    const b = rollArtifact(makeLcg(42))
    expect(a?.lines.length).toBe(b?.lines.length)
    if (a && b) {
      expect(a.lines[0].positive.value).toBe(b.lines[0].positive.value)
    }
  })
})

describe('computeArtifactMods', () => {
  it('returns zeros for empty list', () => {
    expect(computeArtifactMods([])).toEqual(ZERO_ARTIFACT_MODS)
  })

  it('ignores unequipped artifacts', () => {
    const art = rollArtifact(makeLcg(1))!
    expect(computeArtifactMods([{ ...art, equipped: false }])).toEqual(ZERO_ARTIFACT_MODS)
  })

  it('sums additively across equipped artifacts', () => {
    const art1: Artifact = {
      id: 'a', equipped: true, createdAt: 0,
      lines: [{ positive: { kind: 'positive', type: 'globalMoreDamage', value: 10 }, negative: { kind: 'negative', type: 'damageTaken', value: 5 } }],
    }
    const art2: Artifact = {
      id: 'b', equipped: true, createdAt: 0,
      lines: [{ positive: { kind: 'positive', type: 'globalMoreDamage', value: 7 }, negative: { kind: 'negative', type: 'damageTaken', value: 3 } }],
    }
    const mods = computeArtifactMods([art1, art2])
    expect(mods.globalMoreDamage).toBe(17)
    expect(mods.damageTakenMore).toBe(8)
  })
})

describe('maxEquippedArtifacts', () => {
  it('returns 0 below ascent 5', () => {
    expect(maxEquippedArtifacts(0)).toBe(0)
    expect(maxEquippedArtifacts(4)).toBe(0)
  })
  it('returns 1 at ascent 5-9', () => {
    expect(maxEquippedArtifacts(5)).toBe(1)
    expect(maxEquippedArtifacts(9)).toBe(1)
  })
  it('returns 2 at ascent 10+', () => {
    expect(maxEquippedArtifacts(10)).toBe(2)
    expect(maxEquippedArtifacts(15)).toBe(2)
  })
})
