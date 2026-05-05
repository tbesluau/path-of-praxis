import notesRaw from '../config/notes.md?raw'

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

const NOTES = parseNotes(notesRaw)

// ── Linkification ─────────────────────────────────────────────────────────

// Ordered longest-first so multi-word phrases match before single words.
const NOTE_TERMS: { id: string; pattern: RegExp }[] = [
  { id: 'additional-projectile', pattern: /\bAdditional Projectiles?\b/gi },
  { id: 'additional-target',     pattern: /\bAdditional Targets?\b/gi },
  { id: 'feeding-frenzy',        pattern: /\bFeeding Frenzy\b/gi },
  { id: 'second-cast',           pattern: /\bSecond Casts?\b/g },
  { id: 'double-damage',         pattern: /\bDouble Damage\b/gi },
  { id: 'double-cast',           pattern: /\bDouble Cast(?:s|ing)?\b/gi },
  { id: 'multi-action',          pattern: /\bMulti-actions?\b/gi },
  { id: 'life-steal',            pattern: /\bLife Steal\b/gi },
  { id: 'affliction',            pattern: /\bAfflictions?\b/gi },
  { id: 'immolation',            pattern: /\bImmolation\b/gi },
  { id: 'increased',             pattern: /\bIncreased\b/gi },
  { id: 'effect',                pattern: /\bEffects?\b/gi },
  { id: 'status',                pattern: /\bStatus(?:es)?\b/gi },
  { id: 'trance',                pattern: /\bTrance\b/gi },
  { id: 'strong',                pattern: /\bStrong\b/gi },
  { id: 'elite',                 pattern: /\bElite\b/gi },
  { id: 'burn',                  pattern: /\bBurning?\b/gi },
  { id: 'electrocution',         pattern: /\bElectrocuted?\b/gi },
  { id: 'jump',                  pattern: /\bJumps?\b/gi },
  { id: 'more',                  pattern: /\bMore\b/gi },
  { id: 'cast-speed',            pattern: /\bCast Speed\b/gi },
  { id: 'resistance',            pattern: /\bResistances?\b/gi },
  { id: 'mitigation',            pattern: /\bMitigations?\b/gi },
  { id: 'hit',                   pattern: /\b(?:per hit|direct hit|action hit damage|hit damage|on hit)\b/gi },
]

// Apply a single pattern to an HTML string, protecting already-linked spans.
function applyTermPattern(html: string, term: { id: string; pattern: RegExp }): string {
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

// Escape plain text for safe HTML insertion, then apply note-term linkification.
// Pass excludeId to suppress self-links inside a note modal.
export function linkifyNoteTerms(plainText: string, excludeId?: string): string {
  let html = plainText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  for (const term of NOTE_TERMS) {
    if (term.id === excludeId) continue
    html = applyTermPattern(html, term)
  }
  return html
}

// Apply linkification to an already-safe HTML string (e.g. rendered markdown body).
function linkifyHtml(html: string, excludeId?: string): string {
  let result = html
  for (const term of NOTE_TERMS) {
    if (term.id === excludeId) continue
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
  const entry = NOTES.get(noteId)
  if (!entry) return () => undefined

  const bodyHtml = linkifyHtml(renderMarkdown(entry.body), noteId)

  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop note-backdrop'
  backdrop.innerHTML = `
    <div class="modal-panel note-panel" role="dialog" aria-modal="true" aria-labelledby="note-title">
      <button class="modal-close-btn" data-action="close" aria-label="Close"></button>
      <h2 class="modal-title note-title" id="note-title">${entry.title}</h2>
      <div class="note-body">${bodyHtml}</div>
    </div>
  `
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

  const dismiss = (): void => { closeSub(); backdrop.remove(); onClose() }
  backdrop.querySelector<HTMLButtonElement>('[data-action="close"]')!
    .addEventListener('click', dismiss)

  return () => { closeSub(); backdrop.remove() }
}
