import { weapons, type WeaponDef } from './weapons'
import { spells, type SpellDef } from './spells'

export type { WeaponDef } from './weapons'
export type { SpellDef } from './spells'
export type ActionDef = WeaponDef | SpellDef
export type ActionId = ActionDef['id']

// Ordered list used for cycling (sword → bow → fireball → zap → …)
export const allActions: ActionDef[] = [
  ...Object.values(weapons),
  ...Object.values(spells),
]

export function getAction(id: ActionId): ActionDef {
  const found = allActions.find(a => a.id === id)
  if (!found) throw new Error(`Unknown action: ${id}`)
  return found
}

export function randomAction(): ActionDef {
  return allActions[Math.floor(Math.random() * allActions.length)]
}
