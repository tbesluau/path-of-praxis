import { balance } from './balance'

export type Source = 'fire' | 'lightning' | 'physical' | 'cold' | 'rot'
export type PositiveType =
  | 'sourceMoreDamage' | 'sourceActionSpeed' | 'sourceAffliction'
  | 'globalActionSpeed' | 'globalMoreDamage'
  | 'doubleDamageChance' | 'doubleActionChance' | 'rangeAndArea'
export type NegativeType =
  | 'damageTaken' | 'allResistances' | 'lessMoveSpeed' | 'lessActionSpeed' | 'lessRangeAndArea'

export interface PositiveModifier { kind: 'positive'; type: PositiveType; source?: Source; value: number }
export interface NegativeModifier { kind: 'negative'; type: NegativeType; value: number }
export interface ArtifactLine { positive: PositiveModifier; negative: NegativeModifier }
export interface Artifact {
  id: string
  lines: ArtifactLine[]   // 1..3 lines
  equipped: boolean
  createdAt: number
  upgradeCount?: number   // times upgraded with scraps; absent on legacy saves (= 0)
}

export interface ArtifactMods {
  fireMoreDamage: number
  fireActionSpeedAdd: number
  burnMoreDamage: number
  lightningMoreDamage: number
  lightningMoreActionSpeed: number
  electrocuteEffectAdd: number
  physicalMoreDamage: number
  physicalActionSpeedAdd: number
  bleedMoreDamage: number
  coldMoreDamage: number
  coldActionSpeedAdd: number
  frostEffectAdd: number
  rotMoreDamage: number
  rotActionSpeedAdd: number
  poisonMoreDamage: number
  globalMoreDamage: number
  globalActionSpeedMore: number
  doubleDamageChance: number
  doubleActionChance: number
  rangeMore: number
  areaMore: number
  damageTakenMore: number
  resistanceLess: number
  moveSpeedLess: number
  actionSpeedLess: number
  rangeLess: number
  areaLess: number
}

export const ZERO_ARTIFACT_MODS: ArtifactMods = {
  fireMoreDamage: 0, fireActionSpeedAdd: 0, burnMoreDamage: 0,
  lightningMoreDamage: 0, lightningMoreActionSpeed: 0, electrocuteEffectAdd: 0,
  physicalMoreDamage: 0, physicalActionSpeedAdd: 0, bleedMoreDamage: 0,
  coldMoreDamage: 0, coldActionSpeedAdd: 0, frostEffectAdd: 0,
  rotMoreDamage: 0, rotActionSpeedAdd: 0, poisonMoreDamage: 0,
  globalMoreDamage: 0, globalActionSpeedMore: 0,
  doubleDamageChance: 0, doubleActionChance: 0,
  rangeMore: 0, areaMore: 0,
  damageTakenMore: 0, resistanceLess: 0, moveSpeedLess: 0, actionSpeedLess: 0,
  rangeLess: 0, areaLess: 0,
}

interface PositiveSpec { type: PositiveType; source?: Source; min: number; max: number; weight: number }

const POSITIVE_POOL: PositiveSpec[] = [
  { type: 'sourceMoreDamage',  source: 'fire',       min: 10, max: 20, weight: 1 },
  { type: 'sourceActionSpeed', source: 'fire',       min:  5, max: 10, weight: 1 },
  { type: 'sourceAffliction',  source: 'fire',       min: 20, max: 30, weight: 1 },
  { type: 'sourceMoreDamage',  source: 'lightning',  min: 10, max: 20, weight: 1 },
  { type: 'sourceActionSpeed', source: 'lightning',  min:  5, max: 10, weight: 1 },
  { type: 'sourceAffliction',  source: 'lightning',  min:  5, max: 10, weight: 1 },
  { type: 'sourceMoreDamage',  source: 'physical',   min: 10, max: 20, weight: 1 },
  { type: 'sourceActionSpeed', source: 'physical',   min:  5, max: 10, weight: 1 },
  { type: 'sourceAffliction',  source: 'physical',   min: 20, max: 30, weight: 1 },
  // Frost is a debuff-effect affliction like electrocute → lightning-style range;
  // poison is a DoT like burn/bleed → fire/physical-style range.
  { type: 'sourceMoreDamage',  source: 'cold',       min: 10, max: 20, weight: 1 },
  { type: 'sourceActionSpeed', source: 'cold',       min:  5, max: 10, weight: 1 },
  { type: 'sourceAffliction',  source: 'cold',       min:  5, max: 10, weight: 1 },
  { type: 'sourceMoreDamage',  source: 'rot',        min: 10, max: 20, weight: 1 },
  { type: 'sourceActionSpeed', source: 'rot',        min:  5, max: 10, weight: 1 },
  { type: 'sourceAffliction',  source: 'rot',        min: 20, max: 30, weight: 1 },
  { type: 'globalActionSpeed', min:  3, max:  6, weight: 1 },
  { type: 'globalMoreDamage',  min:  6, max: 12, weight: 1 },
  { type: 'doubleDamageChance',min:  5, max: 10, weight: 1 },
  { type: 'doubleActionChance',min:  3, max:  6, weight: 1 },
  { type: 'rangeAndArea',      min:  5, max: 10, weight: 1 },
]

