import { describe, it, expect, beforeEach } from 'vitest'

describe('character', () => {
  let character: typeof import('./character')

  beforeEach(async () => {
    localStorage.clear()
    character = await import('./character')
  })

  it('starts with no characters', () => {
    expect(character.getCharacters()).toEqual([])
    expect(character.getCurrentId()).toBeNull()
    expect(character.getCurrentCharacter()).toBeNull()
  })

  it('creates a character with default stats and 50 starting resources', () => {
    const c = character.createCharacter('Alice', 'sword')
    expect(c.name).toBe('Alice')
    expect(c.id).toBeTruthy()
    expect(c.maxLife).toBe(100)
    expect(c.maxMana).toBe(100)
    expect(c.currentLife).toBe(50)
    expect(c.currentMana).toBe(50)
    expect(c.actionId).toBe('sword')
    expect(c.actionProgress).toEqual({})
    expect(c.lifeProgress).toEqual({ xp: 0, level: 1 })
    expect(c.manaProgress).toEqual({ xp: 0, level: 1 })
    expect(c.enemyProgress).toEqual({ xp: 0, level: 1, maxLevel: 1, autoLevel: false })
    expect(character.getCharacters()).toHaveLength(1)
    expect(character.getCurrentId()).toBe(c.id)
  })

  it('persists and restores actionId', () => {
    const c = character.createCharacter('Mage', 'fireball')
    expect(c.actionId).toBe('fireball')
    character.saveCharacterState(c.id, 80, 60, 'zap')
    const restored = character.getCharacters().find(x => x.id === c.id)!
    expect(restored.actionId).toBe('zap')
  })

  it('trims whitespace from name', () => {
    const c = character.createCharacter('  Bob  ', 'sword')
    expect(c.name).toBe('Bob')
  })

  it('prevents duplicate character names', () => {
    character.createCharacter('Alice', 'sword')
    expect(() => character.createCharacter('Alice', 'sword')).toThrow(/taken/)
  })

  it('allows up to MAX_SLOTS characters', () => {
    for (let i = 0; i < character.MAX_SLOTS; i++) {
      character.createCharacter(`Hero ${i}`, 'sword')
    }
    expect(character.getCharacters()).toHaveLength(character.MAX_SLOTS)
    expect(() => character.createCharacter('One too many', 'sword')).toThrow(/full/)
  })

  it('loads a character by id', () => {
    const a = character.createCharacter('Alpha', 'sword')
    const b = character.createCharacter('Beta', 'bow')
    expect(character.getCurrentId()).toBe(b.id)
    character.loadCharacter(a.id)
    expect(character.getCurrentId()).toBe(a.id)
  })

  it('throws when loading a non-existent character', () => {
    expect(() => character.loadCharacter('does-not-exist')).toThrow(/not found/)
  })

  it('deleting current character sets currentId to null', () => {
    character.createCharacter('Alpha', 'sword')
    const b = character.createCharacter('Beta', 'sword')
    character.loadCharacter(b.id)
    character.deleteCharacter(b.id)
    expect(character.getCharacters()).toHaveLength(1)
    expect(character.getCurrentId()).toBeNull()
  })

  it('deleting a non-current character preserves current', () => {
    const a = character.createCharacter('Alpha', 'sword')
    const b = character.createCharacter('Beta', 'bow')
    character.loadCharacter(b.id)
    character.deleteCharacter(a.id)
    expect(character.getCurrentId()).toBe(b.id)
  })

  it('sets currentId to null when last character is deleted', () => {
    const c = character.createCharacter('Solo', 'sword')
    character.deleteCharacter(c.id)
    expect(character.getCharacters()).toHaveLength(0)
    expect(character.getCurrentId()).toBeNull()
  })

  it('saves and restores current life and mana', () => {
    const c = character.createCharacter('Hero', 'sword')
    character.saveCharacterState(c.id, 75, 30)
    const restored = character.getCharacters().find(x => x.id === c.id)!
    expect(restored.currentLife).toBe(75)
    expect(restored.currentMana).toBe(30)
  })

  it('saveCharacterState is a no-op for unknown id', () => {
    expect(() => character.saveCharacterState('ghost', 50, 50)).not.toThrow()
  })

  it('normalises legacy saves missing maxLife/maxMana/currentLife/currentMana/actionId', () => {
    const legacy = { characters: [{ id: 'x', name: 'Old', createdAt: 0 }], currentId: 'x' }
    localStorage.setItem('pop:save', JSON.stringify(legacy))
    const chars = character.getCharacters()
    expect(chars[0].maxLife).toBe(100)
    expect(chars[0].maxMana).toBe(100)
    expect(chars[0].currentLife).toBe(100)
    expect(chars[0].currentMana).toBe(100)
    expect(chars[0].actionId).toBe('sword')
    expect(chars[0].actionProgress).toEqual({})
    expect(chars[0].lifeProgress).toEqual({ xp: 0, level: 1 })
    expect(chars[0].manaProgress).toEqual({ xp: 0, level: 1 })
    expect(chars[0].enemyProgress).toEqual({ xp: 0, level: 1, maxLevel: 1, autoLevel: false })
  })

  it('saveCharacterState persists actionProgress', () => {
    const c = character.createCharacter('Hero', 'sword')
    character.saveCharacterState(c.id, 80, 60, 'sword', { sword: { xp: 150, level: 2, maxLevel: 2 } })
    const restored = character.getCharacters().find(x => x.id === c.id)!
    expect(restored.actionProgress.sword).toEqual({ xp: 150, level: 2, maxLevel: 2 })
  })

  it('saveCharacterState persists lifeProgress and manaProgress', () => {
    const c = character.createCharacter('Warrior', 'sword')
    character.saveCharacterState(c.id, 80, 60, undefined, undefined, { xp: 75, level: 2 }, { xp: 50, level: 3 })
    const restored = character.getCharacters().find(x => x.id === c.id)!
    expect(restored.lifeProgress).toEqual({ xp: 75, level: 2 })
    expect(restored.manaProgress).toEqual({ xp: 50, level: 3 })
  })

  it('saveCharacterState persists enemyProgress', () => {
    const c = character.createCharacter('Hunter', 'sword')
    character.saveCharacterState(c.id, 80, 60, undefined, undefined, undefined, undefined, { xp: 500, level: 2, maxLevel: 3, autoLevel: true })
    const restored = character.getCharacters().find(x => x.id === c.id)!
    expect(restored.enemyProgress).toEqual({ xp: 500, level: 2, maxLevel: 3, autoLevel: true })
  })
})
