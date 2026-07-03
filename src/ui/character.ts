import { t } from '../i18n'
import { playSound } from '../audio'
import { balance } from '../config/balance'
import type { RelicId } from '../config/relics'

const RELIC_NAME_KEY: Record<RelicId, 'relicFreeRebirth' | 'relicMultiAscend' | 'relicExtraTrigger' | 'relicOnslaught'> = {
  freeRebirth:  'relicFreeRebirth',
  multiAscend:  'relicMultiAscend',
  extraTrigger: 'relicExtraTrigger',
  onslaught:    'relicOnslaught',
}

export function mountCharacterModal(
  parent: HTMLElement,
  opts: {
    // Label for the die button — "Rebirth" while the freeRebirth relic is armed.
    dieLabel:       string
    transcendCount: number
    relics:         RelicId[]
    onDie:        () => void
    onCustomize:  () => void
    onStats:      () => void
    onClose:      () => void
  },
): () => void {
  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop char-modal-backdrop'

  const pct = (rate: number): string => String(Math.round(opts.transcendCount * rate * 100))
  const transcendHtml = (opts.transcendCount > 0 || opts.relics.length > 0) ? `
      <div class="char-transcend-section">
        <div class="char-transcend-power">
          <span class="char-transcend-title">${t('transcend', 'powerLabel').replace('{n}', String(opts.transcendCount))}</span>
          ${opts.transcendCount > 0 ? `<span class="char-transcend-summary">${
            t('transcend', 'powerSummary')
              .replace('{xp}', pct(balance.transcend.xpPerTranscend))
              .replace('{dmg}', pct(balance.transcend.damagePerTranscend))
              .replace('{life}', pct(balance.transcend.maxLifePerTranscend))
          }</span>` : ''}
        </div>
        ${opts.relics.length > 0 ? `
          <div class="char-transcend-relics">
            <span class="char-transcend-relics-label">${t('transcend', 'relicsLabel')}</span>
            ${opts.relics.map(r => `<span class="char-transcend-relic">${t('transcend', RELIC_NAME_KEY[r])}</span>`).join('')}
          </div>` : ''}
      </div>` : ''

  backdrop.innerHTML = `
    <div class="modal-panel char-modal-panel" role="dialog" aria-modal="true" aria-labelledby="char-modal-title">
      <button class="modal-close-btn" data-action="close" aria-label="${t('settings', 'close')}"></button>
      <h2 class="modal-title" id="char-modal-title">Main Character</h2>
      <div class="char-modal-actions">
        <button class="modal-btn modal-btn--ghost char-modal-btn" data-action="customize">Customize</button>
        <button class="modal-btn modal-btn--ghost char-modal-btn" data-action="stats">Stats</button>
        <button class="modal-btn modal-btn--danger char-modal-btn" data-action="die">${opts.dieLabel}</button>
      </div>
      ${transcendHtml}
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
