import { Application, Graphics } from 'pixi.js'
import { createIcons, User, ArrowLeft, Play, Pause } from 'lucide'
import { tokens } from '../theme'
import { t } from '../i18n'
import { getCurrentCharacter, saveCharacterState } from '../core/character'
import { createPlayerEntity, createEnemyEntity } from '../core/entity'
import type { Entity } from '../core/entity'
import type { SceneId } from '../core/router'

const PLAYER_RADIUS = 20
const ENEMY_SIZE = 40
const HUD_HEIGHT = 128
const REGEN_RATE = 1
const SAVE_INTERVAL_MS = 10_000
const ENEMY_SPAWN_DELAY_MS = 2_000

export function createGameScene(
  container: HTMLElement,
  navigate: (to: SceneId) => void,
): () => void {
  const char = getCurrentCharacter()
  const maxLife = char?.maxLife ?? 100
  const maxMana = char?.maxMana ?? 100

  const playerEntity = createPlayerEntity({
    maxLife,
    maxMana,
    currentLife: char?.currentLife ?? 50,
    currentMana: char?.currentMana ?? 50,
  })

  let paused = true
  let enemiesSpawned = false
  let enemySpawnTimeout: ReturnType<typeof setTimeout> | null = null

  const el = document.createElement('div')
  el.className = 'scene scene-game'
  el.innerHTML = `
    <button class="back-btn" aria-label="Back to menu">
      <i data-lucide="arrow-left" aria-hidden="true"></i>
    </button>
    <div class="stat-bars">
      <div class="stat-bar stat-bar--life">
        <div class="stat-bar-fill stat-bar-fill--life"></div>
      </div>
      <div class="stat-bar stat-bar--mana">
        <div class="stat-bar-fill stat-bar-fill--mana"></div>
      </div>
    </div>
    <div class="game-hud">
      <button class="game-action-btn" data-label="A">A</button>
      <button class="game-action-btn game-action-btn--icon" data-action="playpause" aria-label="Play">
        <i data-lucide="play" aria-hidden="true"></i>
      </button>
      <button class="game-action-btn game-action-btn--icon" data-action="character" aria-label="Character">
        <i data-lucide="user" aria-hidden="true"></i>
      </button>
    </div>
  `
  container.appendChild(el)
  createIcons({ icons: { User, ArrowLeft, Play, Pause } })

  const lifeFill = el.querySelector<HTMLElement>('.stat-bar-fill--life')!
  const manaFill = el.querySelector<HTMLElement>('.stat-bar-fill--mana')!
  const playPauseBtn = el.querySelector<HTMLButtonElement>('[data-action="playpause"]')!

  function updateBars(): void {
    lifeFill.style.width = `${(playerEntity.currentLife / playerEntity.maxLife) * 100}%`
    manaFill.style.width = `${(playerEntity.currentMana / playerEntity.maxMana) * 100}%`
  }

  updateBars()

  // ── Regen ───────────────────────────────────────────────────────────────

  let regenTimer: ReturnType<typeof setInterval> | null = null

  function startRegen(): void {
    if (regenTimer !== null) return
    regenTimer = setInterval(() => {
      playerEntity.currentLife = Math.min(playerEntity.maxLife, playerEntity.currentLife + REGEN_RATE)
      playerEntity.currentMana = Math.min(playerEntity.maxMana, playerEntity.currentMana + REGEN_RATE)
      updateBars()
    }, 1000)
  }

  function stopRegen(): void {
    if (regenTimer !== null) {
      clearInterval(regenTimer)
      regenTimer = null
    }
  }

  // ── Play / Pause ────────────────────────────────────────────────────────

  function updatePlayPauseBtn(): void {
    const icon = paused ? 'play' : 'pause'
    playPauseBtn.setAttribute('aria-label', paused ? 'Play' : 'Pause')
    playPauseBtn.innerHTML = `<i data-lucide="${icon}" aria-hidden="true"></i>`
    createIcons({ icons: { Play, Pause } })
  }

  function togglePause(): void {
    paused = !paused
    if (paused) {
      stopRegen()
      app?.ticker.stop()
    } else {
      startRegen()
      app?.ticker.start()
      if (!enemiesSpawned) {
        enemySpawnTimeout = setTimeout(() => {
          if (!destroyed) spawnEnemies()
        }, ENEMY_SPAWN_DELAY_MS)
      }
    }
    updatePlayPauseBtn()
  }

  playPauseBtn.addEventListener('click', togglePause)

  // ── Auto-save ───────────────────────────────────────────────────────────

  const saveInterval = setInterval(() => {
    if (char) saveCharacterState(char.id, playerEntity.currentLife, playerEntity.currentMana)
  }, SAVE_INTERVAL_MS)

  function saveAndGoBack(): void {
    if (char) saveCharacterState(char.id, playerEntity.currentLife, playerEntity.currentMana)
    navigate('menu')
  }

  el.querySelector<HTMLButtonElement>('.back-btn')!
    .addEventListener('click', saveAndGoBack)

  // ── PixiJS ──────────────────────────────────────────────────────────────

  let app: Application | null = null
  let destroyed = false
  let modalCleanup: (() => void) | null = null
  const entityGraphics = new Map<string, Graphics>()

  const charBtn = el.querySelector<HTMLButtonElement>('[data-action="character"]')!
  charBtn.addEventListener('click', () => {
    if (modalCleanup) {
      modalCleanup()
      modalCleanup = null
      return
    }
    modalCleanup = mountCharacterModal(el, () => { modalCleanup = null })
  })

  function drawEntity(entity: Entity): void {
    if (!app) return
    let g = entityGraphics.get(entity.id)
    if (!g) {
      g = new Graphics()
      app.stage.addChild(g)
      entityGraphics.set(entity.id, g)
    }
    g.clear()
    if (entity.role === 'player') {
      g.circle(0, 0, PLAYER_RADIUS)
      g.fill({ color: tokens.color.primary })
    } else {
      g.rect(-ENEMY_SIZE / 2, -ENEMY_SIZE / 2, ENEMY_SIZE, ENEMY_SIZE)
      g.fill({ color: tokens.color.accentAlt })
    }
    g.position.set(entity.x, entity.y)
  }

  function repositionPlayer(): void {
    if (!app) return
    const { width, height } = app.screen
    playerEntity.x = width / 2
    playerEntity.y = (height - HUD_HEIGHT) / 2
    drawEntity(playerEntity)
  }

  function spawnEnemies(): void {
    if (!app || enemiesSpawned) return
    enemiesSpawned = true
    const { width, height } = app.screen
    const playArea = height - HUD_HEIGHT
    const margin = ENEMY_SIZE
    const positions: Array<[number, number]> = [
      [
        margin + Math.random() * (width / 2 - margin * 2),
        margin + Math.random() * (playArea - margin * 2),
      ],
      [
        width / 2 + margin + Math.random() * (width / 2 - margin * 2),
        margin + Math.random() * (playArea - margin * 2),
      ],
    ]
    positions.forEach(([x, y], i) => {
      const enemy = createEnemyEntity(`enemy-${i + 1}`, x, y)
      drawEntity(enemy)
    })
  }

  ;(async () => {
    try {
      const instance = new Application()
      await instance.init({
        background: tokens.color.surface,
        resizeTo: el,
        antialias: true,
        resolution: devicePixelRatio,
        autoDensity: true,
      })

      if (destroyed) {
        instance.destroy(true)
        return
      }

      if (paused) instance.ticker.stop()

      app = instance

      const wrapper = document.createElement('div')
      wrapper.className = 'game-canvas-wrapper'
      wrapper.appendChild(app.canvas)
      el.insertBefore(wrapper, el.firstChild)

      repositionPlayer()
      app.renderer.on('resize', repositionPlayer)
    } catch (err) {
      console.error('[game] PixiJS init failed:', err)
    }
  })()

  return () => {
    destroyed = true
    stopRegen()
    clearInterval(saveInterval)
    if (enemySpawnTimeout !== null) { clearTimeout(enemySpawnTimeout); enemySpawnTimeout = null }
    if (modalCleanup) { modalCleanup(); modalCleanup = null }
    app?.destroy(true)
    app = null
    el.remove()
  }
}

