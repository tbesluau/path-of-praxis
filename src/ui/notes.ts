import notesRaw from '../config/notes.md?raw'
import { getLocale, t, type Locale } from '../i18n'
import { getNoteTranslation } from '../i18n/content'
import { playSound } from '../audio'

// ── Types ──────────────────────────────────────────────────────────────────

interface NoteEntry {
  id:    string
  title: string
  body:  string
}

// ── Note registry ──────────────────────────────────────────────────────────

function parseNotes(raw: string): Map<string, NoteEntry> {
  const map = new Map<string, NoteEntry>()
  for (const section of raw.split(/\n---\n/)) {
    const trimmed = section.trim()
    if (!trimmed) continue
    const firstLine = trimmed.split('\n')[0]
    if (!firstLine.startsWith('## ')) continue
    const title = firstLine.slice(3).trim()
    const id    = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const body  = trimmed.slice(firstLine.length).trim()
    map.set(id, { id, title, body })
  }
  return map
}

// English source-of-truth registry. The structure (IDs and ordering) always
// comes from notes.md; translations only override the title/body strings.
const NOTES_EN = parseNotes(notesRaw)

function getNote(id: string): NoteEntry | undefined {
  const base = NOTES_EN.get(id)
  if (!base) return undefined
  const tr = getNoteTranslation(getLocale(), id)
  if (!tr) return base
  return {
    id,
    title: tr.title ?? base.title,
    body:  tr.body  ?? base.body,
  }
}

/** Localized display title for a note, or undefined if the note doesn't exist. */
export function getNoteTitle(id: string): string | undefined {
  return getNote(id)?.title
}

// ── Linkification ─────────────────────────────────────────────────────────

interface NoteTerm {
  id:      string
  pattern: RegExp
}

// Ordered longest-first so multi-word phrases match before single words.
// Multi-word patterns must precede any of their constituent single words
// (e.g. 'burning-ground' before 'burn', 'resistance-breaking' before 'resistance').
const NOTE_TERMS_EN: NoteTerm[] = [
  { id: 'additional-projectile', pattern: /\bAdditional Projectiles?\b/gi },
  { id: 'additional-target',     pattern: /\bAdditional Targets?\b/gi },
  { id: 'resistance-breaking',   pattern: /\bResistance Breaking\b/gi },
  { id: 'burning-ground',        pattern: /\bBurning Ground\b/gi },
  { id: 'ignore-mitigation',     pattern: /\bIgnore(?:s|d|ing)? (?:all )?(?:enemy )?(?:damage )?mitigation\b/gi },
  { id: 'feeding-frenzy',        pattern: /\bFeeding Frenzy\b/gi },
  { id: 'frozen-armor',          pattern: /\bFrozen Armor\b/gi },
  { id: 'critical-hit',          pattern: /\bCritical Hits?\b/gi },
  { id: 'mana-shield',           pattern: /\bMana Shield\b/gi },
  { id: 'mana-steal',            pattern: /\bMana Steal\b/gi },
  { id: 'second-action',          pattern: /\bSecond Actions?\b/g },
  { id: 'double-damage',         pattern: /\bDouble Damage\b/gi },
  { id: 'double-action',         pattern: /\bDouble Action(?:s|ing)?\b/gi },
  { id: 'multi-action',          pattern: /\bMulti-actions?\b/gi },
  { id: 'life-steal',            pattern: /\bLife Steal\b/gi },
  { id: 'action-speed',           pattern: /\bAction Speed\b/gi },
  { id: 'affliction',            pattern: /\bAfflictions?\b/gi },
  { id: 'immolation',            pattern: /\bImmolation\b/gi },
  { id: 'bloodlust',             pattern: /\bBloodlust\b/gi },
  { id: 'electrified',           pattern: /\bElectrified\b/gi },
  { id: 'electrocution',         pattern: /\bElectrocuted?\b/gi },
  { id: 'frost',                 pattern: /\bFrost(?:ed)?\b/gi },
  { id: 'shatter',               pattern: /\bShatters?\b/gi },
  { id: 'champion',              pattern: /\bChampions?\b/gi },
  { id: 'boss',                  pattern: /\bBoss(?:es)?\b/gi },
  { id: 'frenzy',                pattern: /\bFrenzy\b/gi },
  { id: 'bleed',                 pattern: /\bBleeds?\b/gi },
  { id: 'block',                 pattern: /\bBlock(?:s|ed|ing)?\b/gi },
  { id: 'area',                  pattern: /\bAreas?\b/gi },
  { id: 'knockback',             pattern: /\bKnockbacks?\b/gi },
  { id: 'tremor',                pattern: /\bTremors?\b/gi },
  { id: 'increased',             pattern: /\bIncreased\b/gi },
  { id: 'effect',                pattern: /\bEffects?\b/gi },
  { id: 'status',                pattern: /\bStatus(?:es)?\b/gi },
  { id: 'trance',                pattern: /\bTrance\b/gi },
  { id: 'strong',                pattern: /\bStrong\b/gi },
  { id: 'elite',                 pattern: /\bElite\b/gi },
  { id: 'burn',                  pattern: /\bBurn(?:ing)?\b/gi },
  { id: 'jump',                  pattern: /\bJumps?\b/gi },
  { id: 'more',                  pattern: /\bMore\b/gi },
  { id: 'resistance',            pattern: /\bResistances?\b/gi },
  { id: 'mitigation',            pattern: /\bMitigations?\b/gi },
  { id: 'hit',                   pattern: /\b(?:per hit|direct hit|action hit damage|hit damage|on hit)\b/gi },
  { id: 'dash',                  pattern: /\bDash(?:es|ing)?\b/gi },
  { id: 'kite',                  pattern: /\bKites?(?:ing)?\b/gi },
]

