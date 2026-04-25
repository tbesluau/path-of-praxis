import { createIcons, Play, UserPlus, FolderOpen, Trophy, Trash2, Sword, Target, Flame, Zap } from 'lucide'
import { t } from '../i18n'
import { tokens } from '../theme'
import { mountSettingsButton } from '../ui/settings'
import type { SceneId } from '../core/router'
import {
  getCharacters,
  getCurrentId,
  createCharacter,
  loadCharacter,
  deleteCharacter,
  MAX_SLOTS,
} from '../core/character'
import { allActions, type ActionId, type ActionDef } from '../config/actions'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  opacity: number
  color: string
}

const PARTICLE_COLORS = [
  tokens.color.primary,
  tokens.color.accent,
  tokens.color.accentAlt,
]

export function createMenuScene(
  container: HTMLElement,
  navigate: (to: SceneId) => void,
): () => void {
  const el = document.createElement('div')
  el.className = 'scene scene-menu'
  el.innerHTML = `
    <canvas class="scene-bg" id="menu-canvas"></canvas>
    <span class="version-badge">v${__APP_VERSION__}</span>
    <div class="menu-content">
      <header class="menu-header">
        <h1 class="game-title">${t('game', 'title')}</h1>
        <p class="game-subtitle">${t('game', 'subtitle')}</p>
      </header>
      <nav class="menu-nav" aria-label="${t('menu', 'nav')}">
        <button class="menu-btn" data-action="continue">
          <i data-lucide="play" aria-hidden="true"></i>
          <span>${t('menu', 'continue')}</span>
        </button>
        <button class="menu-btn" data-action="new-character">
          <i data-lucide="user-plus" aria-hidden="true"></i>
          <span>${t('menu', 'newCharacter')}</span>
        </button>
        <button class="menu-btn" data-action="load-character">
          <i data-lucide="folder-open" aria-hidden="true"></i>
          <span>${t('menu', 'loadCharacter')}</span>
        </button>
        <div class="menu-divider" role="separator"></div>
        <button class="menu-btn" data-action="ladder">
          <i data-lucide="trophy" aria-hidden="true"></i>
          <span>${t('menu', 'ladder')}</span>
        </button>
      </nav>
    </div>
  `

  container.appendChild(el)
  createIcons({ icons: { Play, UserPlus, FolderOpen, Trophy, Trash2 } })

  const unmountSettings = mountSettingsButton(el)

  const canvas = el.querySelector<HTMLCanvasElement>('#menu-canvas')!
  const stopParticles = startParticles(canvas)

  const btnContinue = el.querySelector<HTMLButtonElement>('[data-action="continue"]')!
  const btnNew = el.querySelector<HTMLButtonElement>('[data-action="new-character"]')!
  const btnLoad = el.querySelector<HTMLButtonElement>('[data-action="load-character"]')!

  let modalCleanup: (() => void) | null = null

  function refreshButtonStates(): void {
    const chars = getCharacters()
    const currentId = getCurrentId()
    btnContinue.disabled = currentId === null
    btnLoad.disabled = chars.length === 0
    btnNew.disabled = chars.length >= MAX_SLOTS
  }

  function closeModal(): void {
    if (modalCleanup) {
      modalCleanup()
      modalCleanup = null
    }
    refreshButtonStates()
  }

  refreshButtonStates()

  btnContinue.addEventListener('click', () => {
    if (!btnContinue.disabled) navigate('game')
  })

  btnNew.addEventListener('click', () => {
    if (btnNew.disabled) return
    closeModal()
    modalCleanup = mountNewCharacterModal(el, {
      onClose: closeModal,
      onCreate: (name, actionId) => {
        createCharacter(name, actionId)
        navigate('game')
      },
    })
  })

  btnLoad.addEventListener('click', () => {
    if (btnLoad.disabled) return
    closeModal()
    modalCleanup = mountLoadCharacterModal(el, {
      onClose: closeModal,
      onSelect: () => navigate('game'),
    })
  })

  el.querySelector<HTMLButtonElement>('[data-action="ladder"]')!
    .addEventListener('click', () => console.info('[menu] action: ladder'))

  function onEscape(e: KeyboardEvent): void {
    if (e.key === 'Escape') closeModal()
  }
  document.addEventListener('keydown', onEscape)

  return () => {
    stopParticles()
    unmountSettings()
    document.removeEventListener('keydown', onEscape)
    if (modalCleanup) modalCleanup()
    el.remove()
  }
}