const NEGATIVE_POOL: { type: NegativeType; min: number; max: number }[] = [
  { type: 'damageTaken',      min:  5, max: 10 },
  { type: 'allResistances',   min:  5, max: 10 },
  { type: 'lessMoveSpeed',    min: 10, max: 20 },
  { type: 'lessActionSpeed',  min:  3, max:  6 },
  { type: 'lessRangeAndArea', min:  5, max: 10 },
]

// Box-Muller Gaussian, clamped and rounded to 1 decimal.
export function rollValue(min: number, max: number, rng = Math.random): number {
  const mid = (min + max) / 2
  const sigma = (max - min) / 4
  const u1 = Math.max(Number.EPSILON, rng())
  const u2 = rng()
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  const raw = mid + z * sigma
  return Math.round(Math.max(min, Math.min(max, raw)) * 10) / 10
}

// `maxLines` caps how many lines an artifact may roll (boss-level gating).
// A tier above the cap folds back into the no-drop pool (returns 0), so the
// disallowed probability mass becomes "no drop" rather than a smaller artifact.
export function rollLineCount(rng = Math.random, maxLines: 1 | 2 | 3 = 3): 0 | 1 | 2 | 3 {
  const r = rng()
  if (r < 0.60) return 0
  if (r < 0.85) return 1
  if (r < 0.95) return maxLines >= 2 ? 2 : 0
  return maxLines >= 3 ? 3 : 0
}

export function drawPositives(n: number, rng = Math.random): PositiveModifier[] {
  const pool: PositiveSpec[] = POSITIVE_POOL.map(s => ({ ...s }))
  const result: PositiveModifier[] = []
  let lockedSource: Source | undefined
  for (let i = 0; i < n; i++) {
    const available = pool.filter(s => s.weight > 0)
    if (available.length === 0) break
    const totalWeight = available.reduce((acc, s) => acc + s.weight, 0)
    let pick = rng() * totalWeight
    let chosen: PositiveSpec | undefined
    for (const s of available) {
      pick -= s.weight
      if (pick <= 0) { chosen = s; break }
    }
    if (!chosen) chosen = available[available.length - 1]
    result.push({ kind: 'positive', type: chosen.type, source: chosen.source, value: rollValue(chosen.min, chosen.max, rng) })
    // Remove chosen from pool
    for (let j = 0; j < pool.length; j++) {
      if (pool[j].type === chosen.type && pool[j].source === chosen.source) {
        pool[j].weight = 0
        break
      }
    }
    // Source-lock: if a source-typed pick was chosen, lock to that source
    if (chosen.source) {
      if (!lockedSource) {
        lockedSource = chosen.source
        // Remove other-source entries, boost same-source remaining
        for (const s of pool) {
          if (s.weight === 0) continue
          if (s.source && s.source !== lockedSource) s.weight = 0
          else if (s.source === lockedSource) s.weight = 2
        }
      }
    }
  }
  return result
}

export function drawNegatives(n: number, rng = Math.random): NegativeModifier[] {
  const pool = [...NEGATIVE_POOL]
  // Fisher-Yates partial shuffle
  for (let i = 0; i < n && i < pool.length; i++) {
    const j = i + Math.floor(rng() * (pool.length - i))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, n).map(s => ({
    kind: 'negative' as const,
    type: s.type,
    value: rollValue(s.min, s.max, rng),
  }))
}

export function rollArtifact(rng = Math.random, maxLines: 1 | 2 | 3 = 3): Artifact | null {
  const n = rollLineCount(rng, maxLines)
  if (n === 0) return null
  const positives = drawPositives(n, rng)
  const negatives = drawNegatives(n, rng)
  const lines: ArtifactLine[] = []
  for (let i = 0; i < n; i++) {
    lines.push({ positive: positives[i], negative: negatives[i] })
  }
  return { id: crypto.randomUUID(), lines, equipped: false, createdAt: Date.now() }
}

