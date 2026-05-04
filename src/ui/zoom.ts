import { createIcons, Search, Plus, Minus } from 'lucide'
import { t } from '../i18n'

export const ZOOM_STEPS = [0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2] as const
export const ZOOM_DEFAULT_INDEX = 4

function indexFromZoom(zoom: number): number {
  let bestIdx = ZOOM_DEFAULT_INDEX
  let bestDiff = Infinity
  for (let i = 0; i < ZOOM_STEPS.length; i++) {
    const diff = Math.abs(ZOOM_STEPS[i] - zoom)
    if (diff < bestDiff) { bestDiff = diff; bestIdx = i }
  }
  return bestIdx
}

export function mountZoomControl(
  container: HTMLElement,
  initial:   number,
  onChange:  (zoom: number) => void,
): () => void {
  let stepIdx = indexFromZoom(initial)
  let popover: HTMLElement | null = null

  const btn = document.createElement('button')
  btn.className = 'zoom-btn'
  btn.setAttribute('aria-label', t('settings', 'zoomLabel'))
  btn.innerHTML = '<i data-lucide="search" aria-hidden="true"></i>'
  container.appendChild(btn)
  createIcons({ icons: { Search } })

  function onDocClick(e: MouseEvent): void {
    const target = e.target as HTMLElement
    if (popover && !popover.contains(target) && !btn.contains(target)) close()
  }

  function onEscape(e: KeyboardEvent): void {
    if (e.key === 'Escape') close()
  }

  function renderPopover(): void {
    if (!popover) return
    const atMin = stepIdx === 0
    const atMax = stepIdx === ZOOM_STEPS.length - 1
    popover.innerHTML = `
      <button class="zoom-step-btn" data-action="plus" aria-label="+" ${atMax ? 'disabled' : ''}>
        <i data-lucide="plus" aria-hidden="true"></i>
      </button>
      <div class="zoom-value">${Math.round(ZOOM_STEPS[stepIdx] * 100)}%</div>
      <button class="zoom-step-btn" data-action="minus" aria-label="−" ${atMin ? 'disabled' : ''}>
        <i data-lucide="minus" aria-hidden="true"></i>
      </button>
    `
    createIcons({ icons: { Plus, Minus } })

    popover.querySelector<HTMLButtonElement>('[data-action="plus"]')!
      .addEventListener('click', () => {
        if (stepIdx >= ZOOM_STEPS.length - 1) return
        stepIdx++
        onChange(ZOOM_STEPS[stepIdx])
        renderPopover()
      })
    popover.querySelector<HTMLButtonElement>('[data-action="minus"]')!
      .addEventListener('click', () => {
        if (stepIdx <= 0) return
        stepIdx--
        onChange(ZOOM_STEPS[stepIdx])
        renderPopover()
      })
  }

  function open(): void {
    if (popover) return
    popover = document.createElement('div')
    popover.className = 'zoom-popover'
    popover.setAttribute('role', 'dialog')
    container.appendChild(popover)
    renderPopover()
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEscape)
  }

  function close(): void {
    if (!popover) return
    popover.remove()
    popover = null
    document.removeEventListener('mousedown', onDocClick)
    document.removeEventListener('keydown', onEscape)
  }

  btn.addEventListener('click', () => {
    if (popover) close()
    else open()
  })

  return () => { close(); btn.remove() }
}
