import { getPrefs, setPref } from '../core/prefs'
import tutorialsRaw from '../config/tutorials.md?raw'

// ── Tutorial content ────────────────────────────────────────────────────────

function parseTutorials(raw: string): Map<string, string> {
  const map = new Map<string, string>()
  for (const section of raw.split(/\n---\n/)) {
    const trimmed = section.trim()
    if (!trimmed) continue
    const firstLine = trimmed.split('\n')[0]
    if (!firstLine.startsWith('## ')) continue
    const key  = firstLine.slice(3).trim()
    const body = trimmed.slice(firstLine.length).trim()
    map.set(key, body)
  }
  return map
}

const TUTORIALS = parseTutorials(tutorialsRaw)

export function getTutorialMessage(id: string, stepIdx: number): string {
  return TUTORIALS.get(`${id}.${stepIdx}`) ?? `[missing tutorial: ${id}.${stepIdx}]`
}

// ── Tutorial engine ─────────────────────────────────────────────────────────

export interface TutorialStep {
  message:              string
  targetSelector?:      string
  requiresInteraction?: boolean
  // When true: no dark backdrop; the panel sits at the bottom-center of the
  // viewport so it can describe an open modal underneath without hiding it.
  transparent?:         boolean
}

export interface TutorialOptions {
  id:               string
  steps:            TutorialStep[]
  guideSection?:    string
  parent:           HTMLElement
  openGuide:        (section: string) => void
  onDone:           () => void
  // Called when "More info" is clicked. Defaults to onDone. Use this to keep
  // the game paused while the guide is shown.
  onGuide?:         () => void
  // When true, the last step without a guideSection shows only "Done" (no "Close").
  noDismissOnLast?: boolean
}

export function isTutorialSeen(id: string): boolean {
  return getPrefs().seenTutorials?.includes(id) ?? false
}

