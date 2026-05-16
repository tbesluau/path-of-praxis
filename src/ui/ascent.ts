import { balance } from '../config/balance'
import type { UniversePointAllocations } from '../core/character'

const THRESHOLDS: { count: number; label: string }[] = [
  { count: 1, label: 'Critical strike' },
  { count: 2, label: 'Bosses' },
  { count: 3, label: 'Time-based action trigger' },
]

const UP_SLOTS: { key: keyof UniversePointAllocations; label: string; max: number }[] = [
  { key: 'placeholderA', label: 'Placeholder A', max: balance.ascent.universePointMaxA },
  { key: 'placeholderB', label: 'Placeholder B', max: balance.ascent.universePointMaxB },
]

export function mountAscentModal(
  parent: HTMLElement,
  getAscentCount: () => number,
  getAllocations: () => UniversePointAllocations,
  onAllocate: (slot: keyof UniversePointAllocations, delta: 1 | -1) => void,
  onClose: () => void,
): () => void {
  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop ascent-backdrop'

  function buildPanel(): void {
    const ascentCount = getAscentCount()
    const allocations = getAllocations()
    const totalPoints = ascentCount
    const spent = (Object.values(allocations) as number[]).reduce((s, v) => s + v, 0)
    const available = totalPoints - spent
    const nextRequired = balance.ascent.requiredEnemyLevelBase + ascentCount * balance.ascent.requiredLevelStep

    const thresholdsHtml = THRESHOLDS.map(t => {
      const unlocked = ascentCount >= t.count
      return `
        <div class="ascent-threshold-row">
          <span class="ascent-threshold-icon${unlocked ? ' ascent-threshold-icon--unlocked' : ''}">
            ${unlocked ? '✓' : '○'}
          </span>
          <span class="ascent-threshold-count">${t.count}</span>
          <span class="ascent-threshold-label${unlocked ? '' : ' ascent-threshold-label--locked'}">${t.label}</span>
        </div>
      `
    }).join('')

    const pointsHtml = UP_SLOTS.map(slot => {
      const val = allocations[slot.key]
      const canAdd = available > 0 && val < slot.max
      const canRemove = val > 0
      return `
        <div class="universe-point-row">
          <span class="universe-point-name">${slot.label}</span>
          <div class="universe-point-ctrl">
            <button class="universe-point-btn modal-btn" data-slot="${slot.key}" data-delta="-1"
              ${canRemove ? '' : 'disabled'}>−</button>
            <span class="universe-point-value">${val}</span>
            <button class="universe-point-btn modal-btn" data-slot="${slot.key}" data-delta="1"
              ${canAdd ? '' : 'disabled'}>+</button>
          </div>
          <span class="universe-point-max">/ ${slot.max}</span>
        </div>
      `
    }).join('')

    backdrop.innerHTML = `
      <div class="modal-panel ascent-panel" role="dialog" aria-modal="true" aria-labelledby="ascent-title">
        <button class="modal-close-btn" data-action="close" aria-label="Close"></button>
        <h2 class="modal-title" id="ascent-title">Ascent</h2>

        <div class="ascent-summary">
          <span class="ascent-summary-item">Ascent count: <strong>${ascentCount}</strong></span>
          <span class="ascent-summary-sep">·</span>
          <span class="ascent-summary-item">Next ascent: enemy level <strong>${nextRequired}</strong></span>
        </div>

        <section class="ascent-section">
          <h3 class="ascent-section-title">Unlocked at</h3>
          <div class="ascent-threshold-list">${thresholdsHtml}</div>
        </section>

        <section class="ascent-section">
          <h3 class="ascent-section-title">Universe points <span class="ascent-points-avail">(${available} available)</span></h3>
          <div class="universe-point-list">${pointsHtml}</div>
        </section>
      </div>
    `

    const dismiss = (): void => { backdrop.remove(); onClose() }
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
  }

  buildPanel()
  parent.appendChild(backdrop)

  return () => backdrop.remove()
}
