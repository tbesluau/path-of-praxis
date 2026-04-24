import { describe, it, expect, beforeEach } from 'vitest'
import { t, setLocale, initI18n } from './index'

describe('i18n', () => {
  beforeEach(() => setLocale('en'))

  it('returns correct English translations', () => {
    expect(t('game', 'title')).toBe('Path of Praxis')
    expect(t('game', 'subtitle')).toBe('Forge your path')
    expect(t('menu', 'play')).toBe('Play')
    expect(t('menu', 'ladder')).toBe('Ladder')
    expect(t('menu', 'options')).toBe('Options')
  })

  it('switches locale to French', () => {
    setLocale('fr')
    expect(t('menu', 'play')).toBe('Jouer')
    expect(t('menu', 'ladder')).toBe('Classement')
    expect(t('game', 'subtitle')).toBe('Forge ta voie')
  })

  it('falls back to English for unknown browser locale', () => {
    Object.defineProperty(navigator, 'language', { value: 'ja', configurable: true })
    initI18n()
    expect(t('menu', 'play')).toBe('Play')
  })

  it('detects French from browser locale', () => {
    Object.defineProperty(navigator, 'language', { value: 'fr-FR', configurable: true })
    initI18n()
    expect(t('menu', 'play')).toBe('Jouer')
    setLocale('en')
  })
})
