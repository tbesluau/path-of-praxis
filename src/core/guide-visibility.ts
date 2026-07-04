// Which guide sections are hidden until their feature is unlocked / has
// happened once. Pure — callers pass a snapshot of the relevant progress.

import { balance } from '../config/balance'

export interface GuideVisibilitySnapshot {
  ascentCount: number
  transcendCount: number
  transcendReady: boolean
  relics: readonly string[]
  enemyMaxLevel: number
  fullMastery: boolean
}

export function hiddenGuideSectionIds(s: GuideVisibilitySnapshot): string[] {
  if (s.fullMastery) return []
  const hidden: string[] = []
  // Ascent: visible once ascended, or once the ascent bar has appeared
  // (enemy max level reached the current requirement).
  const requiredLevel = balance.ascent.requiredEnemyLevelBase + s.ascentCount * balance.ascent.requiredLevelStep
  if (s.ascentCount < 1 && s.enemyMaxLevel < requiredLevel) hidden.push('Ascent')
  // Action Triggers: visible once slot 2 unlocks (or via the extraTrigger relic).
  if (s.ascentCount < balance.ascent.slot2UnlockAscent && !s.relics.includes('extraTrigger')) hidden.push('Action Triggers')
  // Artifacts: visible once bosses can drop them (or grandfathered by transcendence).
  if (s.ascentCount < balance.ascent.artifactSlot1UnlockAscent && s.transcendCount < 1) hidden.push('Artifacts')
  // Transcendence: visible once transcended, or once the Transcend button is ready.
  if (s.transcendCount < 1 && !s.transcendReady) hidden.push('Transcendence')
  return hidden
}
