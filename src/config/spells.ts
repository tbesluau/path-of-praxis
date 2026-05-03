import type { ActionTag } from './masteries'

/**
 * Spell definitions — add new spells here, no code changes needed.
 *
 * range     — range units (1 = player radius)
 * damage    — life points removed per cast
 * speed     — casts per second
 * manaCost  — mana consumed per cast
 */

export type SpellId = 'fireball' | 'zap'

export interface SpellDef {
  id: SpellId
  kind: 'spell'
  label: string
  icon: string
  iconSystem: 'lucide' | 'game'
  range: number
  damage: number
  speed: number
  manaCost: number
  tags: ActionTag[]
}

export const spells: Record<SpellId, SpellDef> = {
  fireball: { id: 'fireball', kind: 'spell', label: 'Fireball', icon: 'flame', iconSystem: 'lucide', range: 12, damage: 1,   speed: 1.2, manaCost: 3, tags: ['spell', 'fire',      'projectile'] },
  zap:      { id: 'zap',      kind: 'spell', label: 'Zap',      icon: 'zap',   iconSystem: 'lucide', range: 1,  damage: 1.2, speed: 1.8, manaCost: 1, tags: ['spell', 'lightning', 'strike']     },
}
