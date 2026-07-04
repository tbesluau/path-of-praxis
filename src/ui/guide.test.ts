import { describe, it, expect } from 'vitest'
import { mountGuideModal } from './settings'

// jsdom in this setup lacks CSS.escape (browsers have it) — minimal stub.
if (typeof CSS === 'undefined' || !CSS.escape) {
  ;(globalThis as { CSS?: { escape(s: string): string } }).CSS = {
    ...(globalThis as { CSS?: object }).CSS,
    escape: (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`),
  }
}
// jsdom has no layout — scrollIntoView is a no-op stub.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

function mount(openSection?: string, hidden?: string[]): HTMLElement {
  const parent = document.createElement('div')
  document.body.appendChild(parent)
  mountGuideModal(parent, () => {}, openSection, hidden)
  return parent
}

describe('guide modal', () => {
  it('clicking a note-link inside a section opens the note modal', () => {
    const parent = mount()
    const btn = parent.querySelector<HTMLElement>('.guide-section-btn[data-section-id="Afflictions"]')!
    btn.click()
    const link = parent.querySelector<HTMLElement>('.guide-section-body:not([hidden]) [data-note-id]')!
    expect(link).toBeTruthy()
    link.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(parent.querySelector('.note-backdrop')).toBeTruthy()
    parent.remove()
  })

  it('hides locked sections', () => {
    const parent = mount(undefined, ['Transcendence', 'Artifacts'])
    expect(parent.querySelector('[data-section-id="Transcendence"]')).toBeNull()
    expect(parent.querySelector('[data-section-id="Artifacts"]')).toBeNull()
    expect(parent.querySelector('[data-section-id="Masteries"]')).toBeTruthy()
    parent.remove()
  })

  it('an explicitly opened section shows even if listed as hidden', () => {
    const parent = mount('Transcendence', ['Transcendence'])
    expect(parent.querySelector('[data-section-id="Transcendence"]')).toBeTruthy()
    parent.remove()
  })

  it('Transcendence is the last section of the guide', () => {
    const parent = mount()
    const ids = Array.from(parent.querySelectorAll<HTMLElement>('[data-section-id]')).map(el => el.dataset['sectionId'])
    expect(ids[ids.length - 1]).toBe('Transcendence')
    parent.remove()
  })
})
