import { runesByType, getRune, SLOT_TYPES, SLOT_UNLOCK_LEVELS, unlockedSlotCount, getRuneLabel, getRuneDesc, type RuneId, type RuneType } from '../config/runes'
import type { ActionRunes } from '../core/character'
import { t } from '../i18n'
import { playSound } from '../audio'

const SLOT_TYPE_KEY: Record<RuneType, 'slotMinor' | 'slotMajor' | 'slotKey'> = {
  minor: 'slotMinor', major: 'slotMajor', key: 'slotKey',
}

// ── Rune Select Modal ──────────────────────────────────────────────────────

function mountRuneSelectModal(
  parent: HTMLElement,
  slotIdx: number,
  slotType: RuneType,
  takenIds: Set<RuneId>,
  currentId: RuneId | null,
  onSelect: (id: RuneId | null) => void,
  onClose: () => void,
): () => void {
  const available = runesByType(slotType).filter(r => r.id === currentId || !takenIds.has(r.id))

  const currentRune = currentId ? getRune(currentId) : null
  const removeHtml = currentRune
    ? `<button class="modal-btn modal-btn--ghost rune-remove-btn" data-action="remove">${t('rune', 'remove').replace('{label}', getRuneLabel(currentRune.id))}</button>`
    : ''

  const itemsHtml = available.map(r => `
    <button class="rune-select-item${r.id === currentId ? ' rune-select-item--active' : ''}" data-rune-id="${r.id}">
      <span class="rune-select-name">${getRuneLabel(r.id)}</span>
      <span class="rune-select-desc">${getRuneDesc(r.id)}</span>
    </button>
  `).join('')

  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop rune-select-backdrop'
  backdrop.innerHTML = `
    <div class="modal-panel rune-select-panel" role="dialog" aria-modal="true" aria-labelledby="rune-select-title">
      <button class="modal-close-btn" data-action="close" aria-label="${t('settings', 'close')}"></button>
      <h2 class="modal-title" id="rune-select-title">${t('rune', 'selectTitle').replace('{type}', t('rune', SLOT_TYPE_KEY[slotType])).replace('{n}', String(slotIdx + 1))}</h2>
      <div class="rune-select-list">${itemsHtml}</div>
      ${removeHtml ? `<div class="rune-select-footer">${removeHtml}</div>` : ''}
    </div>
  `
  playSound('modal.open')
  parent.appendChild(backdrop)

  const dismiss = (): void => { playSound('modal.close'); backdrop.remove(); onClose() }
  backdrop.querySelector<HTMLButtonElement>('[data-action="close"]')!.addEventListener('click', dismiss)
  backdrop.addEventListener('click', e => { if (e.target === backdrop) dismiss() })

  backdrop.querySelectorAll<HTMLButtonElement>('[data-rune-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.runeId as RuneId
      onSelect(id)
      dismiss()
    })
  })

  const removeBtn = backdrop.querySelector<HTMLButtonElement>('[data-action="remove"]')
  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      onSelect(null)
      dismiss()
    })
  }

  return () => backdrop.remove()
}

// ── Runes Main Modal ───────────────────────────────────────────────────────

export function mountRunesModal(
  parent: HTMLElement,
  _actionId: string,
  actionLabel: string,
  actionLevel: number,
  actionMaxLevel: number,
  runes: ActionRunes,
  onAssign: (slotIdx: number, runeId: RuneId | null) => void,
  onClose: () => void,
): () => void {
  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop runes-backdrop'

  function buildPanel(): void {
    const unlocked = unlockedSlotCount(actionLevel)

    const slotsHtml = SLOT_TYPES.map((slotType, i) => {
      const isUnlocked = i < unlocked
      const requiredLevel = SLOT_UNLOCK_LEVELS[i]
      const currentId = runes.selected[i] ?? null
      const currentRune = currentId ? getRune(currentId) : null

      const typeLabel = t('rune', SLOT_TYPE_KEY[slotType])
      const typeBadgeHtml = `<span class="rune-card-badge rune-card-badge--${slotType}">${typeLabel}</span>`
      const lockedBadgeHtml = isUnlocked
        ? ''
        : `<span class="rune-card-lock-badge">Lv. ${requiredLevel}</span>`
      const lockedClass = isUnlocked ? '' : ' rune-card--locked'

      if (!currentRune) {
        return `
          <button class="rune-card rune-card--empty rune-card--${slotType}${lockedClass}" data-slot="${i}" aria-label="${t('rune', 'addToSlot').replace('{type}', typeLabel).replace('{n}', String(i + 1))}">
            ${typeBadgeHtml}${lockedBadgeHtml}
            <div class="rune-card-content">
              <span class="rune-card-name rune-card-name--empty">${t('rune', 'addRune')}</span>
            </div>
          </button>
        `
      }

      return `
        <button class="rune-card rune-card--filled rune-card--${slotType}${lockedClass}" data-slot="${i}" aria-label="${t('rune', 'clickToChange').replace('{label}', getRuneLabel(currentRune.id))}">
          ${typeBadgeHtml}${lockedBadgeHtml}
          <div class="rune-card-content">
            <span class="rune-card-name">${getRuneLabel(currentRune.id)}</span>
            <span class="rune-card-desc">${getRuneDesc(currentRune.id)}</span>
          </div>
        </button>
      `
    }).join('')

    backdrop.innerHTML = `
      <div class="modal-panel runes-panel" role="dialog" aria-modal="true" aria-labelledby="runes-title">
        <button class="modal-close-btn" data-action="close" aria-label="${t('settings', 'close')}"></button>
        <h2 class="modal-title" id="runes-title">${t('rune', 'runesTitle').replace('{action}', actionLabel)}</h2>
        <p class="runes-level-hint">${t('rune', 'levelHint').replace('{level}', String(actionLevel)).replace('{unlocked}', String(unlocked)).replace('{bonus}', String((actionMaxLevel - 1) * 10))}</p>
        <div class="rune-slots">${slotsHtml}</div>
      </div>
    `

    backdrop.querySelector<HTMLButtonElement>('[data-action="close"]')!.addEventListener('click', dismiss)
    backdrop.addEventListener('click', e => { if (e.target === backdrop) dismiss() })

    backdrop.querySelectorAll<HTMLButtonElement>('[data-slot]').forEach(btn => {
      btn.addEventListener('click', () => {
        const slotIdx = Number(btn.dataset.slot)
        const slotType = SLOT_TYPES[slotIdx]
        const taken = new Set(
          runes.selected
            .filter((id, idx): id is RuneId => id !== null && idx !== slotIdx)
        )
        const selectCleanup = mountRuneSelectModal(
          parent,
          slotIdx,
          slotType,
          taken,
          runes.selected[slotIdx] ?? null,
          (chosenId) => {
            onAssign(slotIdx, chosenId)
            buildPanel()
          },
          () => { /* select modal closed */ },
        )
        // Track cleanup so tear-down works even if select is still open
        activeSelectCleanup = selectCleanup
      })
    })
  }

  let activeSelectCleanup: (() => void) | null = null

  const dismiss = (): void => {
    playSound('modal.close')
    if (activeSelectCleanup) { activeSelectCleanup(); activeSelectCleanup = null }
    backdrop.remove()
    onClose()
  }

  buildPanel()
  playSound('modal.open')
  parent.appendChild(backdrop)

  return () => {
    if (activeSelectCleanup) { activeSelectCleanup(); activeSelectCleanup = null }
    backdrop.remove()
  }
}
