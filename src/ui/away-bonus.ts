import { t } from '../i18n'

function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  if (totalSec < 60) return `${totalSec}s`
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

export function mountAwayBonusModal(
  parent: HTMLElement,
  awayMs: number,
  earnedMs: number,
  onClose: () => void,
): () => void {
  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop away-bonus-backdrop'

  const body = t('awayBonus', 'body')
    .replace('{away}', formatDuration(awayMs))
    .replace('{earned}', formatDuration(earnedMs))

  backdrop.innerHTML = `
    <div class="modal-panel away-bonus-panel" role="dialog" aria-modal="true" aria-labelledby="away-bonus-title">
      <button class="modal-close-btn" data-action="close" aria-label="${t('awayBonus', 'close')}"></button>
      <h2 class="modal-title" id="away-bonus-title">${t('awayBonus', 'title')}</h2>
      <p class="away-bonus-body">${body}</p>
      <button class="away-bonus-close-btn" data-action="close">${t('awayBonus', 'close')}</button>
    </div>
  `

  const dismiss = (): void => { backdrop.remove(); onClose() }
  backdrop.querySelectorAll<HTMLButtonElement>('[data-action="close"]').forEach(btn => {
    btn.addEventListener('click', dismiss)
  })
  backdrop.addEventListener('click', e => { if (e.target === backdrop) dismiss() })

  parent.appendChild(backdrop)
  return () => backdrop.remove()
}
