import { Application, Container, Graphics } from 'pixi.js'
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
const HP_BAR_H = 4
const HP_BAR_GAP = 4
const HUD_HEIGHT = 128
const REGEN_RATE = 1
const SAVE_INTERVAL_MS = 10_000
const ENEMY_SPAWN_DELAY_MS = 2_000
const ENTITY_SPEED = 80
const SPAWN_DISTANCE = 300
const FRAG_COUNT = 8
const FRAG_LIFETIME = 750 // ms

interface DeathFragment {
  g: Graphics
  vx: number
  vy: number
  spin: number
  age: number
  maxAge: number
}

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

  // ── Physics ─────────────────────────────────────────────────────────────

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
  let playerDead = false
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
      if (playerDead) return
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
    if (char && !playerDead) saveCharacterState(char.id, playerEntity.currentLife, playerEntity.currentMana)
  }, SAVE_INTERVAL_MS)

  function saveAndGoBack(): void {
    if (char && !playerDead) saveCharacterState(char.id, playerEntity.currentLife, playerEntity.currentMana)
    navigate('menu')
  }

  el.querySelector<HTMLButtonElement>('.back-btn')!
    .addEventListener('click', saveAndGoBack)

  // ── PixiJS ──────────────────────────────────────────────────────────────

  let app: Application | null = null
  let worldGrid: Graphics | null = null
  let destroyed = false
  let modalCleanup: (() => void) | null = null

  const entityContainers = new Map<string, Container>()
  const lifeBarGraphics = new Map<string, Graphics>()
  const attackCooldowns = new Map<string, number>()
  const deathFragments: DeathFragment[] = []

  const charBtn = el.querySelector<HTMLButtonElement>('[data-action="character"]')!
  charBtn.addEventListener('click', () => {
    if (modalCleanup) {
      modalCleanup()
      modalCleanup = null
      return
    }
    modalCleanup = mountCharacterModal(el, () => { modalCleanup = null })
  })

  function drawLifeBar(entity: Entity): void {
    const bar = lifeBarGraphics.get(entity.id)
    if (!bar) return
    const barW = entity.radius * 2
    bar.clear()
    bar.rect(-barW / 2, 0, barW, HP_BAR_H)
    bar.fill({ color: tokens.color.surfacePanel })
    const pct = Math.max(0, entity.currentLife / entity.maxLife)
    if (pct > 0) {
      bar.rect(-barW / 2, 0, barW * pct, HP_BAR_H)
      bar.fill({ color: tokens.color.accentAlt })
    }
  }

  function initEntityDisplay(entity: Entity): void {
    if (!app || entityContainers.has(entity.id)) return
    const c = new Container()
    const sprite = new Graphics()
    if (entity.role === 'player') {
      sprite.circle(0, 0, entity.radius)
      sprite.fill({ color: tokens.color.primary })
    } else {
      sprite.rect(-entity.radius, -entity.radius, entity.radius * 2, entity.radius * 2)
      sprite.fill({ color: tokens.color.accentAlt })
    }
    c.addChild(sprite)
    if (entity.role !== 'player') {
      const bar = new Graphics()
      bar.position.set(0, -(entity.radius + HP_BAR_GAP + HP_BAR_H))
      c.addChild(bar)
      lifeBarGraphics.set(entity.id, bar)
      drawLifeBar(entity)
    }
    c.position.set(entity.x, entity.y)
    app.stage.addChild(c)
    entityContainers.set(entity.id, c)
  }

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

  function updateCamera(): void {
    if (!app) return
    const { width, height } = app.screen
    app.stage.position.set(
      width / 2 - playerEntity.x,
      (height - HUD_HEIGHT) / 2 - playerEntity.y,
    )
  }

  // ── Death system ─────────────────────────────────────────────────────────

  function spawnDeathFragments(entity: Entity): void {
    if (!app) return
    const color = entity.role === 'player' ? tokens.color.primary : tokens.color.accentAlt
    const fragSize = entity.radius * 0.35

    for (let i = 0; i < FRAG_COUNT; i++) {
      const angle = (i / FRAG_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.5
      const speed = 70 + Math.random() * 110
      const g = new Graphics()
      if (entity.role === 'player') {
        g.circle(0, 0, fragSize)
        g.fill({ color })
      } else {
        g.rect(-fragSize, -fragSize * 0.6, fragSize * 2, fragSize * 1.2)
        g.fill({ color })
      }
      g.position.set(entity.x, entity.y)
      app.stage.addChild(g)
      deathFragments.push({
        g,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        spin: entity.role === 'player' ? 0 : (Math.random() - 0.5) * 9,
        age: 0,
        maxAge: FRAG_LIFETIME + Math.random() * 300,
      })
    }
  }

  // Removes entity from all data structures without spawning animation.
  function removeEntity(entity: Entity): void {
    const body = entityBodies.get(entity.id)
    if (body) {
      Matter.Composite.remove(physicsEngine.world, body)
      entityBodies.delete(entity.id)
    }
    const c = entityContainers.get(entity.id)
    if (c) {
      c.destroy()
      entityContainers.delete(entity.id)
    }
    lifeBarGraphics.delete(entity.id)
    attackCooldowns.delete(entity.id)
    const idx = entities.indexOf(entity)
    if (idx !== -1) entities.splice(idx, 1)
  }

  // On-death hook: runs the shatter animation then cleans up the entity.
  function killEntity(entity: Entity): void {
    spawnDeathFragments(entity)
    removeEntity(entity)
    if (entity.role === 'player') {
      playerDead = true
      modalCleanup = mountDeathModal()
    }
  }

  function rebirth(): void {
    modalCleanup = null

    // Clear any in-progress fragments immediately
    for (const f of deathFragments) f.g.destroy()
    deathFragments.length = 0

    // Remove remaining enemies without animation
    for (const entity of [...entities]) {
      if (entity.role !== 'player') removeEntity(entity)
    }

    // Cancel any pending enemy spawn timer
    if (enemySpawnTimeout !== null) {
      clearTimeout(enemySpawnTimeout)
      enemySpawnTimeout = null
    }

    // Reset player
    playerEntity.currentLife = playerEntity.maxLife
    playerEntity.currentMana = playerEntity.maxMana
    playerEntity.x = 0
    playerEntity.y = 0

    entities.push(playerEntity)
    createEntityBody(playerEntity)
    initEntityDisplay(playerEntity)

    playerDead = false
    enemiesSpawned = false
    updateBars()

    // Schedule enemy respawn (game is still unpaused at this point)
    enemySpawnTimeout = setTimeout(() => {
      if (!destroyed) spawnEnemies()
    }, ENEMY_SPAWN_DELAY_MS)
  }

  function mountDeathModal(): () => void {
    const backdrop = document.createElement('div')
    backdrop.className = 'modal-backdrop'
    backdrop.innerHTML = `
      <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="death-title">
        <h2 class="modal-title" id="death-title">${t('game', 'deathTitle')}</h2>
        <div class="modal-actions">
          <button class="modal-btn modal-btn--primary" data-action="rebirth">${t('game', 'deathRebirth')}</button>
        </div>
      </div>
    `
    backdrop.querySelector<HTMLButtonElement>('[data-action="rebirth"]')!
      .addEventListener('click', () => { backdrop.remove(); rebirth() })
    el.appendChild(backdrop)
    return () => backdrop.remove()
  }

  // ── Spawn ────────────────────────────────────────────────────────────────

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
      initEntityDisplay(enemy)
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

      initEntityDisplay(playerEntity)
      drawGrid()
      updateCamera()
      app.renderer.on('resize', () => { drawGrid(); updateCamera() })

      app.ticker.add((ticker) => {
        // ── Death fragment animation (always runs while ticker is active) ───
        for (let i = deathFragments.length - 1; i >= 0; i--) {
          const f = deathFragments[i]
          f.age += ticker.deltaMS
          if (f.age >= f.maxAge) {
            f.g.destroy()
            deathFragments.splice(i, 1)
            continue
          }
          const dt = ticker.deltaMS / 1000
          const progress = f.age / f.maxAge
          f.g.x += f.vx * dt
          f.g.y += f.vy * dt
          f.g.rotation += f.spin * dt
          f.g.alpha = 1 - progress
          f.g.scale.set(1 - progress * 0.4)
        }

        if (playerDead) {
          drawGrid()
          updateCamera()
          return
        }

        const dt = ticker.deltaMS / 1000

        // ── Movement ────────────────────────────────────────────────────────
        for (const entity of entities) {
          const body = entityBodies.get(entity.id)
          if (!body) continue
          const target = nearestTarget(entity, entities)
          if (!target) {
            Matter.Body.setVelocity(body, { x: 0, y: 0 })
            continue
          }
          const dx = target.x - entity.x
          const dy = target.y - entity.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const stopDist = entity.attackRange + target.radius
          if (dist > stopDist) {
            Matter.Body.setVelocity(body, {
              x: (dx / dist) * ENTITY_SPEED * dt,
              y: (dy / dist) * ENTITY_SPEED * dt,
            })
          } else {
            Matter.Body.setVelocity(body, { x: 0, y: 0 })
          }
        }

        // ── Physics step ────────────────────────────────────────────────────
        Matter.Engine.update(physicsEngine, ticker.deltaMS)

        // ── Sync positions ──────────────────────────────────────────────────
        for (const entity of entities) {
          const body = entityBodies.get(entity.id)
          if (body) {
            entity.x = body.position.x
            entity.y = body.position.y
          }
          entityContainers.get(entity.id)?.position.set(entity.x, entity.y)
        }

        // ── Attacks ─────────────────────────────────────────────────────────
        const damagedIds = new Set<string>()
        for (const entity of entities) {
          const cd = (attackCooldowns.get(entity.id) ?? 0) - ticker.deltaMS
          attackCooldowns.set(entity.id, cd)
          const target = nearestTarget(entity, entities)
          if (!target) continue
          const dx = target.x - entity.x
          const dy = target.y - entity.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist - target.radius <= entity.attackRange && cd <= 0) {
            target.currentLife = Math.max(0, target.currentLife - entity.attackDamage)
            attackCooldowns.set(entity.id, 1000 / entity.attackSpeed)
            damagedIds.add(target.id)
          }
        }

        // ── Death checks and life bar updates ───────────────────────────────
        for (const id of damagedIds) {
          const entity = entities.find(e => e.id === id)
          if (!entity) continue
          if (entity.currentLife <= 0) {
            killEntity(entity)
          } else if (entity.role === 'player') {
            updateBars()
          } else {
            drawLifeBar(entity)
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
    for (const f of deathFragments) f.g.destroy()
    deathFragments.length = 0
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
