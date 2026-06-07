import { t } from '../i18n'
import { playSound } from '../audio'

// ── Snapshot data model ─────────────────────────────────────────────────────
// Built in game.ts (where all the bonus-computing closures live) and handed to
// this modal for rendering. A "factor" is one term in a left-to-right product;
// `origin` is the human-readable source, rendered italic + colored.

export interface StatFactor {
  text:   string                          // pre-formatted, e.g. "×1.25" or "100"
  origin: string                          // e.g. "levels", "fire mastery 1.6, 1.6b"
  kind:   'base' | 'mul' | 'more' | 'less'
  group?: string                          // mastery category; triggers a visual separator on group change
}

export interface StatLine {
  label:   string
  total:   string
  factors: StatFactor[]
  note?:   string
}

export interface OddsLine {
  label:  string
  odds:   string
  origin: string
  note?:  string
}

export interface ActionStatBlock {
  name:              string
  damage:            StatLine
  speed:             StatLine
  isDependentTrigger?: boolean           // crit/affliction slots: speed shown as damage-context note
  multiStrike:       OddsLine[]
  afflictionChance?: OddsLine
  afflictionDamage?: StatLine
  critChance:        OddsLine
  critDamage:        StatLine
  triggerBuffs:      { name: string; odds: string; effect: string }[]
  slotNote?:         string
}

export interface PlayerStatsSnapshot {
  life:            StatLine
  mana:            StatLine
  physRotResist:   string
  elementalResist: string
  resistNote?:     string
  actions:         ActionStatBlock[]
}

// ── Rendering helpers ───────────────────────────────────────────────────────

function el(tag: string, className?: string, text?: string): HTMLElement {
  const e = document.createElement(tag)
  if (className) e.className = className
  if (text != null) e.textContent = text
  return e
}

// A formula row: bold total, then the factor chain with colored italic origins.
function renderStatLine(line: StatLine): HTMLElement {
  const row = el('div', 'stat-row')
  row.appendChild(el('div', 'stat-label', line.label))

  const formula = el('div', 'stat-formula')
  formula.appendChild(el('span', 'stat-total', line.total))
  formula.appendChild(el('span', 'stat-eq', '='))
  line.factors.forEach((f, i) => {
    if (i > 0) {
      const prevGroup = line.factors[i - 1].group
      if (f.group && prevGroup && f.group !== prevGroup) {
        formula.appendChild(el('span', 'stat-group-sep'))
      } else {
        formula.appendChild(document.createTextNode(' '))
      }
    }
    const term = el('span', 'stat-term')
    term.appendChild(el('span', 'stat-term-val', f.text))
    term.appendChild(el('span', `stat-origin stat-origin--${f.kind}`, f.origin))
    formula.appendChild(term)
  })
  row.appendChild(formula)

  if (line.note) row.appendChild(el('div', 'stat-note', line.note))
  return row
}

function renderOddsLine(line: OddsLine): HTMLElement {
  const row = el('div', 'stat-odds-row')
  row.appendChild(el('span', 'stat-odds-label', line.label))
  row.appendChild(el('span', 'stat-odds-val', line.odds))
  row.appendChild(el('span', 'stat-origin stat-origin--mul', line.origin))
  if (line.note) row.appendChild(el('div', 'stat-note', line.note))
  return row
}

