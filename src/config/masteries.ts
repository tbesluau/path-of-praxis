export type ActionTag = 'weapon' | 'spell' | 'physical' | 'fire' | 'lightning'

export type MasteryId =
  | 'weapon' | 'spell'
  | 'physical' | 'fire' | 'lightning'
  | 'life' | 'mana'
  | 'enemy' | 'movement'

export interface MasteryDef {
  id: MasteryId
  label: string
  tag?: ActionTag
}

export interface MasteryCategoryDef {
  label: string
  masteries: MasteryDef[]
}

export const masteryCategories: MasteryCategoryDef[] = [
  {
    label: 'Action',
    masteries: [
      { id: 'weapon', label: 'Weapon', tag: 'weapon' },
      { id: 'spell',  label: 'Spell',  tag: 'spell'  },
    ],
  },
  {
    label: 'Damage',
    masteries: [
      { id: 'physical',  label: 'Physical',  tag: 'physical'  },
      { id: 'fire',      label: 'Fire',      tag: 'fire'      },
      { id: 'lightning', label: 'Lightning', tag: 'lightning' },
    ],
  },
  {
    label: 'Life & Mana',
    masteries: [
      { id: 'life', label: 'Life' },
      { id: 'mana', label: 'Mana' },
    ],
  },
  {
    label: 'World',
    masteries: [
      { id: 'enemy',    label: 'Enemy'    },
      { id: 'movement', label: 'Movement' },
    ],
  },
]

export const allMasteries = masteryCategories.flatMap(c => c.masteries)

export function masteryXpNeeded(level: number): number {
  return Math.round(1000 * Math.pow(1.5, level - 1))
}