function mountNewCharacterModal(
  parent: HTMLElement,
  { onClose, onCreate }: { onClose: () => void; onCreate: (name: string, actionId: ActionId) => void },
): () => void {
  const weaponActions = allActions.filter((a): a is ActionDef & { kind: 'weapon' } => a.kind === 'weapon')
  const spellActions  = allActions.filter((a): a is ActionDef & { kind: 'spell'  } => a.kind === 'spell')

  const buildCards = (actions: ActionDef[], selected: ActionId) =>
    actions.map(a => `
      <button class="action-card${a.id === selected ? ' action-card--selected' : ''}" data-action-id="${a.id}">
        <i data-lucide="${a.icon}" aria-hidden="true"></i>
        <span class="action-card-name">${a.label}</span>
      </button>`).join('')

  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop'
  backdrop.innerHTML = `
    <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-new-title">
      <h2 class="modal-title" id="modal-new-title">${t('character', 'newTitle')}</h2>
      <div class="modal-field">
        <label class="modal-label" for="char-name-input">${t('character', 'nameLabel')}</label>
        <input
          id="char-name-input"
          class="modal-input"
          type="text"
          maxlength="32"
          placeholder="${t('character', 'namePlaceholder')}"
          autocomplete="off"
        />
        <span class="modal-input-error" aria-live="polite"></span>
      </div>
      <div class="modal-field">
        <span class="modal-label">${t('game', 'actionSelectTitle')}</span>
        <div class="action-tabs">
          <button class="action-tab action-tab--active" data-tab="weapon">${t('game', 'weaponsTab')}</button>
          <button class="action-tab" data-tab="spell">${t('game', 'spellsTab')}</button>
        </div>
        <div class="action-grid" data-panel="weapon">${buildCards(weaponActions, 'sword')}</div>
        <div class="action-grid" data-panel="spell" hidden>${buildCards(spellActions, 'sword')}</div>
      </div>
      <div class="modal-actions">
        <button class="modal-btn modal-btn--ghost" data-action="cancel">${t('character', 'cancel')}</button>
        <button class="modal-btn modal-btn--primary" data-action="create" disabled>${t('character', 'create')}</button>
      </div>
    </div>
  `

  parent.appendChild(backdrop)
  createIcons({ icons: { Sword, Target, Flame, Zap } })

  const input = backdrop.querySelector<HTMLInputElement>('#char-name-input')!
  const createBtn = backdrop.querySelector<HTMLButtonElement>('[data-action="create"]')!
  const cancelBtn = backdrop.querySelector<HTMLButtonElement>('[data-action="cancel"]')!
  const errorMsg = backdrop.querySelector<HTMLElement>('.modal-input-error')!

  let selectedActionId: ActionId = 'sword'

  const tabs   = backdrop.querySelectorAll<HTMLButtonElement>('.action-tab')
  const panels = backdrop.querySelectorAll<HTMLElement>('[data-panel]')
  tabs.forEach(tab => tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.toggle('action-tab--active', t === tab))
    panels.forEach(p => { p.hidden = p.dataset.panel !== tab.dataset.tab })
  }))

  backdrop.querySelectorAll<HTMLButtonElement>('[data-action-id]').forEach(card =>
    card.addEventListener('click', () => {
      selectedActionId = card.dataset.actionId as ActionId
      backdrop.querySelectorAll('[data-action-id]').forEach(c =>
        c.classList.toggle('action-card--selected', c === card),
      )
    }),
  )

  input.focus()

  input.addEventListener('input', () => {
    const trimmed = input.value.trim()
    const isDuplicate = trimmed.length > 0 && getCharacters().some(c => c.name === trimmed)
    errorMsg.textContent = isDuplicate ? t('character', 'nameTaken') : ''
    createBtn.disabled = trimmed.length === 0 || isDuplicate
  })

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !createBtn.disabled) {
      onCreate(input.value.trim(), selectedActionId)
    }
  })

  createBtn.addEventListener('click', () => {
    if (!createBtn.disabled) onCreate(input.value.trim(), selectedActionId)
  })

  cancelBtn.addEventListener('click', onClose)

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) onClose()
  })

  return () => backdrop.remove()
}

