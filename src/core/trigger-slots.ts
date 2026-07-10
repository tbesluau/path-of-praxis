// Uniqueness rules for action-trigger slots: a trigger type can only be used
// by one slot, and an action can only be assigned to one slot (the auto-attack
// slot counts). Saves created before these rules may violate them — enforce
// in place, first occurrence wins, and report whether anything was cleared so
// the caller can notify the player.

import type { ExtraActionSlot, TriggerType } from './character'

export function enforceUniqueSlots(mainActionId: string, slots: ExtraActionSlot[]): boolean {
  let changed = false
  const usedTriggers = new Set<TriggerType>()
  const usedActions = new Set<string>([mainActionId])
  for (const slot of slots) {
    if (!slot) continue
    if (slot.triggerType) {
      if (usedTriggers.has(slot.triggerType)) { slot.triggerType = null; changed = true }
      else usedTriggers.add(slot.triggerType)
    }
    if (slot.actionId) {
      if (usedActions.has(slot.actionId)) { slot.actionId = null; changed = true }
      else usedActions.add(slot.actionId)
    }
  }
  return changed
}
