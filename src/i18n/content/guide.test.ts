import { describe, it, expect } from 'vitest'
import guideRaw from '../../config/guide.md?raw'
import { guideFr } from './guide.fr'
import { guideEs } from './guide.es'
import { guideZh } from './guide.zh'
import { guideRu } from './guide.ru'

// Section IDs are the English "## " headings in guide.md — the stable keys
// every locale map must cover for the guide to be fully localized.
const sectionIds = guideRaw
  .split('\n')
  .filter(l => l.startsWith('## '))
  .map(l => l.slice(3).trim())

const GUIDES = { fr: guideFr, es: guideEs, zh: guideZh, ru: guideRu }

describe('guide translations', () => {
  it('parses sections out of guide.md', () => {
    expect(sectionIds.length).toBeGreaterThan(0)
  })

  for (const [locale, map] of Object.entries(GUIDES)) {
    it(`${locale} translates every guide section (title and body)`, () => {
      for (const id of sectionIds) {
        const block = map[id]
        expect(block, `missing section "${id}" in ${locale}`).toBeDefined()
        expect(block.title, `missing title for "${id}" in ${locale}`).toBeTruthy()
        expect(block.body, `missing body for "${id}" in ${locale}`).toBeTruthy()
      }
    })

    it(`${locale} has no stale section keys`, () => {
      for (const key of Object.keys(map)) {
        expect(sectionIds, `stale section "${key}" in ${locale}`).toContain(key)
      }
    })
  }
})
