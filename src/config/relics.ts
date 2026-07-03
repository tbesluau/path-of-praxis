// Relics — permanent boons chosen when Transcending. Each relic can be owned
// exactly once; they survive every reset layer (rebirth, ascent, transcend).

import { balance } from './balance'

export type RelicId = 'freeRebirth' | 'multiAscend' | 'extraTrigger' | 'onslaught'

export const ALL_RELICS: readonly RelicId[] = ['freeRebirth', 'multiAscend', 'extraTrigger', 'onslaught']

export function isRelicId(x: unknown): x is RelicId {
  return typeof x === 'string' && (ALL_RELICS as readonly string[]).includes(x)
}

/**
 * multiAscend relic: how many ascent counts a single Ascend grants. The
 * reachable count is the largest N whose required enemy level
 * (base + (N−1)·step) fits within maxEnemyLevel − margin; never below 1
 * (the normal single ascent).
 * Example: maxLevel 56, count 2 → (56−5−30)/5+1 = 5 → gain 3.
 */
export function ascentsGainedFor(maxEnemyLevel: number, ascentCount: number): number {
  const lvl = maxEnemyLevel - balance.transcend.multiAscendMargin
  const maxN = Math.floor((lvl - balance.ascent.requiredEnemyLevelBase) / balance.ascent.requiredLevelStep) + 1
  return Math.max(1, maxN - ascentCount)
}
