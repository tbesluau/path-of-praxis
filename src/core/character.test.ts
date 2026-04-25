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

  it('creates a character with default stats', () => {
    const c = character.createCharacter('Alice')
    expect(c.name).toBe('Alice')
    expect(c.id).toBeTruthy()
    expect(c.maxLife).toBe(100)
    expect(c.maxMana).toBe(100)
    expect(character.getCharacters()).toHaveLength(1)
    expect(character.getCurrentId()).toBe(c.id)
    expect(character.getCurrentCharacter()?.name).toBe('Alice')
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

  it('normalises legacy saves missing maxLife/maxMana', () => {
    const legacy = { characters: [{ id: 'x', name: 'Old', createdAt: 0 }], currentId: 'x' }
    localStorage.setItem('pop:save', JSON.stringify(legacy))
    const chars = character.getCharacters()
    expect(chars[0].maxLife).toBe(100)
    expect(chars[0].maxMana).toBe(100)
  })
})
