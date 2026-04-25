import { Application, Container, Graphics } from 'pixi.js'
import * as Matter from 'matter-js'
import { createIcons, User, ArrowLeft, Play, Pause, Sword, Target, Flame, Zap } from 'lucide'
import { tokens } from '../theme'
import { t } from '../i18n'
import { getCurrentCharacter, saveCharacterState } from '../core/character'
import { createPlayerEntity, createEnemyEntity, nearestTarget } from '../core/entity'
import type { Entity } from '../core/entity'
import { balance } from '../config/balance'
import { allActions, getAction, randomAction, type ActionId, type ActionDef } from '../config/actions'
import type { SceneId } from '../core/router'

const HP_BAR_H = 4
const HP_BAR_GAP = 4
const HUD_HEIGHT = 128
const SAVE_INTERVAL_MS = 10_000

interface DeathFragment {
  g: Graphics
  vx: number
  vy: number
  spin: number
  age: number
  maxAge: number
}

interface Vfx {
  g: Graphics
  age: number
  maxAge: number
  tick: (progress: number) => void
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
    currentLife: char?.currentLife ?? balance.player.startingLife,
    currentMana: char?.currentMana ?? balance.player.startingMana,
    radius: balance.player.radius,
    moveSpeed: balance.player.moveSpeed,
  })

  const entities: Entity[] = [playerEntity]

  // ── Actions ──────────────────────────────────────────────────────────────

  const entityActions = new Map<string, ActionId>()

  function assignAction(entity: Entity, id: ActionId): void {
    const def = getAction(id)
    entity.attackSpeed  = def.speed
    entity.attackDamage = def.damage
    entity.attackRange  = def.range * balance.player.radius
    entityActions.set(entity.id, id)
  }

  assignAction(playerEntity, 'sword')

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
  let waveScheduled = false
  let enemyIdCounter = 0
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
      <button class="game-action-btn game-action-btn--action" data-action="open-action" aria-label="Select action">
        <i data-lucide="sword" aria-hidden="true"></i>
        <span>Sword</span>
      </button>
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
  const actionBtn = el.querySelector<HTMLButtonElement>('[data-action="open-action"]')!

  function updateActionBtn(def: ActionDef): void {
    actionBtn.innerHTML = `<i data-lucide="${def.icon}" aria-hidden="true"></i><span>${def.label}</span>`
    createIcons({ icons: { Sword, Target, Flame, Zap } })
  }

  updateActionBtn(getAction('sword'))

  actionBtn.addEventListener('click', () => {
    if (modalCleanup) { modalCleanup(); modalCleanup = null; return }
    const currentId = entityActions.get(playerEntity.id) ?? allActions[0].id
    modalCleanup = mountActionSelectModal(
      el,
      currentId,
      (id) => { assignAction(playerEntity, id); updateActionBtn(getAction(id)) },
      () => { modalCleanup = null },
    )
  })

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
      playerEntity.currentLife = Math.min(playerEntity.maxLife, playerEntity.currentLife + balance.player.regenRate)
      playerEntity.currentMana = Math.min(playerEntity.maxMana, playerEntity.currentMana + balance.player.regenRate)
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
      const liveEnemies = entities.filter(e => e.role === 'enemy').length
      if (liveEnemies <= balance.wave.nextWaveThreshold) scheduleWave()
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
  const vfxList: Vfx[] = []

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
    const gs = balance.world.gridSize
    const halfW = width / 2
    const halfH = (height - HUD_HEIGHT) / 2
    const left   = playerEntity.x - halfW   - gs
    const right  = playerEntity.x + halfW   + gs
    const top    = playerEntity.y - halfH   - gs
    const bottom = playerEntity.y + halfH   + gs
    const startX = Math.floor(left / gs) * gs
    const startY = Math.floor(top  / gs) * gs
    worldGrid.clear()
    for (let x = startX; x <= right;  x += gs) {
      worldGrid.moveTo(x, top)
      worldGrid.lineTo(x, bottom)
    }
    for (let y = startY; y <= bottom; y += gs) {
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

    const fragCount = balance.death.fragmentCount
    for (let i = 0; i < fragCount; i++) {
      const angle = (i / fragCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5
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
        maxAge: balance.death.fragmentLifetime + Math.random() * 300,
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
    entityActions.delete(entity.id)
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
    } else {
      const liveEnemies = entities.filter(e => e.role === 'enemy').length
      if (!paused && liveEnemies <= balance.wave.nextWaveThreshold) scheduleWave()
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

    // Cancel any pending wave timer
    if (enemySpawnTimeout !== null) {
      clearTimeout(enemySpawnTimeout)
      enemySpawnTimeout = null
    }
    waveScheduled = false

    // Reset player
    playerEntity.currentLife = playerEntity.maxLife
    playerEntity.currentMana = playerEntity.maxMana
    playerEntity.x = 0
    playerEntity.y = 0

    entities.push(playerEntity)
    createEntityBody(playerEntity)
    initEntityDisplay(playerEntity)

    playerDead = false
    updateBars()

    scheduleWave()
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

  function scheduleWave(): void {
    if (waveScheduled) return
    waveScheduled = true
    enemySpawnTimeout = setTimeout(() => {
      if (!destroyed) spawnEnemies()
    }, balance.wave.spawnDelay)
  }

  function spawnEnemies(): void {
    if (!app) return
    waveScheduled = false
    enemySpawnTimeout = null

    let count = balance.wave.minCount
    while (Math.random() < balance.wave.extraChance) count++

    const baseAngle = Math.random() * Math.PI * 2
    for (let i = 0; i < count; i++) {
      const angle = baseAngle + (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5
      const dist = balance.wave.spawnDistance + Math.random() * 100
      const enemy = createEnemyEntity(
        `enemy-${++enemyIdCounter}`,
        playerEntity.x + Math.cos(angle) * dist,
        playerEntity.y + Math.sin(angle) * dist,
        'enemyA',
        balance.enemyA.radius,
        { moveSpeed: balance.enemyA.moveSpeed, maxLife: balance.enemyA.maxLife },
      )
      assignAction(enemy, randomAction().id)
      entities.push(enemy)
      createEntityBody(enemy)
      initEntityDisplay(enemy)
    }
  }

  // ── VFX ──────────────────────────────────────────────────────────────────

  function addVfx(maxAge: number, tick: (g: Graphics, progress: number) => void): void {
    if (!app) return
    const g = new Graphics()
    app.stage.addChild(g)
    vfxList.push({ g, age: 0, maxAge, tick: (p) => tick(g, p) })
  }

  function spawnVfx(attacker: Entity, target: Entity, action: ActionDef): void {
    const ax = attacker.x, ay = attacker.y
    const tx = target.x, ty = target.y
    const tr = target.radius

    if (action.id === 'sword') {
      addVfx(200, (g, p) => {
        g.clear()
        const r = tr * 0.75
        g.moveTo(tx - r, ty - r); g.lineTo(tx + r, ty + r)
        g.moveTo(tx + r, ty - r); g.lineTo(tx - r, ty + r)
        g.stroke({ color: 0xffffff, width: Math.max(0.5, 3 * (1 - p)), alpha: 1 - p })
      })
    } else if (action.id === 'bow') {
      addVfx(180, (g, p) => {
        g.clear()
        const tail = Math.min(1, p * 5)
        g.moveTo(ax + (tx - ax) * tail, ay + (ty - ay) * tail)
        g.lineTo(tx, ty)
        g.stroke({ color: 0xffee66, width: 2, alpha: 1 - p })
      })
    } else if (action.id === 'fireball') {
      addVfx(320, (g, p) => {
        g.clear()
        const r = tr * (0.4 + p * 2)
        g.circle(tx, ty, r)
        g.fill({ color: 0xff6600, alpha: (1 - p) * 0.5 })
        g.circle(tx, ty, r * 0.5)
        g.fill({ color: 0xffcc00, alpha: (1 - p) * 0.8 })
      })
    } else if (action.id === 'zap') {
      addVfx(110, (g, p) => {
        g.clear()
        const dx = tx - ax, dy = ty - ay
        const len = Math.sqrt(dx * dx + dy * dy) || 1
        const nx = -dy / len, ny = dx / len
        const jitter = tr * 0.45 * (1 - p * 2)
        const segs = 5
        g.moveTo(ax, ay)
        for (let i = 1; i < segs; i++) {
          const s = i / segs
          const side = (i % 2 === 0 ? 1 : -1) * jitter
          g.lineTo(ax + dx * s + nx * side, ay + dy * s + ny * side)
        }
        g.lineTo(tx, ty)
        g.stroke({ color: 0x66ddff, width: 2, alpha: 1 - p })
      })
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

        for (let i = vfxList.length - 1; i >= 0; i--) {
          const v = vfxList[i]
          v.age += ticker.deltaMS
          if (v.age >= v.maxAge) { v.g.destroy(); vfxList.splice(i, 1); continue }
          v.tick(v.age / v.maxAge)
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
              x: (dx / dist) * entity.moveSpeed * dt,
              y: (dy / dist) * entity.moveSpeed * dt,
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
        let playerManaSpent = false
        for (const entity of entities) {
          const actionId = entityActions.get(entity.id)
          if (!actionId) continue
          const action = getAction(actionId)
          const cd = (attackCooldowns.get(entity.id) ?? 0) - ticker.deltaMS
          attackCooldowns.set(entity.id, cd)
          if (cd > 0) continue
          const target = nearestTarget(entity, entities)
          if (!target) continue
          const dx = target.x - entity.x
          const dy = target.y - entity.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist - target.radius > entity.attackRange) continue
          // Mana gate — only enforced for entities with a mana pool
          if (entity.maxMana > 0 && entity.currentMana < action.manaCost) continue
          target.currentLife = Math.max(0, target.currentLife - action.damage)
          if (entity.maxMana > 0) {
            entity.currentMana = Math.max(0, entity.currentMana - action.manaCost)
            if (entity.role === 'player') playerManaSpent = true
          }
          attackCooldowns.set(entity.id, 1000 / action.speed)
          damagedIds.add(target.id)
          spawnVfx(entity, target, action)
        }
        if (playerManaSpent) updateBars()

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
    for (const v of vfxList) v.g.destroy()
    vfxList.length = 0
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

function mountActionSelectModal(
  parent: HTMLElement,
  currentId: ActionId,
  onSelect: (id: ActionId) => void,
  onClose: () => void,
): () => void {
  const weaponActions = allActions.filter(a => a.kind === 'weapon')
  const spellActions  = allActions.filter(a => a.kind === 'spell')

  const buildCards = (actions: ActionDef[]) =>
    actions.map(a => `
      <button class="action-card${a.id === currentId ? ' action-card--selected' : ''}" data-action-id="${a.id}">
        <i data-lucide="${a.icon}" aria-hidden="true"></i>
        <span class="action-card-name">${escapeHtml(a.label)}</span>
      </button>`).join('')

  const startOnWeapons = weaponActions.some(a => a.id === currentId)

  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop'
  backdrop.innerHTML = `
    <div class="modal-panel action-select-panel" role="dialog" aria-modal="true" aria-labelledby="action-title">
      <h2 class="modal-title" id="action-title">${t('game', 'actionSelectTitle')}</h2>
      <div class="action-tabs">
        <button class="action-tab${startOnWeapons ? ' action-tab--active' : ''}" data-tab="weapon">${t('game', 'weaponsTab')}</button>
        <button class="action-tab${!startOnWeapons ? ' action-tab--active' : ''}" data-tab="spell">${t('game', 'spellsTab')}</button>
      </div>
      <div class="action-grid" data-panel="weapon"${startOnWeapons ? '' : ' hidden'}>${buildCards(weaponActions)}</div>
      <div class="action-grid" data-panel="spell"${!startOnWeapons ? '' : ' hidden'}>${buildCards(spellActions)}</div>
      <div class="modal-actions">
        <button class="modal-btn modal-btn--ghost" data-action="close">${t('settings', 'close')}</button>
      </div>
    </div>
  `

  const tabs   = backdrop.querySelectorAll<HTMLButtonElement>('.action-tab')
  const panels = backdrop.querySelectorAll<HTMLElement>('[data-panel]')
  tabs.forEach(tab => tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.toggle('action-tab--active', t === tab))
    panels.forEach(p => { p.hidden = p.dataset.panel !== tab.dataset.tab })
  }))

  const dismiss = () => { backdrop.remove(); onClose() }

  backdrop.querySelectorAll<HTMLButtonElement>('[data-action-id]').forEach(card =>
    card.addEventListener('click', () => {
      onSelect(card.dataset.actionId as ActionId)
      dismiss()
    }),
  )

  backdrop.querySelector<HTMLButtonElement>('[data-action="close"]')!
    .addEventListener('click', dismiss)
  backdrop.addEventListener('click', e => { if (e.target === backdrop) dismiss() })

  parent.appendChild(backdrop)
  createIcons({ icons: { Sword, Target, Flame, Zap } })
  return () => backdrop.remove()
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
