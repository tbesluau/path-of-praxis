/**
 * Weapon definitions — add new weapons here, no code changes needed.
 *
 * range     — range units (1 = player radius, so 1 = melee, 5 = ranged)
 * damage    — life points removed per hit
 * speed     — attacks per second
 * manaCost  — mana consumed per attack
 */

export type WeaponId = 'sword' | 'bow'

export interface WeaponDef {
  id: WeaponId
  kind: 'weapon'
  label: string
  range: number
  damage: number
  speed: number
  manaCost: number
}

export const weapons: Record<WeaponId, WeaponDef> = {
  sword: { id: 'sword', kind: 'weapon', label: 'Sword', range: 1, damage: 2,   speed: 1,   manaCost: 1 },
  bow:   { id: 'bow',   kind: 'weapon', label: 'Bow',   range: 5, damage: 2,   speed: 0.6, manaCost: 2 },
}
