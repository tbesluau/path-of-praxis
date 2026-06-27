import { describe, it, expect } from 'vitest'
import { getNoteTitle } from './notes'

// The buff bar (src/scenes/game.ts renderBuffBar) wires each clickable buff icon
// to a note via a hardcoded `data-note` slug. If a note heading is renamed the
// slug silently stops resolving and the icon becomes a dead click — guard the
// slugs the buff icons depend on.
describe('buff-bar note slugs resolve', () => {
  it.each(['green-veins', 'frozen-armor'])('%s note exists', (id) => {
    expect(getNoteTitle(id)).toBeTruthy()
  })
})
