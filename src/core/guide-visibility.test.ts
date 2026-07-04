import { describe, it, expect } from 'vitest'
import { hiddenGuideSectionIds } from './guide-visibility'

const base = {
  ascentCount: 0, transcendCount: 0, transcendReady: false,
  relics: [] as string[], enemyMaxLevel: 1, fullMastery: false,
}

describe('hiddenGuideSectionIds', () => {
  it('hides all gated sections for a fresh character', () => {
    expect(hiddenGuideSectionIds(base).sort()).toEqual(
      ['Action Triggers', 'Artifacts', 'Ascent', 'Transcendence'],
    )
  })

  it('reveals Ascent once the ascent requirement is reached or ascended', () => {
    expect(hiddenGuideSectionIds({ ...base, enemyMaxLevel: 30 })).not.toContain('Ascent')
    expect(hiddenGuideSectionIds({ ...base, ascentCount: 1 })).not.toContain('Ascent')
  })

  it('reveals Action Triggers at slot-2 ascent or via the extraTrigger relic', () => {
    expect(hiddenGuideSectionIds({ ...base, ascentCount: 3 })).not.toContain('Action Triggers')
    expect(hiddenGuideSectionIds({ ...base, relics: ['extraTrigger'] })).not.toContain('Action Triggers')
  })

  it('reveals Artifacts at ascent 5 or after transcending', () => {
    expect(hiddenGuideSectionIds({ ...base, ascentCount: 5 })).not.toContain('Artifacts')
    expect(hiddenGuideSectionIds({ ...base, transcendCount: 1 })).not.toContain('Artifacts')
  })

  it('reveals Transcendence when ready or after the first transcend', () => {
    expect(hiddenGuideSectionIds({ ...base, transcendReady: true })).not.toContain('Transcendence')
    expect(hiddenGuideSectionIds({ ...base, transcendCount: 1 })).not.toContain('Transcendence')
  })

  it('fullMastery reveals everything', () => {
    expect(hiddenGuideSectionIds({ ...base, fullMastery: true })).toEqual([])
  })
})
