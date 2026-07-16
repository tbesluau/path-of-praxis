import { describe, it, expect } from 'vitest'
import { computeRuneBonuses, unlockedSlotCount, SLOT_TYPES, SLOT_UNLOCK_LEVELS, runesByType } from './runes'

describe('key runes', () => {
  // Slots: [minor, major, minor, minor, major, key, source]
  const withKey = (id: 'keySplit' | 'keyHeavy' | 'keyManaless' | 'keyConsequences') =>
    computeRuneBonuses([null, null, null, null, null, id, null], 100)

  it('Split Action: double speed, 33% less damage', () => {
    const b = withKey('keySplit')
    expect(b.speedMore).toBe(2)
    expect(b.damageMore).toBeCloseTo(0.67)
  })

  it('Slow & Heavy: double damage, 33% less speed', () => {
    const b = withKey('keyHeavy')
    expect(b.damageMore).toBe(2)
    expect(b.speedMore).toBeCloseTo(0.67)
  })

  it('Manaless unchanged', () => {
    expect(withKey('keyManaless').manaless).toBe(true)
  })

  it('Consequences doubles affliction damage', () => {
    const b = withKey('keyConsequences')
    expect(b.afflictionDamageMult).toBe(2)
    expect(b.damageMore).toBe(1)
    expect(b.speedMore).toBe(1)
  })
})

describe('source-conversion slot (level 70)', () => {
  it('the 7th slot is a source slot unlocking at 70', () => {
    expect(SLOT_TYPES[6]).toBe('source')
    expect(SLOT_UNLOCK_LEVELS[6]).toBe(70)
    expect(unlockedSlotCount(69)).toBe(6)
    expect(unlockedSlotCount(70)).toBe(7)
  })

  it('offers all five sources', () => {
    expect(runesByType('source').map(r => r.id).sort()).toEqual(
      ['sourceCold', 'sourceFire', 'sourceLightning', 'sourcePhysical', 'sourceRot'],
    )
  })

  it('a slotted source rune sets convertSource, locked below level 70', () => {
    const selected = [null, null, null, null, null, null, 'sourceCold'] as Parameters<typeof computeRuneBonuses>[0]
    expect(computeRuneBonuses(selected, 70).convertSource).toBe('cold')
    expect(computeRuneBonuses(selected, 69).convertSource).toBeNull()
  })
})
