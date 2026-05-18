import 'flag-icons/css/flag-icons.min.css'
import { createIcons, Settings, BookOpen, Plus, Minus, Crosshair, TrendingDown, TrendingUp, Shuffle } from 'lucide'
import { t, setLocale, getLocale, type Locale } from '../i18n'
import { getCurrentSceneId, navigate } from '../core/router'
import { getPrefs, setPref, isCheatMode } from '../core/prefs'
import { ZOOM_STEPS, indexFromZoom } from './zoom'
import guideContent from '../config/guide.md?raw'
import type { TargetingMode } from '../core/character'

const LOCALE_FLAG_CLASS: Record<Locale, string> = {
  en: 'fi fi-gb',
  fr: 'fi fi-fr',
}

const TARGETING_OPTS: Array<{ mode: TargetingMode; icon: string; label: string; desc: string }> = [
  { mode: 'nearest',   icon: 'crosshair',    label: 'Nearest',   desc: 'Attack closest enemy' },
  { mode: 'weakest',   icon: 'trending-down', label: 'Weakest',   desc: 'Focus low HP' },
  { mode: 'strongest', icon: 'trending-up',   label: 'Strongest', desc: 'Focus high HP' },
  { mode: 'random',    icon: 'shuffle',       label: 'Random',    desc: 'Pick random target' },
]

export interface SettingsButtonOptions {
  /** Called when the zoom level changes from the settings modal. */
  onZoomChange?: (zoom: number) => void
  /** Returns the current targeting mode (called when the targeting modal opens). */
  getTargetingMode?: () => TargetingMode
  /** Called when the user selects a new targeting mode. */
  onTargetingChange?: (mode: TargetingMode) => void
}

export function mountSettingsButton(
  container: HTMLElement,
  modalRoot: HTMLElement = container,
  opts: SettingsButtonOptions = {},
): () => void {
  const btn = document.createElement('button')
  btn.className = 'settings-btn'
  btn.setAttribute('aria-label', 'Settings')
  btn.innerHTML = '<i data-lucide="settings" aria-hidden="true"></i>'
  container.appendChild(btn)
  createIcons({ icons: { Settings } })

  let modalCleanup: (() => void) | null = null

  function onEscape(e: KeyboardEvent): void {
    if (e.key === 'Escape') closeModal()
  }

  function closeModal(): void {
    if (!modalCleanup) return
    modalCleanup()
    modalCleanup = null
    document.removeEventListener('keydown', onEscape)
  }

  btn.addEventListener('click', () => {
    if (modalCleanup) { closeModal(); return }
    modalCleanup = mountSettingsModal(modalRoot, closeModal, opts)
    document.addEventListener('keydown', onEscape)
  })

  return () => { closeModal(); btn.remove() }
}

