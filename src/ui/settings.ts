import 'flag-icons/css/flag-icons.min.css'
import { createIcons, Settings, BookOpen } from 'lucide'
import { t, setLocale, getLocale, type Locale } from '../i18n'
import { getCurrentSceneId, navigate } from '../core/router'
import { getPrefs, setPref } from '../core/prefs'
import guideContent from '../config/guide.md?raw'

const LOCALE_FLAG_CLASS: Record<Locale, string> = {
  en: 'fi fi-gb',
  fr: 'fi fi-fr',
}

export function mountSettingsButton(container: HTMLElement, modalRoot: HTMLElement = container): () => void {
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
    modalCleanup = mountSettingsModal(modalRoot, closeModal)
    document.addEventListener('keydown', onEscape)
  })

  return () => { closeModal(); btn.remove() }
}

function mountSettingsModal(parent: HTMLElement, onClose: () => void): () => void {
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
        <div class="modal-field">
          <label class="settings-toggle-row">
            <span class="modal-label">${t('settings', 'showDamageNumbers')}</span>
            <input type="checkbox" class="settings-toggle-input" data-pref="showDamageNumbers" ${prefs.showDamageNumbers ? 'checked' : ''}>
            <span class="settings-toggle-track" aria-hidden="true"></span>
          </label>
        </div>
      </div>
    `
    createIcons({ icons: { BookOpen } })

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
