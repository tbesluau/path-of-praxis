import { t } from '../i18n'
import { playSound } from '../audio'

export function mountCharacterStatsModal(
  parent: HTMLElement,
  opts: { onClose: () => void },
): () => void {
  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop char-modal-backdrop'
  backdrop.innerHTML = `
    <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="char-stats-title">
      <button class="modal-close-btn" data-action="close" aria-label="${t('settings', 'close')}"></button>
      <h2 class="modal-title" id="char-stats-title">Stats</h2>
      <p class="char-stats-placeholder">Coming soon…</p>
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

  return () => backdrop.remove()
}
