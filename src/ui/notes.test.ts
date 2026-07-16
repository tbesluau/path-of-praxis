import { describe, it, expect } from 'vitest'
import { getNoteTitle, linkifyNoteTerms } from './notes'

// The buff bar (src/scenes/game.ts renderBuffBar) wires each clickable buff icon
// to a note via a hardcoded `data-note` slug. If a note heading is renamed the
// slug silently stops resolving and the icon becomes a dead click — guard the
// slugs the buff icons depend on.
describe('buff-bar note slugs resolve', () => {
  it.each(['green-veins', 'frozen-armor'])('%s note exists', (id) => {
    expect(getNoteTitle(id)).toBeTruthy()
  })
})

describe('splash note linking', () => {
  it('the splash note exists', () => {
    expect(getNoteTitle('splash')).toBe('Splash')
  })

  it('the strike major descriptions link the term to the note', () => {
    expect(linkifyNoteTerms('Strikes have 10% increased chance to splash')).toContain('data-note-id="splash"')
  })
})

describe('block note linking', () => {
  it('the block note exists', () => {
    expect(getNoteTitle('block')).toBe('Block')
  })

  it('block-tree node descriptions link the term to the note', () => {
    // Representative Block-tree node descriptions.
    for (const desc of [
      '+4% increased chance to block hits',
      '+6% increased amount of damage blocked',
      'Blocked hits cannot trigger afflictions on you',
      '+100% increased block recovery speed',
    ]) {
      expect(linkifyNoteTerms(desc)).toContain('data-note-id="block"')
    }
  })
})