// French note terms — same IDs as English so click-through still works,
// but patterns match the translated phrasing used in notes.fr/guide.fr.
const NOTE_TERMS_FR: NoteTerm[] = [
  { id: 'additional-projectile', pattern: /\bProjectiles? supplémentaires?\b/gi },
  { id: 'additional-target',     pattern: /\bCibles? supplémentaires?\b/gi },
  { id: 'resistance-breaking',   pattern: /\b(?:Brise|Bris de)[ -]résistance\b/gi },
  { id: 'burning-ground',        pattern: /\bSol enflammé\b/gi },
  { id: 'ignore-mitigation',     pattern: /\b(?:Ignore|Ignorer|Ignorant)(?: toute)?(?: la)? (?:mitigation|atténuation)\b/gi },
  { id: 'feeding-frenzy',        pattern: /\bFrénésie alimentaire\b/gi },
  { id: 'frozen-armor',          pattern: /\bArmure de glace\b/gi },
  { id: 'critical-hit',          pattern: /\b(?:Coups? critiques?|Critiques?)\b/gi },
  { id: 'mana-shield',           pattern: /\bBouclier de mana\b/gi },
  { id: 'mana-steal',            pattern: /\bVol de mana\b/gi },
  { id: 'second-action',         pattern: /\b(?:Seconde|Deuxième) actions?\b/gi },
  { id: 'double-damage',         pattern: /\bDégâts doubles\b/gi },
  { id: 'double-action',         pattern: /\bDouble actions?\b/gi },
  { id: 'multi-action',          pattern: /\bMulti-actions?\b/gi },
  { id: 'life-steal',            pattern: /\bVol de vie\b/gi },
  { id: 'action-speed',          pattern: /\bVitesse d'action\b/gi },
  { id: 'affliction',            pattern: /\bAfflictions?\b/gi },
  { id: 'immolation',            pattern: /\bImmolation\b/gi },
  { id: 'bloodlust',             pattern: /\bSoif de sang\b/gi },
  { id: 'electrified',           pattern: /\bÉlectrifié(?:e|s|es)?\b/gi },
  { id: 'electrocution',         pattern: /\bÉlectrocuté(?:e|s|es)?\b/gi },
  { id: 'frost',                 pattern: /\bGivr(?:e|é|ée|és|ées)\b/gi },
  { id: 'shatter',               pattern: /\bFracas\b/gi },
  { id: 'champion',              pattern: /\bChampions?\b/gi },
  { id: 'boss',                  pattern: /\bBoss\b/gi },
  { id: 'frenzy',                pattern: /\bFrénésie\b/gi },
  { id: 'bleed',                 pattern: /\bSaignements?\b/gi },
  { id: 'block',                 pattern: /\b(?:Blocages?|Bloqu(?:é(?:e|s|es)?|er))\b/gi },
  { id: 'area',                  pattern: /\bZones?\b/gi },
  { id: 'knockback',             pattern: /\bRepoussements?\b/gi },
  { id: 'tremor',                pattern: /\bSecousses?\b/gi },
  { id: 'increased',             pattern: /\bAugmenté(?:e|s|es)?\b/gi },
  { id: 'effect',                pattern: /\bEffets?\b/gi },
  { id: 'status',                pattern: /\b(?:Status|Statuts?)\b/gi },
  { id: 'trance',                pattern: /\bTranse\b/gi },
  { id: 'strong',                pattern: /\bRobustes?\b/gi },
  { id: 'elite',                 pattern: /\bÉlites?\b/gi },
  { id: 'burn',                  pattern: /\bBrûlures?\b/gi },
  { id: 'jump',                  pattern: /\bSauts?\b/gi },
  { id: 'more',                  pattern: /\bSupplémentaire\b/gi },
  { id: 'resistance',            pattern: /\bRésistances?\b/gi },
  { id: 'mitigation',            pattern: /\b(?:Mitigation|Atténuation)\b/gi },
  { id: 'hit',                   pattern: /\b(?:par coup|coup direct|dégâts? au coup|aux coups)\b/gi },
  { id: 'dash',                  pattern: /\b(?:Charges?|Dash)\b/gi },
  { id: 'kite',                  pattern: /\bKite(?:s|r|ing)?\b/gi },
]

// Spanish note terms — same IDs as English.
const NOTE_TERMS_ES: NoteTerm[] = [
  { id: 'additional-projectile', pattern: /\bProyectiles? adicionales?\b/gi },
  { id: 'additional-target',     pattern: /\bObjetivos? adicionales?\b/gi },
  { id: 'resistance-breaking',   pattern: /\b(?:Quiebra|Rotura) de resistencia\b/gi },
  { id: 'burning-ground',        pattern: /\bSuelo ardiente\b/gi },
  { id: 'ignore-mitigation',     pattern: /\b(?:Ignora|Ignorar|Ignorando)(?: toda)?(?: la)? mitigación\b/gi },
  { id: 'feeding-frenzy',        pattern: /\bFrenesí alimentario\b/gi },
  { id: 'frozen-armor',          pattern: /\bArmadura helada\b/gi },
  { id: 'critical-hit',          pattern: /\b(?:Golpes? críticos?|Críticos?)\b/gi },
  { id: 'mana-shield',           pattern: /\bEscudo de maná\b/gi },
  { id: 'mana-steal',            pattern: /\bRobo de maná\b/gi },
  { id: 'second-action',         pattern: /\bSegunda acción\b/gi },
  { id: 'double-damage',         pattern: /\bDaño doble\b/gi },
  { id: 'double-action',         pattern: /\bAcción doble\b/gi },
  { id: 'multi-action',          pattern: /\bMulti-?acciones?\b/gi },
  { id: 'life-steal',            pattern: /\bRobo de vida\b/gi },
  { id: 'action-speed',          pattern: /\bVelocidad de acción\b/gi },
  { id: 'affliction',            pattern: /\bAflicciones?\b/gi },
  { id: 'immolation',            pattern: /\bInmolación\b/gi },
  { id: 'bloodlust',             pattern: /\bSed de sangre\b/gi },
  { id: 'electrified',           pattern: /\bElectrificad(?:o|a|os|as)\b/gi },
  { id: 'electrocution',         pattern: /\bElectrocutad(?:o|a|os|as)\b/gi },
  { id: 'frost',                 pattern: /\b(?:Escarchad(?:o|a|os|as)|Escarcha)\b/gi },
  { id: 'shatter',               pattern: /\bFractura\b/gi },
  { id: 'champion',              pattern: /\bCampe(?:ón|ones)\b/gi },
  { id: 'boss',                  pattern: /\bJefes?\b/gi },
  { id: 'frenzy',                pattern: /\bFrenesí\b/gi },
  { id: 'bleed',                 pattern: /\bSangrad(?:o|os)\b/gi },
  { id: 'block',                 pattern: /\b(?:Bloqueos?|Bloquead(?:o|a|os|as)|Bloquear)\b/gi },
  { id: 'area',                  pattern: /\bÁreas?\b/gi },
  { id: 'knockback',             pattern: /\bRetrocesos?\b/gi },
  { id: 'tremor',                pattern: /\bTemblores?\b/gi },
  { id: 'increased',             pattern: /\bAumentad(?:o|a|os|as)\b/gi },
  { id: 'effect',                pattern: /\bEfectos?\b/gi },
  { id: 'status',                pattern: /\bEstados?\b/gi },
  { id: 'trance',                pattern: /\bTrance\b/gi },
  { id: 'strong',                pattern: /\bFuertes?\b/gi },
  { id: 'elite',                 pattern: /\bÉlites?\b/gi },
  { id: 'burn',                  pattern: /\b(?:Quemadura|Quemaduras|Quemando)\b/gi },
  { id: 'jump',                  pattern: /\bSaltos?\b/gi },
  { id: 'more',                  pattern: /\bMás\b/gi },
  { id: 'resistance',            pattern: /\bResistencias?\b/gi },
  { id: 'mitigation',            pattern: /\bMitigación\b/gi },
  { id: 'hit',                   pattern: /\b(?:por golpe|golpe directo|daño por golpe|al golpear)\b/gi },
  { id: 'dash',                  pattern: /\b(?:Embestidas?|Dash)\b/gi },
  { id: 'kite',                  pattern: /\bKite(?:s|ar|ando)?\b/gi },
]

const NOTE_TERMS_BY_LOCALE: Record<Locale, NoteTerm[]> = {
  en: NOTE_TERMS_EN,
  fr: NOTE_TERMS_FR,
  es: NOTE_TERMS_ES,
  zh: [],
  ru: [],
}

// Apply a single pattern to an HTML string, protecting already-linked spans.
function applyTermPattern(html: string, term: NoteTerm): string {
  const parts = html.split(/(<[^>]*>)/g)
  const out: string[] = []
  let inNoteLink = 0

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (i % 2 === 1) {
      // HTML tag — track depth of note-link spans to protect their content
      if (/^<span[^>]+note-link/.test(part)) inNoteLink++
      else if (part === '</span>' && inNoteLink > 0) inNoteLink--
      out.push(part)
    } else {
      out.push(
        inNoteLink > 0
          ? part
          : part.replace(term.pattern,
              (m) => `<span class="note-link" data-note-id="${term.id}">${m}</span>`
            )
      )
    }
  }
  return out.join('')
}

