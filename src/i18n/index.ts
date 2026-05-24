import { en, type TranslationSchema } from './locales/en'
import { fr } from './locales/fr'
import { es } from './locales/es'

export type Locale = 'en' | 'fr' | 'es'

export const SUPPORTED_LOCALES: readonly Locale[] = ['en', 'fr', 'es']

const locales: Record<Locale, TranslationSchema> = { en, fr, es }

let active: TranslationSchema = en
let activeLocale: Locale = 'en'

export function initI18n(): void {
  const lang = navigator.language.slice(0, 2)
  activeLocale = lang in locales ? (lang as Locale) : 'en'
  active = locales[activeLocale]
}

export function setLocale(locale: Locale): void {
  activeLocale = locale
  active = locales[locale]
}

export function getLocale(): Locale {
  return activeLocale
}

export function t<S extends keyof TranslationSchema>(
  section: S,
  key: keyof TranslationSchema[S] & string,
): string {
  return active[section][key] as string
}
