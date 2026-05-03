import { balance } from './balance'

export type ActionTypeTag    = 'spell' | 'weapon'
export type DamageEssenceTag = 'lightning' | 'fire' | 'cold' | 'physical' | 'rot'
export type DamageTypeTag    = 'area' | 'projectile' | 'strike'
export type ActionTag = ActionTypeTag | DamageEssenceTag | DamageTypeTag

export type MasteryId =
  | 'weapon' | 'spell'
  | 'physical' | 'fire' | 'lightning'
  | 'area' | 'projectile' | 'strike'
  | 'life' | 'mana'
  | 'enemy' | 'movement'

export interface MasteryTreeDef {
  index: number   // 0-4
  label: string   // e.g. "Lightning 1"
  short?: boolean // if true, tree ends after first major (line nodes 0-5; key nodes 12-13 only)
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

function makeTrees(label: string): MasteryTreeDef[] {
  return [1, 2, 3, 4, 5].map(n => ({ index: n - 1, label: `${label} ${n}` }))
}

export const masteryCategories: MasteryCategoryDef[] = [
  {
    label: 'Action',
    masteries: [
      { id: 'weapon', label: 'Weapon', tag: 'weapon', trees: makeTrees('Weapon') },
      { id: 'spell',  label: 'Spell',  tag: 'spell',  trees: [
        { index: 0, label: 'Spell Damage' },
        { index: 1, label: 'Cast Speed' },
        { index: 2, label: 'Trance',    short: true },
        { index: 3, label: 'Mana Cost', short: true },
        { index: 4, label: 'Spell Range' },
      ] },
    ],
  },
  {
    label: 'Damage',
    masteries: [
      { id: 'physical',  label: 'Physical',  tag: 'physical',  trees: makeTrees('Physical')  },
      { id: 'fire',      label: 'Fire',      tag: 'fire',      trees: [
        { index: 0, label: 'Burning' },
        { index: 1, label: 'Immolation', short: true },
        ...([3, 4, 5].map(n => ({ index: n - 1, label: `Fire ${n}` }))),
      ] },
      { id: 'lightning', label: 'Lightning', tag: 'lightning', trees: makeTrees('Lightning') },
    ],
  },
  {
    label: 'Damage Type',
    masteries: [
      { id: 'area',       label: 'Area',       tag: 'area',       trees: makeTrees('Area')       },
      { id: 'projectile', label: 'Projectile', tag: 'projectile', trees: [
        { index: 0, label: 'Projectile Range',      short: true },
        { index: 1, label: 'Multiple Projectiles' },
        ...([3, 4, 5].map(n => ({ index: n - 1, label: `Projectile ${n}` }))),
      ] },
      { id: 'strike',     label: 'Strike',     tag: 'strike',     trees: makeTrees('Strike')     },
    ],
  },
  {
    label: 'Life & Mana',
    masteries: [
      { id: 'life', label: 'Life', trees: [
        { index: 0, label: 'Maximum Life' },
        { index: 1, label: 'Life Regeneration', short: true },
        ...([3, 4, 5].map(n => ({ index: n - 1, label: `Life ${n}` }))),
      ] },
      { id: 'mana', label: 'Mana', trees: [
        { index: 0, label: 'Mana Regeneration', short: true },
        { index: 1, label: 'Maximum Mana',       short: true },
        ...([3, 4, 5].map(n => ({ index: n - 1, label: `Mana ${n}` }))),
      ] },
    ],
  },
  {
    label: 'World',
    masteries: [
      { id: 'enemy',    label: 'Enemy',    trees: [
        { index: 0, label: 'Enemy Quantity', short: true },
        { index: 1, label: 'Enemy Quality',  short: true },
        ...([3, 4, 5].map(n => ({ index: n - 1, label: `Enemy ${n}` }))),
      ] },
      { id: 'movement', label: 'Movement', trees: makeTrees('Movement') },
    ],
  },
]

export const allMasteries = masteryCategories.flatMap(c => c.masteries)

export function masteryXpNeeded(level: number): number {
  return Math.round(balance.mastery.xpPerLevel * Math.pow(balance.mastery.xpGrowth, level - 1))
}
