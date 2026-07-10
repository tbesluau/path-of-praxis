import { describe, it, expect } from 'vitest'
import {
  rollValue, rollLineCount, drawPositives, drawNegatives,
  rollArtifact, computeArtifactMods, maxEquippedArtifacts,
  scrapsForArtifact, totalUpgradeSpent, upgradeCost, upgradeArtifact,
  modifierQuality, artifactQuality,
  ZERO_ARTIFACT_MODS, type Artifact, type ArtifactLine,
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

  it('rolls land exactly on 10%-quality steps (an 11-dice)', () => {
    const rng = makeLcg(9)
    for (const [min, max] of [[10, 20], [5, 10], [3, 6], [20, 30]] as const) {
      const seen = new Set<number>()
      for (let i = 0; i < 500; i++) {
        const v = rollValue(min, max, rng)
        const step = ((v - min) / (max - min)) * 10
        expect(step).toBeCloseTo(Math.round(step), 5)
        seen.add(Math.round(step))
      }
      expect(seen.size).toBe(11)   // all 11 faces reachable
    }
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
        expect(line.negative!.value).toBeGreaterThan(0)
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
  it('returns 1 at ascent 5-8', () => {
    expect(maxEquippedArtifacts(5)).toBe(1)
    expect(maxEquippedArtifacts(8)).toBe(1)
  })
  it('returns 2 at ascent 9+', () => {
    expect(maxEquippedArtifacts(9)).toBe(2)
    expect(maxEquippedArtifacts(15)).toBe(2)
  })
  it('grandfathers both slots once transcended, regardless of ascent', () => {
    expect(maxEquippedArtifacts(0, true)).toBe(2)
    expect(maxEquippedArtifacts(5, true)).toBe(2)
    expect(maxEquippedArtifacts(0, false)).toBe(0)
  })
})

// ── Cold / rot sources ────────────────────────────────────────────────────────

describe('cold and rot artifact sources', () => {
  it('cold and rot mods can roll (all five sources reachable)', () => {
    const rng = makeLcg(2024)
    const seen = new Set<string>()
    for (let i = 0; i < 500; i++) {
      for (const p of drawPositives(3, rng)) {
        if (p.source) seen.add(p.source)
      }
    }
    expect([...seen].sort()).toEqual(['cold', 'fire', 'lightning', 'physical', 'rot'])
  })

  it('source-lock still holds with five sources', () => {
    const rng = makeLcg(42)
    for (let trial = 0; trial < 300; trial++) {
      const sources = drawPositives(3, rng).filter(p => p.source).map(p => p.source)
      expect(new Set(sources).size).toBeLessThanOrEqual(1)
    }
  })

  it('computeArtifactMods maps the cold and rot fields', () => {
    const line = (type: 'sourceMoreDamage' | 'sourceActionSpeed' | 'sourceAffliction', source: 'cold' | 'rot', value: number): ArtifactLine => ({
      positive: { kind: 'positive', type, source, value },
      negative: { kind: 'negative', type: 'damageTaken', value: 1 },
    })
    const art: Artifact = {
      id: 'cr', equipped: true, createdAt: 0,
      lines: [line('sourceMoreDamage', 'cold', 11), line('sourceActionSpeed', 'cold', 6), line('sourceAffliction', 'cold', 7)],
    }
    const art2: Artifact = {
      id: 'cr2', equipped: true, createdAt: 0,
      lines: [line('sourceMoreDamage', 'rot', 12), line('sourceActionSpeed', 'rot', 8), line('sourceAffliction', 'rot', 25)],
    }
    const mods = computeArtifactMods([art, art2])
    expect(mods.coldMoreDamage).toBe(11)
    expect(mods.coldActionSpeedAdd).toBe(6)
    expect(mods.frostEffectAdd).toBe(7)
    expect(mods.rotMoreDamage).toBe(12)
    expect(mods.rotActionSpeedAdd).toBe(8)
    expect(mods.poisonMoreDamage).toBe(25)
  })
})

// ── Scraps & upgrades ─────────────────────────────────────────────────────────

function mkArtifact(lines: ArtifactLine[], upgradeCount?: number): Artifact {
  return { id: 'u', lines, equipped: false, createdAt: 0, ...(upgradeCount !== undefined ? { upgradeCount } : {}) }
}

const posLine = (value: number): ArtifactLine => ({
  positive: { kind: 'positive', type: 'globalMoreDamage', value },       // spec 6-12
  negative: { kind: 'negative', type: 'damageTaken', value: 5 },          // spec 5-10, 5 = perfect
})

describe('scrapsForArtifact', () => {
  it('grants 1/2/3 scraps for light/medium/heavy', () => {
    expect(scrapsForArtifact(mkArtifact([posLine(8)]))).toBe(1)
    expect(scrapsForArtifact(mkArtifact([posLine(8), posLine(8)]))).toBe(2)
    expect(scrapsForArtifact(mkArtifact([posLine(8), posLine(8), posLine(8)]))).toBe(3)
  })

  it('refunds half the upgrade costs on top of the base value', () => {
    // Cost curve 1, 2, 3, 5, 8 → cumulative spend 0, 1, 3, 6, 11, 19.
    expect(scrapsForArtifact(mkArtifact([posLine(8)], 1))).toBe(1)       // 1 + floor(1/2)
    expect(scrapsForArtifact(mkArtifact([posLine(8)], 2))).toBe(2)       // 1 + floor(3/2)
    expect(scrapsForArtifact(mkArtifact([posLine(8)], 3))).toBe(4)       // 1 + floor(6/2)
    expect(scrapsForArtifact(mkArtifact([posLine(8)], 5))).toBe(10)      // 1 + floor(19/2)
    expect(scrapsForArtifact(mkArtifact([posLine(8), posLine(8), posLine(8)], 4))).toBe(8)  // 3 + floor(11/2)
  })
})

describe('totalUpgradeSpent', () => {
  it('sums the cost curve for the upgrades bought so far', () => {
    const spent = [0, 1, 3, 6, 11, 19, 31, 49, 76, 117]
    spent.forEach((total, n) => {
      expect(totalUpgradeSpent(mkArtifact([posLine(8)], n))).toBe(total)
    })
  })
})

describe('upgradeCost', () => {
  it('grows 50% rounded up per upgrade: 1, 2, 3, 5, 8, 12, 18, 27, 41', () => {
    const expected = [1, 2, 3, 5, 8, 12, 18, 27, 41]
    expected.forEach((cost, n) => {
      expect(upgradeCost(mkArtifact([posLine(8)], n))).toBe(cost)
    })
  })
  it('legacy artifact without upgradeCount costs 1', () => {
    expect(upgradeCost(mkArtifact([posLine(8)]))).toBe(1)
  })
})

describe('quality', () => {
  it('positive quality is linear from min (0%) to max (100%)', () => {
    const mk = (value: number) => ({ kind: 'positive' as const, type: 'globalMoreDamage' as const, value })  // spec 6-12
    expect(modifierQuality(mk(6))).toBe(0)
    expect(modifierQuality(mk(9))).toBe(50)
    expect(modifierQuality(mk(12))).toBe(100)
  })

  it('negative quality is inverted: lower rolls score higher', () => {
    const mk = (value: number) => ({ kind: 'negative' as const, type: 'damageTaken' as const, value })  // spec 5-10
    expect(modifierQuality(mk(10))).toBe(0)
    expect(modifierQuality(mk(7.5))).toBe(50)
    expect(modifierQuality(mk(5))).toBe(100)
  })

  it('artifact quality is the average of all line qualities', () => {
    const art = mkArtifact([{
      positive: { kind: 'positive', type: 'globalMoreDamage', value: 9 },   // 50%
      negative: { kind: 'negative', type: 'damageTaken', value: 5 },        // 100%
    }])
    expect(artifactQuality(art)).toBe(75)
  })

  it('removed bad lines no longer count toward the average', () => {
    const art = mkArtifact([{
      positive: { kind: 'positive', type: 'globalMoreDamage', value: 9 },   // 50%
    }])
    expect(artifactQuality(art)).toBe(50)
  })
})

describe('upgradeArtifact', () => {
  it('improves a positive by 10% of its roll range (6-12 → +0.6)', () => {
    // globalMoreDamage 8 (max 12) unmaxed; negative at 5 (min) is maxed → only candidate is the positive.
    const art = mkArtifact([posLine(8)])
    const res = upgradeArtifact(art, () => 0)
    expect(res).toEqual({ kind: 'upgraded', removed: null, improvement: { target: 'positive', lineIndex: 0, before: 8, after: 8.6 } })
    expect(art.lines[0].positive.value).toBe(8.6)
    expect(art.upgradeCount).toBe(1)
  })

  it('reduces a negative by 10% of its roll range (5-10 → −0.5)', () => {
    const art = mkArtifact([{
      positive: { kind: 'positive', type: 'globalMoreDamage', value: 12 },  // maxed
      negative: { kind: 'negative', type: 'damageTaken', value: 7 },        // unmaxed
    }])
    const res = upgradeArtifact(art, () => 0)
    expect(res).toEqual({ kind: 'upgraded', removed: null, improvement: { target: 'negative', lineIndex: 0, before: 7, after: 6.5 } })
    expect(art.lines[0].negative!.value).toBe(6.5)
  })

  it('clamps at the spec bound (19.5 → 20 on a 10-20 mod)', () => {
    const art = mkArtifact([{
      positive: { kind: 'positive', type: 'sourceMoreDamage', source: 'fire', value: 19.5 },  // spec 10-20
      negative: { kind: 'negative', type: 'damageTaken', value: 5 },                          // maxed
    }])
    const res = upgradeArtifact(art, () => 0)
    expect(res.kind).toBe('upgraded')
    expect(art.lines[0].positive.value).toBe(20)
  })

  it('only picks unmaxed modifiers', () => {
    // One fully-maxed line pair + one unmaxed positive: any rng must pick the unmaxed one.
    const art = mkArtifact([
      {
        positive: { kind: 'positive', type: 'sourceMoreDamage', source: 'fire', value: 20 },  // maxed
        negative: { kind: 'negative', type: 'damageTaken', value: 5 },                        // maxed
      },
      posLine(8),
    ])
    for (const r of [0, 0.5, 0.99]) {
      const clone: Artifact = JSON.parse(JSON.stringify(art))
      const res = upgradeArtifact(clone, () => r)
      expect(res).toMatchObject({ kind: 'upgraded', improvement: { target: 'positive', lineIndex: 1 } })
    }
  })

  it('returns maxed for a perfect-roll artifact without mutating it', () => {
    const art = mkArtifact([{
      positive: { kind: 'positive', type: 'globalMoreDamage', value: 12 },
      negative: { kind: 'negative', type: 'damageTaken', value: 5 },
    }], 3)
    const snapshot = JSON.stringify(art)
    const res = upgradeArtifact(art, () => 0)
    expect(res).toEqual({ kind: 'maxed' })
    expect(JSON.stringify(art)).toBe(snapshot)
    expect(art.upgradeCount).toBe(3)
  })

  it('increments upgradeCount on each success', () => {
    const art = mkArtifact([posLine(6)])
    upgradeArtifact(art, () => 0)
    upgradeArtifact(art, () => 0)
    expect(art.upgradeCount).toBe(2)
    expect(art.lines[0].positive.value).toBe(7.2)   // 6 → 6.6 → 7.2
    expect(upgradeCost(art)).toBe(3)                // 1, 2, 3, …
  })
})

describe('upgrade-level bad-line removals', () => {
  const heavyLines = (): ArtifactLine[] => [
    {
      positive: { kind: 'positive', type: 'globalMoreDamage', value: 6 },
      negative: { kind: 'negative', type: 'damageTaken', value: 10 },      // quality 0% — worst
    },
    {
      positive: { kind: 'positive', type: 'globalActionSpeed', value: 3 },
      negative: { kind: 'negative', type: 'lessMoveSpeed', value: 15 },    // quality 50%
    },
    {
      positive: { kind: 'positive', type: 'doubleDamageChance', value: 5 },
      negative: { kind: 'negative', type: 'lessActionSpeed', value: 3 },   // quality 100%
    },
  ]

  it('upgrade 5 removes the worst-quality bad line, then still improves', () => {
    const art = mkArtifact(heavyLines(), 4)
    const res = upgradeArtifact(art, () => 0)
    expect(res.kind).toBe('upgraded')
    if (res.kind !== 'upgraded') return
    expect(res.removed).toEqual({ kind: 'negative', type: 'damageTaken', value: 10 })
    expect(res.improvement).not.toBeNull()
    expect(art.lines[0].negative).toBeUndefined()
    expect(art.lines[1].negative).toBeDefined()
    expect(art.lines[2].negative).toBeDefined()
    expect(art.upgradeCount).toBe(5)
  })

  it('upgrade 10 removes the next worst bad line, leaving one on a heavy', () => {
    const art = mkArtifact(heavyLines(), 4)
    for (let i = 0; i < 6; i++) upgradeArtifact(art, () => 0.99)
    expect(art.upgradeCount).toBe(10)
    const remaining = art.lines.filter(l => l.negative)
    expect(remaining).toHaveLength(1)
    expect(remaining[0].negative!.type).toBe('lessActionSpeed')
  })

  it('no removal happens between or past levels 5 and 10', () => {
    const art = mkArtifact(heavyLines(), 4)
    for (let i = 0; i < 8; i++) upgradeArtifact(art, () => 0.99)  // levels 5..12
    expect(art.upgradeCount).toBe(12)
    expect(art.lines.filter(l => l.negative)).toHaveLength(1)     // still just the 2 removals
  })

  it('a light artifact has no removal at level 10 (bad line already gone at 5)', () => {
    const art = mkArtifact([{
      positive: { kind: 'positive', type: 'globalMoreDamage', value: 6 },
      negative: { kind: 'negative', type: 'damageTaken', value: 10 },
    }], 4)
    const res5 = upgradeArtifact(art, () => 0)
    expect(res5.kind === 'upgraded' && res5.removed !== null).toBe(true)
    for (let i = 0; i < 5; i++) upgradeArtifact(art, () => 0)     // levels 6..10
    expect(art.upgradeCount).toBe(10)
    expect(art.lines[0].negative).toBeUndefined()                 // removed once, at 5
  })

  it('a removal-due upgrade succeeds even on an otherwise perfect artifact', () => {
    const art = mkArtifact([{
      positive: { kind: 'positive', type: 'globalMoreDamage', value: 12 },  // maxed
      negative: { kind: 'negative', type: 'damageTaken', value: 5 },        // maxed (perfect)
    }], 4)
    const res = upgradeArtifact(art, () => 0)
    expect(res.kind).toBe('upgraded')
    if (res.kind !== 'upgraded') return
    expect(res.removed).toEqual({ kind: 'negative', type: 'damageTaken', value: 5 })
    expect(res.improvement).toBeNull()   // nothing left to improve after removal
    expect(art.upgradeCount).toBe(5)
  })
})