function mountSettingsModal(parent: HTMLElement, onClose: () => void, opts: SettingsButtonOptions): () => void {
  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop settings-modal-backdrop'

  let subCleanup: (() => void) | null = null
  function closeSub(): void {
    if (subCleanup) { subCleanup(); subCleanup = null }
  }

  function render(): void {
    const locale = getLocale()
    const prefs = getPrefs()
    const baseUrl = (import.meta as { env: { BASE_URL: string } }).env.BASE_URL
    const zoomIdx = indexFromZoom(prefs.zoomLevel ?? 1.0)
    const zoomPct = Math.round(ZOOM_STEPS[zoomIdx] * 100)
    const atMin = zoomIdx === 0
    const atMax = zoomIdx === ZOOM_STEPS.length - 1
    backdrop.innerHTML = `
      <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <button class="modal-close-btn" data-action="close" aria-label="Close"></button>
        <h2 class="modal-title" id="settings-title">${t('settings', 'title')}</h2>
        <div class="settings-top-buttons">
          <button class="settings-top-btn" data-action="guide" aria-label="${t('settings', 'guide')}">
            <i data-lucide="book-open" aria-hidden="true"></i>
          </button>
          <button class="settings-top-btn settings-top-btn--discord" data-action="discord" aria-label="${t('settings', 'discord')}">
            <img src="${baseUrl}ui/discord-mark.svg" alt="" aria-hidden="true" class="discord-icon">
          </button>
          <button class="settings-top-btn" data-action="language" aria-label="${t('settings', 'languageTitle')}">
            <span class="${LOCALE_FLAG_CLASS[locale]} settings-flag-icon" role="img" aria-label="${locale === 'en' ? t('settings', 'langEn') : t('settings', 'langFr')}"></span>
          </button>
        </div>
        ${opts.getTargetingMode ? `
        <div class="modal-field">
          <button class="settings-section-btn" data-action="targeting">
            <i data-lucide="crosshair" aria-hidden="true"></i>
            <span>${t('game', 'targetingTitle')}</span>
          </button>
        </div>` : ''}
        <div class="modal-field">
          <div class="settings-zoom-row">
            <span class="modal-label">${t('settings', 'zoomLabel')}</span>
            <div class="settings-zoom-controls">
              <button class="settings-zoom-step-btn" data-action="zoom-minus" aria-label="−" ${atMin ? 'disabled' : ''}>
                <i data-lucide="minus" aria-hidden="true"></i>
              </button>
              <span class="settings-zoom-value">${zoomPct}%</span>
              <button class="settings-zoom-step-btn" data-action="zoom-plus" aria-label="+" ${atMax ? 'disabled' : ''}>
                <i data-lucide="plus" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        </div>
        <div class="modal-field">
          <label class="settings-toggle-row">
            <span class="modal-label">${t('settings', 'showDamageNumbers')}</span>
            <input type="checkbox" class="settings-toggle-input" data-pref="showDamageNumbers" ${prefs.showDamageNumbers ? 'checked' : ''}>
            <span class="settings-toggle-track" aria-hidden="true"></span>
          </label>
        </div>
        <div class="modal-field">
          <label class="settings-toggle-row">
            <span class="modal-label">${t('settings', 'showDpsMeter')}</span>
            <input type="checkbox" class="settings-toggle-input" data-pref="showDpsMeter" ${prefs.showDpsMeter ? 'checked' : ''}>
            <span class="settings-toggle-track" aria-hidden="true"></span>
          </label>
        </div>
        ${isCheatMode() ? `
        <div class="modal-field">
          <label class="settings-toggle-row">
            <span class="modal-label">${t('settings', 'fullMastery')}</span>
            <input type="checkbox" class="settings-toggle-input" data-pref="fullMastery" ${prefs.fullMastery ? 'checked' : ''}>
            <span class="settings-toggle-track" aria-hidden="true"></span>
          </label>
        </div>` : ''}
      </div>
    `
    createIcons({ icons: { BookOpen, Plus, Minus, Crosshair } })

    const stepZoom = (delta: 1 | -1): void => {
      const next = zoomIdx + delta
      if (next < 0 || next >= ZOOM_STEPS.length) return
      const z = ZOOM_STEPS[next]
      setPref('zoomLevel', z)
      opts.onZoomChange?.(z)
      render()
    }
    backdrop.querySelector<HTMLButtonElement>('[data-action="zoom-plus"]')!
      .addEventListener('click', () => stepZoom(1))
    backdrop.querySelector<HTMLButtonElement>('[data-action="zoom-minus"]')!
      .addEventListener('click', () => stepZoom(-1))

    backdrop.querySelector<HTMLButtonElement>('[data-action="close"]')!
      .addEventListener('click', () => { closeSub(); backdrop.remove(); onClose() })

    backdrop.querySelector<HTMLButtonElement>('[data-action="guide"]')!
      .addEventListener('click', () => {
        closeSub()
        subCleanup = mountGuideModal(parent, () => { subCleanup = null })
      })

    backdrop.querySelector<HTMLButtonElement>('[data-action="discord"]')!
      .addEventListener('click', () => { /* not wired — placeholder for future link */ })

    backdrop.querySelector<HTMLButtonElement>('[data-action="language"]')!
      .addEventListener('click', () => {
        closeSub()
        subCleanup = mountLanguageModal(parent, () => { subCleanup = null }, () => { render() })
      })

    backdrop.querySelector<HTMLInputElement>('[data-pref="showDamageNumbers"]')!
      .addEventListener('change', (e) => {
        setPref('showDamageNumbers', (e.target as HTMLInputElement).checked)
      })
    backdrop.querySelector<HTMLInputElement>('[data-pref="showDpsMeter"]')!
      .addEventListener('change', (e) => {
        setPref('showDpsMeter', (e.target as HTMLInputElement).checked)
      })
    backdrop.querySelector<HTMLInputElement>('[data-pref="fullMastery"]')
      ?.addEventListener('change', (e) => {
        setPref('fullMastery', (e.target as HTMLInputElement).checked)
      })

    const targetingBtn = backdrop.querySelector<HTMLButtonElement>('[data-action="targeting"]')
    if (targetingBtn && opts.getTargetingMode && opts.onTargetingChange) {
      const getMode = opts.getTargetingMode
      const onChange = opts.onTargetingChange
      targetingBtn.addEventListener('click', () => {
        closeSub()
        subCleanup = mountTargetingModal(parent, getMode, onChange, () => { subCleanup = null })
      })
    }
  }

  // Append to DOM before render so createIcons can find elements in the document.
  parent.appendChild(backdrop)
  render()

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) { closeSub(); backdrop.remove(); onClose() }
  })

  return () => { closeSub(); backdrop.remove() }
}

