import { describe, it, expect, beforeEach } from 'vitest'

describe('save-code', () => {
  let character: typeof import('./character')
  let saveCode: typeof import('./save-code')

  beforeEach(async () => {
    localStorage.clear()
    character = await import('./character')
    saveCode = await import('./save-code')
  })

  it('round-trips a save through export and import', () => {
    const a = character.createCharacter('Alice', 'sword')
    character.createCharacter('Bob', 'fireball')
    character.loadCharacter(a.id)

    const code = saveCode.exportSaveCode()
    expect(code.startsWith('POP1')).toBe(true)

    localStorage.clear()
    expect(character.getCharacters()).toEqual([])

    expect(saveCode.importSaveCode(code)).toBe(true)
    const names = character.getCharacters().map(c => c.name).sort()
    expect(names).toEqual(['Alice', 'Bob'])
    expect(character.getCurrentId()).toBe(a.id)
  })

  it('preserves non-ASCII character names', () => {
    character.createCharacter('Élodie ✨', 'sword')
    const code = saveCode.exportSaveCode()
    localStorage.clear()
    expect(saveCode.importSaveCode(code)).toBe(true)
    expect(character.getCharacters()[0].name).toBe('Élodie ✨')
  })

  it('rejects malformed codes without touching existing data', () => {
    const c = character.createCharacter('Keeper', 'sword')
    expect(saveCode.importSaveCode('')).toBe(false)
    expect(saveCode.importSaveCode('not a real code')).toBe(false)
    expect(saveCode.importSaveCode('POP1' + btoa('{"v":2}'))).toBe(false)
    expect(saveCode.importSaveCode('POP1' + btoa('{"v":1,"save":{}}'))).toBe(false)
    // Existing save is untouched.
    expect(character.getCharacters().map(x => x.id)).toEqual([c.id])
  })

  it('tolerates whitespace introduced by line-wrapping on paste', () => {
    character.createCharacter('Wrapped', 'sword')
    const code = saveCode.exportSaveCode()
    const wrapped = code.replace(/(.{8})/g, '$1\n  ')
    localStorage.clear()
    expect(saveCode.importSaveCode(wrapped)).toBe(true)
    expect(character.getCharacters()[0].name).toBe('Wrapped')
  })
})
