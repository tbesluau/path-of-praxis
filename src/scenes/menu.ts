import { createIcons, Play, FolderOpen, Trophy, Trash2 } from 'lucide'
import { t } from '../i18n'
import { tokens } from '../theme'
import { mountSettingsButton } from '../ui/settings'
import { buildActionThumbnail, refreshActionThumbnailIcons, mountActionPickerModal } from '../ui/action-picker'
import type { SceneId } from '../core/router'
import {
  getCharacters,
  getCurrentId,
  createCharacter,
  loadCharacter,
  deleteCharacter,
  MAX_SLOTS,
} from '../core/character'
import { allActions, type ActionId } from '../config/actions'

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
    <span class="version-badge">v${__APP_VERSION__} alpha</span>
    <div class="menu-content">
      <header class="menu-header">
        <h1 class="game-title">${t('game', 'title')}</h1>
      </header>
      <nav class="menu-nav" aria-label="${t('menu', 'nav')}">
        <button class="menu-btn" data-action="continue">
          <i data-lucide="play" aria-hidden="true"></i>
          <span>${t('menu', 'continue')}</span>
        </button>
        <button class="menu-btn" data-action="load-character">
          <i data-lucide="folder-open" aria-hidden="true"></i>
          <span>${t('menu', 'characters')}</span>
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
  createIcons({ icons: { Play, FolderOpen, Trophy, Trash2 } })

  const unmountSettings = mountSettingsButton(el)

  const canvas = el.querySelector<HTMLCanvasElement>('#menu-canvas')!
  const stopParticles = startParticles(canvas)

  const btnContinue = el.querySelector<HTMLButtonElement>('[data-action="continue"]')!
  const btnLoad = el.querySelector<HTMLButtonElement>('[data-action="load-character"]')!

  let modalCleanup: (() => void) | null = null

  function refreshButtonStates(): void {
    const currentId = getCurrentId()
    btnContinue.disabled = currentId === null
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

  btnLoad.addEventListener('click', () => {
    closeModal()
    modalCleanup = mountLoadCharacterModal(el, {
      onClose: closeModal,
      onSelect: () => navigate('game'),
      onCreate: (name, actionId) => {
        createCharacter(name, actionId)
        navigate('game')
      },
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
  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop'
  backdrop.innerHTML = `
    <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-new-title">
      <button class="modal-close-btn" data-action="close" aria-label="Close"></button>
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
        <div class="new-char-action-slot"></div>
      </div>
      <div class="modal-actions">
        <button class="modal-btn modal-btn--ghost" data-action="cancel">${t('character', 'cancel')}</button>
        <button class="modal-btn modal-btn--primary" data-action="create" disabled>${t('character', 'create')}</button>
      </div>
    </div>
  `

  parent.appendChild(backdrop)

  const input = backdrop.querySelector<HTMLInputElement>('#char-name-input')!
  const createBtn = backdrop.querySelector<HTMLButtonElement>('[data-action="create"]')!
  const actionSlot = backdrop.querySelector<HTMLElement>('.new-char-action-slot')!
  backdrop.querySelector<HTMLButtonElement>('[data-action="close"]')!
    .addEventListener('click', onClose)
  const cancelBtn = backdrop.querySelector<HTMLButtonElement>('[data-action="cancel"]')!
  const errorMsg = backdrop.querySelector<HTMLElement>('.modal-input-error')!

  let selectedActionId: ActionId | null = null
  let pickerCleanup: (() => void) | null = null

  function syncCreateBtn(): void {
    const trimmed = input.value.trim()
    const isDuplicate = trimmed.length > 0 && getCharacters().some(c => c.name === trimmed)
    errorMsg.textContent = isDuplicate ? t('character', 'nameTaken') : ''
    createBtn.disabled = trimmed.length === 0 || isDuplicate || selectedActionId === null
  }

  function renderThumbnail(): void {
    actionSlot.innerHTML = ''
    const btn = document.createElement('button')
    btn.className = 'action-trigger-card'
    btn.appendChild(buildActionThumbnail(selectedActionId ? allActions.find(a => a.id === selectedActionId) ?? null : null))
    actionSlot.appendChild(btn)
    refreshActionThumbnailIcons()
    btn.addEventListener('click', () => {
      if (pickerCleanup) { pickerCleanup(); pickerCleanup = null }
      pickerCleanup = mountActionPickerModal(
        parent,
        allActions,
        selectedActionId,
        (id) => { selectedActionId = id as ActionId; renderThumbnail(); syncCreateBtn() },
        () => { pickerCleanup = null },
      )
    })
  }

  renderThumbnail()
  input.focus()

  input.addEventListener('input', syncCreateBtn)

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !createBtn.disabled) {
      onCreate(input.value.trim(), selectedActionId!)
    }
  })

  createBtn.addEventListener('click', () => {
    if (!createBtn.disabled) onCreate(input.value.trim(), selectedActionId!)
  })

  cancelBtn.addEventListener('click', onClose)

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) onClose()
  })

  return () => { if (pickerCleanup) pickerCleanup(); backdrop.remove() }
}

function mountLoadCharacterModal(
  parent: HTMLElement,
  { onClose, onSelect, onCreate }: {
    onClose: () => void
    onSelect: () => void
    onCreate: (name: string, actionId: ActionId) => void
  },
): () => void {
  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop'
  backdrop.innerHTML = `
    <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-load-title">
      <button class="modal-close-btn" data-action="close" aria-label="Close"></button>
      <h2 class="modal-title" id="modal-load-title">${t('character', 'loadTitle')}</h2>
      <div class="char-slot-list"></div>
    </div>
  `

  parent.appendChild(backdrop)

  let subCleanup: (() => void) | null = null
  function closeSub(): void {
    if (subCleanup) { subCleanup(); subCleanup = null }
  }

  const slotList = backdrop.querySelector<HTMLElement>('.char-slot-list')!

  function renderSlots(): void {
    const chars = getCharacters()
    const currentId = getCurrentId()
    slotList.innerHTML = ''
    let firstEmptyDone = false

    for (let i = 0; i < MAX_SLOTS; i++) {
      const char = chars[i]
      const row = document.createElement('div')

      if (!char) {
        row.className = 'char-slot char-slot--empty'
        if (!firstEmptyDone) {
          firstEmptyDone = true
          const emptyLabel = document.createElement('span')
          emptyLabel.className = 'char-slot-name'
          emptyLabel.textContent = t('character', 'emptySlot')
          const newBtn = document.createElement('button')
          newBtn.className = 'char-slot-new-btn'
          newBtn.textContent = t('character', 'newSlot')
          newBtn.addEventListener('click', () => {
            closeSub()
            subCleanup = mountNewCharacterModal(parent, {
              onClose: () => { subCleanup = null },
              onCreate,
            })
          })
          row.appendChild(emptyLabel)
          row.appendChild(newBtn)
        } else {
          row.textContent = t('character', 'emptySlot')
        }
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
        })
        row.appendChild(delBtn)
      }

      slotList.appendChild(row)
    }

    createIcons({ icons: { Trash2 } })
  }

  renderSlots()

  backdrop.querySelector<HTMLButtonElement>('[data-action="close"]')!
    .addEventListener('click', () => { closeSub(); backdrop.remove(); onClose() })

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) { closeSub(); backdrop.remove(); onClose() }
  })

  return () => { closeSub(); backdrop.remove() }
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
