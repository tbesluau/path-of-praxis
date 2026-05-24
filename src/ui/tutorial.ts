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
  // When true: no dark backdrop strips. A target (if any) still gets the
  // gold pulse and the panel is still positioned next to it — this lets a
  // tutorial step point at an element inside an already-open modal without
  // covering the modal.
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
    // Round to integers — fractional strip dimensions create 1px gaps
    // between strips and trigger sub-pixel rendering on child buttons,
    // which surfaces as faint white lines on the border-image seams.
    const cutL = Math.round(Math.max(0, tr.left  - pw.left - margin))
    const cutT = Math.round(Math.max(0, tr.top   - pw.top  - margin))
    const cutR = Math.round(Math.min(pw.width,  tr.left - pw.left + tr.width  + margin))
    const cutB = Math.round(Math.min(pw.height, tr.top  - pw.top  + tr.height + margin))
    stripTop.style.cssText    = `position:absolute;left:0;top:0;right:0;height:${cutT}px`
    stripBottom.style.cssText = `position:absolute;left:0;top:${cutB}px;right:0;bottom:0`
    stripLeft.style.cssText   = `position:absolute;left:0;top:${cutT}px;width:${cutL}px;height:${cutB - cutT}px`
    stripRight.style.cssText  = `position:absolute;left:${cutR}px;top:${cutT}px;right:0;height:${cutB - cutT}px`
  }

  function positionPanel(target: Element | undefined, transparent: boolean): void {
    const pw = opts.parent.getBoundingClientRect()
    const margin = 8

    if (!target) {
      // No target: transparent → bottom-center banner; opaque → center modal.
      if (transparent) {
        panel.style.cssText = 'bottom:24px;left:50%;transform:translateX(-50%);width:min(420px,92vw)'
      } else {
        panel.style.cssText = 'top:50%;left:50%;transform:translate(-50%,-50%);width:min(340px,90vw)'
      }
      arrow.hidden = true
      return
    }
    const tr = target.getBoundingClientRect()
    const relTop  = tr.top  - pw.top
    const relLeft = tr.left - pw.left
    const relBottom = relTop + tr.height

    // Apply width first so the panel reflows to its final width, then measure
    // its natural height. innerHTML must already be set by the caller for the
    // height to be accurate. All final pixel values are rounded — sub-pixel
    // positions cause faint white lines on child border-image buttons.
    const panelW = Math.round(Math.min(340, pw.width * 0.90))
    panel.style.cssText = `top:0;left:0;width:${panelW}px`
    const panelH = panel.offsetHeight

    // Pick whichever side has more room. For oversized targets neither side
    // may fit the full panel — we clamp afterwards.
    const placeBelow = (pw.height - relBottom) >= relTop

    const arrowX = relLeft + tr.width / 2 - 10
    let panelL = relLeft + tr.width / 2 - panelW / 2
    panelL = Math.round(Math.max(margin, Math.min(panelL, pw.width - panelW - margin)))

    if (placeBelow) {
      const naturalArrowY = relBottom + 6
      const naturalPanelTop = naturalArrowY + 22
      const clampedPanelTop = Math.round(Math.max(margin, Math.min(naturalPanelTop, pw.height - panelH - margin)))
      if (clampedPanelTop === Math.round(naturalPanelTop)) {
        arrow.hidden = false
        arrow.dataset['dir'] = 'down'
        arrow.style.left = `${Math.round(Math.max(margin, arrowX))}px`
        arrow.style.top  = `${Math.round(naturalArrowY)}px`
      } else {
        // Panel overlaps the target — drop the arrow; the gold pulse ring
        // on the target itself is enough to identify the focus.
        arrow.hidden = true
      }
      panel.style.cssText = `top:${clampedPanelTop}px;left:${panelL}px;width:${panelW}px`
    } else {
      const naturalArrowY = relTop - 22
      const naturalPanelBottom = pw.height - naturalArrowY + 8
      const clampedPanelBottom = Math.round(Math.max(margin, Math.min(naturalPanelBottom, pw.height - panelH - margin)))
      if (clampedPanelBottom === Math.round(naturalPanelBottom)) {
        arrow.hidden = false
        arrow.dataset['dir'] = 'up'
        arrow.style.left = `${Math.round(Math.max(margin, arrowX))}px`
        arrow.style.top  = `${Math.round(naturalArrowY)}px`
      } else {
        arrow.hidden = true
      }
      panel.style.cssText = `bottom:${clampedPanelBottom}px;left:${panelL}px;width:${panelW}px`
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
      if (target) {
        target.classList.add('tutorial-target')
        currentTarget = target
      }
    }

    const disableId = `tut-disable-${opts.id}-${stepIdx}`

    // Button rules: the closing-button label tells the user whether they'd
    // miss more tutorial info by clicking it.
    // - "Dismiss" → there are more tutorial steps remaining in this section
    // - "Done"    → this is the last step (nothing more to miss)
    // "More info →" (guideSection link) is independent of this — the guide
    // is separate from the tutorial proper, so reaching the last step still
    // shows "Done" + "More info →".
    let actionHtml = ''
    if (step.requiresInteraction && target) {
      // The intended completion is clicking the highlighted target, so the
      // escape-hatch is always "Dismiss" — never "Done".
      actionHtml = `<button class="modal-btn modal-btn--danger" data-tut="dismiss">Dismiss</button>`
    } else if (isLast) {
      if (opts.guideSection) {
        actionHtml = `
          <button class="modal-btn modal-btn--ghost" data-tut="done">Done</button>
          <button class="modal-btn modal-btn--primary" data-tut="more-info">More info →</button>
        `
      } else {
        actionHtml = `<button class="modal-btn modal-btn--primary" data-tut="done">Done</button>`
      }
    } else {
      actionHtml = `
        <button class="modal-btn modal-btn--danger" data-tut="dismiss">Dismiss</button>
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

    // Position after innerHTML so panel.offsetHeight reflects the real content.
    positionBackdrop(target, transparent)
    positionPanel(target, transparent)

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
