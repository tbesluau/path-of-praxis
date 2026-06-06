import { t } from '../i18n'
import privacyRaw from '../config/privacy.md?raw'
import eulaRaw from '../config/eula.md?raw'
import { inline, renderMarkdown } from './about'
import { playSound } from '../audio'

// Sub-modal: renders the full markdown for one legal document.
// Stays open until the user explicitly closes it; clicking the backdrop
// closes only this sub-modal, never the parent gate.
function mountLegalSubModal(
  parent: HTMLElement,
  title: string,
  markdown: string,
  onClose: () => void,
): () => void {
  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop settings-submodal-backdrop terms-sub-backdrop'

  const body = renderMarkdown(markdown)

  backdrop.innerHTML = `
    <div class="modal-panel about-panel" role="dialog" aria-modal="true" aria-labelledby="terms-sub-title">
      <button class="modal-close-btn" data-action="close" aria-label="${t('settings', 'close')}"></button>
      <h2 class="modal-title" id="terms-sub-title">${inline(title)}</h2>
      <div class="about-body">${body}</div>
    </div>
  `

  playSound('modal.open')
  parent.appendChild(backdrop)

  const teardown = (): void => { backdrop.remove() }
  const dismiss = (): void => { playSound('modal.close'); teardown(); onClose() }

  backdrop.querySelector<HTMLButtonElement>('[data-action="close"]')!
    .addEventListener('click', dismiss)

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) dismiss()
  })

  return teardown
}

export function mountTermsAcceptanceModal(
  parent: HTMLElement,
  onAccept: () => void,
): () => void {
  const backdrop = document.createElement('div')
  // No close button, no Escape, no click-outside dismiss — acceptance is mandatory.
  backdrop.className = 'modal-backdrop terms-backdrop'

  const privacyLinkHtml = `<button type="button" class="terms-link" data-action="open-privacy" data-sfx="modal">${inline(t('terms', 'privacyLink'))}</button>`
  const eulaLinkHtml = `<button type="button" class="terms-link" data-action="open-eula" data-sfx="modal">${inline(t('terms', 'eulaLink'))}</button>`

  const privacyLabelHtml = inline(t('terms', 'privacyLabel')).replace('{link}', privacyLinkHtml)
  const eulaLabelHtml = inline(t('terms', 'eulaLabel')).replace('{link}', eulaLinkHtml)

  backdrop.innerHTML = `
    <div class="modal-panel terms-panel" role="dialog" aria-modal="true" aria-labelledby="terms-title" aria-describedby="terms-intro">
      <h2 class="modal-title" id="terms-title">${inline(t('terms', 'title'))}</h2>
      <p class="terms-intro" id="terms-intro">${inline(t('terms', 'intro'))}</p>
      <div class="terms-checklist">
        <label class="terms-check-row">
          <input type="checkbox" class="terms-checkbox" data-doc="privacy">
          <span class="terms-check-label">${privacyLabelHtml}</span>
        </label>
        <label class="terms-check-row">
          <input type="checkbox" class="terms-checkbox" data-doc="eula">
          <span class="terms-check-label">${eulaLabelHtml}</span>
        </label>
      </div>
      <div class="modal-actions terms-actions">
        <button class="modal-btn modal-btn--primary terms-continue" data-action="continue" disabled>${inline(t('terms', 'continue'))}</button>
      </div>
    </div>
  `

  parent.appendChild(backdrop)

  let subCleanup: (() => void) | null = null
  const closeSub = (): void => { if (subCleanup) { subCleanup(); subCleanup = null } }

  const checkboxes = Array.from(backdrop.querySelectorAll<HTMLInputElement>('.terms-checkbox'))
  const continueBtn = backdrop.querySelector<HTMLButtonElement>('[data-action="continue"]')!

  function refreshContinue(): void {
    continueBtn.disabled = !checkboxes.every(cb => cb.checked)
  }

  checkboxes.forEach(cb => cb.addEventListener('change', refreshContinue))

  // Link buttons live inside <label>; the label would toggle the checkbox
  // when clicked. Stop the click from reaching the label.
  backdrop.querySelectorAll<HTMLButtonElement>('.terms-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      const doc = link.dataset.action === 'open-privacy' ? 'privacy' : 'eula'
      const title = doc === 'privacy' ? t('terms', 'privacyTitle') : t('terms', 'eulaTitle')
      const md = doc === 'privacy' ? privacyRaw : eulaRaw
      closeSub()
      subCleanup = mountLegalSubModal(parent, title, md, () => { subCleanup = null })
    })
  })

  continueBtn.addEventListener('click', () => {
    if (continueBtn.disabled) return
    closeSub()
    backdrop.remove()
    onAccept()
  })

  // Block backdrop-click dismissal: gate is mandatory.
  backdrop.addEventListener('click', (e) => { e.stopPropagation() })

  return () => { closeSub(); backdrop.remove() }
}
