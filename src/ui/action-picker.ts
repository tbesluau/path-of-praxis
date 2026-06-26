import { createIcons, Sword, Flame, Zap, Snowflake, Skull, Timer, Crosshair, Radius, Swords, MoveRight, TestTube, Bomb, Hammer, LoaderPinwheel, CloudLightning, Star, Sparkles, Navigation2 } from 'lucide'
import type { ActionDef } from '../config/actions'
import { getActionLabel, getActionTagLabel } from '../config/actions'
import { WEAPON_ICONS, isWeaponIcon } from '../assets/weapon-icons'
import type { DamageEssenceTag, DamageTypeTag } from '../config/masteries'
import { balance } from '../config/balance'
import { playSound } from '../audio'
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

function critChancePct(tags: ActionDef['tags']): number | null {
  if (tags.includes('strike')) return balance.criticalHit.chanceStrike * 100
  if (tags.includes('area')) return balance.criticalHit.chanceArea * 100
  if (tags.includes('projectile')) return balance.criticalHit.chanceProjectile * 100
  return null
}

// Custom-art weapons (e.g. the rot skills) render their inline coloured SVG;
// every other action uses a monochrome Lucide glyph swapped in by createIcons().
function renderActionIconMarkup(action: ActionDef): string {
  if (action.iconSystem === 'custom' && isWeaponIcon(action.icon)) {
    return WEAPON_ICONS[action.icon]
  }
  return `<i data-lucide="${action.icon}" aria-hidden="true"></i>`
}

export interface ActionThumbXp {
  level: number
  xp: number
  xpNeeded: number
}

export function buildActionThumbnail(action: ActionDef | null, legend = false, showCritChance = false, critBaseAdd = 0, xpProgress?: ActionThumbXp): HTMLElement {
  const wrap = document.createElement('div')
  wrap.className = `action-thumbnail${legend ? ' action-thumbnail--legend' : ''}`

  if (!action) {
    wrap.classList.add('action-thumbnail--empty')
    wrap.innerHTML = `<span class="action-thumb-empty-label">${t('game', 'selectAnAction')}</span>`
    return wrap
  }

  if (legend) {
    wrap.innerHTML = `
      <div class="action-thumb-stats">
        <span class="action-thumb-stat"><i data-lucide="sword" aria-hidden="true"></i>${t('game', 'legendDamage')}</span>
        <span class="action-thumb-stat"><i data-lucide="timer" aria-hidden="true"></i>${t('game', 'legendSpeed')}</span>
        <span class="action-thumb-stat"><i data-lucide="crosshair" aria-hidden="true"></i>${t('game', 'legendRange')}</span>
        <span class="action-thumb-stat"><i data-lucide="radius" aria-hidden="true"></i>${t('game', 'legendArea')}</span>
        <span class="action-thumb-stat"><i data-lucide="test-tube" aria-hidden="true"></i>${t('game', 'legendMana')}</span>
        ${showCritChance ? `<span class="action-thumb-stat action-thumb-stat--crit"><i data-lucide="star" aria-hidden="true"></i>${t('game', 'critLabel')}</span>` : ''}
      </div>
    `
    return wrap
  }

  const tagsHtml = action.tags.map(tag => {
    if (isEssenceTag(tag)) {
      return `<span class="action-thumb-tag ${ESSENCE_CLASS[tag]}">
        <i data-lucide="${ESSENCE_ICON[tag]}" aria-hidden="true"></i>${getActionTagLabel(tag)}
      </span>`
    }
    if (isDamageTypeTag(tag)) {
      return `<span class="action-thumb-tag tag--neutral">
        <i data-lucide="${DAMAGE_TYPE_ICON[tag]}" aria-hidden="true"></i>${getActionTagLabel(tag)}
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

  const crit = showCritChance ? critChancePct(action.tags) : null
  const critHtml = crit != null
    ? `<span class="action-thumb-stat action-thumb-stat--crit"><i data-lucide="star" aria-hidden="true"></i>${Math.round(crit)}%${critBaseAdd > 0 ? ` + ${Math.round(critBaseAdd)}%` : ''}</span>`
    : ''

  const xpPct = xpProgress
    ? Math.min(100, Math.round(xpProgress.xp / Math.max(1, xpProgress.xpNeeded) * 100))
    : 0
  const xpBarHtml = xpProgress
    ? `<div class="action-thumb-xp">
         <div class="action-thumb-xp-bar"><div class="action-thumb-xp-fill" style="width:${xpPct}%"></div></div>
         <span class="action-thumb-xp-label">Lv.${xpProgress.level}</span>
       </div>`
    : ''

  wrap.innerHTML = `
    <div class="action-thumb-header">
      <div class="action-thumb-icon">${renderActionIconMarkup(action)}</div>
      <span class="action-thumb-name">${getActionLabel(action.id)}</span>
    </div>
    <div class="action-thumb-stats">
      <span class="action-thumb-stat"><i data-lucide="sword" aria-hidden="true"></i>${action.damage}</span>
      <span class="action-thumb-stat"><i data-lucide="timer" aria-hidden="true"></i>${speedPerSec}/s</span>
      <span class="action-thumb-stat"><i data-lucide="crosshair" aria-hidden="true"></i>${displayRange}</span>
      ${areaHtml}
      <span class="action-thumb-stat"><i data-lucide="test-tube" aria-hidden="true"></i>${action.manaCost}</span>
      ${critHtml}
    </div>
    <div class="action-thumb-tags">${tagsHtml}${specialsHtml}</div>
    ${xpBarHtml}
  `
  return wrap
}

const PICKER_ICONS = { Sword, Flame, Zap, Snowflake, Skull, Timer, Crosshair, Radius, Swords, MoveRight, TestTube, Bomb, Hammer, LoaderPinwheel, CloudLightning, Star, Sparkles, Navigation2 }

export function refreshActionThumbnailIcons(): void {
  createIcons({ icons: PICKER_ICONS })
}

export function mountActionPickerModal(
  container: HTMLElement,
  actions: ActionDef[],
  currentActionId: string | null,
  onSelect: (actionId: string) => void,
  onClose: () => void,
  showCritChance = false,
  critBaseAdd = 0,
): () => void {
  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop picker-backdrop'

  const panel = document.createElement('div')
  panel.className = 'modal-panel action-picker-panel'
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-modal', 'true')
  panel.setAttribute('aria-labelledby', 'picker-title')

  panel.innerHTML = `
    <button class="modal-close-btn" data-action="close" aria-label="${t('settings', 'close')}"></button>
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
    showCritChance,
  ))
  list.appendChild(legendWrap)

  actions.forEach(action => {
    const btn = document.createElement('button')
    btn.className = `action-picker-btn${action.id === currentActionId ? ' action-picker-btn--selected' : ''}`
    btn.dataset['actionId'] = action.id
    btn.dataset['sfx'] = 'modal'  // selecting closes the modal → modal.close, not toggle
    btn.appendChild(buildActionThumbnail(action, false, showCritChance, critBaseAdd))
    btn.addEventListener('click', () => {
      onSelect(action.id)
      playSound('modal.close')
      backdrop.remove()
      onClose()
    })
    list.appendChild(btn)
  })

  panel.appendChild(list)
  backdrop.appendChild(panel)
  playSound('modal.open')
  container.appendChild(backdrop)

  createIcons({ icons: PICKER_ICONS })

  const dismiss = (): void => { playSound('modal.close'); backdrop.remove(); onClose() }
  panel.querySelector<HTMLButtonElement>('[data-action="close"]')!
    .addEventListener('click', dismiss)
  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) dismiss()
  })

  return () => backdrop.remove()
}
