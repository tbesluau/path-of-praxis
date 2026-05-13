export type EntityRole = 'player' | 'enemy' | 'ally' | 'summon'
export type EntityTeam = 'player' | 'enemyA' | 'enemyB'

export interface Entity {
  id: string
  role: EntityRole
  team: EntityTeam
  x: number
  y: number
  radius: number
  moveSpeed: number    // pixels per second
  maxLife: number
  maxMana: number
  currentLife: number
  currentMana: number
  actionSpeed: number  // actions per second
  actionDamage: number
  actionRange: number  // pixels from target edge
  physRotResist?: number  // % damage reduction for physical and rot hits
  eleResist?: number      // % damage reduction for fire, lightning, and cold hits
}

export function createPlayerEntity(
  stats: Pick<Entity, 'radius' | 'moveSpeed' | 'maxLife' | 'maxMana' | 'currentLife' | 'currentMana'> &
    Partial<Pick<Entity, 'actionSpeed' | 'actionDamage' | 'actionRange'>>,
): Entity {
  return {
    id: 'player',
    role: 'player',
    team: 'player',
    x: 0,
    y: 0,
    actionSpeed:  stats.actionSpeed  ?? 1,
    actionDamage: stats.actionDamage ?? 1,
    actionRange:  stats.actionRange  ?? 20,
    radius:       stats.radius,
    moveSpeed:    stats.moveSpeed,
    maxLife:      stats.maxLife,
    maxMana:      stats.maxMana,
    currentLife:  stats.currentLife,
    currentMana:  stats.currentMana,
  }
}

export function createEnemyEntity(
  id: string,
  x: number,
  y: number,
  team: EntityTeam = 'enemyA',
  radius = 20,
  stats?: Partial<Pick<Entity, 'moveSpeed' | 'maxLife' | 'actionSpeed' | 'actionDamage' | 'actionRange'>>,
): Entity {
  const maxLife = stats?.maxLife ?? 100
  return {
    id,
    role: 'enemy',
    team,
    x,
    y,
    radius,
    moveSpeed:    stats?.moveSpeed    ?? 80,
    maxLife,
    maxMana:      0,
    currentLife:  maxLife,
    currentMana:  0,
    actionSpeed:  stats?.actionSpeed  ?? 1,
    actionDamage: stats?.actionDamage ?? 1,
    actionRange:  stats?.actionRange  ?? 20,
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
