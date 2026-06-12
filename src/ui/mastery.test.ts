import { describe, it, expect } from 'vitest'
import { generateMasterySaveString, parseMasterySaveString } from './mastery'
import type { MasteryProgress } from '../core/character'

const prog = (nodes: number[][], nodeHistory?: Array<[number, number]>): MasteryProgress =>
  ({ xp: 0, level: 20, nodes, nodeHistory })

describe('generateMasterySaveString', () => {
  it('replays the interleaved cross-tree assignment order within a mastery', () => {
    // Assigned: Fire Damage 1, then Burning 1, then Fire Damage 2.
    const fire = prog([[0, 1], [0], [], [], []], [[0, 0], [1, 0], [0, 1]])
    expect(generateMasterySaveString({ fire })).toBe('FD1, FB1, FD2')
  })

  it('emits masteries in canonical letter order regardless of key order', () => {
    const out = generateMasterySaveString({
      fire:   prog([[0], [], [], [], []], [[0, 0]]),
      action: prog([[0], [], [], [], []], [[0, 0]]),
    })
    expect(out).toBe('AD1, FD1')
  })

  it('returns null when a mastery with nodes has no history (legacy progress)', () => {
    expect(generateMasterySaveString({ fire: prog([[0], [], [], [], []]) })).toBeNull()
  })

  it('returns null when a history is incomplete', () => {
    const fire = prog([[0, 1], [], [], [], []], [[0, 0]])
    expect(generateMasterySaveString({ fire })).toBeNull()
  })

  it('ignores masteries with no assigned nodes even without history', () => {
    const out = generateMasterySaveString({
      fire: prog([[0], [], [], [], []], [[0, 0]]),
      mana: prog([[], [], [], [], []]),  // levelled but nothing assigned
    })
    expect(out).toBe('FD1')
  })

  it('returns an empty string when nothing is assigned anywhere', () => {
    expect(generateMasterySaveString({})).toBe('')
  })

  it('round-trips through parseMasterySaveString preserving per-mastery order', () => {
    const fire = prog(
      [[0, 1, 2], [0, 1], [], [], []],
      [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2]],
    )
    const str = generateMasterySaveString({ fire })!
    const parsed = parseMasterySaveString(str)!
    expect(parsed.get('fire')).toEqual([
      { treeIdx: 0, nodeIdx: 0 },
      { treeIdx: 1, nodeIdx: 0 },
      { treeIdx: 0, nodeIdx: 1 },
      { treeIdx: 1, nodeIdx: 1 },
      { treeIdx: 0, nodeIdx: 2 },
    ])
  })

  it('encodes key nodes from history (6a/6b notation)', () => {
    const fire = prog([[0], [], [], [], []], [[0, 0]])
    fire.nodes[0] = [0, 12]
    fire.nodeHistory = [[0, 0], [0, 12]]
    expect(generateMasterySaveString({ fire })).toBe('FD1, FD6a')
  })
})