export function showTutorial(opts: TutorialOptions): void {
  if (getPrefs().tutorialDisabled || isTutorialSeen(opts.id)) return

  setPref('seenTutorials', [...(getPrefs().seenTutorials ?? []), opts.id])

  const overlay = document.createElement('div')
  overlay.className = 'tutorial-overlay'

  // Four backdrop strips form a "frame" around the highlighted target so the
  // target itself stays uncovered, fully visible, and clickable. When there is
  // no target, the top strip stretches to full-screen and the other three are
  // hidden. Using strips (instead of a single full-screen backdrop) avoids the
  // stacking-context trap: `.scene-game` has a CSS transform, so a z-index on
  // the target button can never lift it above an overlay rendered into #app.
  const stripTop    = document.createElement('div')
  const stripBottom = document.createElement('div')
  const stripLeft   = document.createElement('div')
  const stripRight  = document.createElement('div')
  const strips = [stripTop, stripBottom, stripLeft, stripRight] as const
  for (const s of strips) s.className = 'tutorial-backdrop-strip'

  const panel = document.createElement('div')
  panel.className = 'tutorial-panel modal-panel'
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-modal', 'true')

  const arrow = document.createElement('div')
  arrow.className = 'tutorial-arrow'
  arrow.hidden = true

  for (const s of strips) overlay.appendChild(s)
  overlay.appendChild(arrow)
  overlay.appendChild(panel)
  opts.parent.appendChild(overlay)

  let currentTarget: HTMLElement | null = null
  let removeTargetListener: (() => void) | null = null

  function cleanup(): void {
    if (removeTargetListener) { removeTargetListener(); removeTargetListener = null }
    currentTarget?.classList.remove('tutorial-target')
    currentTarget = null
    overlay.remove()
  }

  function positionBackdrop(target: Element | undefined, transparent: boolean): void {
    if (transparent) {
      for (const s of strips) s.style.cssText = 'display:none'
      return
    }
    if (!target) {
      stripTop.style.cssText = 'position:absolute;inset:0'
      stripBottom.style.cssText = 'display:none'
      stripLeft.style.cssText   = 'display:none'
      stripRight.style.cssText  = 'display:none'
      return
    }
    const pw = opts.parent.getBoundingClientRect()
    const tr = target.getBoundingClientRect()
    // Pad the cutout so the gold pulse ring (3px + 12px glow) is fully visible.
    const margin = 10
    const cutL = Math.max(0, tr.left  - pw.left - margin)
    const cutT = Math.max(0, tr.top   - pw.top  - margin)
    const cutR = Math.min(pw.width,  tr.left - pw.left + tr.width  + margin)
    const cutB = Math.min(pw.height, tr.top  - pw.top  + tr.height + margin)
    stripTop.style.cssText    = `position:absolute;left:0;top:0;right:0;height:${cutT}px`
    stripBottom.style.cssText = `position:absolute;left:0;top:${cutB}px;right:0;bottom:0`
    stripLeft.style.cssText   = `position:absolute;left:0;top:${cutT}px;width:${cutL}px;height:${cutB - cutT}px`
    stripRight.style.cssText  = `position:absolute;left:${cutR}px;top:${cutT}px;right:0;height:${cutB - cutT}px`
  }

  function positionPanel(target: Element | undefined, transparent: boolean): void {
    const pw = opts.parent.getBoundingClientRect()

    if (transparent) {
      panel.style.cssText = 'bottom:24px;left:50%;transform:translateX(-50%);width:min(420px,92vw)'
      arrow.hidden = true
      return
    }

    if (!target) {
      panel.style.cssText = 'top:50%;left:50%;transform:translate(-50%,-50%);width:min(340px,90vw)'
      arrow.hidden = true
      return
    }
    const tr = target.getBoundingClientRect()
    const relTop  = tr.top  - pw.top
    const relLeft = tr.left - pw.left
    const inTop   = relTop < pw.height / 2

    arrow.hidden = false
    arrow.dataset['dir'] = inTop ? 'down' : 'up'
    const arrowX = relLeft + tr.width / 2 - 10
    const arrowY = inTop ? relTop + tr.height + 6 : relTop - 22

    arrow.style.left = `${Math.max(8, arrowX)}px`
    arrow.style.top  = `${arrowY}px`

    const panelW = Math.min(340, pw.width * 0.90)
    let panelL = relLeft + tr.width / 2 - panelW / 2
    panelL = Math.max(8, Math.min(panelL, pw.width - panelW - 8))
    if (inTop) {
      panel.style.cssText = `top:${arrowY + 22}px;left:${panelL}px;width:${panelW}px`
    } else {
      panel.style.cssText = `bottom:${pw.height - arrowY + 8}px;left:${panelL}px;width:${panelW}px`
    }
  }

  function renderStep(stepIdx: number): void {
    if (removeTargetListener) { removeTargetListener(); removeTargetListener = null }
    currentTarget?.classList.remove('tutorial-target')
    currentTarget = null

    const step = opts.steps[stepIdx]
    const isLast = stepIdx === opts.steps.length - 1
    const transparent = !!step.transparent

    overlay.classList.toggle('tutorial-overlay--transparent', transparent)

    let target: HTMLElement | undefined
    if (step.targetSelector) {
      target = opts.parent.querySelector<HTMLElement>(step.targetSelector) ?? undefined
      // Only pulse-highlight when the overlay is opaque — when transparent the
      // user is looking at an open modal and a pulsing ring elsewhere is noise.
      if (target && !transparent) {
        target.classList.add('tutorial-target')
        currentTarget = target
      }
    }

    positionBackdrop(target, transparent)
    positionPanel(target, transparent)

    const disableId = `tut-disable-${opts.id}-${stepIdx}`

    let actionHtml = ''
    if (step.requiresInteraction && target) {
      actionHtml = `<button class="modal-btn modal-btn--ghost" data-tut="dismiss">Close</button>`
    } else if (isLast) {
      if (opts.guideSection) {
        actionHtml = `
          <button class="modal-btn modal-btn--ghost" data-tut="dismiss">Close</button>
          <button class="modal-btn modal-btn--primary" data-tut="more-info">More info →</button>
        `
      } else if (opts.noDismissOnLast) {
        actionHtml = `
          <button class="modal-btn modal-btn--primary" data-tut="done">Done</button>
        `
      } else {
        actionHtml = `
          <button class="modal-btn modal-btn--ghost" data-tut="dismiss">Close</button>
          <button class="modal-btn modal-btn--primary" data-tut="done">Done</button>
        `
      }
    } else {
      actionHtml = `
        <button class="modal-btn modal-btn--ghost" data-tut="dismiss">Close</button>
        <button class="modal-btn modal-btn--primary" data-tut="next">Next</button>
      `
    }

    panel.innerHTML = `
      <p class="tutorial-message">${step.message}</p>
      <div class="tutorial-controls">
        <label class="tutorial-disable-label" for="${disableId}">
          <input type="checkbox" id="${disableId}" data-tut="disable">
          Don't show tutorials
        </label>
        ${actionHtml}
      </div>
    `

    panel.querySelector<HTMLInputElement>('[data-tut="disable"]')!
      .addEventListener('change', () => {
        setPref('tutorialDisabled', true)
        cleanup()
        opts.onDone()
      })

    panel.querySelector<HTMLButtonElement>('[data-tut="dismiss"]')
      ?.addEventListener('click', () => { cleanup(); opts.onDone() })

    panel.querySelector<HTMLButtonElement>('[data-tut="next"]')
      ?.addEventListener('click', () => renderStep(stepIdx + 1))

    panel.querySelector<HTMLButtonElement>('[data-tut="done"]')
      ?.addEventListener('click', () => { cleanup(); opts.onDone() })

    panel.querySelector<HTMLButtonElement>('[data-tut="more-info"]')
      ?.addEventListener('click', () => {
        const section = opts.guideSection!
        const guideCb = opts.onGuide ?? opts.onDone
        cleanup()
        guideCb()
        opts.openGuide(section)
      })

    if (step.requiresInteraction && target) {
      const advance = (): void => {
        removeTargetListener = null
        if (isLast) {
          cleanup()
          opts.onDone()
        } else {
          renderStep(stepIdx + 1)
        }
      }
      target.addEventListener('click', advance, { once: true })
      removeTargetListener = () => target!.removeEventListener('click', advance)
    }
  }

  renderStep(0)
}
