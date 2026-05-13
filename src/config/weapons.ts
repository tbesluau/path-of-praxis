import type { ActionTag } from './masteries'

export type WeaponId = 'sword' | 'bow'

interface WeaponEntry {
  id: WeaponId
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
}

export const weapons: Record<WeaponId, WeaponEntry> = {
  sword: { id: 'sword', label: 'Sword', icon: 'sword',     iconSystem: 'lucide', range: 1,  damage: 2, speed: 1,   manaCost: 1, tags: ['physical', 'strike']     },
  bow:   { id: 'bow',   label: 'Bow',   icon: 'crosshair', iconSystem: 'lucide', range: 10, damage: 2, speed: 0.6, manaCost: 2, tags: ['physical', 'projectile'] },
}
