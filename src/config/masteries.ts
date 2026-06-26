import { balance } from './balance'
import { t } from '../i18n'
import type { TranslationSchema } from '../i18n/locales/en'

export type DamageEssenceTag = 'lightning' | 'fire' | 'cold' | 'physical' | 'rot'
export type DamageTypeTag    = 'area' | 'projectile' | 'strike'
export type ActionTag = DamageEssenceTag | DamageTypeTag

export type MasteryId =
  | 'action' | 'criticalHit'
  | 'physical' | 'fire' | 'lightning' | 'cold' | 'rot'
  | 'area' | 'projectile' | 'strike'
  | 'life' | 'mana'
  | 'enemy' | 'movement'

export interface MasteryTreeDef {
  index: number        // 0-based position in the trees array
  label: string        // e.g. "Action Damage"
  short?: boolean      // if true, tree ends after first major (line nodes 0-5; key nodes 12-13 only)
  unlockAscent?: number // hide until ascentCount >= this value
}

export interface MasteryDef {
  id: MasteryId
  label: string
  tag?: ActionTag
  trees: MasteryTreeDef[]
}

export type MasteryCategoryId = 'action' | 'damageBase' | 'damageType' | 'lifeMana' | 'world'

export interface MasteryCategoryDef {
  id: MasteryCategoryId
  label: string
  masteries: MasteryDef[]
}

// Line pattern for nodes 0-11
const LINE_TYPES = ['small','small','strong','small','small','major',
                    'small','small','strong','small','small','major'] as const
export type NodeType = 'small' | 'strong' | 'major' | 'key'

export function nodeType(nodeIdx: number): NodeType {
  if (nodeIdx >= 12) return 'key'
  return LINE_TYPES[nodeIdx]
}

// Point cost of a single node by index.
// small / strong = 1 pt  |  major = 2 pts  |  key = 3 pts
export function nodeCost(nodeIdx: number): number {
  const t = nodeType(nodeIdx)
  if (t === 'major') return 2
  if (t === 'key')   return 3
  return 1
}

export function nodeDescription(treeDef: MasteryTreeDef, nodeIdx: number): string {
  return `${treeDef.label} ${nodeType(nodeIdx)}`
}