function mountLanguageModal(
  parent: HTMLElement,
  onClose: () => void,
  onChange: () => void,
): () => void {
  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop settings-submodal-backdrop'
  const locale = getLocale()
  const langs: Locale[] = ['en', 'fr']

  backdrop.innerHTML = `
    <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="lang-title">
      <button class="modal-close-btn" data-action="close" aria-label="Close"></button>
      <h2 class="modal-title" id="lang-title">${t('settings', 'languageTitle')}</h2>
      <div class="lang-options">
        ${langs.map(l => `
          <button class="lang-option${l === locale ? ' lang-option--active' : ''}" data-locale="${l}">
            <span class="${LOCALE_FLAG_CLASS[l]} lang-option-flag" role="img" aria-label="${l === 'en' ? 'English' : 'Français'}"></span>
            <span class="lang-option-name">${t('settings', l === 'en' ? 'langEn' : 'langFr')}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `

  parent.appendChild(backdrop)

  backdrop.querySelector<HTMLButtonElement>('[data-action="close"]')!
    .addEventListener('click', () => { backdrop.remove(); onClose() })

  backdrop.querySelectorAll<HTMLButtonElement>('[data-locale]').forEach(btn => {
    btn.addEventListener('click', () => {
      const next = btn.dataset['locale'] as Locale
      if (next !== getLocale()) {
        setLocale(next)
        const scene = getCurrentSceneId()
        if (scene) navigate(scene)
        return
      }
      backdrop.remove()
      onClose()
      onChange()
    })
  })

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) { backdrop.remove(); onClose() }
  })

  return () => backdrop.remove()
}

// ── Targeting modal ───────────────────────────────────────────────────────

function mountTargetingModal(
  parent: HTMLElement,
  getTargetingMode: () => TargetingMode,
  onTargetingChange: (mode: TargetingMode) => void,
  onClose: () => void,
): () => void {
  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop settings-submodal-backdrop'
  const currentMode = getTargetingMode()

  backdrop.innerHTML = `
    <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="targeting-title">
      <button class="modal-close-btn" data-action="close" aria-label="Close"></button>
      <h2 class="modal-title" id="targeting-title">${t('game', 'targetingTitle')}</h2>
      <div class="targeting-options">
        ${TARGETING_OPTS.map(o => `
          <button class="targeting-opt${currentMode === o.mode ? ' targeting-opt--active' : ''}" data-targeting="${o.mode}">
            <i data-lucide="${o.icon}" aria-hidden="true"></i>
            <span class="targeting-opt-name">${o.label}</span>
            <small class="targeting-opt-desc">${o.desc}</small>
          </button>`).join('')}
      </div>
    </div>
  `

  parent.appendChild(backdrop)

  createIcons({ icons: { Crosshair, TrendingDown, TrendingUp, Shuffle } })

  backdrop.querySelector<HTMLButtonElement>('[data-action="close"]')!
    .addEventListener('click', () => { backdrop.remove(); onClose() })

  backdrop.querySelectorAll<HTMLButtonElement>('[data-targeting]').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset['targeting'] as TargetingMode
      backdrop.querySelectorAll('[data-targeting]').forEach(b =>
        b.classList.toggle('targeting-opt--active', b === btn),
      )
      onTargetingChange(mode)
    })
  })

  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) { backdrop.remove(); onClose() }
  })

  return () => backdrop.remove()
}

// ── Guide helpers ─────────────────────────────────────────────────────────

function parseGuideSections(md: string): { title: string; body: string }[] {
  const sections: { title: string; body: string }[] = []
  let currentTitle = ''
  let bodyLines: string[] = []
  for (const line of md.split('\n')) {
    if (line.startsWith('## ')) {
      if (currentTitle) sections.push({ title: currentTitle, body: bodyLines.join('\n').trim() })
      currentTitle = line.slice(3).trim()
      bodyLines = []
    } else if (currentTitle) {
      bodyLines.push(line)
    }
  }
  if (currentTitle) sections.push({ title: currentTitle, body: bodyLines.join('\n').trim() })
  return sections
}

function renderGuideBody(md: string): string {
  return md
    .split(/\n\n+/)
    .map(block => {
      const trimmed = block.trim()
      if (!trimmed) return ''
      const lines = trimmed.split('\n')
      if (lines.every(l => l.startsWith('- '))) {
        const items = lines.map(l => `<li>${inline(l.slice(2))}</li>`).join('')
        return `<ul>${items}</ul>`
      }
      return `<p>${inline(trimmed.replace(/\n/g, ' '))}</p>`
    })
    .filter(Boolean)
    .join('')
}

function inline(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
             .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

// ── Guide modal ────────────────────────────────────────────────────────────

function mountGuideModal(parent: HTMLElement, onClose: () => void): () => void {
  const baseUrl = (import.meta as { env: { BASE_URL: string } }).env.BASE_URL
  const arrowSrc = `${baseUrl}ui/kenney_ui-pack-rpg-expansion/PNG/arrowBlue_right.png`
  const sections = parseGuideSections(guideContent)

  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop settings-submodal-backdrop'

  const panel = document.createElement('div')
  panel.className = 'modal-panel guide-panel'
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-modal', 'true')
  panel.setAttribute('aria-labelledby', 'guide-title')
  panel.innerHTML = `
    <button class="modal-close-btn" data-action="close" aria-label="Close"></button>
    <h2 class="modal-title" id="guide-title">${t('guide', 'title')}</h2>
    <div class="guide-sections"></div>
  `

  const sectionsEl = panel.querySelector<HTMLElement>('.guide-sections')!
  sections.forEach(({ title, body }) => {
    const section = document.createElement('div')
    section.className = 'guide-section'

    const btn = document.createElement('button')
    btn.className = 'guide-section-btn'
    btn.setAttribute('aria-expanded', 'false')
    btn.innerHTML = `
      <span class="guide-section-title">${title}</span>
      <img class="guide-section-arrow" src="${arrowSrc}" alt="" aria-hidden="true">
    `

    const bodyEl = document.createElement('div')
    bodyEl.className = 'guide-section-body'
    bodyEl.hidden = true
    bodyEl.innerHTML = renderGuideBody(body)

    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') === 'true'
      btn.setAttribute('aria-expanded', open ? 'false' : 'true')
      bodyEl.hidden = open
    })

    section.append(btn, bodyEl)
    sectionsEl.appendChild(section)
  })

  backdrop.appendChild(panel)
  parent.appendChild(backdrop)

  panel.querySelector<HTMLButtonElement>('[data-action="close"]')!
    .addEventListener('click', () => { backdrop.remove(); onClose() })

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) { backdrop.remove(); onClose() }
  })

  return () => backdrop.remove()
}
