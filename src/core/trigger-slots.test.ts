import { describe, it, expect } from 'vitest'
import { enforceUniqueSlots } from './trigger-slots'
import type { ExtraActionSlot } from './character'

describe('enforceUniqueSlots', () => {
  it('leaves a compliant configuration untouched', () => {
    const slots: ExtraActionSlot[] = [
      { actionId: 'fireball', triggerType: 'time' },
      { actionId: 'lightning', triggerType: 'mana' },
    ]
    expect(enforceUniqueSlots('sword', slots)).toBe(false)
    expect(slots).toEqual([
      { actionId: 'fireball', triggerType: 'time' },
      { actionId: 'lightning', triggerType: 'mana' },
    ])
  })

  it('clears a duplicated trigger type on the later slot', () => {
    const slots: ExtraActionSlot[] = [
      { actionId: 'fireball', triggerType: 'time' },
      { actionId: 'lightning', triggerType: 'time' },
    ]
    expect(enforceUniqueSlots('sword', slots)).toBe(true)
    expect(slots[0].triggerType).toBe('time')
    expect(slots[1].triggerType).toBeNull()
    expect(slots[1].actionId).toBe('lightning')   // action untouched
  })

  it('clears a duplicated action on the later slot', () => {
    const slots: ExtraActionSlot[] = [
      { actionId: 'fireball', triggerType: 'time' },
      { actionId: 'fireball', triggerType: 'mana' },
    ]
    expect(enforceUniqueSlots('sword', slots)).toBe(true)
    expect(slots[0].actionId).toBe('fireball')
    expect(slots[1].actionId).toBeNull()
    expect(slots[1].triggerType).toBe('mana')     // trigger untouched
  })

  it('clears an extra-slot action that duplicates the auto-attack action', () => {
    const slots: ExtraActionSlot[] = [
      { actionId: 'sword', triggerType: 'time' },
    ]
    expect(enforceUniqueSlots('sword', slots)).toBe(true)
    expect(slots[0].actionId).toBeNull()
    expect(slots[0].triggerType).toBe('time')
  })

  it('handles both violations at once and empty slots', () => {
    const slots: ExtraActionSlot[] = [
      { actionId: null, triggerType: null },
      { actionId: 'sword', triggerType: 'crit' },
      { actionId: 'fireball', triggerType: 'crit' },
    ]
    expect(enforceUniqueSlots('sword', slots)).toBe(true)
    expect(slots[1]).toEqual({ actionId: null, triggerType: 'crit' })
    expect(slots[2]).toEqual({ actionId: 'fireball', triggerType: null })
  })
})
