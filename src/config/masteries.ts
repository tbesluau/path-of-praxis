import { balance } from './balance'

export type DamageEssenceTag = 'lightning' | 'fire' | 'cold' | 'physical' | 'rot'
export type DamageTypeTag    = 'area' | 'projectile' | 'strike'
export type ActionTag = DamageEssenceTag | DamageTypeTag

export type MasteryId =
  | 'action' | 'criticalHit'
  | 'physical' | 'fire' | 'lightning'
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

export interface MasteryCategoryDef {
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

export function nodeDescription(treeDef: MasteryTreeDef, nodeIdx: number): string {
  return `${treeDef.label} ${nodeType(nodeIdx)}`
}

// Tree order priority within each size bucket: damage/quantity/maximum → multi-actions → afflictions → buffs/debuffs
// Large trees come before small trees.
export const masteryCategories: MasteryCategoryDef[] = [
  {
    label: 'Action',
    masteries: [
      { id: 'action', label: 'Action', trees: [
        { index: 0, label: 'Action Damage' },
        { index: 1, label: 'Action Speed' },
        { index: 2, label: 'Trance',    short: true },
        { index: 3, label: 'Mana Cost', short: true },
      ] },
      { id: 'criticalHit', label: 'Critical Hit', trees: [
        { index: 0, label: 'Critical Damage' },
        { index: 1, label: 'Critical Chance' },
      ] },
    ],
  },
  {
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
    ],
  },
  {
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

function masteryXpGrowth(masteryId?: MasteryId): number {
  return (masteryId === 'life' || masteryId === 'mana')
    ? balance.mastery.lifeManaMasteryXpGrowth
    : balance.mastery.xpGrowth
}

export function masteryXpNeeded(level: number, masteryId?: MasteryId): number {
  return Math.round(balance.mastery.xpPerLevel * Math.pow(masteryXpGrowth(masteryId), level - 1))
}

export interface MasteryGainPreview {
  fromLv: number
  toLv: number
  newXp: number          // XP that would remain after the simulated rebirth
  levelsGained: number
  cappedAtMaxLevels: boolean
  oldPct: number         // % of current bar before gain (0 when level-up occurred)
  gainPct: number        // % of current bar from gain (0 when no gain)
}

// Simulates applying xpGain on top of (currentXp, currentLevel) with an absolute
// max-level cap. Once a mastery reaches maxLevel it stops accumulating XP — its
// stored XP is reset to 0 and any incoming XP beyond the cap is discarded.
export function previewMasteryGain(
  currentXp: number,
  currentLevel: number,
  xpGain: number,
  maxLevel: number,
  masteryId?: MasteryId,
): MasteryGainPreview {
  const fromLv = currentLevel
  let xp = currentXp + xpGain
  let level = currentLevel
  while (xp >= masteryXpNeeded(level, masteryId) && level < maxLevel) {
    xp -= masteryXpNeeded(level, masteryId)
    level++
  }
  let cappedAtMaxLevels = false
  if (level >= maxLevel) {
    xp = 0
    cappedAtMaxLevels = true
  }
  const levelsGained = level - fromLv
  const neededNow = masteryXpNeeded(level, masteryId)
  // Round percentages but never reduce a positive amount to 0 — the bar should
  // still show at min-width for any non-zero value (rendered as a min-bar in CSS).
  const pctRound = (n: number): number => n <= 0 ? 0 : Math.max(1, Math.round(n))
  let oldPct: number, gainPct: number
  if (cappedAtMaxLevels && levelsGained === 0) {
    // Already at absolute max — incoming XP is discarded, show no bar movement.
    oldPct = 0
    gainPct = 0
  } else if (levelsGained > 0) {
    oldPct = 0
    // Always show at least a min-bar when a level was gained, even if remaining
    // XP is 0 (exact boundary hit or absolute-max-level reached this rebirth).
    gainPct = Math.max(1, pctRound((xp / neededNow) * 100))
  } else {
    oldPct = pctRound((currentXp / neededNow) * 100)
    gainPct = Math.min(pctRound((xpGain / neededNow) * 100), 100 - oldPct)
  }
  return { fromLv, toLv: level, newXp: xp, levelsGained, cappedAtMaxLevels, oldPct, gainPct }
}