// Tree order priority within each size bucket: damage/quantity/maximum → multi-actions → afflictions → buffs/debuffs
// Large trees come before small trees.
export const masteryCategories: MasteryCategoryDef[] = [
  {
    id: 'action',
    label: 'Action',
    masteries: [
      { id: 'action', label: 'Action', trees: [
        { index: 0, label: 'Action Damage' },
        { index: 1, label: 'Action Speed' },
        { index: 2, label: 'Trance',    short: true },
        { index: 3, label: 'Mana Cost', short: true },
      ] },
      { id: 'criticalHit', label: 'Critical Hit', trees: [
        { index: 1, label: 'Critical Chance' },
        { index: 0, label: 'Critical Damage' },
      ] },
    ],
  },
  {
    id: 'damageBase',
    label: 'Damage Base',
    masteries: [
      { id: 'physical',  label: 'Physical',  tag: 'physical',  trees: [
        { index: 0, label: 'Physical Damage' },
        { index: 1, label: 'Bleed' },
        { index: 3, label: 'Bloodlust',           short: true },
        { index: 2, label: 'Resistance Breaking', short: true },
      ] },
      { id: 'fire',      label: 'Fire',      tag: 'fire',      trees: [
        { index: 0, label: 'Fire Damage' },
        { index: 1, label: 'Burning' },
        { index: 3, label: 'Immolation',     short: true },
        { index: 2, label: 'Burning Ground', short: true },
      ] },
      { id: 'lightning', label: 'Lightning', tag: 'lightning', trees: [
        { index: 0, label: 'Lightning Damage' },
        { index: 1, label: 'Electrocution' },
        { index: 3, label: 'Electrifying', short: true },
        { index: 2, label: 'Jump',        short: true },
      ] },
      { id: 'cold', label: 'Cold', tag: 'cold', trees: [
        { index: 0, label: 'Cold Damage' },
        { index: 1, label: 'Frost' },
        { index: 2, label: 'Shatter',      short: true },
        { index: 3, label: 'Frozen Armor', short: true },
      ] },
      { id: 'rot', label: 'Rot', tag: 'rot', trees: [
        { index: 0, label: 'Rot Damage' },
        { index: 1, label: 'Poison' },
        { index: 2, label: 'Weakening',   short: true },
        { index: 3, label: 'Green Veins', short: true },
      ] },
    ],
  },
  {
    id: 'damageType',
    label: 'Damage Type',
    masteries: [
      { id: 'area',       label: 'Area',       tag: 'area',       trees: [
        { index: 0, label: 'Area Damage' },
        { index: 1, label: 'Area Size' },
        { index: 2, label: 'Tremor',    short: true },
        { index: 3, label: 'Knockback', short: true },
      ] },
      { id: 'projectile', label: 'Projectile', tag: 'projectile', trees: [
        { index: 0, label: 'Projectile Damage' },
        { index: 1, label: 'Multiple Projectiles' },
        { index: 2, label: 'Projectile Range', short: true },
        { index: 3, label: 'Knockback',        short: true },
      ] },
      { id: 'strike',     label: 'Strike',     tag: 'strike',     trees: [
        { index: 0, label: 'Strike Damage' },
        { index: 1, label: 'Frenzy' },
        { index: 2, label: 'Strike Range',     short: true },
        { index: 3, label: 'Additional Target', short: true },
      ] },
    ],
  },
  {
    id: 'lifeMana',
    label: 'Life & Mana',
    masteries: [
      { id: 'life', label: 'Life', trees: [
        { index: 0, label: 'Maximum Life' },
        { index: 1, label: 'Resistances' },
        { index: 2, label: 'Life Regeneration', short: true },
        { index: 3, label: 'Life Steal',        short: true },
      ] },
      { id: 'mana', label: 'Mana', trees: [
        { index: 0, label: 'Maximum Mana' },
        { index: 1, label: 'Mana Shield' },
        { index: 2, label: 'Mana Regeneration', short: true },
        { index: 3, label: 'Mana Steal',        short: true },
      ] },
    ],
  },
  {
    id: 'world',
    label: 'World',
    masteries: [
      { id: 'enemy',    label: 'Enemy',    trees: [
        { index: 0, label: 'Enemy Quantity' },
        { index: 1, label: 'Enemy Quality' },
        { index: 3, label: 'Enemy Proliferation', short: true },
        { index: 2, label: 'Champions and Bosses', short: true, unlockAscent: 2 },
      ] },
      { id: 'movement', label: 'Movement', trees: [
        { index: 0, label: 'Movement Speed' },
        { index: 1, label: 'Dash', short: true },
        { index: 2, label: 'Kite', short: true },
      ] },
    ],
  },
]

export const allMasteries = masteryCategories.flatMap(c => c.masteries)

// ── Mastery node codes ─────────────────────────────────────────────────────
// Human-readable identifiers: one mastery letter + one tree letter + position.
// Examples: FD6a = Fire/Damage tree, first major key (top); HM1 = Life/MaxLife, node 1.

export const MASTERY_LETTER: Record<MasteryId, string> = {
  action: 'A', criticalHit: 'C', physical: 'P', fire: 'F', lightning: 'L', cold: 'K', rot: 'O',
  area: 'R', projectile: 'J', strike: 'S', life: 'H', mana: 'M', enemy: 'E', movement: 'V',
}

