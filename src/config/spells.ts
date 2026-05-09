import type { ActionTag } from './masteries'

/**
 * Spell definitions — add new spells here, no code changes needed.
 *
 * range        — range units (1 = player radius). 0 for self-targeted area spells.
 * damage       — life points removed per cast
 * speed        — casts per second
 * manaCost     — mana consumed per cast
 * area         — (area-tagged only) radius units (1 = player radius) of the circular AoE
 * selfTargeted — (area-tagged only) when true, the area is centered on the caster
 *                and the cast fires the moment any enemy enters the area radius.
 *                Otherwise the area is centered on the targeted enemy.
 */

export type SpellId = 'fireball' | 'zap' | 'fire-nova'

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
  area?: number
  selfTargeted?: boolean
}

export const spells: Record<SpellId, SpellDef> = {
  fireball:    { id: 'fireball',    kind: 'spell', label: 'Fireball',  icon: 'flame',     iconSystem: 'lucide', range: 12, damage: 1,   speed: 1.2, manaCost: 3, tags: ['spell', 'fire',      'projectile'] },
  zap:         { id: 'zap',         kind: 'spell', label: 'Zap',       icon: 'zap',       iconSystem: 'lucide', range: 1,  damage: 1.2, speed: 1.8, manaCost: 1, tags: ['spell', 'lightning', 'strike']     },
  'fire-nova': { id: 'fire-nova',   kind: 'spell', label: 'Fire Nova', icon: 'flame',     iconSystem: 'lucide', range: 0,  damage: 1.2, speed: 1,   manaCost: 2, tags: ['spell', 'fire',      'area'], area: 4, selfTargeted: true },
}
