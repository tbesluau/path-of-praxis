// Localized content lookup for markdown-derived text (notes, guide, tutorials).
//
// Source of truth: the English markdown files in src/config/.
// Per-locale TypeScript modules in this directory map section IDs to translated
// strings. When a translation is missing the consumer falls back to the
// English source — so edits to the .md file propagate immediately to every
// locale, and translations can be filled in incrementally without breaking
// anything.

import type { Locale } from '..'
import releaseNotesRaw from '../../config/release-notes.md?raw'
import { notesFr } from './notes.fr'
import { notesEs } from './notes.es'
import { guideFr } from './guide.fr'
import { guideEs } from './guide.es'
import { tutorialsFr } from './tutorials.fr'
import { tutorialsEs } from './tutorials.es'
import { nodesFr } from './nodes.fr'
import { nodesEs } from './nodes.es'
import { nodesZh } from './nodes.zh'
import { nodesRu } from './nodes.ru'
import { releaseNotesFr } from './release-notes.fr'
import { releaseNotesEs } from './release-notes.es'
import { releaseNotesZh } from './release-notes.zh'
import { releaseNotesRu } from './release-notes.ru'

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

const NODES_BY_LOCALE: Partial<Record<Locale, Record<string, string>>> = {
  fr: nodesFr,
  es: nodesEs,
  zh: nodesZh,
  ru: nodesRu,
}

const RELEASE_NOTES_BY_LOCALE: Partial<Record<Locale, Record<string, string>>> = {
  fr: releaseNotesFr,
  es: releaseNotesEs,
  zh: releaseNotesZh,
  ru: releaseNotesRu,
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

export function getNodeDescTranslation(locale: Locale, key: string): string | undefined {
  return NODES_BY_LOCALE[locale]?.[key]
}

export function getLocalizedReleaseNotes(locale: Locale): string {
  const translations = RELEASE_NOTES_BY_LOCALE[locale]
  if (!translations) return releaseNotesRaw
  // Split into per-version blocks and substitute any that have a translation.
  // Each block starts with "### X.X.XX"; splitting on the lookahead keeps the
  // heading attached to its block rather than leaving it stranded.
  const blocks = releaseNotesRaw.split(/(?=^### )/m)
  return blocks.map(block => {
    const match = /^### (\S+)/.exec(block)
    if (match) {
      const version = match[1]
      const tr = translations[version]
      if (tr) return tr + '\n\n'
    }
    return block
  }).join('')
}
