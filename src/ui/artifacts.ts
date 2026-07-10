import { t } from '../i18n'
import { playSound } from '../audio'
import type { Artifact, PositiveModifier, NegativeModifier, UpgradeResult } from '../config/artifacts'
import { describePositive, describeNegative, upgradeCost, modifierQuality, artifactQuality } from '../config/artifacts'

// Matches the Lucide `trash-2` glyph used for character deletion in the menu.
const TRASH_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>`

function rarityClass(lines: number): string {
  if (lines === 3) return 'artifact-thumb--r3'
  if (lines === 2) return 'artifact-thumb--r2'
  return 'artifact-thumb--r1'
}

function weightLabel(lines: number): string {
  if (lines === 3) return t('artifacts', 'weightHeavy')
  if (lines === 2) return t('artifacts', 'weightMedium')
  return t('artifacts', 'weightLight')
}

// Per-modifier roll quality, shown at the end of each line: 0% = worst
// possible roll, 100% = perfect (for bad lines, lower rolls score higher).
function qualityHtml(m: PositiveModifier | NegativeModifier): string {
  return ` <span class="artifact-line-quality">(${Math.round(modifierQuality(m))}%)</span>`
}

function positiveLineHtml(positive: PositiveModifier): string {
  const pd = describePositive(positive)
  const sourceKey = pd.source ? t('artifacts', `source${pd.source.charAt(0).toUpperCase() + pd.source.slice(1)}` as 'sourceFire') : ''
  const posKey = `pos${pd.key.charAt(0).toUpperCase() + pd.key.slice(1)}` as 'posGlobalMoreDamage'
  const posText = t('artifacts', posKey)
    .replace('{v}', String(pd.value))
    .replace('{source}', sourceKey)
  return `<span class="artifact-line-positive">${posText}${qualityHtml(positive)}</span>`
}

function negativeLineHtml(negative: NegativeModifier): string {
  const nd = describeNegative(negative)
  const negKey = `neg${nd.key.charAt(0).toUpperCase() + nd.key.slice(1)}` as 'negDamageTaken'
  const negText = t('artifacts', negKey).replace('{v}', String(nd.value))
  return `<span class="artifact-line-negative">${negText}${qualityHtml(negative)}</span>`
}

function positivesHtml(artifact: Artifact): string {
  return artifact.lines.map(l => positiveLineHtml(l.positive)).join('')
}

function negativesHtml(artifact: Artifact): string {
  return artifact.lines.filter(l => l.negative).map(l => negativeLineHtml(l.negative!)).join('')
}

function allLinesHtml(artifact: Artifact): string {
  return positivesHtml(artifact) + negativesHtml(artifact)
}

// "Artifact quality" — the average of all line qualities, next to the title.
function titleQualityHtml(artifact: Artifact): string {
  return ` <span class="artifact-quality">(${Math.round(artifactQuality(artifact))}%)</span>`
}

function renderArtifactThumb(
  artifact: Artifact,
  used: number,
  max: number,
  scraps: number,
): string {
  const rc = rarityClass(artifact.lines.length)
  const equippedClass = artifact.equipped ? ' artifact-thumb--equipped' : ''
  const canEquip = !artifact.equipped && used < max
  const equipBtn = artifact.equipped
    ? `<button class="artifact-thumb-equip-btn" data-artifact-id="${artifact.id}" data-action="unequip">${t('artifacts', 'unequip')}</button>`
    : `<button class="artifact-thumb-equip-btn" data-artifact-id="${artifact.id}" data-action="equip" ${canEquip ? '' : 'disabled'} title="${canEquip ? '' : t('artifacts', 'lockedHint')}">${t('artifacts', 'equip')}</button>`
  const cost = upgradeCost(artifact)
  const upgradeLabel = t('artifacts', 'upgradeBtn')
    .replace('{scraps}', String(scraps))
    .replace('{cost}', String(cost))
  const upgradeBtn = `<button class="artifact-thumb-upgrade-btn" data-artifact-id="${artifact.id}" data-action="upgrade" ${scraps >= cost ? '' : 'disabled'}>${upgradeLabel}</button>`
  return `
    <div class="artifact-thumb-row">
      <div class="artifact-thumb ${rc}${equippedClass}" data-artifact-id="${artifact.id}">
        <div class="artifact-thumb-header">
          <span class="artifact-rarity-label">${weightLabel(artifact.lines.length)}${titleQualityHtml(artifact)}</span>
        </div>
        <div class="artifact-thumb-lines">${allLinesHtml(artifact)}</div>
        <div class="artifact-thumb-btn-row">
          ${equipBtn}
          ${upgradeBtn}
        </div>
      </div>
      <button class="artifact-thumb-trash" data-artifact-id="${artifact.id}" data-action="delete" aria-label="${t('artifacts', 'deleteBtn')}">${TRASH_ICON}</button>
    </div>
  `
}

export function mountDeleteConfirmModal(
  parent: HTMLElement,
  artifactLabel: string,
  onConfirm: () => void,
  onClose: () => void,
): () => void {
  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop'
  backdrop.innerHTML = `
    <div class="modal-panel" role="dialog" aria-modal="true">
      <h2 class="modal-title">${t('artifacts', 'deleteConfirmTitle')}</h2>
      <p class="modal-body">${t('artifacts', 'deleteConfirmBody')}</p>
      <p class="modal-body"><em>${artifactLabel}</em></p>
      <div class="modal-actions">
        <button class="modal-btn modal-btn--ghost" data-action="cancel">${t('mastery', 'confirmCancel')}</button>
        <button class="modal-btn modal-btn--danger" data-action="confirm">${t('artifacts', 'deleteConfirmBtn')}</button>
      </div>
    </div>
  `
  const teardown = (): void => { backdrop.remove(); onClose() }
  backdrop.querySelector<HTMLButtonElement>('[data-action="cancel"]')!.addEventListener('click', () => { playSound('modal.close'); teardown() })
  backdrop.querySelector<HTMLButtonElement>('[data-action="confirm"]')!.addEventListener('click', () => { playSound('modal.close'); onConfirm(); teardown() })
  backdrop.addEventListener('click', e => { if (e.target === backdrop) { playSound('modal.close'); teardown() } })
  playSound('modal.open')
  parent.appendChild(backdrop)
  return teardown
}

// Renders the improved modifier's line text at an arbitrary value (for the
// before → after display in the upgrade result modal).
function improvementHtmlAt(artifact: Artifact, imp: NonNullable<Extract<UpgradeResult, { kind: 'upgraded' }>['improvement']>, value: number): string {
  const line = artifact.lines[imp.lineIndex]
  if (imp.target === 'positive') {
    return positiveLineHtml({ ...line.positive, value })
  }
  return negativeLineHtml({ ...line.negative!, value })
}

export function mountUpgradeResultModal(
  parent: HTMLElement,
  artifact: Artifact,
  result: UpgradeResult,
  onClose: () => void,
): () => void {
  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop'
  const isUpgraded = result.kind === 'upgraded'
  let bodyHtml = ''
  if (result.kind === 'upgraded') {
    if (result.removed) {
      bodyHtml += `<p class="modal-body artifact-upgrade-removed"><strong>${t('artifacts', 'upgradeRemovedLabel')}</strong> <s>${negativeLineHtml(result.removed)}</s></p>`
    }
    if (result.improvement) {
      bodyHtml += `<p class="modal-body artifact-upgrade-diff">${improvementHtmlAt(artifact, result.improvement, result.improvement.before)} → ${improvementHtmlAt(artifact, result.improvement, result.improvement.after)}</p>`
    }
  } else {
    bodyHtml = `<p class="modal-body">${t('artifacts', 'upgradeMaxedBody')}</p>`
  }
  backdrop.innerHTML = `
    <div class="modal-panel" role="dialog" aria-modal="true">
      <h2 class="modal-title">${t('artifacts', isUpgraded ? 'upgradeResultTitle' : 'upgradeMaxedTitle')}</h2>
      ${bodyHtml}
      <div class="modal-actions">
        <button class="modal-btn modal-btn--primary" data-action="ok">${t('settings', 'close')}</button>
      </div>
    </div>
  `
  const teardown = (): void => { backdrop.remove(); onClose() }
  backdrop.querySelector<HTMLButtonElement>('[data-action="ok"]')!.addEventListener('click', () => { playSound('modal.close'); teardown() })
  backdrop.addEventListener('click', e => { if (e.target === backdrop) { playSound('modal.close'); teardown() } })
  playSound('modal.open')
  parent.appendChild(backdrop)
  return teardown
}

export function mountArtifactCardModal(
  parent: HTMLElement,
  artifact: Artifact,
  // onDismiss runs on backdrop click (click-away): the artifact shouldn't be
  // silently destroyed, so the game bags it when there's room instead.
  handlers: { onBag: () => void; onEquip: () => void; onDrop: () => void; onDismiss: () => void },
  onClose: () => void,
): () => void {
  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop'
  const posHtml = positivesHtml(artifact)
  const negHtml = negativesHtml(artifact)
  const rc = rarityClass(artifact.lines.length)
  backdrop.innerHTML = `
    <div class="modal-panel artifact-card ${rc}" role="dialog" aria-modal="true">
      <button class="artifact-card-drop-btn" data-action="drop" aria-label="${t('artifacts', 'drop')}" title="${t('artifacts', 'drop')}">${TRASH_ICON}</button>
      <h2 class="modal-title">${weightLabel(artifact.lines.length)}${titleQualityHtml(artifact)}</h2>
      <div class="artifact-card-lines">${posHtml}${negHtml}</div>
      <div class="artifact-card-actions">
        <button class="modal-btn modal-btn--primary" data-action="bag">${t('artifacts', 'bag')}</button>
        <button class="modal-btn modal-btn--primary" data-action="equip">${t('artifacts', 'equip')}</button>
      </div>
    </div>
  `
  const teardown = (): void => { backdrop.remove(); onClose() }
  backdrop.querySelector<HTMLButtonElement>('[data-action="bag"]')!.addEventListener('click', () => { playSound('modal.close'); handlers.onBag(); teardown() })
  backdrop.querySelector<HTMLButtonElement>('[data-action="equip"]')!.addEventListener('click', () => { playSound('modal.close'); handlers.onEquip(); teardown() })
  backdrop.querySelector<HTMLButtonElement>('[data-action="drop"]')!.addEventListener('click', () => { playSound('modal.close'); handlers.onDrop(); teardown() })
  backdrop.addEventListener('click', e => { if (e.target === backdrop) { playSound('modal.close'); handlers.onDismiss(); teardown() } })
  playSound('modal.open')
  parent.appendChild(backdrop)
  return teardown
}

export function mountArtifactsModal(
  parent: HTMLElement,
  state: {
    getArtifacts: () => Artifact[]
    getMaxEquipped: () => number
    getMax: () => number
    getScraps: () => number
    getAutoDiscard: () => number
    getAutoDiscardWeight: () => number
  },
  actions: {
    onEquip: (id: string) => void
    onUnequip: (id: string) => void
    onDelete: (id: string) => void
    onUpgrade: (id: string) => UpgradeResult | null
    onAutoDiscardChange: (v: number) => void
    onAutoDiscardWeightChange: (v: number) => void
  },
  onClose: () => void,
): () => void {
  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop artifacts-backdrop'

  function buildPanel(): void {
    const artifacts = state.getArtifacts()
    const maxEquipped = state.getMaxEquipped()
    const max = state.getMax()
    const scraps = state.getScraps()
    const used = artifacts.filter(a => a.equipped).length
    const isFull = artifacts.length >= max

    // Equipped artifacts always list first (display order only — the stored
    // order is untouched). Array.prototype.sort is stable, so bag order is
    // preserved within each group.
    const ordered = [...artifacts].sort((a, b) => Number(b.equipped) - Number(a.equipped))
    const thumbsHtml = ordered.map(a => renderArtifactThumb(a, used, maxEquipped, scraps)).join('')

    // Auto-discard threshold widget — mirrors the enemy-level arrow buttons.
    const autoDiscard = state.getAutoDiscard()
    const autoDiscardText = autoDiscard <= 0
      ? t('artifacts', 'autoDiscardNever')
      : autoDiscard >= 110
        ? t('artifacts', 'autoDiscardAll')
        : t('artifacts', 'autoDiscardBelow').replace('{v}', String(autoDiscard)).replace('<', '&lt;')
    // Weight selector — an OR condition on top of quality: drops at or below
    // the selected weight are discarded regardless of their quality.
    const autoDiscardWeight = state.getAutoDiscardWeight()
    const weightText = autoDiscardWeight <= 0
      ? t('artifacts', 'autoDiscardWeightAll')
      : autoDiscardWeight === 1
        ? t('artifacts', 'autoDiscardWeightLight')
        : t('artifacts', 'autoDiscardWeightMedium')
    const arrowBase = `${import.meta.env.BASE_URL}ui/kenney_ui-pack-rpg-expansion/PNG`
    const autoDiscardHtml = `
      <div class="artifact-autodiscard">
        <span class="artifact-autodiscard-label">${t('artifacts', 'autoDiscardLabel')}</span>
        <div class="artifact-autodiscard-main">
          <button class="enemy-level-btn" data-action="autodiscard-down" ${autoDiscard <= 0 ? 'disabled' : ''} aria-label="${t('artifacts', 'autoDiscardDown')}"><img class="enemy-level-arrow" src="${arrowBase}/arrowSilver_left.png" alt=""></button>
          <span class="artifact-autodiscard-display">${autoDiscardText}</span>
          <button class="enemy-level-btn" data-action="autodiscard-up" ${autoDiscard >= 110 ? 'disabled' : ''} aria-label="${t('artifacts', 'autoDiscardUp')}"><img class="enemy-level-arrow" src="${arrowBase}/arrowSilver_right.png" alt=""></button>
        </div>
        <span class="artifact-autodiscard-label">${t('artifacts', 'autoDiscardWeightLabel')}</span>
        <div class="artifact-autodiscard-main">
          <button class="enemy-level-btn" data-action="autodiscard-weight-down" ${autoDiscardWeight <= 0 ? 'disabled' : ''} aria-label="${t('artifacts', 'autoDiscardWeightDown')}"><img class="enemy-level-arrow" src="${arrowBase}/arrowSilver_left.png" alt=""></button>
          <span class="artifact-autodiscard-display artifact-autodiscard-display--weight">${weightText}</span>
          <button class="enemy-level-btn" data-action="autodiscard-weight-up" ${autoDiscardWeight >= 2 ? 'disabled' : ''} aria-label="${t('artifacts', 'autoDiscardWeightUp')}"><img class="enemy-level-arrow" src="${arrowBase}/arrowSilver_right.png" alt=""></button>
        </div>
      </div>
    `

    backdrop.innerHTML = `
      <div class="modal-panel artifacts-panel" role="dialog" aria-modal="true" aria-labelledby="artifacts-title">
        <button class="modal-close-btn" data-action="close" aria-label="${t('settings', 'close')}"></button>
        <h2 class="modal-title" id="artifacts-title">${t('artifacts', 'title')}</h2>
        <div class="artifacts-header-info">
          <span class="artifact-count">${t('artifacts', 'countLabel').replace('{n}', String(artifacts.length)).replace('{max}', String(max))}</span>
          <span class="artifact-equipped-label">${t('artifacts', 'equippedLabel').replace('{used}', String(used)).replace('{max}', String(maxEquipped))}</span>
          <span class="artifact-scraps">${t('artifacts', 'scrapsLabel').replace('{n}', String(scraps))}</span>
        </div>
        ${isFull ? `<p class="artifact-warning">${t('artifacts', 'full')}</p>` : ''}
        ${autoDiscardHtml}
        <div class="artifact-grid">${thumbsHtml.length ? thumbsHtml : '<p class="artifact-empty">—</p>'}</div>
      </div>
    `

    const dismiss = (): void => { playSound('modal.close'); backdrop.remove(); onClose() }
    backdrop.querySelector<HTMLButtonElement>('[data-action="close"]')!.addEventListener('click', dismiss)
    backdrop.addEventListener('click', e => { if (e.target === backdrop) dismiss() })

    backdrop.querySelector<HTMLButtonElement>('[data-action="autodiscard-down"]')!.addEventListener('click', () => {
      actions.onAutoDiscardChange(Math.max(0, state.getAutoDiscard() - 10))
      buildPanel()
    })
    backdrop.querySelector<HTMLButtonElement>('[data-action="autodiscard-up"]')!.addEventListener('click', () => {
      actions.onAutoDiscardChange(Math.min(110, state.getAutoDiscard() + 10))
      buildPanel()
    })
    backdrop.querySelector<HTMLButtonElement>('[data-action="autodiscard-weight-down"]')!.addEventListener('click', () => {
      actions.onAutoDiscardWeightChange(Math.max(0, state.getAutoDiscardWeight() - 1))
      buildPanel()
    })
    backdrop.querySelector<HTMLButtonElement>('[data-action="autodiscard-weight-up"]')!.addEventListener('click', () => {
      actions.onAutoDiscardWeightChange(Math.min(2, state.getAutoDiscardWeight() + 1))
      buildPanel()
    })

    backdrop.querySelectorAll<HTMLButtonElement>('[data-artifact-id][data-action="equip"]').forEach(btn => {
      btn.addEventListener('click', () => {
        actions.onEquip(btn.dataset.artifactId!)
        buildPanel()
      })
    })
    backdrop.querySelectorAll<HTMLButtonElement>('[data-artifact-id][data-action="unequip"]').forEach(btn => {
      btn.addEventListener('click', () => {
        actions.onUnequip(btn.dataset.artifactId!)
        buildPanel()
      })
    })
    backdrop.querySelectorAll<HTMLButtonElement>('[data-artifact-id][data-action="upgrade"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.artifactId!
        const result = actions.onUpgrade(id)
        if (result) {
          const art = state.getArtifacts().find(a => a.id === id)
          if (art) mountUpgradeResultModal(parent, art, result, () => {})
        }
        buildPanel()
      })
    })
    backdrop.querySelectorAll<HTMLButtonElement>('[data-artifact-id][data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.artifactId!
        const art = state.getArtifacts().find(a => a.id === id)
        const label = art ? weightLabel(art.lines.length) : ''
        mountDeleteConfirmModal(parent, label, () => {
          actions.onDelete(id)
          buildPanel()
        }, () => {})
      })
    })
  }

  buildPanel()
  playSound('modal.open')
  parent.appendChild(backdrop)

  return () => backdrop.remove()
}
