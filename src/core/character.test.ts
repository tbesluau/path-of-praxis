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

  it('creates a character with default stats and full starting resources', () => {
    const c = character.createCharacter('Alice', 'sword')
    expect(c.name).toBe('Alice')
    expect(c.id).toBeTruthy()
    expect(c.maxLife).toBe(200)
    expect(c.maxMana).toBe(100)
    expect(c.currentLife).toBe(200)
    expect(c.currentMana).toBe(100)
    expect(c.actionId).toBe('sword')
    expect(c.actionProgress).toEqual({})
    expect(c.lifeProgress).toEqual({ xp: 0, level: 1 })
    expect(c.manaProgress).toEqual({ xp: 0, level: 1 })
    expect(c.enemyProgress).toEqual({ xp: 0, level: 1, maxLevel: 1, autoLevel: false })
    expect(c.targetingMode).toBe('nearest')
    expect(c.masteryProgress).toEqual({})
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

  it('persists extra-slot trigger types, including mana', () => {
    const c = character.createCharacter('Triggers', 'sword')
    character.saveCharacterState(c.id, 100, 100, undefined, undefined, undefined,
      undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      undefined, undefined, [
        { actionId: 'zap', triggerType: 'mana' },
        { actionId: 'bow', triggerType: 'affliction' },
      ])
    const restored = character.getCharacters().find(x => x.id === c.id)!
    expect(restored.extraSlots).toEqual([
      { actionId: 'zap', triggerType: 'mana' },
      { actionId: 'bow', triggerType: 'affliction' },
    ])
  })

  it('normalizes unknown trigger types to null', () => {
    const c = character.createCharacter('BadTrigger', 'sword')
    character.saveCharacterState(c.id, 100, 100, undefined, undefined, undefined,
      undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      undefined, undefined, [
        { actionId: 'zap', triggerType: 'bogus' as never },
      ])
    const restored = character.getCharacters().find(x => x.id === c.id)!
    expect(restored.extraSlots).toEqual([{ actionId: 'zap', triggerType: null }])
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
    expect(chars[0].maxLife).toBe(200)
    expect(chars[0].maxMana).toBe(100)
    expect(chars[0].currentLife).toBe(200)
    expect(chars[0].currentMana).toBe(100)
    expect(chars[0].actionId).toBe('sword')
    expect(chars[0].actionProgress).toEqual({})
    expect(chars[0].lifeProgress).toEqual({ xp: 0, level: 1 })
    expect(chars[0].manaProgress).toEqual({ xp: 0, level: 1 })
    expect(chars[0].enemyProgress).toEqual({ xp: 0, level: 1, maxLevel: 1, autoLevel: false })
    expect(chars[0].targetingMode).toBe('nearest')
    expect(chars[0].masteryProgress).toEqual({})
  })

  it('scraps default to 0 on legacy saves and persist through saveCharacterState', () => {
    const legacy = { characters: [{ id: 'x', name: 'Old', createdAt: 0 }], currentId: 'x' }
    localStorage.setItem('pop:save', JSON.stringify(legacy))
    expect(character.getCharacters()[0].scraps).toBe(0)

    const c = character.createCharacter('Scrapper', 'sword')
    expect(c.scraps).toBe(0)
    character.saveCharacterState(
      c.id, 80, 60, undefined, undefined, undefined, undefined, undefined, undefined,
      undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      undefined, undefined, undefined, undefined, undefined, undefined, 7,
    )
    const restored = character.getCharacters().find(x => x.id === c.id)!
    expect(restored.scraps).toBe(7)
  })

  it('transcendence fields default safely on legacy saves and persist', () => {
    const legacy = { characters: [{ id: 'x', name: 'Old', createdAt: 0 }], currentId: 'x' }
    localStorage.setItem('pop:save', JSON.stringify(legacy))
    const c0 = character.getCharacters()[0]
    expect(c0.transcendCount).toBe(0)
    expect(c0.relics).toEqual([])
    expect(c0.transcendReady).toBe(false)

    const c = character.createCharacter('Transcender', 'sword')
    character.saveCharacterState(
      c.id, 80, 60, undefined, undefined, undefined, undefined, undefined, undefined,
      undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      2, ['freeRebirth', 'onslaught'], true,
    )
    const restored = character.getCharacters().find(x => x.id === c.id)!
    expect(restored.transcendCount).toBe(2)
    expect(restored.relics).toEqual(['freeRebirth', 'onslaught'])
    expect(restored.transcendReady).toBe(true)
  })

  it('normalize drops unknown relic ids and keeps equipped artifacts once transcended', () => {
    const art = (id: string, equipped: boolean) => ({
      id, equipped, createdAt: 0,
      lines: [{ positive: { kind: 'positive', type: 'globalMoreDamage', value: 10 }, negative: { kind: 'negative', type: 'damageTaken', value: 5 } }],
    })
    const data = {
      characters: [{
        id: 'x', name: 'T', createdAt: 0,
        transcendCount: 1, relics: ['freeRebirth', 'bogus', 42],
        ascentCount: 0,
        artifacts: [art('a', true), art('b', true)],
      }],
      currentId: 'x',
    }
    localStorage.setItem('pop:save', JSON.stringify(data))
    const c0 = character.getCharacters()[0]
    expect(c0.relics).toEqual(['freeRebirth'])
    // transcended → both equip slots grandfathered even at ascent 0
    expect(c0.artifacts.filter(a => a.equipped).length).toBe(2)
  })

  it('runProgress.blockXp defaults to 0 on legacy saves and survives normalize', () => {
    const legacy = {
      characters: [{ id: 'x', name: 'Old', createdAt: 0, runProgress: { actionXp: {}, lifeXp: 5, manaXp: 0, enemyXp: 0, distancePx: 0, critXp: 0 } }],
      currentId: 'x',
    }
    localStorage.setItem('pop:save', JSON.stringify(legacy))
    expect(character.getCharacters()[0].runProgress.blockXp).toBe(0)

    const withBlock = {
      characters: [{ id: 'y', name: 'Blocker', createdAt: 0, runProgress: { actionXp: {}, lifeXp: 0, manaXp: 0, enemyXp: 0, distancePx: 0, critXp: 0, blockXp: 42 } }],
      currentId: 'y',
    }
    localStorage.setItem('pop:save', JSON.stringify(withBlock))
    expect(character.getCharacters()[0].runProgress.blockXp).toBe(42)
  })

  it('masteryPointsSeen defaults to {} on legacy saves and persists', () => {
    const legacy = { characters: [{ id: 'x', name: 'Old', createdAt: 0 }], currentId: 'x' }
    localStorage.setItem('pop:save', JSON.stringify(legacy))
    expect(character.getCharacters()[0].masteryPointsSeen).toEqual({})

    const c = character.createCharacter('Seer', 'sword')
    expect(c.masteryPointsSeen).toEqual({})
    character.saveCharacterState(
      c.id, 80, 60, undefined, undefined, undefined, undefined, undefined, undefined,
      undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      undefined, undefined, undefined, { fire: 3, life: 1 },
    )
    const restored = character.getCharacters().find(x => x.id === c.id)!
    expect(restored.masteryPointsSeen).toEqual({ fire: 3, life: 1 })
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

  describe('masteryPointsAvailable', () => {
    it('returns earned minus spent (no free, no dump)', () => {
      const p = { xp: 0, level: 11, nodes: [[0, 1], [2], [], [], []] }
      // earned 10, spent 3 → 7 available
      expect(character.masteryPointsAvailable(p)).toBe(7)
    })

    it('includes free points used into the earned total', () => {
      const p = { xp: 0, level: 5, nodes: [[0], [], [], [], []] }
      // earned (4 levels - 1 spent) + 3 free = 6
      expect(character.masteryPointsAvailable(p, 3)).toBe(6)
    })

    it('subtracts dumped points from available', () => {
      const p = { xp: 0, level: 6, nodes: [[0, 1], [], [], [], []] }
      // earned 5, spent 2, dumped 2 → 1 available
      expect(character.masteryPointsAvailable(p, 0, 2)).toBe(1)
    })

    it('combines free and dump correctly', () => {
      const p = { xp: 0, level: 5, nodes: [[0], [], [], [], []] }
      // earned 4 + free 2 = 6 earned, spent 1, dumped 3 → 2 available
      expect(character.masteryPointsAvailable(p, 2, 3)).toBe(2)
    })

    it('weights node cost: major = 2, key = 3, small/strong = 1', () => {
      // node 0 small (1) + node 5 major (2) + node 12 key (3) = 6 spent
      const p = { xp: 0, level: 11, nodes: [[0, 5, 12], [], [], [], []] }
      // earned 10, spent 6 → 4 available
      expect(character.masteryPointsAvailable(p)).toBe(4)
    })
  })

  describe('computeAward', () => {
    it('discards short absences below the 10s award threshold', () => {
      // 99s away → 99/10 = 9.9s → floors to 9s → < 10s minimum → discarded
      expect(character.computeAward(99_000, 0)).toBe(0)
    })

    it('awards exactly 10s for a 100s absence', () => {
      expect(character.computeAward(100_000, 0)).toBe(10_000)
    })

    it('awards 6 minutes for a 1-hour absence', () => {
      expect(character.computeAward(60 * 60 * 1000, 0)).toBe(6 * 60 * 1000)
    })

    it('caps total stockpile at the 30-minute non-doubled cap', () => {
      // 10h away → /10 = 1h. Cap at 30m (the non-doubled ceiling).
      expect(character.computeAward(10 * 60 * 60 * 1000, 0)).toBe(30 * 60 * 1000)
    })

    it('returns 0 when already at the cap', () => {
      expect(character.computeAward(60 * 60 * 1000, 30 * 60 * 1000)).toBe(0)
    })

    it('rounds the earned amount down to whole seconds', () => {
      // 10500ms away → 1050ms → floor to seconds = 1000ms → <10s → discarded
      expect(character.computeAward(10_500, 0)).toBe(0)
      // 109_999ms away → 10999.9ms → floor to seconds = 10_000ms → exactly the threshold
      expect(character.computeAward(109_999, 0)).toBe(10_000)
    })

    it('respects remaining room under the cap', () => {
      // 1h away normally awards 6m. If current is cap - 1m, room = 1m, award clamped.
      const current = 30 * 60 * 1000 - 60_000
      expect(character.computeAward(60 * 60 * 1000, current)).toBe(60_000)
    })

    it('returns 0 for non-positive or invalid input', () => {
      expect(character.computeAward(0, 0)).toBe(0)
      expect(character.computeAward(-1000, 0)).toBe(0)
      expect(character.computeAward(NaN, 0)).toBe(0)
    })
  })

  describe('mastery node history', () => {
    const prog = (nodes: number[][], nodeHistory?: Array<[number, number]>) =>
      ({ xp: 0, level: 10, nodes, nodeHistory })

    it('masteryHistoryComplete is true when no nodes are assigned', () => {
      expect(character.masteryHistoryComplete(prog([[], [], [], [], []]))).toBe(true)
      expect(character.masteryHistoryComplete(prog([[], [], [], [], []], []))).toBe(true)
    })

    it('masteryHistoryComplete accepts a full interleaved history', () => {
      const p = prog([[0, 1], [0], [], [], []], [[0, 0], [1, 0], [0, 1]])
      expect(character.masteryHistoryComplete(p)).toBe(true)
    })

    it('masteryHistoryComplete rejects missing, short, duplicated, or mismatched histories', () => {
      const nodes = [[0, 1], [0], [], [], []]
      expect(character.masteryHistoryComplete(prog(nodes))).toBe(false)                                   // legacy: absent
      expect(character.masteryHistoryComplete(prog(nodes, [[0, 0], [1, 0]]))).toBe(false)                 // too short
      expect(character.masteryHistoryComplete(prog(nodes, [[0, 0], [0, 0], [1, 0]]))).toBe(false)         // duplicate
      expect(character.masteryHistoryComplete(prog(nodes, [[0, 0], [1, 0], [2, 5]]))).toBe(false)         // not assigned
    })

    it('masteryHistoryComplete rejects a non-empty history when no nodes are assigned', () => {
      expect(character.masteryHistoryComplete(prog([[], [], [], [], []], [[0, 0]]))).toBe(false)
    })

    it('normalize keeps a reconciling nodeHistory and drops a corrupt one', () => {
      character.importSaveData({
        currentId: 'h1',
        characters: [{
          id: 'h1', name: 'H', createdAt: 1,
          masteryProgress: {
            fire:   { xp: 0, level: 9, nodes: [[0, 1], [0], [], [], []], nodeHistory: [[0, 0], [1, 0], [0, 1]] },
            action: { xp: 0, level: 9, nodes: [[0, 1], [], [], [], []], nodeHistory: [[0, 0]] },  // length mismatch
          },
        }],
      })
      const c = character.getCharacters().find(x => x.id === 'h1')!
      expect(c.masteryProgress.fire?.nodeHistory).toEqual([[0, 0], [1, 0], [0, 1]])
      expect(c.masteryProgress.action?.nodeHistory).toBeUndefined()
    })
  })
})
