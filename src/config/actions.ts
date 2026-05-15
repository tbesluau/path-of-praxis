import type { ActionTag } from './masteries'

export type SpecialTagKind = 'afflictionChance' | 'buff' | 'manaRestore' | 'cooldownReduce' | 'other'

export interface SpecialTag {
  kind: SpecialTagKind
  label: string
  value?: number
}

export interface ActionDef {
  id: string
  label: string
  icon: string
  iconSystem: 'lucide' | 'game'
  range: number
  damage: number
  speed: number
  manaCost: number
  tags: ActionTag[]
  area?: number
  selfTargeted?: boolean
  specialTags?: SpecialTag[]
}

export type ActionId =
  | 'sword' | 'bow' | 'fireball' | 'zap' | 'fire-nova'
  | 'grenade' | 'hammer-slam' | 'lightning-nova' | 'bolt'

export const allActions: ActionDef[] = [
  { id: 'sword',          label: 'Sword Strike',   icon: 'sword',           iconSystem: 'lucide', range: 1,  damage: 2,   speed: 1,   manaCost: 1,   tags: ['physical',  'strike']     },
  { id: 'bow',            label: 'Sniping Arrow',  icon: 'crosshair',       iconSystem: 'lucide', range: 10, damage: 2,   speed: 0.6, manaCost: 2,   tags: ['physical',  'projectile'] },
  { id: 'fireball',       label: 'Fireball',       icon: 'flame',           iconSystem: 'lucide', range: 12, damage: 1,   speed: 1.2, manaCost: 3,   tags: ['fire',      'projectile'] },
  { id: 'zap',            label: 'Zap',            icon: 'zap',             iconSystem: 'lucide', range: 1,  damage: 1.2, speed: 1.8, manaCost: 1,   tags: ['lightning', 'strike']     },
  { id: 'fire-nova',      label: 'Fire Nova',      icon: 'flame',           iconSystem: 'lucide', range: 0,  damage: 1.2, speed: 1,   manaCost: 2,   tags: ['fire',      'area'], area: 4,   selfTargeted: true },
  { id: 'grenade',        label: 'Grenade',        icon: 'bomb',            iconSystem: 'lucide', range: 8,  damage: 2,   speed: 0.5, manaCost: 1.5, tags: ['fire',      'area'], area: 2.5 },
  { id: 'hammer-slam',    label: 'Hammer Slam',    icon: 'hammer',          iconSystem: 'lucide', range: 0,  damage: 2,   speed: 0.5, manaCost: 1,   tags: ['physical', 'area'],  area: 4,   selfTargeted: true },
  { id: 'lightning-nova', label: 'Lightning Nova', icon: 'loader-pinwheel', iconSystem: 'lucide', range: 0,  damage: 1.2, speed: 1,   manaCost: 2,   tags: ['lightning', 'area'], area: 4,   selfTargeted: true },
  { id: 'bolt',           label: 'Bolt',           icon: 'cloud-lightning', iconSystem: 'lucide', range: 7,  damage: 0.8, speed: 2,   manaCost: 2,   tags: ['lightning', 'projectile'] },
]

export function getAction(id: ActionId): ActionDef {
  const found = allActions.find(a => a.id === id)
  if (!found) throw new Error(`Unknown action: ${id}`)
  return found
}

export function randomAction(): ActionDef {
  return allActions[Math.floor(Math.random() * allActions.length)]
}
