import { balance } from '../config/balance'
import { universePointsForAscent, type UniversePointAllocations } from '../core/character'
import { t } from '../i18n'
import { playSound } from '../audio'

const THRESHOLDS: { count: number; labelKey: 'threshold1' | 'threshold2' | 'threshold3' | 'threshold4' | 'threshold5' | 'threshold6' | 'threshold7' | 'threshold8' | 'threshold9' | 'threshold10' }[] = [
  { count: 1, labelKey: 'threshold1' },
  { count: 2, labelKey: 'threshold2' },
  { count: 3, labelKey: 'threshold3' },
  { count: 4, labelKey: 'threshold4' },
  { count: 5, labelKey: 'threshold5' },
  { count: 6, labelKey: 'threshold6' },
  { count: 7, labelKey: 'threshold7' },
  { count: 8, labelKey: 'threshold8' },
  { count: 9, labelKey: 'threshold9' },
  { count: 10, labelKey: 'threshold10' },
]

const UP_SLOTS: { key: keyof UniversePointAllocations; labelKey: 'upSlotA' | 'upSlotB' | 'upSlotC' | 'upSlotD'; max: number }[] = [
  { key: 'placeholderA', labelKey: 'upSlotA', max: balance.ascent.universePointMaxA },
  { key: 'placeholderB', labelKey: 'upSlotB', max: balance.ascent.universePointMaxB },
  { key: 'placeholderC', labelKey: 'upSlotC', max: balance.ascent.universePointMaxC },
  { key: 'placeholderD', labelKey: 'upSlotD', max: balance.ascent.universePointMaxD },
]

export function mountAscentModal(
  parent: HTMLElement,
  getAscentCount: () => number,
  getAllocations: () => UniversePointAllocations,
  onAllocate: (slot: keyof UniversePointAllocations, delta: 1 | -1) => void,
  onClose: () => void,
  onOpenArtifacts?: () => void,
): () => void {
  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop ascent-backdrop'

  function buildPanel(): void {
    const ascentCount = getAscentCount()
    const allocations = getAllocations()
    const totalPoints = universePointsForAscent(ascentCount)
    const spent = (Object.values(allocations) as number[]).reduce((s, v) => s + v, 0)
    const available = totalPoints - spent
    const nextRequired = balance.ascent.requiredEnemyLevelBase + ascentCount * balance.ascent.requiredLevelStep

    const thresholdsHtml = THRESHOLDS.map(thresh => {
      const unlocked = ascentCount >= thresh.count
      return `
        <div class="ascent-threshold-row">
          <span class="ascent-threshold-icon${unlocked ? ' ascent-threshold-icon--unlocked' : ''}">
            ${unlocked ? '✓' : '○'}
          </span>
          <span class="ascent-threshold-count">${thresh.count}</span>
          <span class="ascent-threshold-label${unlocked ? '' : ' ascent-threshold-label--locked'}">${t('ascent', thresh.labelKey)}</span>
        </div>
      `
    }).join('')

    const arrowLeft = `${import.meta.env.BASE_URL}ui/kenney_ui-pack-rpg-expansion/PNG/arrowSilver_left.png`
    const arrowRight = `${import.meta.env.BASE_URL}ui/kenney_ui-pack-rpg-expansion/PNG/arrowSilver_right.png`
    const pointsHtml = UP_SLOTS.map(slot => {
      const val = allocations[slot.key]
      const canAdd = available > 0 && val < slot.max
      const canRemove = val > 0
      return `
        <div class="universe-point-row">
          <span class="universe-point-name">${t('ascent', slot.labelKey)}</span>
          <div class="universe-point-ctrl">
            <button class="enemy-level-btn" data-slot="${slot.key}" data-delta="-1" aria-label="${t('ascent', 'removePoint')}"
              ${canRemove ? '' : 'disabled'}><img class="enemy-level-arrow" src="${arrowLeft}" alt=""></button>
            <span class="universe-point-value">${val}/${slot.max}</span>
            <button class="enemy-level-btn" data-slot="${slot.key}" data-delta="1" aria-label="${t('ascent', 'addPoint')}"
              ${canAdd ? '' : 'disabled'}><img class="enemy-level-arrow" src="${arrowRight}" alt=""></button>
          </div>
        </div>
      `
    }).join('')

    backdrop.innerHTML = `
      <div class="modal-panel ascent-panel" role="dialog" aria-modal="true" aria-labelledby="ascent-title">
        <button class="modal-close-btn" data-action="close" aria-label="${t('settings', 'close')}"></button>
        <h2 class="modal-title" id="ascent-title">${t('ascent', 'title')}</h2>

        <div class="ascent-summary">
          <span class="ascent-summary-item">${t('ascent', 'ascentCount').replace('{n}', `<strong>${ascentCount}</strong>`)}</span>
          <span class="ascent-summary-sep">·</span>
          <span class="ascent-summary-item">${t('ascent', 'nextAscent').replace('{n}', `<strong>${nextRequired}</strong>`)}</span>
        </div>

        <section class="ascent-section">
          <h3 class="ascent-section-title">${t('ascent', 'unlockedAt')}</h3>
          <div class="ascent-threshold-list">${thresholdsHtml}</div>
        </section>

        <section class="ascent-section">
          <h3 class="ascent-section-title">${t('ascent', 'universePoints')} <span class="ascent-points-avail">${t('ascent', 'available').replace('{n}', String(available))}</span></h3>
          <div class="universe-point-list">${pointsHtml}</div>
        </section>
        ${ascentCount >= balance.ascent.artifactSlot1UnlockAscent ? `
          <section class="ascent-section ascent-artifacts-section">
            <button class="modal-btn modal-btn--primary ascent-artifacts-btn" data-action="open-artifacts" style="position:relative">
              ${t('ascent', 'artifactsBtn')}
              <span class="notif-dot artifact-notif-dot" hidden style="position:absolute;top:6px;right:8px"></span>
            </button>
          </section>
        ` : ''}
      </div>
    `

    const dismiss = (): void => { playSound('modal.close'); backdrop.remove(); onClose() }
    backdrop.querySelector<HTMLButtonElement>('[data-action="close"]')!.addEventListener('click', dismiss)
    backdrop.addEventListener('click', e => { if (e.target === backdrop) dismiss() })

    backdrop.querySelectorAll<HTMLButtonElement>('[data-slot][data-delta]').forEach(btn => {
      btn.addEventListener('click', () => {
        const slot = btn.dataset.slot as keyof UniversePointAllocations
        const delta = Number(btn.dataset.delta) as 1 | -1
        onAllocate(slot, delta)
        buildPanel()
      })
    })

    const artifactsBtn = backdrop.querySelector<HTMLButtonElement>('[data-action="open-artifacts"]')
    if (artifactsBtn && onOpenArtifacts) {
      artifactsBtn.addEventListener('click', () => {
        playSound('modal.open')
        onOpenArtifacts()
      })
    }
  }

  buildPanel()
  playSound('modal.open')
  parent.appendChild(backdrop)

  return () => backdrop.remove()
}
