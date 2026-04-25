import { describe, it, expect } from 'vitest'
import { createPlayerEntity, createEnemyEntity, nearestTarget } from './entity'

describe('entity', () => {
  describe('createPlayerEntity', () => {
    it('creates a player entity with given stats', () => {
      const e = createPlayerEntity({
        radius: 20, moveSpeed: 80,
        maxLife: 100, maxMana: 80, currentLife: 50, currentMana: 40,
      })
      expect(e.id).toBe('player')
      expect(e.role).toBe('player')
      expect(e.team).toBe('player')
      expect(e.radius).toBe(20)
      expect(e.moveSpeed).toBe(80)
      expect(e.maxLife).toBe(100)
      expect(e.maxMana).toBe(80)
      expect(e.currentLife).toBe(50)
      expect(e.currentMana).toBe(40)
    })

    it('defaults attack stats to 1 / 1 / 20', () => {
      const e = createPlayerEntity({
        radius: 20, moveSpeed: 80,
        maxLife: 100, maxMana: 100, currentLife: 50, currentMana: 50,
      })
      expect(e.attackSpeed).toBe(1)
      expect(e.attackDamage).toBe(1)
      expect(e.attackRange).toBe(20)
    })

    it('accepts explicit attack stats', () => {
      const e = createPlayerEntity({
        radius: 20, moveSpeed: 80,
        maxLife: 100, maxMana: 100, currentLife: 100, currentMana: 100,
        attackSpeed: 2, attackDamage: 5, attackRange: 40,
      })
      expect(e.attackSpeed).toBe(2)
      expect(e.attackDamage).toBe(5)
      expect(e.attackRange).toBe(40)
    })

    it('starts at position (0, 0)', () => {
      const e = createPlayerEntity({
        radius: 20, moveSpeed: 80,
        maxLife: 100, maxMana: 100, currentLife: 50, currentMana: 50,
      })
      expect(e.x).toBe(0)
      expect(e.y).toBe(0)
    })
  })

  describe('createEnemyEntity', () => {
    it('creates an enemyA entity with default stats', () => {
      const e = createEnemyEntity('enemy-1', 200, 300)
      expect(e.id).toBe('enemy-1')
      expect(e.role).toBe('enemy')
      expect(e.team).toBe('enemyA')
      expect(e.radius).toBe(20)
      expect(e.moveSpeed).toBe(80)
      expect(e.x).toBe(200)
      expect(e.y).toBe(300)
    })

    it('defaults attack stats to 1 / 1 / 20', () => {
      const e = createEnemyEntity('enemy-2', 0, 0)
      expect(e.attackSpeed).toBe(1)
      expect(e.attackDamage).toBe(1)
      expect(e.attackRange).toBe(20)
    })

    it('accepts an explicit team, radius, and stats override', () => {
      const e = createEnemyEntity('enemy-3', 0, 0, 'enemyB', 30, {
        moveSpeed: 120, maxLife: 200, attackDamage: 3,
      })
      expect(e.team).toBe('enemyB')
      expect(e.radius).toBe(30)
      expect(e.moveSpeed).toBe(120)
      expect(e.maxLife).toBe(200)
      expect(e.currentLife).toBe(200)
      expect(e.attackDamage).toBe(3)
    })

    it('defaults enemy to full life and zero mana', () => {
      const e = createEnemyEntity('enemy-4', 0, 0)
      expect(e.maxLife).toBe(100)
      expect(e.currentLife).toBe(100)
      expect(e.maxMana).toBe(0)
      expect(e.currentMana).toBe(0)
    })
  })

  describe('nearestTarget', () => {
    const mkPlayer = () => createPlayerEntity({
      radius: 20, moveSpeed: 80,
      maxLife: 100, maxMana: 100, currentLife: 100, currentMana: 100,
    })

    it('returns the closest entity of a different team', () => {
      const player = mkPlayer()
      const near = createEnemyEntity('e1', 10, 0)
      const far  = createEnemyEntity('e2', 100, 0)
      expect(nearestTarget(player, [player, near, far])?.id).toBe('e1')
    })

    it('ignores entities of the same team', () => {
      const player = mkPlayer()
      const ally = { ...player, id: 'player-2' }
      expect(nearestTarget(player, [player, ally])).toBeNull()
    })

    it('returns null when there are no other entities', () => {
      const player = mkPlayer()
      expect(nearestTarget(player, [player])).toBeNull()
    })
  })
})