function mountCharacterModal(parent: HTMLElement, onClose: () => void): () => void {
  const char = getCurrentCharacter()

  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop'
  backdrop.innerHTML = `
    <div class="modal-panel char-info-panel" role="dialog" aria-modal="true" aria-labelledby="char-info-title">
      <h2 class="modal-title" id="char-info-title">${t('character', 'infoTitle')}</h2>
      <div class="char-info-row">
        <span class="char-info-label">${t('character', 'nameLabel')}</span>
        <span class="char-info-value">${char ? escapeHtml(char.name) : '—'}</span>
      </div>
      <div class="char-info-row">
        <span class="char-info-label">${t('character', 'statMaxLife')}</span>
        <span class="char-info-value char-info-value--life">${char?.maxLife ?? 100}</span>
      </div>
      <div class="char-info-row">
        <span class="char-info-label">${t('character', 'statMaxMana')}</span>
        <span class="char-info-value char-info-value--mana">${char?.maxMana ?? 100}</span>
      </div>
      <div class="modal-actions">
        <button class="modal-btn modal-btn--ghost" data-action="close">${t('settings', 'close')}</button>
      </div>
    </div>
  `

  parent.appendChild(backdrop)

  backdrop.querySelector<HTMLButtonElement>('[data-action="close"]')!
    .addEventListener('click', () => { backdrop.remove(); onClose() })

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) { backdrop.remove(); onClose() }
  })

  return () => backdrop.remove()
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
