import { t } from '../i18n'
import { showRewardedAd } from '../ads'
import { playSound } from '../audio'
import { trackEvent } from '../core/analytics'

let currentTeardown: (() => void) | null = null

/**
 * Offered when the ×2-speed stockpile drains to zero. If the user opts to
 * watch the rewarded ad, `onRefill(addedMs)` is invoked with the bonus
 * duration to credit (30 min by default in the caller).
 */
export function mountRefillAdModal(
  parent: HTMLElement,
  rewardMs: number,
  ascentCount: number,
  onRefill: (addedMs: number) => void,
  onClose: () => void,
): () => void {
  currentTeardown?.()
  currentTeardown = null

  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop away-bonus-backdrop'

  backdrop.innerHTML = `
    <div class="modal-panel away-bonus-panel" role="dialog" aria-modal="true" aria-labelledby="refill-ad-title">
      <button class="modal-close-btn" data-action="skip" aria-label="${t('refillAd', 'skip')}"></button>
      <h2 class="modal-title" id="refill-ad-title">${t('refillAd', 'title')}</h2>
      <p class="away-bonus-body">${t('refillAd', 'body')}</p>
      <div class="away-bonus-actions">
        <button class="away-bonus-watch-ad-btn" data-action="watch-ad">${t('refillAd', 'watchAd')}</button>
        <button class="away-bonus-close-btn"    data-action="skip">${t('refillAd', 'skip')}</button>
      </div>
    </div>
  `

  const teardown = (): void => { backdrop.remove(); currentTeardown = null }
  const dismiss  = (): void => { trackEvent('x2_speed_refill', { outcome: 'ad_skipped', ascent: String(ascentCount) }); playSound('modal.close'); teardown(); onClose() }

  backdrop.querySelectorAll<HTMLButtonElement>('[data-action="skip"]').forEach(btn => {
    btn.addEventListener('click', dismiss)
  })
  const watchBtn = backdrop.querySelector<HTMLButtonElement>('[data-action="watch-ad"]')!
  watchBtn.addEventListener('click', async () => {
    watchBtn.disabled = true
    watchBtn.classList.add('away-bonus-watch-ad-btn--loading')
    const watched = await showRewardedAd()
    teardown()
    trackEvent('x2_speed_refill', { outcome: watched ? 'ad_watched' : 'ad_skipped', ascent: String(ascentCount) })
    if (watched) onRefill(rewardMs)
    onClose()
  })
  backdrop.addEventListener('click', e => { if (e.target === backdrop) dismiss() })

  playSound('modal.open')
  parent.appendChild(backdrop)
  currentTeardown = teardown
  return teardown
}