// Keyed by treeIdx (MasteryTreeDef.index), not display order.
export const TREE_LETTER: Record<MasteryId, Record<number, string>> = {
  action:      { 0: 'D', 1: 'S', 2: 'T', 3: 'C' },
  criticalHit: { 0: 'D', 1: 'H' },
  physical:    { 0: 'D', 1: 'B', 2: 'R', 3: 'L' },
  fire:        { 0: 'D', 1: 'B', 2: 'G', 3: 'I' },
  lightning:   { 0: 'D', 1: 'E', 2: 'J', 3: 'T' },
  cold:        { 0: 'D', 1: 'F', 2: 'S', 3: 'A' },
  rot:         { 0: 'D', 1: 'P', 2: 'W', 3: 'G' },
  area:        { 0: 'D', 1: 'S', 2: 'T', 3: 'K' },
  projectile:  { 0: 'D', 1: 'M', 2: 'R', 3: 'K' },
  strike:      { 0: 'D', 1: 'F', 2: 'R', 3: 'T' },
  life:        { 0: 'M', 1: 'R', 2: 'G', 3: 'T' },
  mana:        { 0: 'M', 1: 'S', 2: 'G', 3: 'T' },
  enemy:       { 0: 'Q', 1: 'U', 2: 'B', 3: 'P' },
  movement:    { 0: 'S', 1: 'D', 2: 'K' },
}

// Reverse maps for codeToNode.
const LETTER_TO_MASTERY: Record<string, MasteryId> = Object.fromEntries(
  Object.entries(MASTERY_LETTER).map(([id, l]) => [l, id as MasteryId]),
)

const LETTER_TO_TREE: Record<MasteryId, Record<string, number>> = Object.fromEntries(
  (Object.entries(TREE_LETTER) as [MasteryId, Record<number, string>][]).map(([id, map]) => [
    id,
    Object.fromEntries(Object.entries(map).map(([idx, l]) => [l, Number(idx)])),
  ]),
) as Record<MasteryId, Record<string, number>>

// nodeIdx → display position suffix:
//   0-11  → "1"–"12"
//   12    → "6a"  (top key after first major)
//   13    → "6b"  (bottom key after first major)
//   14    → "12a" (top key after second major)
//   15    → "12b" (bottom key after second major)
export function nodeToCode(masteryId: MasteryId, treeIdx: number, nodeIdx: number): string {
  const m = MASTERY_LETTER[masteryId]
  const treeMap = TREE_LETTER[masteryId]
  const tl = treeMap?.[treeIdx]
  if (!m || !tl) return ''
  if (nodeIdx < 12) return `${m}${tl}${nodeIdx + 1}`
  if (nodeIdx === 12) return `${m}${tl}6a`
  if (nodeIdx === 13) return `${m}${tl}6b`
  if (nodeIdx === 14) return `${m}${tl}12a`
  return `${m}${tl}12b`
}

export function codeToNode(
  code: string,
): { masteryId: MasteryId; treeIdx: number; nodeIdx: number } | null {
  const match = code.match(/^([A-Z])([A-Z])(\d+)(a|b)?$/)
  if (!match) return null
  const [, mLetter, tLetter, numStr, side] = match
  const masteryId = LETTER_TO_MASTERY[mLetter]
  if (!masteryId) return null
  const treeIdx = LETTER_TO_TREE[masteryId]?.[tLetter]
  if (treeIdx === undefined) return null
  const num = parseInt(numStr, 10)
  let nodeIdx: number
  if (side === 'a') {
    nodeIdx = num === 6 ? 12 : 14
  } else if (side === 'b') {
    nodeIdx = num === 6 ? 13 : 15
  } else {
    nodeIdx = num - 1
  }
  return { masteryId, treeIdx, nodeIdx }
}

export function getMasteryCategoryLabel(id: MasteryCategoryId): string {
  return t('masteryCategory', id)
}

export function getMasteryLabel(id: MasteryId): string {
  return t('masteryLabel', id)
}

export function getMasteryTreeLabel(masteryId: MasteryId, treeIdx: number): string {
  const key = `${masteryId}_${treeIdx}` as keyof TranslationSchema['masteryTree']
  return t('masteryTree', key)
}

