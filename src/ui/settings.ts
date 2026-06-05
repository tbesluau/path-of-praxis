import 'flag-icons/css/flag-icons.min.css'
import { createIcons, Settings, BookOpen, Plus, Minus, Crosshair, TrendingDown, TrendingUp, Shuffle, Save } from 'lucide'
import { t, setLocale, getLocale, SUPPORTED_LOCALES, type Locale } from '../i18n'
import { getCurrentSceneId, navigate } from '../core/router'
import { getPrefs, setPref, isCheatMode } from '../core/prefs'
import { exportSaveCode, importSaveCode } from '../core/save-code'
import { ZOOM_STEPS, indexFromZoom } from './zoom'
import guideContent from '../config/guide.md?raw'
import { linkifyHtml, mountNoteModal } from './notes'
import { getGuideTranslation } from '../i18n/content'
import type { TargetingMode } from '../core/character'

const LOCALE_FLAG_CLASS: Record<Locale, string> = {
  en: 'fi fi-gb',
  fr: 'fi fi-fr',
  es: 'fi fi-es',
}

const LOCALE_NAME_KEY: Record<Locale, 'langEn' | 'langFr' | 'langEs'> = {
  en: 'langEn',
  fr: 'langFr',
  es: 'langEs',
}

function isFullscreen(): boolean {
  return document.fullscreenElement !== null
}

async function toggleFullscreen(): Promise<void> {
  if (isFullscreen()) {
    await document.exitFullscreen()
  } else {
    await document.documentElement.requestFullscreen()
  }
}

interface TargetingOpt {
  mode: TargetingMode
  icon: string
  labelKey: 'targetNearest' | 'targetWeakest' | 'targetStrongest' | 'targetRandom'
  descKey:  'targetNearestDesc' | 'targetWeakestDesc' | 'targetStrongestDesc' | 'targetRandomDesc'
}

const TARGETING_OPTS: TargetingOpt[] = [
  { mode: 'nearest',   icon: 'crosshair',     labelKey: 'targetNearest',   descKey: 'targetNearestDesc' },
  { mode: 'weakest',   icon: 'trending-down', labelKey: 'targetWeakest',   descKey: 'targetWeakestDesc' },
  { mode: 'strongest', icon: 'trending-up',   labelKey: 'targetStrongest', descKey: 'targetStrongestDesc' },
  { mode: 'random',    icon: 'shuffle',       labelKey: 'targetRandom',    descKey: 'targetRandomDesc' },
]

export interface SettingsButtonOptions {
  /** Called when the zoom level changes from the settings modal. */
  onZoomChange?: (zoom: number) => void
  /** Returns the current targeting mode (called when the targeting modal opens). */
  getTargetingMode?: () => TargetingMode
  /** Called when the user selects a new targeting mode. */
  onTargetingChange?: (mode: TargetingMode) => void
  /** Cheat mode only: skips all requirements and immediately ascends. */
  onForceAscend?: () => void
  /** Cheat mode only: adds 60 seconds of ×2 speed stockpile for easy testing. */
  onAddFastForwardTime?: () => void
  /** Cheat mode only: despawns the current wave and forces a boss wave. */
  onSpawnBoss?: () => void
}