function renderActionBlock(block: ActionStatBlock): HTMLElement {
  const section = el('div', 'stat-section')
  const header = el('div', 'stat-section-title', block.name)
  if (block.slotNote) header.appendChild(el('span', 'stat-slot-note', block.slotNote))
  section.appendChild(header)

  section.appendChild(renderStatLine(block.damage))
  if (block.isDependentTrigger) {
    section.appendChild(el('div', 'stat-note', `Action speed: ${block.speed.total} actions/sec per trigger event`))
  } else {
    section.appendChild(renderStatLine(block.speed))
  }

  if (block.multiStrike.length > 0) {
    section.appendChild(el('div', 'stat-subhead', 'Multi-strike (in roll order)'))
    const list = el('div', 'stat-odds-list')
    for (const ms of block.multiStrike) list.appendChild(renderOddsLine(ms))
    section.appendChild(list)
  }

  if (block.afflictionChance) {
    section.appendChild(el('div', 'stat-subhead', 'Affliction'))
    section.appendChild(renderOddsLine(block.afflictionChance))
    if (block.afflictionDamage) section.appendChild(renderStatLine(block.afflictionDamage))
  }

  section.appendChild(el('div', 'stat-subhead', 'Critical hit'))
  section.appendChild(renderOddsLine(block.critChance))
  section.appendChild(renderStatLine(block.critDamage))

  if (block.triggerBuffs.length > 0) {
    section.appendChild(el('div', 'stat-subhead', 'Triggerable buffs'))
    const list = el('div', 'stat-buff-list')
    for (const b of block.triggerBuffs) {
      const item = el('div', 'stat-buff')
      const head = el('div', 'stat-buff-head')
      head.appendChild(el('span', 'stat-buff-name', b.name))
      head.appendChild(el('span', 'stat-buff-odds', b.odds))
      item.appendChild(head)
      item.appendChild(el('div', 'stat-buff-effect', b.effect))
      list.appendChild(item)
    }
    section.appendChild(list)
  }

  return section
}

// ── Modal ───────────────────────────────────────────────────────────────────

export function mountCharacterStatsModal(
  parent: HTMLElement,
  opts: { snapshot: PlayerStatsSnapshot; onClose: () => void },
): () => void {
  const { snapshot } = opts

  const backdrop = el('div', 'modal-backdrop char-modal-backdrop')
  const panel = el('div', 'modal-panel char-stats-panel')
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-modal', 'true')
  panel.setAttribute('aria-labelledby', 'char-stats-title')

  const closeBtn = el('button', 'modal-close-btn')
  closeBtn.setAttribute('data-action', 'close')
  closeBtn.setAttribute('aria-label', t('settings', 'close'))
  panel.appendChild(closeBtn)

  const title = el('h2', 'modal-title', 'Stats')
  title.id = 'char-stats-title'
  panel.appendChild(title)

  const scroll = el('div', 'char-stats-scroll')

  // Vitals
  const vitals = el('div', 'stat-section')
  vitals.appendChild(el('div', 'stat-section-title', 'Vitals'))
  vitals.appendChild(renderStatLine(snapshot.life))
  vitals.appendChild(renderStatLine(snapshot.mana))
  const resRow = el('div', 'stat-odds-list')
  const physRow = el('div', 'stat-odds-row')
  physRow.appendChild(el('span', 'stat-odds-label', 'Physical / Rot resistance'))
  physRow.appendChild(el('span', 'stat-odds-val', snapshot.physRotResist))
  resRow.appendChild(physRow)
  const eleRow = el('div', 'stat-odds-row')
  eleRow.appendChild(el('span', 'stat-odds-label', 'Elemental resistance'))
  eleRow.appendChild(el('span', 'stat-odds-val', snapshot.elementalResist))
  resRow.appendChild(eleRow)
  vitals.appendChild(resRow)
  if (snapshot.resistNote) vitals.appendChild(el('div', 'stat-note', snapshot.resistNote))
  scroll.appendChild(vitals)

  // Actions
  for (const block of snapshot.actions) scroll.appendChild(renderActionBlock(block))

  panel.appendChild(scroll)
  backdrop.appendChild(panel)

  playSound('modal.open')
  parent.appendChild(backdrop)

  const dismiss = (): void => {
    playSound('modal.close')
    backdrop.remove()
    opts.onClose()
  }

  closeBtn.addEventListener('click', dismiss)
  backdrop.addEventListener('click', e => { if (e.target === backdrop) dismiss() })

  return () => backdrop.remove()
}
