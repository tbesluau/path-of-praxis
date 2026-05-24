// Localized content lookup for markdown-derived text (notes, guide, tutorials).
//
// Source of truth: the English markdown files in src/config/.
// Per-locale TypeScript modules in this directory map section IDs to translated
// strings. When a translation is missing the consumer falls back to the
// English source — so edits to the .md file propagate immediately to every
// locale, and translations can be filled in incrementally without breaking
// anything.

import type { Locale } from '..'
import { notesFr } from './notes.fr'
import { notesEs } from './notes.es'
import { guideFr } from './guide.fr'
import { guideEs } from './guide.es'
import { tutorialsFr } from './tutorials.fr'
import { tutorialsEs } from './tutorials.es'

export interface ContentBlock {
  title?: string
  body?:  string
}

type ContentMap = Record<string, ContentBlock>

const NOTES_BY_LOCALE: Partial<Record<Locale, ContentMap>> = {
  fr: notesFr,
  es: notesEs,
}

const GUIDE_BY_LOCALE: Partial<Record<Locale, ContentMap>> = {
  fr: guideFr,
  es: guideEs,
}

const TUTORIALS_BY_LOCALE: Partial<Record<Locale, Record<string, string>>> = {
  fr: tutorialsFr,
  es: tutorialsEs,
}

export function getNoteTranslation(locale: Locale, id: string): ContentBlock | undefined {
  return NOTES_BY_LOCALE[locale]?.[id]
}

export function getGuideTranslation(locale: Locale, id: string): ContentBlock | undefined {
  return GUIDE_BY_LOCALE[locale]?.[id]
}

export function getTutorialTranslation(locale: Locale, key: string): string | undefined {
  return TUTORIALS_BY_LOCALE[locale]?.[key]
}
