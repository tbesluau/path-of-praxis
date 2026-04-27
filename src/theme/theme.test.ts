import { describe, it, expect } from 'vitest'
import { tokens } from './tokens'

const hexColor = /^#[0-9a-f]{6}$/i
const pxValue = /^\d+px$/

describe('theme tokens', () => {
  it('exports valid hex colour values', () => {
    for (const [key, val] of Object.entries(tokens.color)) {
      if (typeof val === 'string' && val.startsWith('#')) {
        expect(val, `color.${key}`).toMatch(hexColor)
      }
    }
  })

  it('includes Cinzel in display font stack', () => {
    expect(tokens.font.display).toContain('Cinzel')
  })

  it('includes a serif body font', () => {
    expect(tokens.font.body).toContain('serif')
  })

  it('exports spacing values as px strings', () => {
    for (const [key, val] of Object.entries(tokens.spacing)) {
      expect(val, `spacing.${key}`).toMatch(pxValue)
    }
  })

  it('exports radius values as px strings', () => {
    for (const [key, val] of Object.entries(tokens.radius)) {
      if (key !== 'full') expect(val, `radius.${key}`).toMatch(pxValue)
    }
  })

  it('applyTheme writes custom properties onto :root', async () => {
    const { applyTheme } = await import('./index')
    applyTheme()
    const style = document.documentElement.style
    expect(style.getPropertyValue('--color-primary')).toBe(tokens.color.primary)
    expect(style.getPropertyValue('--font-display')).toBe(tokens.font.display)
    expect(style.getPropertyValue('--space-md')).toBe(tokens.spacing.md)
  })
})