function masteryXpGrowth(masteryId?: MasteryId): number {
  return (masteryId === 'life' || masteryId === 'mana')
    ? balance.mastery.lifeManaMasteryXpGrowth
    : balance.mastery.xpGrowth
}

export function masteryXpNeeded(level: number, masteryId?: MasteryId): number {
  if (masteryId === 'movement') {
    return Math.round(balance.mastery.xpPerLevel * (1 + balance.mastery.movementMasteryXpAddPerLevel * (level - 1)))
  }
  return Math.round(balance.mastery.xpPerLevel * Math.pow(masteryXpGrowth(masteryId), level - 1))
}

// Raw run XP buys less the further you climb in a single rebirth. Each level
// gained beyond the committed baseline taxes incoming XP by an extra (1+penalty)
// factor: the first level above base is untaxed, the next needs ×(1+penalty) raw
// XP, the next ×(1+penalty)², … Equivalent difficulty to scaling the requirement,
// but the *stored* progress stays in natural units — so leftover never overflows
// a bar and nothing is discarded.
export function unearnedXpTax(unearnedLevels: number): number {
  return Math.pow(1 + balance.mastery.unearnedLevelXpPenalty, Math.max(0, unearnedLevels))
}

export interface MasteryGainPreview {
  fromLv: number
  toLv: number
  newXp: number          // XP that would remain after the simulated rebirth (natural units)
  levelsGained: number
  oldPct: number         // % of current bar before gain (0 when level-up occurred)
  gainPct: number        // % of current bar from gain (0 when no gain)
}

// Simulates applying xpGain on top of (currentXp, currentLevel). There is no hard
// level cap; instead the run XP poured in is taxed more per level gained this
// rebirth (beyond `currentLevel`, the committed baseline), which throttles how far
// a single rebirth can climb. Stored progress (newXp) is kept in natural units so
// it never exceeds the next level's natural requirement; leftover always carries.
export function previewMasteryGain(
  currentXp: number,
  currentLevel: number,
  xpGain: number,
  masteryId?: MasteryId,
): MasteryGainPreview {
  const fromLv = currentLevel
  let level = currentLevel
  let xp = currentXp     // banked progress toward `level`, in natural units
  let pool = xpGain      // raw run XP still to distribute
  for (;;) {
    const need = masteryXpNeeded(level, masteryId)
    if (xp >= need) {
      // Legacy carryover already completes this level — flush it at natural cost.
      xp -= need
      level++
      continue
    }
    const tax = unearnedXpTax(level - fromLv)
    const rawNeed = (need - xp) * tax    // raw run XP required to finish this level
    if (pool >= rawNeed) {
      pool -= rawNeed
      level++
      xp = 0
    } else {
      xp += pool / tax                   // convert remaining raw XP back to natural units
      pool = 0
      break
    }
  }
  const levelsGained = level - fromLv
  const neededNow = masteryXpNeeded(level, masteryId)
  // Round percentages but never reduce a positive amount to 0 — the bar should
  // still show at min-width for any non-zero value (rendered as a min-bar in CSS).
  const pctRound = (n: number): number => n <= 0 ? 0 : Math.max(1, Math.round(n))
  let oldPct: number, gainPct: number
  if (levelsGained > 0) {
    oldPct = 0
    // Always show at least a min-bar when a level was gained, even if remaining
    // XP is 0 (exact boundary hit).
    gainPct = Math.max(1, pctRound((xp / neededNow) * 100))
  } else {
    // No level gained → still at the untaxed first tier, so the bar moves by the
    // raw gain (xp - currentXp === xpGain here).
    oldPct = pctRound((currentXp / neededNow) * 100)
    gainPct = Math.min(pctRound(((xp - currentXp) / neededNow) * 100), 100 - oldPct)
  }
  return { fromLv, toLv: level, newXp: xp, levelsGained, oldPct, gainPct }
}