function activeTerms(): NoteTerm[] {
  return NOTE_TERMS_BY_LOCALE[getLocale()] ?? NOTE_TERMS_EN
}

// Escape plain text for safe HTML insertion, then apply note-term linkification.
// Pass excludeId to suppress self-links inside a note modal.
export function linkifyNoteTerms(plainText: string, excludeId?: string): string {
  let html = plainText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  for (const term of activeTerms()) {
    if (term.id === excludeId) continue
    html = applyTermPattern(html, term)
  }
  return html
}

// Apply linkification to an already-safe HTML string (e.g. rendered markdown body).
export function linkifyHtml(html: string, excludeIds?: string | readonly string[]): string {
  const excluded = new Set(
    Array.isArray(excludeIds) ? excludeIds : excludeIds ? [excludeIds as string] : []
  )
  let result = html
  for (const term of activeTerms()) {
    if (excluded.has(term.id)) continue
    result = applyTermPattern(result, term)
  }
  return result
}

// ── Minimal Markdown renderer ──────────────────────────────────────────────

function inline(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
}

function renderMarkdown(md: string): string {
  const lines  = md.split('\n')
  const chunks: string[] = []
  const listItems: string[] = []
  const paraLines: string[] = []

  const flushList = (): void => {
    if (listItems.length === 0) return
    chunks.push(`<ul>${listItems.map(li => `<li>${li}</li>`).join('')}</ul>`)
    listItems.length = 0
  }
  const flushPara = (): void => {
    if (paraLines.length === 0) return
    chunks.push(`<p>${paraLines.join(' ')}</p>`)
    paraLines.length = 0
  }

  for (const line of lines) {
    const t = line.trim()
    if (t === '') {
      flushList(); flushPara()
    } else if (t.startsWith('- ')) {
      flushPara()
      listItems.push(inline(t.slice(2)))
    } else {
      flushList()
      paraLines.push(inline(t))
    }
  }
  flushList(); flushPara()

  return chunks.join('')
}

