import type { ActionTag } from './masteries'

export type SpellId = 'fireball' | 'zap' | 'fire-nova'

interface SpellEntry {
  id: SpellId
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

export const spells: Record<SpellId, SpellEntry> = {
  fireball:    { id: 'fireball',  label: 'Fireball',  icon: 'flame', iconSystem: 'lucide', range: 12, damage: 1,   speed: 1.2, manaCost: 3, tags: ['fire',      'projectile'] },
  zap:         { id: 'zap',       label: 'Zap',       icon: 'zap',   iconSystem: 'lucide', range: 1,  damage: 1.2, speed: 1.8, manaCost: 1, tags: ['lightning', 'strike']     },
  'fire-nova': { id: 'fire-nova', label: 'Fire Nova', icon: 'flame', iconSystem: 'lucide', range: 0,  damage: 1.2, speed: 1,   manaCost: 2, tags: ['fire', 'area'], area: 4, selfTargeted: true },
}
