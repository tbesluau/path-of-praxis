export type EntityRole = 'player' | 'enemy' | 'ally' | 'summon'

export interface Entity {
  id: string
  role: EntityRole
  x: number
  y: number
  maxLife: number
  maxMana: number
  currentLife: number
  currentMana: number
}

export function createPlayerEntity(
  stats: Pick<Entity, 'maxLife' | 'maxMana' | 'currentLife' | 'currentMana'>,
): Entity {
  return {
    id: 'player',
    role: 'player',
    x: 0,
    y: 0,
    ...stats,
  }
}

export function createEnemyEntity(id: string, x: number, y: number): Entity {
  return {
    id,
    role: 'enemy',
    x,
    y,
    maxLife: 100,
    maxMana: 0,
    currentLife: 100,
    currentMana: 0,
  }
}
