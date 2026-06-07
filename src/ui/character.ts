import { t } from '../i18n'
import { playSound } from '../audio'

export function mountCharacterModal(
  parent: HTMLElement,
  opts: {
    onDie:        () => void
    onCustomize:  () => void
    onStats:      () => void
    onClose:      () => void
  },
): () => void {
  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop char-modal-backdrop'
  backdrop.innerHTML = `
    <div class="modal-panel char-modal-panel" role="dialog" aria-modal="true" aria-labelledby="char-modal-title">
      <button class="modal-close-btn" data-action="close" aria-label="${t('settings', 'close')}"></button>
      <h2 class="modal-title" id="char-modal-title">Main Character</h2>
      <div class="char-modal-actions">
        <button class="modal-btn modal-btn--ghost char-modal-btn" data-action="customize">Customize</button>
        <button class="modal-btn modal-btn--ghost char-modal-btn" data-action="stats">Stats</button>
        <button class="modal-btn modal-btn--danger char-modal-btn" data-action="die">${t('game', 'dieRebirth')}</button>
      </div>
    </div>
  `

  playSound('modal.open')
  parent.appendChild(backdrop)

  const dismiss = (): void => {
    playSound('modal.close')
    backdrop.remove()
    opts.onClose()
  }

  backdrop.querySelector<HTMLButtonElement>('[data-action="close"]')!
    .addEventListener('click', dismiss)
  backdrop.addEventListener('click', e => { if (e.target === backdrop) dismiss() })

  backdrop.querySelector<HTMLButtonElement>('[data-action="die"]')!
    .addEventListener('click', () => {
      backdrop.remove()
      opts.onClose()
      opts.onDie()
    })

  backdrop.querySelector<HTMLButtonElement>('[data-action="customize"]')!
    .addEventListener('click', () => {
      backdrop.remove()
      opts.onClose()
      opts.onCustomize()
    })

  backdrop.querySelector<HTMLButtonElement>('[data-action="stats"]')!
    .addEventListener('click', () => {
      backdrop.remove()
      opts.onClose()
      opts.onStats()
    })

  return () => backdrop.remove()
}
