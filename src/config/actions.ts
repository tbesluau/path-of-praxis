import type { ActionTag } from './masteries'
import { weapons } from './weapons'
import { spells } from './spells'

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
}

export type ActionId = 'sword' | 'bow' | 'fireball' | 'zap' | 'fire-nova'

// Ordered list used for cycling (sword → bow → fireball → zap → …)
export const allActions: ActionDef[] = [
  ...(Object.values(weapons) as ActionDef[]),
  ...(Object.values(spells)  as ActionDef[]),
]

export function getAction(id: ActionId): ActionDef {
  const found = allActions.find(a => a.id === id)
  if (!found) throw new Error(`Unknown action: ${id}`)
  return found
}

export function randomAction(): ActionDef {
  return allActions[Math.floor(Math.random() * allActions.length)]
}
