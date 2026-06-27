import { t } from '../i18n'
import { showRewardedAd, type AdLifecycle } from '../ads'
import { playSound } from '../audio'
import { trackEvent } from '../core/analytics'

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
  ascentCount: number,
  onClose: () => void,
  // Called if the user watches the rewarded ad — adds `bonusMs` (= earnedMs)
  // on top of the amount already credited before this modal opened.
  onDoubled?: (bonusMs: number) => void,
  // Pause/resume hooks forwarded to the ad SDK around playback.
  adLifecycle?: AdLifecycle,
): () => void {
  currentTeardown?.()
  currentTeardown = null

  // Ad mode (onDoubled provided) shows a "watch ad to double" button; otherwise
  // the modal is informational and the reward (already at its full value) is
  // simply acknowledged.
  const canDouble = onDoubled !== undefined

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
        ${canDouble ? `<button class="away-bonus-watch-ad-btn" data-action="watch-ad">${t('awayBonus', 'watchAd')}</button>` : ''}
        <button class="away-bonus-close-btn" data-action="close">${t('awayBonus', canDouble ? 'close' : 'continue')}</button>
      </div>
    </div>
  `

  const teardown = (): void => { backdrop.remove(); currentTeardown = null }
  // Without an ad on offer this is a purely informational "welcome back" — the
  // reward is already credited, so closing isn't a skip.
  const dismiss  = (): void => { trackEvent('away_bonus', { outcome: canDouble ? 'ad_skipped' : 'auto_granted', ascent: String(ascentCount) }); playSound('modal.close'); teardown(); onClose() }
  backdrop.querySelectorAll<HTMLButtonElement>('[data-action="close"]').forEach(btn => {
    btn.addEventListener('click', dismiss)
  })
  const watchBtn = backdrop.querySelector<HTMLButtonElement>('[data-action="watch-ad"]')
  watchBtn?.addEventListener('click', async () => {
    watchBtn.disabled = true
    watchBtn.classList.add('away-bonus-watch-ad-btn--loading')
    const watched = await showRewardedAd(adLifecycle)
    teardown()
    trackEvent('away_bonus', { outcome: watched ? 'ad_watched' : 'ad_skipped', ascent: String(ascentCount) })
    if (watched && onDoubled) onDoubled(earnedMs)
    onClose()
  })
  backdrop.addEventListener('click', e => { if (e.target === backdrop) dismiss() })

  playSound('modal.open')
  parent.appendChild(backdrop)
  currentTeardown = teardown
  return teardown
}
