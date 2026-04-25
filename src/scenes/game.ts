import { Application, Graphics } from 'pixi.js'
import * as Matter from 'matter-js'
import { createIcons, User, ArrowLeft, Play, Pause } from 'lucide'
import { tokens } from '../theme'
import { t } from '../i18n'
import { getCurrentCharacter, saveCharacterState } from '../core/character'
import { createPlayerEntity, createEnemyEntity, nearestTarget } from '../core/entity'
import type { Entity } from '../core/entity'
import { GRID_SIZE } from '../core/world'
import type { SceneId } from '../core/router'

const PLAYER_RADIUS = 20
const HUD_HEIGHT = 128
const REGEN_RATE = 1
const SAVE_INTERVAL_MS = 10_000
const ENEMY_SPAWN_DELAY_MS = 2_000
const ENTITY_SPEED = 80   // px/s
const SPAWN_DISTANCE = 300 // world units from player

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
    radius: PLAYER_RADIUS,
  })

  const entities: Entity[] = [playerEntity]

  // ── Physics (Matter.js) ─────────────────────────────────────────────────
  // Used for collision detection and resolution; our AI drives the velocities.

  const physicsEngine = Matter.Engine.create({ gravity: { x: 0, y: 0 } })
  const entityBodies = new Map<string, Matter.Body>()

  function createEntityBody(entity: Entity): void {
    const body = Matter.Bodies.circle(entity.x, entity.y, entity.radius, {
      frictionAir: 0,
      friction: 0,
      restitution: 0,
      inertia: Infinity,
      label: entity.id,
    })
    Matter.Composite.add(physicsEngine.world, body)
    entityBodies.set(entity.id, body)
  }

  createEntityBody(playerEntity)

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
  let worldGrid: Graphics | null = null
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

  // Draws the entity shape once and registers its graphics object.
  function initEntityGraphics(entity: Entity): void {
    if (!app || entityGraphics.has(entity.id)) return
    const g = new Graphics()
    if (entity.role === 'player') {
      g.circle(0, 0, entity.radius)
      g.fill({ color: tokens.color.primary })
    } else {
      g.rect(-entity.radius, -entity.radius, entity.radius * 2, entity.radius * 2)
      g.fill({ color: tokens.color.accentAlt })
    }
    g.position.set(entity.x, entity.y)
    app.stage.addChild(g)
    entityGraphics.set(entity.id, g)
  }

  // Redraws the world grid to cover the current viewport in world-space coordinates.
  function drawGrid(): void {
    if (!app || !worldGrid) return
    const { width, height } = app.screen
    const halfW = width / 2
    const halfH = (height - HUD_HEIGHT) / 2

    const left   = playerEntity.x - halfW   - GRID_SIZE
    const right  = playerEntity.x + halfW   + GRID_SIZE
    const top    = playerEntity.y - halfH   - GRID_SIZE
    const bottom = playerEntity.y + halfH   + GRID_SIZE

    const startX = Math.floor(left  / GRID_SIZE) * GRID_SIZE
    const startY = Math.floor(top   / GRID_SIZE) * GRID_SIZE

    worldGrid.clear()
    for (let x = startX; x <= right;  x += GRID_SIZE) {
      worldGrid.moveTo(x, top)
      worldGrid.lineTo(x, bottom)
    }
    for (let y = startY; y <= bottom; y += GRID_SIZE) {
      worldGrid.moveTo(left, y)
      worldGrid.lineTo(right, y)
    }
    worldGrid.stroke({ color: tokens.color.primary, width: 1, alpha: 0.1 })
  }

  // Offsets the stage so the player always appears at the visual center.
  function updateCamera(): void {
    if (!app) return
    const { width, height } = app.screen
    app.stage.position.set(
      width / 2 - playerEntity.x,
      (height - HUD_HEIGHT) / 2 - playerEntity.y,
    )
  }

  function spawnEnemies(): void {
    if (!app || enemiesSpawned) return
    enemiesSpawned = true
    const baseAngle = Math.random() * Math.PI * 2
    for (let i = 0; i < 2; i++) {
      const angle = baseAngle + i * Math.PI + (Math.random() - 0.5) * 0.8
      const dist = SPAWN_DISTANCE + Math.random() * 100
      const enemy = createEnemyEntity(
        `enemy-${i + 1}`,
        playerEntity.x + Math.cos(angle) * dist,
        playerEntity.y + Math.sin(angle) * dist,
      )
      entities.push(enemy)
      createEntityBody(enemy)
      initEntityGraphics(enemy)
    }
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

      worldGrid = new Graphics()
      app.stage.addChild(worldGrid)

      initEntityGraphics(playerEntity)
      drawGrid()
      updateCamera()
      app.renderer.on('resize', () => { drawGrid(); updateCamera() })

      app.ticker.add((ticker) => {
        const dt = ticker.deltaMS / 1000

        // Set velocities toward nearest cross-team target; stop at contact distance.
        for (const entity of entities) {
          const body = entityBodies.get(entity.id)
          if (!body) continue
          const target = nearestTarget(entity, entities)
          if (target) {
            const dx = target.x - entity.x
            const dy = target.y - entity.y
            const distSq = dx * dx + dy * dy
            const minDist = entity.radius + target.radius
            if (distSq > minDist * minDist) {
              const dist = Math.sqrt(distSq)
              Matter.Body.setVelocity(body, {
                x: (dx / dist) * ENTITY_SPEED * dt,
                y: (dy / dist) * ENTITY_SPEED * dt,
              })
            } else {
              Matter.Body.setVelocity(body, { x: 0, y: 0 })
            }
          } else {
            Matter.Body.setVelocity(body, { x: 0, y: 0 })
          }
        }

        // Step physics: resolves collisions and updates body positions.
        Matter.Engine.update(physicsEngine, ticker.deltaMS)

        // Sync entity positions from physics bodies and update graphics.
        for (const entity of entities) {
          const body = entityBodies.get(entity.id)
          if (body) {
            entity.x = body.position.x
            entity.y = body.position.y
            entityGraphics.get(entity.id)?.position.set(entity.x, entity.y)
          }
        }

        drawGrid()
        updateCamera()
      })
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
    Matter.Composite.clear(physicsEngine.world, false)
    Matter.Engine.clear(physicsEngine)
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