function mountLoadCharacterModal(
  parent: HTMLElement,
  { onClose, onSelect }: { onClose: () => void; onSelect: () => void },
): () => void {
  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop'
  backdrop.innerHTML = `
    <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-load-title">
      <h2 class="modal-title" id="modal-load-title">${t('character', 'loadTitle')}</h2>
      <div class="char-slot-list"></div>
      <div class="modal-actions">
        <button class="modal-btn modal-btn--ghost" data-action="cancel">${t('character', 'cancel')}</button>
      </div>
    </div>
  `

  parent.appendChild(backdrop)

  const slotList = backdrop.querySelector<HTMLElement>('.char-slot-list')!

  function renderSlots(): void {
    const chars = getCharacters()
    const currentId = getCurrentId()
    slotList.innerHTML = ''

    for (let i = 0; i < MAX_SLOTS; i++) {
      const char = chars[i]
      const row = document.createElement('div')

      if (!char) {
        row.className = 'char-slot char-slot--empty'
        row.textContent = t('character', 'emptySlot')
      } else {
        const isCurrent = char.id === currentId
        row.className = `char-slot${isCurrent ? ' char-slot--current' : ' char-slot--selectable'}`

        const nameSpan = document.createElement('span')
        nameSpan.className = 'char-slot-name'
        nameSpan.textContent = char.name

        row.appendChild(nameSpan)

        if (isCurrent) {
          const badge = document.createElement('span')
          badge.className = 'char-slot-badge'
          badge.textContent = t('character', 'current')
          row.appendChild(badge)
        } else {
          row.addEventListener('click', () => {
            loadCharacter(char.id)
            onSelect()
          })
        }

        const delBtn = document.createElement('button')
        delBtn.className = 'char-slot-delete'
        delBtn.setAttribute('aria-label', t('character', 'deleteLabel'))
        delBtn.innerHTML = '<i data-lucide="trash-2" aria-hidden="true"></i>'
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation()
          deleteCharacter(char.id)
          createIcons({ icons: { Trash2 } })
          renderSlots()
          if (getCharacters().length === 0) onClose()
        })
        row.appendChild(delBtn)
      }

      slotList.appendChild(row)
    }

    createIcons({ icons: { Trash2 } })
  }

  renderSlots()

  backdrop.querySelector<HTMLButtonElement>('[data-action="cancel"]')!
    .addEventListener('click', onClose)

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) onClose()
  })

  return () => backdrop.remove()
}

function startParticles(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext('2d')!
  let rafId = 0
  const particles: Particle[] = []

  function resize(): void {
    canvas.width = canvas.offsetWidth * devicePixelRatio
    canvas.height = canvas.offsetHeight * devicePixelRatio
  }

  function spawn(): void {
    particles.push({
      x: Math.random() * canvas.width,
      y: canvas.height + 8,
      vx: (Math.random() - 0.5) * 0.6,
      vy: -(Math.random() * 1.2 + 0.4),
      radius: Math.random() * 2.5 + 0.5,
      opacity: Math.random() * 0.5 + 0.2,
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
    })
  }

  function draw(): void {
    if (Math.random() < 0.25) spawn()

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      p.x += p.vx
      p.y += p.vy
      p.opacity -= 0.0015

      if (p.opacity <= 0 || p.y < -8) {
        particles.splice(i, 1)
        continue
      }

      ctx.globalAlpha = p.opacity
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.globalAlpha = 1
    rafId = requestAnimationFrame(draw)
  }

  resize()
  window.addEventListener('resize', resize)
  draw()

  return () => {
    cancelAnimationFrame(rafId)
    window.removeEventListener('resize', resize)
  }
}
