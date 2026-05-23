import { t } from '../i18n'
import { showRewardedAd } from '../ads'

function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  if (totalSec < 60) return `${totalSec}s`
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

let currentTeardown: (() => void) | null = null

export function mountAwayBonusModal(
  parent: HTMLElement,
  awayMs: number,
  earnedMs: number,
  onClose: () => void,
  // Called if the user watches the rewarded ad — adds `bonusMs` (= earnedMs)
  // on top of the amount already credited before this modal opened.
  onDoubled?: (bonusMs: number) => void,
): () => void {
  currentTeardown?.()
  currentTeardown = null

  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop away-bonus-backdrop'

  const body = t('awayBonus', 'body')
    .replace('{away}',   formatDuration(awayMs))
    .replace('{earned}', formatDuration(earnedMs))

  backdrop.innerHTML = `
    <div class="modal-panel away-bonus-panel" role="dialog" aria-modal="true" aria-labelledby="away-bonus-title">
      <button class="modal-close-btn" data-action="close" aria-label="${t('awayBonus', 'close')}"></button>
      <h2 class="modal-title" id="away-bonus-title">${t('awayBonus', 'title')}</h2>
      <p class="away-bonus-body">${body}</p>
      <div class="away-bonus-actions">
        <button class="away-bonus-watch-ad-btn" data-action="watch-ad">${t('awayBonus', 'watchAd')}</button>
        <button class="away-bonus-close-btn"    data-action="close">${t('awayBonus', 'close')}</button>
      </div>
    </div>
  `

  const teardown = (): void => { backdrop.remove(); currentTeardown = null }
  const dismiss  = (): void => { teardown(); onClose() }
  backdrop.querySelectorAll<HTMLButtonElement>('[data-action="close"]').forEach(btn => {
    btn.addEventListener('click', dismiss)
  })
  const watchBtn = backdrop.querySelector<HTMLButtonElement>('[data-action="watch-ad"]')!
  watchBtn.addEventListener('click', async () => {
    watchBtn.disabled = true
    watchBtn.classList.add('away-bonus-watch-ad-btn--loading')
    const watched = await showRewardedAd()
    teardown()
    if (watched && onDoubled) onDoubled(earnedMs)
    onClose()
  })
  backdrop.addEventListener('click', e => { if (e.target === backdrop) dismiss() })

  parent.appendChild(backdrop)
  currentTeardown = teardown
  return teardown
}
