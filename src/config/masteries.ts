import { balance } from './balance'

export type ActionTag = 'weapon' | 'spell' | 'physical' | 'fire' | 'lightning'

export type MasteryId =
  | 'weapon' | 'spell'
  | 'physical' | 'fire' | 'lightning'
  | 'life' | 'mana'
  | 'enemy' | 'movement'

export interface MasteryTreeDef {
  index: number   // 0-4
  label: string   // e.g. "Lightning 1"
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
      { id: 'spell',  label: 'Spell',  tag: 'spell',  trees: makeTrees('Spell')  },
    ],
  },
  {
    label: 'Damage',
    masteries: [
      { id: 'physical',  label: 'Physical',  tag: 'physical',  trees: makeTrees('Physical')  },
      { id: 'fire',      label: 'Fire',      tag: 'fire',      trees: makeTrees('Fire')      },
      { id: 'lightning', label: 'Lightning', tag: 'lightning', trees: makeTrees('Lightning') },
    ],
  },
  {
    label: 'Life & Mana',
    masteries: [
      { id: 'life', label: 'Life', trees: makeTrees('Life') },
      { id: 'mana', label: 'Mana', trees: makeTrees('Mana') },
    ],
  },
  {
    label: 'World',
    masteries: [
      { id: 'enemy',    label: 'Enemy',    trees: makeTrees('Enemy')    },
      { id: 'movement', label: 'Movement', trees: makeTrees('Movement') },
    ],
  },
]

export const allMasteries = masteryCategories.flatMap(c => c.masteries)

export function masteryXpNeeded(level: number): number {
  return Math.round(balance.mastery.xpPerLevel * Math.pow(balance.mastery.xpGrowth, level - 1))
}
