import { getPrefs, setPref } from '../core/prefs'

export interface TutorialStep {
  message:              string
  targetSelector?:      string
  requiresInteraction?: boolean
}

export interface TutorialOptions {
  id:            string
  steps:         TutorialStep[]
  guideSection?: string
  parent:        HTMLElement
  openGuide:     (section: string) => void
  onDone:        () => void
}

export function isTutorialSeen(id: string): boolean {
  return getPrefs().seenTutorials?.includes(id) ?? false
}

export function showTutorial(opts: TutorialOptions): void {
  if (getPrefs().tutorialDisabled || isTutorialSeen(opts.id)) return

  setPref('seenTutorials', [...(getPrefs().seenTutorials ?? []), opts.id])

  const overlay = document.createElement('div')
  overlay.className = 'tutorial-overlay'

  const panel = document.createElement('div')
  panel.className = 'tutorial-panel modal-panel'
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-modal', 'true')

  const arrow = document.createElement('div')
  arrow.className = 'tutorial-arrow'
  arrow.hidden = true

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

  function positionPanel(target?: Element): void {
    const pw = opts.parent.getBoundingClientRect()
    if (!target) {
      panel.style.cssText = 'top:50%;left:50%;transform:translate(-50%,-50%)'
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

    let target: HTMLElement | undefined
    if (step.targetSelector) {
      target = opts.parent.querySelector<HTMLElement>(step.targetSelector) ?? undefined
      if (target) {
        target.classList.add('tutorial-target')
        currentTarget = target
      }
    }

    positionPanel(target)

    const disableId = `tut-disable-${opts.id}`

    let actionHtml = ''
    if (step.requiresInteraction && target) {
      actionHtml = `<button class="modal-btn modal-btn--ghost" data-tut="dismiss">Dismiss</button>`
    } else if (isLast) {
      if (opts.guideSection) {
        actionHtml = `
          <button class="modal-btn modal-btn--ghost" data-tut="dismiss">Dismiss</button>
          <button class="modal-btn modal-btn--primary" data-tut="more-info">More info →</button>
        `
      } else {
        actionHtml = `
          <button class="modal-btn modal-btn--ghost" data-tut="dismiss">Dismiss</button>
          <button class="modal-btn modal-btn--primary" data-tut="done">Done</button>
        `
      }
    } else {
      actionHtml = `
        <button class="modal-btn modal-btn--ghost" data-tut="dismiss">Dismiss</button>
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
        cleanup()
        opts.onDone()
        opts.openGuide(section)
      })

    if (step.requiresInteraction && target) {
      const advance = (): void => {
        removeTargetListener = null
        if (isLast) {
          if (opts.guideSection) {
            const section = opts.guideSection
            cleanup()
            opts.onDone()
            opts.openGuide(section)
          } else {
            cleanup()
            opts.onDone()
          }
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
