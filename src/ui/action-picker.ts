import { createIcons, Sword, Flame, Zap, Snowflake, Skull, Timer, Crosshair, Radius, Swords, MoveRight, TestTube, Bomb, Hammer, LoaderPinwheel, CloudLightning } from 'lucide'
import type { ActionDef } from '../config/actions'
import type { DamageEssenceTag, DamageTypeTag } from '../config/masteries'
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

const DAMAGE_TYPE_ICON: Record<DamageTypeTag, string> = {
  strike: 'swords',
  projectile: 'move-right',
  area: 'radius',
}

const DAMAGE_TYPE_TAGS: DamageTypeTag[] = ['strike', 'projectile', 'area']

function isEssenceTag(tag: string): tag is DamageEssenceTag {
  return ESSENCE_TAGS.includes(tag as DamageEssenceTag)
}

function isDamageTypeTag(tag: string): tag is DamageTypeTag {
  return DAMAGE_TYPE_TAGS.includes(tag as DamageTypeTag)
}

export function buildActionThumbnail(action: ActionDef, legend = false): HTMLElement {
  const wrap = document.createElement('div')
  wrap.className = `action-thumbnail${legend ? ' action-thumbnail--legend' : ''}`

  if (legend) {
    wrap.innerHTML = `
      <div class="action-thumb-stats">
        <span class="action-thumb-stat"><i data-lucide="sword" aria-hidden="true"></i>${t('game', 'legendDamage')}</span>
        <span class="action-thumb-stat"><i data-lucide="timer" aria-hidden="true"></i>${t('game', 'legendSpeed')}</span>
        <span class="action-thumb-stat"><i data-lucide="crosshair" aria-hidden="true"></i>${t('game', 'legendRange')}</span>
        <span class="action-thumb-stat"><i data-lucide="radius" aria-hidden="true"></i>${t('game', 'legendArea')}</span>
        <span class="action-thumb-stat"><i data-lucide="test-tube" aria-hidden="true"></i>${t('game', 'legendMana')}</span>
      </div>
    `
    return wrap
  }

  const tagsHtml = action.tags.map(tag => {
    if (isEssenceTag(tag)) {
      return `<span class="action-thumb-tag ${ESSENCE_CLASS[tag]}">
        <i data-lucide="${ESSENCE_ICON[tag]}" aria-hidden="true"></i>${tag}
      </span>`
    }
    if (isDamageTypeTag(tag)) {
      return `<span class="action-thumb-tag tag--neutral">
        <i data-lucide="${DAMAGE_TYPE_ICON[tag]}" aria-hidden="true"></i>${tag}
      </span>`
    }
    return ''
  }).join('')

  const specialsHtml = (action.specialTags ?? []).map(st => {
    const val = st.value != null ? ` ${st.value}` : ''
    return `<span class="action-thumb-tag tag--special">${st.label}${val}</span>`
  }).join('')

  const speedPerSec = (1 / action.speed).toFixed(1)
  const displayRange = action.selfTargeted ? 0 : action.range

  const areaHtml = action.area != null
    ? `<span class="action-thumb-stat"><i data-lucide="radius" aria-hidden="true"></i>${action.area}</span>`
    : ''

  wrap.innerHTML = `
    <div class="action-thumb-header">
      <div class="action-thumb-icon"><i data-lucide="${action.icon}" aria-hidden="true"></i></div>
      <span class="action-thumb-name">${action.label}</span>
    </div>
    <div class="action-thumb-stats">
      <span class="action-thumb-stat"><i data-lucide="sword" aria-hidden="true"></i>${action.damage}</span>
      <span class="action-thumb-stat"><i data-lucide="timer" aria-hidden="true"></i>${speedPerSec}/s</span>
      <span class="action-thumb-stat"><i data-lucide="crosshair" aria-hidden="true"></i>${displayRange}</span>
      ${areaHtml}
      <span class="action-thumb-stat"><i data-lucide="test-tube" aria-hidden="true"></i>${action.manaCost}</span>
    </div>
    <div class="action-thumb-tags">${tagsHtml}${specialsHtml}</div>
  `
  return wrap
}

const PICKER_ICONS = { Sword, Flame, Zap, Snowflake, Skull, Timer, Crosshair, Radius, Swords, MoveRight, TestTube, Bomb, Hammer, LoaderPinwheel, CloudLightning }

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
