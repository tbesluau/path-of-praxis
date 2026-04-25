import { createIcons, Settings } from 'lucide'
import { t, setLocale, getLocale, type Locale } from '../i18n'
import { getCurrentSceneId, navigate } from '../core/router'

export function mountSettingsButton(container: HTMLElement): void {
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
    modalCleanup = mountSettingsModal(container, closeModal)
    document.addEventListener('keydown', onEscape)
  })
}

function mountSettingsModal(parent: HTMLElement, onClose: () => void): () => void {
  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop settings-modal-backdrop'

  function render(): void {
    const locale = getLocale()
    backdrop.innerHTML = `
      <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <h2 class="modal-title" id="settings-title">${t('settings', 'title')}</h2>
        <div class="modal-field">
          <span class="modal-label">${t('settings', 'language')}</span>
          <div class="lang-options">
            <button class="lang-option${locale === 'en' ? ' lang-option--active' : ''}" data-locale="en">
              ${t('settings', 'langEn')}
            </button>
            <button class="lang-option${locale === 'fr' ? ' lang-option--active' : ''}" data-locale="fr">
              ${t('settings', 'langFr')}
            </button>
          </div>
        </div>
        <div class="modal-actions">
          <button class="modal-btn modal-btn--ghost" data-action="close">${t('settings', 'close')}</button>
        </div>
      </div>
    `

    backdrop.querySelector<HTMLButtonElement>('[data-action="close"]')!
      .addEventListener('click', () => { backdrop.remove(); onClose() })

    backdrop.querySelectorAll<HTMLButtonElement>('[data-locale]').forEach(btn => {
      btn.addEventListener('click', () => {
        const next = btn.dataset['locale'] as Locale
        if (next !== getLocale()) {
          setLocale(next)
          const scene = getCurrentSceneId()
          if (scene) navigate(scene)
        }
        backdrop.remove()
        onClose()
      })
    })
  }

  render()
  parent.appendChild(backdrop)

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) { backdrop.remove(); onClose() }
  })

  return () => backdrop.remove()
}
