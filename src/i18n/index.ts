import { en, type TranslationSchema } from './locales/en'
import { fr } from './locales/fr'

export type Locale = 'en' | 'fr'

const locales: Record<Locale, TranslationSchema> = { en, fr }

let active: TranslationSchema = en

export function initI18n(): void {
  const lang = navigator.language.slice(0, 2) as Locale
  active = locales[lang] ?? en
}

export function setLocale(locale: Locale): void {
  active = locales[locale]
}

export function t<S extends keyof TranslationSchema>(
  section: S,
  key: keyof TranslationSchema[S] & string,
): string {
  return active[section][key] as string
}