export function computeArtifactMods(artifacts: Artifact[]): ArtifactMods {
  const m = { ...ZERO_ARTIFACT_MODS }
  for (const art of artifacts) {
    if (!art.equipped) continue
    for (const line of art.lines) {
      const p = line.positive
      const neg = line.negative
      // Positive
      if (p.type === 'sourceMoreDamage') {
        if (p.source === 'fire') m.fireMoreDamage += p.value
        else if (p.source === 'lightning') m.lightningMoreDamage += p.value
        else if (p.source === 'physical') m.physicalMoreDamage += p.value
        else if (p.source === 'cold') m.coldMoreDamage += p.value
        else if (p.source === 'rot') m.rotMoreDamage += p.value
      } else if (p.type === 'sourceActionSpeed') {
        if (p.source === 'fire') m.fireActionSpeedAdd += p.value
        else if (p.source === 'lightning') m.lightningMoreActionSpeed += p.value
        else if (p.source === 'physical') m.physicalActionSpeedAdd += p.value
        else if (p.source === 'cold') m.coldActionSpeedAdd += p.value
        else if (p.source === 'rot') m.rotActionSpeedAdd += p.value
      } else if (p.type === 'sourceAffliction') {
        if (p.source === 'fire') m.burnMoreDamage += p.value
        else if (p.source === 'lightning') m.electrocuteEffectAdd += p.value
        else if (p.source === 'physical') m.bleedMoreDamage += p.value
        else if (p.source === 'cold') m.frostEffectAdd += p.value
        else if (p.source === 'rot') m.poisonMoreDamage += p.value
      } else if (p.type === 'globalActionSpeed') m.globalActionSpeedMore += p.value
      else if (p.type === 'globalMoreDamage') m.globalMoreDamage += p.value
      else if (p.type === 'doubleDamageChance') m.doubleDamageChance += p.value
      else if (p.type === 'doubleActionChance') m.doubleActionChance += p.value
      else if (p.type === 'rangeAndArea') { m.rangeMore += p.value; m.areaMore += p.value }
      // Negative
      if (neg.type === 'damageTaken') m.damageTakenMore += neg.value
      else if (neg.type === 'allResistances') m.resistanceLess += neg.value
      else if (neg.type === 'lessMoveSpeed') m.moveSpeedLess += neg.value
      else if (neg.type === 'lessActionSpeed') m.actionSpeedLess += neg.value
      else if (neg.type === 'lessRangeAndArea') { m.rangeLess += neg.value; m.areaLess += neg.value }
    }
  }
  return m
}

export function maxEquippedArtifacts(ascentCount: number): number {
  if (ascentCount >= balance.ascent.artifactSlot2UnlockAscent) return 2
  if (ascentCount >= balance.ascent.artifactSlot1UnlockAscent) return 1
  return 0
}

// Bag capacity grows once the bag-boost ascent threshold is reached.
export function maxBaggedArtifacts(ascentCount: number): number {
  return ascentCount >= balance.artifacts.bagBoostUnlockAscent
    ? balance.artifacts.maxCountBoosted
    : balance.artifacts.maxCount
}

export function describePositive(m: PositiveModifier): { key: string; value: number; source?: Source } {
  return { key: m.type, value: m.value, source: m.source }
}

export function describeNegative(m: NegativeModifier): { key: string; value: number } {
  return { key: m.type, value: m.value }
}

// ── Scraps & upgrades ─────────────────────────────────────────────────────────

/** Scraps granted for deleting/dropping an artifact: 1/2/3 by light/medium/heavy. */
export function scrapsForArtifact(a: Artifact): number {
  return a.lines.length
}

/** Upgrade cost in scraps: 1 for the first upgrade, doubling each time (no cap). */
export function upgradeCost(a: Artifact): number {
  return 2 ** (a.upgradeCount ?? 0)
}

export type UpgradeResult =
  | { kind: 'maxed' }
  | { kind: 'upgraded'; target: 'positive' | 'negative'; lineIndex: number; before: number; after: number }

function positiveSpec(m: PositiveModifier): PositiveSpec | undefined {
  return POSITIVE_POOL.find(s => s.type === m.type && s.source === m.source)
}

function negativeSpec(m: NegativeModifier): { min: number; max: number } | undefined {
  return NEGATIVE_POOL.find(s => s.type === m.type)
}

/**
 * Improve one random unmaxed modifier on the artifact by 1 point: positives
 * move +1 toward their spec max, negatives −1 toward their spec min, clamped.
 * A perfect-roll artifact has no unmaxed modifiers and returns {kind:'maxed'}
 * with no mutation (and the caller spends nothing). On success the artifact's
 * upgradeCount increments (doubling the next cost).
 */
export function upgradeArtifact(a: Artifact, rng = Math.random): UpgradeResult {
  interface Candidate { target: 'positive' | 'negative'; lineIndex: number }
  const candidates: Candidate[] = []
  a.lines.forEach((line, i) => {
    const ps = positiveSpec(line.positive)
    if (ps && line.positive.value < ps.max) candidates.push({ target: 'positive', lineIndex: i })
    const ns = negativeSpec(line.negative)
    if (ns && line.negative.value > ns.min) candidates.push({ target: 'negative', lineIndex: i })
  })
  if (candidates.length === 0) return { kind: 'maxed' }

  const pick = candidates[Math.min(candidates.length - 1, Math.floor(rng() * candidates.length))]
  const line = a.lines[pick.lineIndex]
  const round1 = (v: number): number => Math.round(v * 10) / 10
  let before: number, after: number
  if (pick.target === 'positive') {
    const spec = positiveSpec(line.positive)!
    before = line.positive.value
    after = round1(Math.min(spec.max, before + 1))
    line.positive.value = after
  } else {
    const spec = negativeSpec(line.negative)!
    before = line.negative.value
    after = round1(Math.max(spec.min, before - 1))
    line.negative.value = after
  }
  a.upgradeCount = (a.upgradeCount ?? 0) + 1
  return { kind: 'upgraded', target: pick.target, lineIndex: pick.lineIndex, before, after }
}
