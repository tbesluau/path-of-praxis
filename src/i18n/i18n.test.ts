import { describe, it, expect, beforeEach } from 'vitest'
import { t, setLocale, initI18n } from './index'

describe('i18n', () => {
  beforeEach(() => setLocale('en'))

  it('returns correct English translations', () => {
    expect(t('game', 'title')).toBe('Path of Praxis')
    expect(t('game', 'subtitle')).toBe('Theorycraft your Incremental auto-battler')
    expect(t('menu', 'continue')).toBe('Continue')
    expect(t('menu', 'characters')).toBe('Characters')
    expect(t('menu', 'about')).toBe('About')
  })

  it('switches locale to French', () => {
    setLocale('fr')
    expect(t('menu', 'continue')).toBe('Continuer')
    expect(t('menu', 'about')).toBe('À propos')
    expect(t('game', 'subtitle')).toBe('Theorycrafte ton auto-battler incrémental')
  })

  it('falls back to English for unknown browser locale', () => {
    Object.defineProperty(navigator, 'language', { value: 'ja', configurable: true })
    initI18n()
    expect(t('menu', 'continue')).toBe('Continue')
  })

  it('detects French from browser locale', () => {
    Object.defineProperty(navigator, 'language', { value: 'fr-FR', configurable: true })
    initI18n()
    expect(t('menu', 'continue')).toBe('Continuer')
    setLocale('en')
  })

  it('switches locale to Spanish', () => {
    setLocale('es')
    expect(t('menu', 'continue')).toBe('Continuar')
    expect(t('menu', 'about')).toBe('Acerca de')
    expect(t('settings', 'langEs')).toBe('Español')
  })

  it('detects Spanish from browser locale', () => {
    Object.defineProperty(navigator, 'language', { value: 'es-ES', configurable: true })
    initI18n()
    expect(t('menu', 'continue')).toBe('Continuar')
    setLocale('en')
  })
})
