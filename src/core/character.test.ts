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
    const c = character.createCharacter('Alice')
    expect(c.name).toBe('Alice')
    expect(c.id).toBeTruthy()
    expect(c.maxLife).toBe(100)
    expect(c.maxMana).toBe(100)
    expect(c.currentLife).toBe(50)
    expect(c.currentMana).toBe(50)
    expect(character.getCharacters()).toHaveLength(1)
    expect(character.getCurrentId()).toBe(c.id)
  })

  it('trims whitespace from name', () => {
    const c = character.createCharacter('  Bob  ')
    expect(c.name).toBe('Bob')
  })

  it('prevents duplicate character names', () => {
    character.createCharacter('Alice')
    expect(() => character.createCharacter('Alice')).toThrow(/taken/)
  })

  it('allows up to MAX_SLOTS characters', () => {
    for (let i = 0; i < character.MAX_SLOTS; i++) {
      character.createCharacter(`Hero ${i}`)
    }
    expect(character.getCharacters()).toHaveLength(character.MAX_SLOTS)
    expect(() => character.createCharacter('One too many')).toThrow(/full/)
  })

  it('loads a character by id', () => {
    const a = character.createCharacter('Alpha')
    const b = character.createCharacter('Beta')
    expect(character.getCurrentId()).toBe(b.id)
    character.loadCharacter(a.id)
    expect(character.getCurrentId()).toBe(a.id)
  })

  it('throws when loading a non-existent character', () => {
    expect(() => character.loadCharacter('does-not-exist')).toThrow(/not found/)
  })

  it('deleting current character sets currentId to null', () => {
    character.createCharacter('Alpha')
    const b = character.createCharacter('Beta')
    character.loadCharacter(b.id)
    character.deleteCharacter(b.id)
    expect(character.getCharacters()).toHaveLength(1)
    expect(character.getCurrentId()).toBeNull()
  })

  it('deleting a non-current character preserves current', () => {
    const a = character.createCharacter('Alpha')
    const b = character.createCharacter('Beta')
    character.loadCharacter(b.id)
    character.deleteCharacter(a.id)
    expect(character.getCurrentId()).toBe(b.id)
  })

  it('sets currentId to null when last character is deleted', () => {
    const c = character.createCharacter('Solo')
    character.deleteCharacter(c.id)
    expect(character.getCharacters()).toHaveLength(0)
    expect(character.getCurrentId()).toBeNull()
  })

  it('saves and restores current life and mana', () => {
    const c = character.createCharacter('Hero')
    character.saveCharacterState(c.id, 75, 30)
    const restored = character.getCharacters().find(x => x.id === c.id)!
    expect(restored.currentLife).toBe(75)
    expect(restored.currentMana).toBe(30)
  })

  it('saveCharacterState is a no-op for unknown id', () => {
    expect(() => character.saveCharacterState('ghost', 50, 50)).not.toThrow()
  })

  it('normalises legacy saves missing maxLife/maxMana/currentLife/currentMana', () => {
    const legacy = { characters: [{ id: 'x', name: 'Old', createdAt: 0 }], currentId: 'x' }
    localStorage.setItem('pop:save', JSON.stringify(legacy))
    const chars = character.getCharacters()
    expect(chars[0].maxLife).toBe(100)
    expect(chars[0].maxMana).toBe(100)
    expect(chars[0].currentLife).toBe(100)
    expect(chars[0].currentMana).toBe(100)
  })
})
