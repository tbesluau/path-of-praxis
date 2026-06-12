import { t } from '../i18n'
import { playSound } from '../audio'
import type { Artifact, ArtifactLine } from '../config/artifacts'
import { describePositive, describeNegative } from '../config/artifacts'

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

function positiveLineHtml(line: ArtifactLine): string {
  const pd = describePositive(line.positive)
  const sourceKey = pd.source ? t('artifacts', `source${pd.source.charAt(0).toUpperCase() + pd.source.slice(1)}` as 'sourceFire') : ''
  const posKey = `pos${pd.key.charAt(0).toUpperCase() + pd.key.slice(1)}` as 'posGlobalMoreDamage'
  const posText = t('artifacts', posKey)
    .replace('{v}', String(pd.value))
    .replace('{source}', sourceKey)
  return `<span class="artifact-line-positive">${posText}</span>`
}

function negativeLineHtml(line: ArtifactLine): string {
  const nd = describeNegative(line.negative)
  const negKey = `neg${nd.key.charAt(0).toUpperCase() + nd.key.slice(1)}` as 'negDamageTaken'
  const negText = t('artifacts', negKey).replace('{v}', String(nd.value))
  return `<span class="artifact-line-negative">${negText}</span>`
}

function allLinesHtml(artifact: Artifact): string {
  return artifact.lines.map(positiveLineHtml).join('') + artifact.lines.map(negativeLineHtml).join('')
}

function renderArtifactThumb(
  artifact: Artifact,
  used: number,
  max: number,
): string {
  const rc = rarityClass(artifact.lines.length)
  const equippedClass = artifact.equipped ? ' artifact-thumb--equipped' : ''
  const canEquip = !artifact.equipped && used < max
  const equipBtn = artifact.equipped
    ? `<button class="artifact-thumb-equip-btn" data-artifact-id="${artifact.id}" data-action="unequip">${t('artifacts', 'unequip')}</button>`
    : `<button class="artifact-thumb-equip-btn" data-artifact-id="${artifact.id}" data-action="equip" ${canEquip ? '' : 'disabled'} title="${canEquip ? '' : t('artifacts', 'lockedHint')}">${t('artifacts', 'equip')}</button>`
  return `
    <div class="artifact-thumb-row">
      <div class="artifact-thumb ${rc}${equippedClass}" data-artifact-id="${artifact.id}">
        <div class="artifact-thumb-header">
          <span class="artifact-rarity-label">${weightLabel(artifact.lines.length)}</span>
        </div>
        <div class="artifact-thumb-lines">${allLinesHtml(artifact)}</div>
        ${equipBtn}
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
  const posHtml = artifact.lines.map(positiveLineHtml).join('')
  const negHtml = artifact.lines.map(negativeLineHtml).join('')
  const rc = rarityClass(artifact.lines.length)
  backdrop.innerHTML = `
    <div class="modal-panel artifact-card ${rc}" role="dialog" aria-modal="true">
      <button class="artifact-card-drop-btn" data-action="drop" aria-label="${t('artifacts', 'drop')}" title="${t('artifacts', 'drop')}">${TRASH_ICON}</button>
      <h2 class="modal-title">${weightLabel(artifact.lines.length)}</h2>
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
  },
  actions: {
    onEquip: (id: string) => void
    onUnequip: (id: string) => void
    onDelete: (id: string) => void
  },
  onClose: () => void,
): () => void {
  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop artifacts-backdrop'

  function buildPanel(): void {
    const artifacts = state.getArtifacts()
    const maxEquipped = state.getMaxEquipped()
    const max = state.getMax()
    const used = artifacts.filter(a => a.equipped).length
    const isFull = artifacts.length >= max

    const thumbsHtml = artifacts.map(a => renderArtifactThumb(a, used, maxEquipped)).join('')

    backdrop.innerHTML = `
      <div class="modal-panel artifacts-panel" role="dialog" aria-modal="true" aria-labelledby="artifacts-title">
        <button class="modal-close-btn" data-action="close" aria-label="${t('settings', 'close')}"></button>
        <h2 class="modal-title" id="artifacts-title">${t('artifacts', 'title')}</h2>
        <div class="artifacts-header-info">
          <span class="artifact-count">${t('artifacts', 'countLabel').replace('{n}', String(artifacts.length))}</span>
          <span class="artifact-equipped-label">${t('artifacts', 'equippedLabel').replace('{used}', String(used)).replace('{max}', String(maxEquipped))}</span>
        </div>
        ${isFull ? `<p class="artifact-warning">${t('artifacts', 'full')}</p>` : ''}
        <div class="artifact-grid">${thumbsHtml.length ? thumbsHtml : '<p class="artifact-empty">—</p>'}</div>
      </div>
    `

    const dismiss = (): void => { playSound('modal.close'); backdrop.remove(); onClose() }
    backdrop.querySelector<HTMLButtonElement>('[data-action="close"]')!.addEventListener('click', dismiss)
    backdrop.addEventListener('click', e => { if (e.target === backdrop) dismiss() })

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
