import { en, type TranslationSchema } from './locales/en'
import { fr } from './locales/fr'
import { es } from './locales/es'
import { zh } from './locales/zh'
import { ru } from './locales/ru'

export type Locale = 'en' | 'fr' | 'es' | 'zh' | 'ru'

export const SUPPORTED_LOCALES: readonly Locale[] = ['en', 'fr', 'es', 'zh', 'ru']

const locales: Record<Locale, TranslationSchema> = { en, fr, es, zh, ru }
const LOCALE_STORAGE_KEY = 'pop:locale'

let active: TranslationSchema = en
let activeLocale: Locale = 'en'

function loadStoredLocale(): Locale | null {
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY)
    return raw && raw in locales ? (raw as Locale) : null
  } catch { return null }
}

export function initI18n(): void {
  const stored = loadStoredLocale()
  if (stored) {
    activeLocale = stored
  } else {
    const lang = navigator.language.slice(0, 2)
    activeLocale = lang in locales ? (lang as Locale) : 'en'
  }
  active = locales[activeLocale]
}

export function setLocale(locale: Locale): void {
  activeLocale = locale
  active = locales[locale]
  try { localStorage.setItem(LOCALE_STORAGE_KEY, locale) } catch { /* storage disabled */ }
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