export function mountSettingsButton(
  container: HTMLElement,
  modalRoot: HTMLElement = container,
  opts: SettingsButtonOptions = {},
): () => void {
  const btn = document.createElement('button')
  btn.className = 'settings-btn'
  btn.setAttribute('aria-label', t('settings', 'title'))
  btn.setAttribute('data-tooltip', t('settings', 'title'))
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
        <button class="modal-close-btn" data-action="close" aria-label="${t('settings', 'close')}"></button>
        <h2 class="modal-title" id="settings-title">${t('settings', 'title')}</h2>
        <div class="settings-top-buttons">
          <button class="settings-top-btn" data-action="guide" aria-label="${t('settings', 'guide')}">
            <i data-lucide="book-open" aria-hidden="true"></i>
          </button>
          <button class="settings-top-btn settings-top-btn--discord" data-action="discord" aria-label="${t('settings', 'discord')}">
            <img src="${baseUrl}ui/discord-mark.svg" alt="" aria-hidden="true" class="discord-icon">
          </button>
          <button class="settings-top-btn" data-action="language" aria-label="${t('settings', 'languageTitle')}">
            <span class="${LOCALE_FLAG_CLASS[locale]} settings-flag-icon" role="img" aria-label="${t('settings', LOCALE_NAME_KEY[locale])}"></span>
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
          <label class="settings-toggle-row">
            <span class="modal-label">${t('settings', 'fullscreen')}</span>
            <input type="checkbox" class="settings-toggle-input" data-action="fullscreen" ${isFullscreen() ? 'checked' : ''}>
            <span class="settings-toggle-track" aria-hidden="true"></span>
          </label>
        </div>
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
        <div class="modal-field">
          <button class="settings-section-btn" data-action="reset-tutorials">
            <span>${t('settings', 'resetTutorials')}</span>
          </button>
        </div>
        <div class="modal-field">
          <button class="settings-section-btn" data-action="save-data">
            <i data-lucide="save" aria-hidden="true"></i>
            <span>${t('settings', 'saveData')}</span>
          </button>
        </div>
        ${isCheatMode() ? `
        <div class="modal-field">
          <label class="settings-toggle-row">
            <span class="modal-label">${t('settings', 'fullMastery')}</span>
            <input type="checkbox" class="settings-toggle-input" data-pref="fullMastery" ${prefs.fullMastery ? 'checked' : ''}>
            <span class="settings-toggle-track" aria-hidden="true"></span>
          </label>
        </div>
        ${opts.onForceAscend ? `
        <div class="modal-field">
          <button class="settings-section-btn settings-section-btn--cheat" data-action="force-ascend">
            <span>Force Ascend</span>
          </button>
        </div>` : ''}
        ${opts.onAddFastForwardTime ? `
        <div class="modal-field">
          <button class="settings-section-btn settings-section-btn--cheat" data-action="add-ff-time">
            <span>+1 min ×2 speed</span>
          </button>
        </div>` : ''}
        ${opts.onSpawnBoss ? `
        <div class="modal-field">
          <button class="settings-section-btn settings-section-btn--cheat" data-action="spawn-boss">
            <span>Spawn boss wave</span>
          </button>
        </div>` : ''}` : ''}
      </div>
    `
    createIcons({ icons: { BookOpen, Plus, Minus, Crosshair, Save } })

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

    backdrop.querySelector<HTMLInputElement>('[data-action="fullscreen"]')!
      .addEventListener('change', () => { toggleFullscreen().catch(() => render()) })

    backdrop.querySelector<HTMLButtonElement>('[data-action="guide"]')!
      .addEventListener('click', () => {
        closeSub()
        subCleanup = mountGuideModal(parent, () => { subCleanup = null })
      })

    backdrop.querySelector<HTMLButtonElement>('[data-action="discord"]')!
      .addEventListener('click', () => {
        window.open('https://discord.gg/VWMXddNAFn', '_blank', 'noopener,noreferrer')
      })

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

    backdrop.querySelector<HTMLButtonElement>('[data-action="force-ascend"]')
      ?.addEventListener('click', () => {
        closeSub()
        backdrop.remove()
        onClose()
        opts.onForceAscend!()
      })

    backdrop.querySelector<HTMLButtonElement>('[data-action="add-ff-time"]')
      ?.addEventListener('click', () => {
        opts.onAddFastForwardTime!()
      })

    backdrop.querySelector<HTMLButtonElement>('[data-action="spawn-boss"]')
      ?.addEventListener('click', () => {
        opts.onSpawnBoss!()
      })

    backdrop.querySelector<HTMLButtonElement>('[data-action="reset-tutorials"]')
      ?.addEventListener('click', (e) => {
        const btn = e.currentTarget as HTMLButtonElement
        const label = btn.querySelector('span')!
        const original = label.textContent
        setPref('seenTutorials', [])
        setPref('tutorialDisabled', false)
        label.textContent = '✓'
        btn.disabled = true
        setTimeout(() => {
          label.textContent = original
          btn.disabled = false
        }, 1200)
      })

    backdrop.querySelector<HTMLButtonElement>('[data-action="save-data"]')!
      .addEventListener('click', () => {
        closeSub()
        subCleanup = mountSaveDataModal(parent, () => { subCleanup = null })
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

  const onFullscreenChange = (): void => { render() }
  document.addEventListener('fullscreenchange', onFullscreenChange)

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) { closeSub(); backdrop.remove(); onClose() }
  })

  return () => {
    closeSub(); backdrop.remove()
    document.removeEventListener('fullscreenchange', onFullscreenChange)
  }
}

function mountLanguageModal(
  parent: HTMLElement,
  onClose: () => void,
  onChange: () => void,
): () => void {
  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop settings-submodal-backdrop'
  const locale = getLocale()

  backdrop.innerHTML = `
    <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="lang-title">
      <button class="modal-close-btn" data-action="close" aria-label="${t('settings', 'close')}"></button>
      <h2 class="modal-title" id="lang-title">${t('settings', 'languageTitle')}</h2>
      <div class="lang-options">
        ${SUPPORTED_LOCALES.map(l => `
          <button class="lang-option${l === locale ? ' lang-option--active' : ''}" data-locale="${l}">
            <span class="${LOCALE_FLAG_CLASS[l]} lang-option-flag" role="img" aria-label="${t('settings', LOCALE_NAME_KEY[l])}"></span>
            <span class="lang-option-name">${t('settings', LOCALE_NAME_KEY[l])}</span>
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

// ── Save data (import / export) modal ──────────────────────────────────────

function copyText(text: string): void {
  // Prefer the async Clipboard API; fall back to a hidden textarea + execCommand
  // for older webviews or insecure contexts where it is unavailable.
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => copyViaTextarea(text))
    return
  }
  copyViaTextarea(text)
}

function copyViaTextarea(text: string): void {
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  try { document.execCommand('copy') } catch { /* nothing more we can do */ }
  ta.remove()
}

function mountSaveDataModal(parent: HTMLElement, onClose: () => void): () => void {
  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop settings-submodal-backdrop'

  backdrop.innerHTML = `
    <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="save-data-title">
      <button class="modal-close-btn" data-action="close" aria-label="${t('settings', 'close')}"></button>
      <h2 class="modal-title" id="save-data-title">${t('settings', 'saveData')}</h2>
      <p class="save-data-desc">${t('settings', 'saveDataDesc')}</p>
      <div class="modal-field">
        <button class="modal-btn modal-btn--primary save-data-export-btn" data-action="export">${t('settings', 'exportSave')}</button>
      </div>
      <div class="modal-field">
        <label class="modal-label" for="save-import-input">${t('settings', 'importLabel')}</label>
        <textarea id="save-import-input" class="modal-input modal-textarea" rows="3"
          placeholder="${t('settings', 'importPlaceholder')}" autocomplete="off" spellcheck="false"></textarea>
        <span class="modal-input-error" aria-live="polite"></span>
      </div>
      <div class="modal-actions">
        <button class="modal-btn modal-btn--primary" data-action="import" disabled>${t('settings', 'importBtn')}</button>
      </div>
    </div>
  `

  parent.appendChild(backdrop)

  const close = (): void => { backdrop.remove(); onClose() }

  backdrop.querySelector<HTMLButtonElement>('[data-action="close"]')!
    .addEventListener('click', close)
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close() })

  const exportBtn = backdrop.querySelector<HTMLButtonElement>('[data-action="export"]')!
  exportBtn.addEventListener('click', () => {
    copyText(exportSaveCode())
    const original = exportBtn.textContent
    exportBtn.textContent = t('settings', 'exportCopied')
    exportBtn.disabled = true
    setTimeout(() => { exportBtn.textContent = original; exportBtn.disabled = false }, 1200)
  })

  const importInput = backdrop.querySelector<HTMLTextAreaElement>('#save-import-input')!
  const importBtn = backdrop.querySelector<HTMLButtonElement>('[data-action="import"]')!
  const errorMsg = backdrop.querySelector<HTMLElement>('.modal-input-error')!

  importInput.addEventListener('input', () => {
    importBtn.disabled = importInput.value.trim().length === 0
    errorMsg.textContent = ''
  })

  importBtn.addEventListener('click', () => {
    if (!importSaveCode(importInput.value)) {
      errorMsg.textContent = t('settings', 'importError')
      return
    }
    // Rebuild the scene so the imported characters take effect immediately.
    close()
    navigate('menu')
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
      <button class="modal-close-btn" data-action="close" aria-label="${t('settings', 'close')}"></button>
      <h2 class="modal-title" id="targeting-title">${t('game', 'targetingTitle')}</h2>
      <div class="targeting-options">
        ${TARGETING_OPTS.map(o => `
          <button class="targeting-opt${currentMode === o.mode ? ' targeting-opt--active' : ''}" data-targeting="${o.mode}">
            <i data-lucide="${o.icon}" aria-hidden="true"></i>
            <span class="targeting-opt-name">${t('game', o.labelKey)}</span>
            <small class="targeting-opt-desc">${t('game', o.descKey)}</small>
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

interface GuideSection {
  // English title — stable lookup key (used by tutorials' guideSection option
  // and by openGuide()); never changes across locales.
  id:    string
  title: string
  body:  string
}

function parseGuideSections(md: string): GuideSection[] {
  const sections: GuideSection[] = []
  let currentTitle = ''
  let bodyLines: string[] = []
  for (const line of md.split('\n')) {
    if (line.startsWith('## ')) {
      if (currentTitle) sections.push({ id: currentTitle, title: currentTitle, body: bodyLines.join('\n').trim() })
      currentTitle = line.slice(3).trim()
      bodyLines = []
    } else if (currentTitle) {
      bodyLines.push(line)
    }
  }
  if (currentTitle) sections.push({ id: currentTitle, title: currentTitle, body: bodyLines.join('\n').trim() })
  return sections
}

function localizedGuideSections(): GuideSection[] {
  const locale = getLocale()
  return parseGuideSections(guideContent).map(s => {
    const tr = getGuideTranslation(locale, s.id)
    if (!tr) return s
    return { id: s.id, title: tr.title ?? s.title, body: tr.body ?? s.body }
  })
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

export function mountGuideModal(parent: HTMLElement, onClose: () => void, openSection?: string): () => void {
  const baseUrl = (import.meta as { env: { BASE_URL: string } }).env.BASE_URL
  const arrowSrc = `${baseUrl}ui/kenney_ui-pack-rpg-expansion/PNG/arrowBlue_right.png`
  const sections = localizedGuideSections()

  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop settings-submodal-backdrop'

  const panel = document.createElement('div')
  panel.className = 'modal-panel guide-panel'
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-modal', 'true')
  panel.setAttribute('aria-labelledby', 'guide-title')
  panel.innerHTML = `
    <button class="modal-close-btn" data-action="close" aria-label="${t('settings', 'close')}"></button>
    <h2 class="modal-title" id="guide-title">${t('guide', 'title')}</h2>
    <div class="guide-sections"></div>
  `

  const sectionsEl = panel.querySelector<HTMLElement>('.guide-sections')!
  sections.forEach(({ id, title, body }) => {
    const section = document.createElement('div')
    section.className = 'guide-section'

    const btn = document.createElement('button')
    btn.className = 'guide-section-btn'
    btn.setAttribute('aria-expanded', 'false')
    btn.dataset['sectionId'] = id
    btn.innerHTML = `
      <span class="guide-section-title">${title}</span>
      <img class="guide-section-arrow" src="${arrowSrc}" alt="" aria-hidden="true">
    `

    const bodyEl = document.createElement('div')
    bodyEl.className = 'guide-section-body'
    bodyEl.hidden = true
    bodyEl.innerHTML = linkifyHtml(renderGuideBody(body))

    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') === 'true'
      btn.setAttribute('aria-expanded', open ? 'false' : 'true')
      bodyEl.hidden = open
    })

    section.append(btn, bodyEl)
    sectionsEl.appendChild(section)
  })

  if (openSection) {
    const match = sectionsEl.querySelector<HTMLElement>(
      `.guide-section-btn[data-section-id="${CSS.escape(openSection)}"]`,
    )
    if (match) {
      match.setAttribute('aria-expanded', 'true')
      const body = match.nextElementSibling as HTMLElement | null
      if (body) body.hidden = false
      match.scrollIntoView({ block: 'nearest' })
    }
  }

  backdrop.appendChild(panel)
  parent.appendChild(backdrop)

  let noteSubCleanup: (() => void) | null = null
  const closeNoteSub = (): void => { if (noteSubCleanup) { noteSubCleanup(); noteSubCleanup = null } }

  sectionsEl.addEventListener('click', (e) => {
    const link = (e.target as HTMLElement).closest<HTMLElement>('[data-note-id]')
    if (!link) return
    e.stopPropagation()
    closeNoteSub()
    noteSubCleanup = mountNoteModal(parent, link.dataset['noteId']!, () => { noteSubCleanup = null })
  })

  panel.querySelector<HTMLButtonElement>('[data-action="close"]')!
    .addEventListener('click', () => { closeNoteSub(); backdrop.remove(); onClose() })

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) { closeNoteSub(); backdrop.remove(); onClose() }
  })

  return () => { closeNoteSub(); backdrop.remove() }
}