// ── Note Modal ─────────────────────────────────────────────────────────────

export function mountNoteModal(
  parent:  HTMLElement,
  noteId:  string,
  onClose: () => void,
): () => void {
  const entry = getNote(noteId)
  if (!entry) return () => undefined

  const bodyHtml = linkifyHtml(renderMarkdown(entry.body), noteId)

  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop note-backdrop'
  backdrop.innerHTML = `
    <div class="modal-panel note-panel" role="dialog" aria-modal="true" aria-labelledby="note-title">
      <button class="modal-close-btn" data-action="close" aria-label="${t('settings', 'close')}"></button>
      <h2 class="modal-title note-title" id="note-title">${entry.title}</h2>
      <div class="note-body">${bodyHtml}</div>
    </div>
  `
  playSound('modal.open')
  parent.appendChild(backdrop)

  let subCleanup: (() => void) | null = null
  const closeSub = (): void => { if (subCleanup) { subCleanup(); subCleanup = null } }

  backdrop.addEventListener('click', (e) => {
    const link = (e.target as HTMLElement).closest<HTMLElement>('[data-note-id]')
    if (link) {
      const id = link.dataset.noteId!
      e.stopPropagation()
      // Navigate to the new note, replacing the current one.
      closeSub()
      subCleanup = mountNoteModal(parent, id, () => { subCleanup = null })
      return
    }
    if (e.target === backdrop) dismiss()
  })

  const dismiss = (): void => { playSound('modal.close'); closeSub(); backdrop.remove(); onClose() }
  backdrop.querySelector<HTMLButtonElement>('[data-action="close"]')!
    .addEventListener('click', dismiss)

  return () => { closeSub(); backdrop.remove() }
}
