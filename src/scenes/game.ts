import { Application, Container, Graphics } from 'pixi.js'
import * as Matter from 'matter-js'
import { createIcons, User, Play, Pause, Sword, Target, Flame, Zap, ChevronLeft, ChevronRight, Menu, Home, LogOut, Skull } from 'lucide'
import { tokens } from '../theme'
import { t } from '../i18n'
import { getCurrentCharacter, saveCharacterState, type ActionProgress, type StatProgress, type EnemyProgress } from '../core/character'
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

  // Stat progress — life and mana level independently
  let lifeProgress: StatProgress = JSON.parse(
    JSON.stringify(char?.lifeProgress ?? { xp: 0, level: 1 }),
  ) as StatProgress
  let manaProgress: StatProgress = JSON.parse(
    JSON.stringify(char?.manaProgress ?? { xp: 0, level: 1 }),
  ) as StatProgress

  // Enemy level progression
  let enemyProgress: EnemyProgress = JSON.parse(
    JSON.stringify(char?.enemyProgress ?? { xp: 0, level: 1, maxLevel: 1, autoLevel: false }),
  ) as EnemyProgress

  function enemyScale(): number {
    return Math.pow(balance.enemyLevel.statMultiplier, enemyProgress.level - 1)
  }

  function statBonus(level: number): number {
    return 1 + (level - 1) * balance.stat.bonusPerLevel
  }

  const playerEntity = createPlayerEntity({
    maxLife:  balance.player.maxLife  * statBonus(lifeProgress.level),
    maxMana:  balance.player.maxMana  * statBonus(manaProgress.level),
    currentLife: char?.currentLife ?? balance.player.startingLife,
    currentMana: char?.currentMana ?? balance.player.startingMana,
    radius: balance.player.radius,
    moveSpeed: balance.player.moveSpeed,
  })

  const entities: Entity[] = [playerEntity]

  // ── Actions ──────────────────────────────────────────────────────────────

  const entityActions = new Map<string, ActionId>()
  let playerActionId: ActionId = (char?.actionId as ActionId | undefined) ?? 'sword'

  // Deep copy so mutations don't bleed into the cached Character object
  const actionProgress: Record<string, ActionProgress> = JSON.parse(
    JSON.stringify(char?.actionProgress ?? {}),
  ) as Record<string, ActionProgress>

  function getPlayerLevel(id: ActionId): number {
    return actionProgress[id]?.level ?? 1
  }

  function assignAction(entity: Entity, id: ActionId): void {
    const def = getAction(id)
    const level = entity.role === 'player' ? getPlayerLevel(id) : 1
    entity.attackSpeed  = def.speed
    entity.attackDamage = def.damage * level
    entity.attackRange  = def.range * balance.player.radius
    entityActions.set(entity.id, id)
  }

  function awardXp(actionId: ActionId, amount: number): void {
    const prev = actionProgress[actionId] ?? { xp: 0, level: 1, maxLevel: 1 }
    let { xp, level, maxLevel } = prev
    // Prestige accelerates XP gain: past peak level → faster leveling next life
    xp += amount * Math.sqrt(maxLevel)
    let leveled = false
    while (xp >= level * balance.action.xpPerLevel) {
      xp -= level * balance.action.xpPerLevel
      level++
      if (level > maxLevel) maxLevel = level
      leveled = true
    }
    actionProgress[actionId] = { xp, level, maxLevel }
    if (actionId === playerActionId) {
      if (leveled) playerEntity.attackDamage = getAction(actionId).damage * level
      updateActionBtn(getAction(actionId))
    }
  }

  function awardStatXp(stat: 'life' | 'mana', amount: number): void {
    let prog = stat === 'life' ? lifeProgress : manaProgress
    let { xp, level } = prog
    xp += amount
    let leveled = false
    while (xp >= level * balance.stat.xpPerLevel) {
      xp -= level * balance.stat.xpPerLevel
      level++
      leveled = true
    }
    prog = { xp, level }
    if (stat === 'life') {
      lifeProgress = prog
      if (leveled) playerEntity.maxLife = balance.player.maxLife * statBonus(level)
    } else {
      manaProgress = prog
      if (leveled) playerEntity.maxMana = balance.player.maxMana * statBonus(level)
    }
    updateBars()
    updateStatLevels()
  }

  assignAction(playerEntity, playerActionId)

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

  let paused = false
  let playerDead = false
  let waveScheduled = false
  let enemyIdCounter = 0
  let enemySpawnTimeout: ReturnType<typeof setTimeout> | null = null

  const el = document.createElement('div')
  el.className = 'scene scene-game'
  el.innerHTML = `
    <button class="pause-btn" data-action="playpause" aria-label="Pause">
      <i data-lucide="pause" aria-hidden="true"></i>
    </button>
    <div class="enemy-level-ctrl">
      <button class="enemy-level-btn" data-action="enemy-level-down" aria-label="Decrease enemy level">
        <i data-lucide="chevron-left" aria-hidden="true"></i>
      </button>
      <span class="enemy-level-display">1 / 1</span>
      <button class="enemy-level-btn" data-action="enemy-level-up" aria-label="Increase enemy level">
        <i data-lucide="chevron-right" aria-hidden="true"></i>
      </button>
      <label class="enemy-autolevel" title="Auto-advance enemy level on unlock">
        <input type="checkbox" class="enemy-autolevel-input" aria-label="Auto-level enemies">
        <span class="enemy-autolevel-track"></span>
        <span class="enemy-autolevel-label">Auto</span>
      </label>
    </div>
    <div class="stat-bars">
      <div class="stat-bar-row">
        <div class="stat-bar stat-bar--life">
          <div class="stat-bar-fill stat-bar-fill--life"></div>
        </div>
        <small class="stat-level stat-level--life">Lv.1</small>
      </div>
      <div class="stat-bar-row">
        <div class="stat-bar stat-bar--mana">
          <div class="stat-bar-fill stat-bar-fill--mana"></div>
        </div>
        <small class="stat-level stat-level--mana">Lv.1</small>
      </div>
    </div>
    <div class="game-hud">
      <button class="game-action-btn game-action-btn--action" data-action="open-action" aria-label="Select action">
        <i data-lucide="sword" aria-hidden="true"></i>
        <span>Sword</span>
      </button>
      <button class="game-action-btn game-action-btn--icon" data-action="open-menu" aria-label="Menu">
        <i data-lucide="menu" aria-hidden="true"></i>
      </button>
      <button class="game-action-btn game-action-btn--icon" data-action="character" aria-label="Character">
        <i data-lucide="user" aria-hidden="true"></i>
      </button>
    </div>
  `
  container.appendChild(el)
  createIcons({ icons: { User, Play, Pause, ChevronLeft, ChevronRight, Menu } })

  const lifeFill     = el.querySelector<HTMLElement>('.stat-bar-fill--life')!
  const manaFill     = el.querySelector<HTMLElement>('.stat-bar-fill--mana')!
  const lifeLevelEl  = el.querySelector<HTMLElement>('.stat-level--life')!
  const manaLevelEl  = el.querySelector<HTMLElement>('.stat-level--mana')!

  function updateStatLevels(): void {
    lifeLevelEl.textContent = `Lv.${lifeProgress.level}`
    manaLevelEl.textContent = `Lv.${manaProgress.level}`
  }

  const enemyLevelCtrl     = el.querySelector<HTMLElement>('.enemy-level-ctrl')!
  const enemyLevelDisplay   = el.querySelector<HTMLElement>('.enemy-level-display')!
  const enemyLevelDownBtn   = el.querySelector<HTMLButtonElement>('[data-action="enemy-level-down"]')!
  const enemyLevelUpBtn     = el.querySelector<HTMLButtonElement>('[data-action="enemy-level-up"]')!
  const enemyAutoLevelInput = el.querySelector<HTMLInputElement>('.enemy-autolevel-input')!

  function updateEnemyLevelUI(): void {
    const xpPct = Math.round((enemyProgress.xp / (enemyProgress.maxLevel * balance.enemyLevel.xpPerMaxLevel)) * 100)
    enemyLevelCtrl.style.setProperty('--enemy-xp-pct', `${xpPct}%`)
    enemyLevelDisplay.textContent = `${enemyProgress.level} / ${enemyProgress.maxLevel}`
    enemyLevelDownBtn.disabled = enemyProgress.level <= 1
    enemyLevelUpBtn.disabled   = enemyProgress.level >= enemyProgress.maxLevel
    enemyAutoLevelInput.checked = enemyProgress.autoLevel
  }

  enemyLevelDownBtn.addEventListener('click', () => {
    if (enemyProgress.level > 1) {
      enemyProgress.level--
      enemyProgress.autoLevel = false
      updateEnemyLevelUI()
    }
  })
  enemyLevelUpBtn.addEventListener('click', () => {
    if (enemyProgress.level < enemyProgress.maxLevel) { enemyProgress.level++; updateEnemyLevelUI() }
  })
  enemyAutoLevelInput.addEventListener('change', () => {
    enemyProgress.autoLevel = enemyAutoLevelInput.checked
    if (enemyProgress.autoLevel) { enemyProgress.level = enemyProgress.maxLevel; updateEnemyLevelUI() }
  })

  function awardEnemyXp(amount: number): void {
    enemyProgress.xp += amount
    while (enemyProgress.xp >= enemyProgress.maxLevel * balance.enemyLevel.xpPerMaxLevel) {
      enemyProgress.xp -= enemyProgress.maxLevel * balance.enemyLevel.xpPerMaxLevel
      enemyProgress.maxLevel++
      if (enemyProgress.autoLevel) enemyProgress.level = enemyProgress.maxLevel
    }
    updateEnemyLevelUI()
  }

  updateEnemyLevelUI()

  const playPauseBtn = el.querySelector<HTMLButtonElement>('[data-action="playpause"]')!
  const actionBtn = el.querySelector<HTMLButtonElement>('[data-action="open-action"]')!

  function updateActionBtn(def: ActionDef): void {
    const id = def.id as ActionId
    const p = actionProgress[id]
    const level = p?.level ?? 1
    const xpPct = p ? Math.round((p.xp / (p.level * balance.action.xpPerLevel)) * 100) : 0
    actionBtn.style.setProperty('--xp-pct', `${xpPct}%`)
    actionBtn.innerHTML = `<i data-lucide="${def.icon}" aria-hidden="true"></i><span>${def.label}</span><small class="action-level">Lv.${level}</small>`
    createIcons({ icons: { Sword, Target, Flame, Zap } })
  }

  updateActionBtn(getAction(playerActionId))

  actionBtn.addEventListener('click', () => {
    if (modalCleanup) { modalCleanup(); modalCleanup = null; return }
    const currentId = entityActions.get(playerEntity.id) ?? allActions[0].id
    modalCleanup = mountActionSelectModal(
      el,
      currentId,
      (id) => {
        playerActionId = id
        assignAction(playerEntity, id)
        updateActionBtn(getAction(id))
        if (char) saveCharacterState(char.id, playerEntity.currentLife, playerEntity.currentMana, id, actionProgress, lifeProgress, manaProgress, enemyProgress)
      },
      () => { modalCleanup = null },
      actionProgress,
    )
  })

  function updateBars(): void {
    lifeFill.style.width = `${(playerEntity.currentLife / playerEntity.maxLife) * 100}%`
    manaFill.style.width = `${(playerEntity.currentMana / playerEntity.maxMana) * 100}%`
  }

  updateBars()
  updateStatLevels()

  // ── Regen ───────────────────────────────────────────────────────────────

  let regenTimer: ReturnType<typeof setInterval> | null = null

  function startRegen(): void {
    if (regenTimer !== null) return
    regenTimer = setInterval(() => {
      if (playerDead) return
      playerEntity.currentLife = Math.min(playerEntity.maxLife, playerEntity.currentLife + balance.player.regenRate * statBonus(lifeProgress.level))
      playerEntity.currentMana = Math.min(playerEntity.maxMana, playerEntity.currentMana + balance.player.regenRate * statBonus(manaProgress.level))
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
    if (char && !playerDead) saveCharacterState(char.id, playerEntity.currentLife, playerEntity.currentMana, playerActionId, actionProgress, lifeProgress, manaProgress, enemyProgress)
  }, SAVE_INTERVAL_MS)

  function saveAndGoHome(): void {
    if (char && !playerDead) saveCharacterState(char.id, playerEntity.currentLife, playerEntity.currentMana, playerActionId, actionProgress, lifeProgress, manaProgress, enemyProgress)
    navigate('menu')
  }

  el.querySelector<HTMLButtonElement>('[data-action="open-menu"]')!
    .addEventListener('click', () => {
      if (modalCleanup) { modalCleanup(); modalCleanup = null; return }
      modalCleanup = mountGameMenuModal(el, () => { modalCleanup = null }, {
        onHome: saveAndGoHome,
        onFlee: () => {
          for (const entity of [...entities]) {
            if (entity.role !== 'player') removeEntity(entity)
          }
          scheduleWave()
        },
        onDie: () => {
          playerEntity.currentLife = 0
          killEntity(playerEntity)
        },
      })
    })

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
    modalCleanup = mountCharacterModal(el, () => { modalCleanup = null }, actionProgress, lifeProgress, manaProgress)
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

    // Action XP reset; maxLevel persists so prestige multiplier carries forward
    for (const id of Object.keys(actionProgress)) {
      const { maxLevel } = actionProgress[id]
      actionProgress[id] = { xp: 0, level: 1, maxLevel }
    }

    // Life/mana levels reset; maxLife/maxMana return to base
    lifeProgress = { xp: 0, level: 1 }
    manaProgress = { xp: 0, level: 1 }
    playerEntity.maxLife = balance.player.maxLife
    playerEntity.maxMana = balance.player.maxMana

    // Enemy: max level persists; selected level and auto-level reset
    enemyProgress = { ...enemyProgress, level: 1, autoLevel: false }
    updateEnemyLevelUI()

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
    assignAction(playerEntity, playerActionId)

    playerDead = false
    updateBars()
    updateStatLevels()
    updateActionBtn(getAction(playerActionId))

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
      const scale = enemyScale()
      const enemy = createEnemyEntity(
        `enemy-${++enemyIdCounter}`,
        playerEntity.x + Math.cos(angle) * dist,
        playerEntity.y + Math.sin(angle) * dist,
        'enemyA',
        balance.enemyA.radius,
        { moveSpeed: balance.enemyA.moveSpeed, maxLife: Math.round(balance.enemyA.maxLife * scale) },
      )
      assignAction(enemy, randomAction().id)
      enemy.attackDamage *= scale
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

  // Start immediately — paused=false so regen and wave timer kick off now
  startRegen()
  scheduleWave()

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
          const effectiveDamage = entity.attackDamage
          const prevLife = target.currentLife
          target.currentLife = Math.max(0, target.currentLife - effectiveDamage)
          const actualDamage = prevLife - target.currentLife
          if (entity.maxMana > 0) {
            entity.currentMana = Math.max(0, entity.currentMana - action.manaCost)
            if (entity.role === 'player') {
              playerManaSpent = true
              if (action.manaCost > 0) awardStatXp('mana', action.manaCost)
            }
          }
          if (entity.role === 'player' && actualDamage > 0) {
            awardXp(actionId, actualDamage)
            if (enemyProgress.level === enemyProgress.maxLevel) awardEnemyXp(actualDamage)
          }
          if (target.role === 'player' && actualDamage > 0) awardStatXp('life', actualDamage)
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

function mountGameMenuModal(
  parent: HTMLElement,
  onClose: () => void,
  actions: { onHome: () => void; onFlee: () => void; onDie: () => void },
): () => void {
  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop'
  backdrop.innerHTML = `
    <div class="modal-panel game-menu-panel" role="dialog" aria-modal="true" aria-labelledby="game-menu-title">
      <h2 class="modal-title" id="game-menu-title">Menu</h2>
      <div class="modal-actions game-menu-actions">
        <button class="modal-btn modal-btn--ghost modal-btn--icon-row" data-action="home">
          <i data-lucide="home" aria-hidden="true"></i><span>Home Screen</span>
        </button>
        <button class="modal-btn modal-btn--ghost modal-btn--icon-row" data-action="flee">
          <i data-lucide="log-out" aria-hidden="true"></i>
          <span class="menu-btn-text">
            <span class="menu-btn-title">Flee</span>
            <small class="menu-btn-desc">Despawn enemies, start next wave</small>
          </span>
        </button>
        <button class="modal-btn modal-btn--danger modal-btn--icon-row" data-action="die">
          <i data-lucide="skull" aria-hidden="true"></i>
          <span class="menu-btn-text">
            <span class="menu-btn-title">Die</span>
            <small class="menu-btn-desc">Trigger death and rebirth now</small>
          </span>
        </button>
      </div>
    </div>
  `
  parent.appendChild(backdrop)
  createIcons({ icons: { Home, LogOut, Skull } })
  const dismiss = () => { backdrop.remove(); onClose() }
  backdrop.querySelector<HTMLButtonElement>('[data-action="home"]')!
    .addEventListener('click', () => { dismiss(); actions.onHome() })
  backdrop.querySelector<HTMLButtonElement>('[data-action="flee"]')!
    .addEventListener('click', () => { dismiss(); actions.onFlee() })
  backdrop.querySelector<HTMLButtonElement>('[data-action="die"]')!
    .addEventListener('click', () => { dismiss(); actions.onDie() })
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) dismiss() })
  return dismiss
}

