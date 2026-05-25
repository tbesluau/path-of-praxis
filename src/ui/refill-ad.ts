import { t } from '../i18n'
import { isPaid } from '../core/entitlement'
import { showRewardedAd } from '../ads'

let currentTeardown: (() => void) | null = null

/**
 * Offered when the ×2-speed stockpile drains to zero. If the user opts to
 * watch the rewarded ad, `onRefill(addedMs)` is invoked with the bonus
 * duration to credit (30 min by default in the caller).
 * In paid mode the ad is skipped — the reward is granted immediately and
 * there is no "No thanks" button.
 */
export function mountRefillAdModal(
  parent: HTMLElement,
  rewardMs: number,
  onRefill: (addedMs: number) => void,
  onClose: () => void,
): () => void {
  currentTeardown?.()
  currentTeardown = null

  const paid = isPaid()

  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop away-bonus-backdrop'

  backdrop.innerHTML = `
    <div class="modal-panel away-bonus-panel" role="dialog" aria-modal="true" aria-labelledby="refill-ad-title">
      <button class="modal-close-btn" data-action="skip" aria-label="${t('refillAd', 'skip')}"></button>
      <h2 class="modal-title" id="refill-ad-title">${t('refillAd', 'title')}</h2>
      <p class="away-bonus-body">${t('refillAd', 'body')}</p>
      <div class="away-bonus-actions">
        <button class="away-bonus-watch-ad-btn" data-action="claim">${paid ? t('refillAd', 'claim') : t('refillAd', 'watchAd')}</button>
        ${paid ? '' : `<button class="away-bonus-close-btn" data-action="skip">${t('refillAd', 'skip')}</button>`}
      </div>
    </div>
  `

  const teardown = (): void => { backdrop.remove(); currentTeardown = null }
  const dismiss  = (): void => { teardown(); onClose() }

  backdrop.querySelectorAll<HTMLButtonElement>('[data-action="skip"]').forEach(btn => {
    btn.addEventListener('click', dismiss)
  })

  const claimBtn = backdrop.querySelector<HTMLButtonElement>('[data-action="claim"]')!
  if (paid) {
    claimBtn.addEventListener('click', () => {
      teardown()
      onRefill(rewardMs)
      onClose()
    })
  } else {
    claimBtn.addEventListener('click', async () => {
      claimBtn.disabled = true
      claimBtn.classList.add('away-bonus-watch-ad-btn--loading')
      const watched = await showRewardedAd()
      teardown()
      if (watched) onRefill(rewardMs)
      onClose()
    })
  }

  backdrop.addEventListener('click', e => { if (e.target === backdrop) dismiss() })

  parent.appendChild(backdrop)
  currentTeardown = teardown
  return teardown
}
