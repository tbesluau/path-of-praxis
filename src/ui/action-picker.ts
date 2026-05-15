import { createIcons, Sword, Flame, Zap, Snowflake, Skull, Droplets, Timer, Crosshair } from 'lucide'
import type { ActionDef } from '../config/actions'
import type { DamageEssenceTag } from '../config/masteries'
import { t } from '../i18n'

const ESSENCE_ICON: Record<DamageEssenceTag, string> = {
  physical: 'sword',
  fire: 'flame',
  lightning: 'zap',
  cold: 'snowflake',
  rot: 'skull',
}

const ESSENCE_CLASS: Record<DamageEssenceTag, string> = {
  physical: 'tag--physical',
  fire: 'tag--fire',
  lightning: 'tag--lightning',
  cold: 'tag--cold',
  rot: 'tag--rot',
}

const ESSENCE_TAGS: DamageEssenceTag[] = ['physical', 'fire', 'lightning', 'cold', 'rot']

function isEssenceTag(tag: string): tag is DamageEssenceTag {
  return ESSENCE_TAGS.includes(tag as DamageEssenceTag)
}

export function buildActionThumbnail(action: ActionDef, legend = false): HTMLElement {
  const wrap = document.createElement('div')
  wrap.className = `action-thumbnail${legend ? ' action-thumbnail--legend' : ''}`

  if (legend) {
    wrap.innerHTML = `
      <div class="action-thumb-header">
        <div class="action-thumb-icon"><i data-lucide="sword" aria-hidden="true"></i></div>
        <span class="action-thumb-name">${t('game', 'legendDamageBase')}</span>
      </div>
      <div class="action-thumb-attrs">
        <span class="action-thumb-stat"><i data-lucide="droplets" aria-hidden="true"></i>${t('game', 'legendDamage')}</span>
        <span class="action-thumb-stat"><i data-lucide="timer" aria-hidden="true"></i>${t('game', 'legendSpeed')}</span>
        <span class="action-thumb-stat"><i data-lucide="crosshair" aria-hidden="true"></i>${t('game', 'legendArea')}</span>
      </div>
      <div class="action-thumb-specials">
        <span class="action-thumb-special-slot">${t('game', 'legendSpecialSlot')} 1</span>
        <span class="action-thumb-special-slot">${t('game', 'legendSpecialSlot')} 2</span>
        <span class="action-thumb-special-slot">${t('game', 'legendSpecialSlot')} 3</span>
      </div>
    `
    return wrap
  }

  const essenceTags = action.tags.filter(isEssenceTag)

  const tagsHtml = essenceTags.length > 0
    ? essenceTags.map(tag => `
        <span class="action-thumb-tag ${ESSENCE_CLASS[tag]}">
          <i data-lucide="${ESSENCE_ICON[tag]}" aria-hidden="true"></i>${tag}
        </span>`).join('')
    : ''

  const speedPerSec = (1 / action.speed).toFixed(1)

  const areaHtml = action.area != null
    ? `<span class="action-thumb-stat"><i data-lucide="crosshair" aria-hidden="true"></i>${action.area}</span>`
    : ''

  const specialSlots = Array.from({ length: 3 }, (_, i) => {
    const st = action.specialTags?.[i]
    if (st) {
      const val = st.value != null ? ` ${st.value}` : ''
      return `<span class="action-thumb-special-slot action-thumb-special-slot--filled">${st.label}${val}</span>`
    }
    return `<span class="action-thumb-special-slot"></span>`
  }).join('')

  wrap.innerHTML = `
    <div class="action-thumb-header">
      <div class="action-thumb-icon"><i data-lucide="${action.icon}" aria-hidden="true"></i></div>
      <span class="action-thumb-name">${action.label}</span>
    </div>
    <div class="action-thumb-attrs">
      ${tagsHtml ? `<div class="action-thumb-tags">${tagsHtml}</div>` : ''}
      <span class="action-thumb-stat"><i data-lucide="droplets" aria-hidden="true"></i>${action.damage}</span>
      <span class="action-thumb-stat"><i data-lucide="timer" aria-hidden="true"></i>${speedPerSec}/s</span>
      ${areaHtml}
    </div>
    <div class="action-thumb-specials">${specialSlots}</div>
  `
  return wrap
}

const PICKER_ICONS = { Sword, Flame, Zap, Snowflake, Skull, Droplets, Timer, Crosshair }

export function refreshActionThumbnailIcons(): void {
  createIcons({ icons: PICKER_ICONS })
}

export function mountActionPickerModal(
  container: HTMLElement,
  actions: ActionDef[],
  currentActionId: string,
  onSelect: (actionId: string) => void,
  onClose: () => void,
): () => void {
  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop picker-backdrop'

  const panel = document.createElement('div')
  panel.className = 'modal-panel action-picker-panel'
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-modal', 'true')
  panel.setAttribute('aria-labelledby', 'picker-title')

  panel.innerHTML = `
    <button class="modal-close-btn" data-action="close" aria-label="Close"></button>
    <h2 class="modal-title" id="picker-title">${t('game', 'actionPickerTitle')}</h2>
  `

  const list = document.createElement('div')
  list.className = 'action-picker-list'

  const legendWrap = document.createElement('div')
  legendWrap.className = 'action-picker-legend'
  legendWrap.setAttribute('aria-hidden', 'true')
  legendWrap.appendChild(buildActionThumbnail(
    { id: '__legend__', label: '', icon: 'sword', iconSystem: 'lucide', range: 0, damage: 0, speed: 1, manaCost: 0, tags: [] },
    true,
  ))
  list.appendChild(legendWrap)

  actions.forEach(action => {
    const btn = document.createElement('button')
    btn.className = `action-picker-btn${action.id === currentActionId ? ' action-picker-btn--selected' : ''}`
    btn.dataset['actionId'] = action.id
    btn.appendChild(buildActionThumbnail(action))
    btn.addEventListener('click', () => {
      onSelect(action.id)
      backdrop.remove()
      onClose()
    })
    list.appendChild(btn)
  })

  panel.appendChild(list)
  backdrop.appendChild(panel)
  container.appendChild(backdrop)

  createIcons({ icons: PICKER_ICONS })

  panel.querySelector<HTMLButtonElement>('[data-action="close"]')!
    .addEventListener('click', () => { backdrop.remove(); onClose() })
  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) { backdrop.remove(); onClose() }
  })

  return () => backdrop.remove()
}
