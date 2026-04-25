import { describe, it, expect } from 'vitest'
import { createPlayerEntity, createEnemyEntity } from './entity'

describe('entity', () => {
  describe('createPlayerEntity', () => {
    it('creates a player entity with given stats', () => {
      const e = createPlayerEntity({ maxLife: 100, maxMana: 80, currentLife: 50, currentMana: 40 })
      expect(e.id).toBe('player')
      expect(e.role).toBe('player')
      expect(e.maxLife).toBe(100)
      expect(e.maxMana).toBe(80)
      expect(e.currentLife).toBe(50)
      expect(e.currentMana).toBe(40)
    })

    it('starts at position (0, 0)', () => {
      const e = createPlayerEntity({ maxLife: 100, maxMana: 100, currentLife: 50, currentMana: 50 })
      expect(e.x).toBe(0)
      expect(e.y).toBe(0)
    })
  })

  describe('createEnemyEntity', () => {
    it('creates an enemy entity at given position', () => {
      const e = createEnemyEntity('enemy-1', 200, 300)
      expect(e.id).toBe('enemy-1')
      expect(e.role).toBe('enemy')
      expect(e.x).toBe(200)
      expect(e.y).toBe(300)
    })

    it('defaults enemy to full life and zero mana', () => {
      const e = createEnemyEntity('enemy-2', 0, 0)
      expect(e.maxLife).toBe(100)
      expect(e.currentLife).toBe(100)
      expect(e.maxMana).toBe(0)
      expect(e.currentMana).toBe(0)
    })
  })
})