function mountCharacterModal(
  parent: HTMLElement,
  onClose: () => void,
  actionProgress: Record<string, ActionProgress>,
  lifeProgress: StatProgress,
  manaProgress: StatProgress,
): () => void {
  const char = getCurrentCharacter()

  function statDetailRow(label: string, prog: StatProgress, baseMax: number, cssClass: string): string {
    const effectiveMax = Math.round(baseMax * (1 + (prog.level - 1) * balance.stat.bonusPerLevel))
    const xpNeeded = prog.level * balance.stat.xpPerLevel
    const detail = prog.level > 1 || prog.xp > 0
      ? `Lv.${prog.level} &mdash; ${Math.floor(prog.xp)}/${xpNeeded} xp &middot; ${effectiveMax} max`
      : `${effectiveMax}`
    return `<div class="char-info-row">
      <span class="char-info-label">${label}</span>
      <span class="char-info-value ${cssClass}">${detail}</span>
    </div>`
  }

  const actionRows = allActions.map(a => {
    const p = actionProgress[a.id]
    if (!p || p.level === 1 && p.xp === 0) return ''
    const xpNeeded = p.level * balance.action.xpPerLevel
    return `<div class="char-info-row">
        <span class="char-info-label">${escapeHtml(a.label)}</span>
        <span class="char-info-value">Lv.${p.level} &mdash; ${Math.floor(p.xp)}/${xpNeeded} xp</span>
      </div>`
  }).join('')
  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop'
  backdrop.innerHTML = `
    <div class="modal-panel char-info-panel" role="dialog" aria-modal="true" aria-labelledby="char-info-title">
      <h2 class="modal-title" id="char-info-title">${t('character', 'infoTitle')}</h2>
      <div class="char-info-row">
        <span class="char-info-label">${t('character', 'nameLabel')}</span>
        <span class="char-info-value">${char ? escapeHtml(char.name) : '—'}</span>
      </div>
      ${statDetailRow(t('character', 'statMaxLife'), lifeProgress, balance.player.maxLife, 'char-info-value--life')}
      ${statDetailRow(t('character', 'statMaxMana'), manaProgress, balance.player.maxMana, 'char-info-value--mana')}
      ${actionRows}
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
  actionProgress: Record<string, ActionProgress>,
): () => void {
  const weaponActions = allActions.filter(a => a.kind === 'weapon')
  const spellActions  = allActions.filter(a => a.kind === 'spell')

  const buildCards = (actions: ActionDef[]) =>
    actions.map(a => {
      const p = actionProgress[a.id]
      const level = p?.level ?? 1
      const maxLevel = p?.maxLevel ?? 1
      const meta = maxLevel > 1
        ? `Lv.${level} · ×${Math.sqrt(maxLevel).toFixed(1)}`
        : `Lv.${level}`
      return `
        <button class="action-card${a.id === currentId ? ' action-card--selected' : ''}" data-action-id="${a.id}">
          <i data-lucide="${a.icon}" aria-hidden="true"></i>
          <span class="action-card-name">${escapeHtml(a.label)}</span>
          <span class="action-card-meta">${meta}</span>
        </button>`
    }).join('')

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

  let selectedId = currentId

  backdrop.querySelectorAll<HTMLButtonElement>('[data-action-id]').forEach(card =>
    card.addEventListener('click', () => {
      selectedId = card.dataset.actionId as ActionId
      backdrop.querySelectorAll('[data-action-id]').forEach(c =>
        c.classList.toggle('action-card--selected', c === card),
      )
    }),
  )

  const dismiss = () => { onSelect(selectedId); backdrop.remove(); onClose() }

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
