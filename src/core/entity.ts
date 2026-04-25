export type EntityRole = 'player' | 'enemy' | 'ally' | 'summon'
export type EntityTeam = 'player' | 'enemyA' | 'enemyB'

export interface Entity {
  id: string
  role: EntityRole
  team: EntityTeam
  x: number
  y: number
  radius: number
  maxLife: number
  maxMana: number
  currentLife: number
  currentMana: number
  attackSpeed: number  // attacks per second
  attackDamage: number
  attackRange: number  // px from target edge; 1 base unit = player radius (20 px)
}

export function createPlayerEntity(
  stats: Pick<Entity, 'maxLife' | 'maxMana' | 'currentLife' | 'currentMana' | 'radius'> &
    Partial<Pick<Entity, 'attackSpeed' | 'attackDamage' | 'attackRange'>>,
): Entity {
  return {
    id: 'player',
    role: 'player',
    team: 'player',
    x: 0,
    y: 0,
    attackSpeed: stats.attackSpeed ?? 1,
    attackDamage: stats.attackDamage ?? 1,
    attackRange: stats.attackRange ?? 20,
    maxLife: stats.maxLife,
    maxMana: stats.maxMana,
    currentLife: stats.currentLife,
    currentMana: stats.currentMana,
    radius: stats.radius,
  }
}

export function createEnemyEntity(
  id: string,
  x: number,
  y: number,
  team: EntityTeam = 'enemyA',
  radius = 20,
): Entity {
  return {
    id,
    role: 'enemy',
    team,
    x,
    y,
    radius,
    attackSpeed: 1,
    attackDamage: 1,
    attackRange: 20,
    maxLife: 100,
    maxMana: 0,
    currentLife: 100,
    currentMana: 0,
  }
}

// Returns the closest entity belonging to a different team, or null if none.
export function nearestTarget(entity: Entity, others: Entity[]): Entity | null {
  let nearest: Entity | null = null
  let minDistSq = Infinity
  for (const other of others) {
    if (other.team === entity.team) continue
    const dx = other.x - entity.x
    const dy = other.y - entity.y
    const distSq = dx * dx + dy * dy
    if (distSq < minDistSq) {
      minDistSq = distSq
      nearest = other
    }
  }
  return nearest
}
