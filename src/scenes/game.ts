import { Application, Container, Graphics } from 'pixi.js'
import * as Matter from 'matter-js'
import { createIcons, User, Play, Pause, ChevronLeft, ChevronRight, Menu, Home, LogOut, Settings2, Timer, Award } from 'lucide'
import { renderGameIcons } from '../ui/game-icons'
import { tokens } from '../theme'
import { t } from '../i18n'
import { getCurrentCharacter, saveCharacterState, type ActionProgress, type StatProgress, type EnemyProgress, type TargetingMode, type MasteryProgress } from '../core/character'
import { allMasteries, masteryCategories, masteryXpNeeded, type MasteryId } from '../config/masteries'
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

  function captureRunSnapshot() {
    return {
      actionMaxLevels: Object.fromEntries(
        Object.entries(actionProgress).map(([id, p]) => [id, p.maxLevel]),
      ) as Record<string, number>,
      lifeLevel:     lifeProgress.level,
      manaLevel:     manaProgress.level,
      enemyMaxLevel: enemyProgress.maxLevel,
    }
  }
  let runSnapshot = captureRunSnapshot()

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
    const scaledXp = amount * Math.sqrt(maxLevel)
    xp += scaledXp
    runActionXp[actionId] = (runActionXp[actionId] ?? 0) + scaledXp
    let leveled = false
    while (xp >= actionXpNeeded(level)) {
      xp -= actionXpNeeded(level)
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
    if (stat === 'life') runLifeXp += amount
    else runManaXp += amount
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
  let gameSpeed = 1
  let playerDead = false
  let waveScheduled = false
  let enemyIdCounter = 0
  let enemySpawnTimeout: ReturnType<typeof setTimeout> | null = null
  let playerRandomTargetId: string | null = null
  let targetingMode: TargetingMode = char?.targetingMode ?? 'nearest'

  let masteryProgress: Partial<Record<MasteryId, MasteryProgress>> = JSON.parse(
    JSON.stringify(char?.masteryProgress ?? {}),
  ) as Partial<Record<MasteryId, MasteryProgress>>

  // Per-rebirth XP accumulators — reset in rebirth()
  let runActionXp: Record<string, number> = {}
  let runLifeXp = 0
  let runManaXp = 0
  let runEnemyXp = 0
  let runDistancePx = 0
  let playerPrevX = 0
  let playerPrevY = 0

  const el = document.createElement('div')
  el.className = 'scene scene-game'
  el.innerHTML = `
    <div class="bottom-panel">
      <div class="speed-ctrl">
        <button class="speed-pause-btn" data-action="playpause" aria-label="Pause">
          <i data-lucide="pause" aria-hidden="true"></i>
        </button>
        <button class="speed-opt speed-opt--active" data-speed="1">×1</button>
        <button class="speed-opt" data-speed="2">×2</button>
        <button class="speed-opt" data-speed="5">×5</button>
        <button class="speed-opt" data-speed="10">×10</button>
      </div>
      <div class="stat-bars">
        <div class="stat-bar-row">
          <div class="stat-bar stat-bar--life">
            <div class="stat-bar-fill stat-bar-fill--life"></div>
          </div>
          <div class="stat-level stat-level--life"><div class="stat-level-fill"></div><span>Lv.1</span></div>
        </div>
        <div class="stat-bar-row">
          <div class="stat-bar stat-bar--mana">
            <div class="stat-bar-fill stat-bar-fill--mana"></div>
          </div>
          <div class="stat-level stat-level--mana"><div class="stat-level-fill"></div><span>Lv.1</span></div>
        </div>
      </div>
    </div>
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
    <div class="game-hud">
      <div class="battle-config-wrap">
        <div class="action-bubble">
          <i data-game-icon="gi-sword" aria-hidden="true"></i>
          <small class="action-level">Lv.1</small>
        </div>
        <button class="game-action-btn game-action-btn--icon" data-action="open-config" aria-label="Battle configuration">
          <i data-lucide="settings-2" aria-hidden="true"></i>
        </button>
      </div>
      <button class="game-action-btn game-action-btn--icon" data-action="open-mastery" aria-label="Masteries">
        <i data-lucide="award" aria-hidden="true"></i>
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
  createIcons({ icons: { User, Play, Pause, ChevronLeft, ChevronRight, Menu, Settings2, Award } })
  renderGameIcons(el)

  const lifeFill     = el.querySelector<HTMLElement>('.stat-bar-fill--life')!
  const manaFill     = el.querySelector<HTMLElement>('.stat-bar-fill--mana')!
  const lifeLevelEl  = el.querySelector<HTMLElement>('.stat-level--life')!
  const manaLevelEl  = el.querySelector<HTMLElement>('.stat-level--mana')!

  function updateStatLevels(): void {
    const lifePct = Math.round(lifeProgress.xp / (lifeProgress.level * balance.stat.xpPerLevel) * 100)
    lifeLevelEl.style.setProperty('--xp-pct', `${lifePct}%`)
    lifeLevelEl.querySelector('span')!.textContent = `Lv.${lifeProgress.level}`
    const manaPct = Math.round(manaProgress.xp / (manaProgress.level * balance.stat.xpPerLevel) * 100)
    manaLevelEl.style.setProperty('--xp-pct', `${manaPct}%`)
    manaLevelEl.querySelector('span')!.textContent = `Lv.${manaProgress.level}`
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
    runEnemyXp += amount
    enemyProgress.xp += amount
    while (enemyProgress.xp >= enemyProgress.maxLevel * balance.enemyLevel.xpPerMaxLevel) {
      enemyProgress.xp -= enemyProgress.maxLevel * balance.enemyLevel.xpPerMaxLevel
      enemyProgress.maxLevel++
      if (enemyProgress.autoLevel) enemyProgress.level = enemyProgress.maxLevel
    }
    updateEnemyLevelUI()
  }

  updateEnemyLevelUI()

  const speedPauseBtn = el.querySelector<HTMLButtonElement>('[data-action="playpause"]')!
  const speedOptBtns = el.querySelectorAll<HTMLButtonElement>('.speed-opt')
  const actionBubble = el.querySelector<HTMLElement>('.action-bubble')!
  const battleConfigBtn = el.querySelector<HTMLButtonElement>('[data-action="open-config"]')!

  function updateActionBtn(def: ActionDef): void {
    const id = def.id as ActionId
    const p = actionProgress[id]
    const level = p?.level ?? 1
    const xpPct = p ? Math.round((p.xp / actionXpNeeded(p.level)) * 100) : 0
    actionBubble.style.setProperty('--xp-pct', `${xpPct}%`)
    actionBubble.innerHTML = `<i data-game-icon="${def.icon}" aria-hidden="true"></i><small class="action-level">Lv.${level}</small>`
    renderGameIcons(actionBubble)
  }

  updateActionBtn(getAction(playerActionId))

  battleConfigBtn.addEventListener('click', () => {
    if (modalCleanup) { modalCleanup(); modalCleanup = null; return }
    const currentId = entityActions.get(playerEntity.id) ?? allActions[0].id
    modalCleanup = mountBattleConfigModal(
      el,
      currentId,
      targetingMode,
      (id) => {
        playerActionId = id
        assignAction(playerEntity, id)
        updateActionBtn(getAction(id))
        if (char) saveCharacterState(char.id, playerEntity.currentLife, playerEntity.currentMana, id, actionProgress, lifeProgress, manaProgress, enemyProgress, targetingMode, masteryProgress)
      },
      (mode) => {
        targetingMode = mode
        playerRandomTargetId = null
        if (char) saveCharacterState(char.id, playerEntity.currentLife, playerEntity.currentMana, playerActionId, actionProgress, lifeProgress, manaProgress, enemyProgress, mode, masteryProgress)
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
      playerEntity.currentLife = Math.min(playerEntity.maxLife, playerEntity.currentLife + balance.player.regenRate * statBonus(lifeProgress.level) * gameSpeed)
      playerEntity.currentMana = Math.min(playerEntity.maxMana, playerEntity.currentMana + balance.player.regenRate * statBonus(manaProgress.level) * gameSpeed)
      updateBars()
    }, 1000)
  }

  function stopRegen(): void {
    if (regenTimer !== null) {
      clearInterval(regenTimer)
      regenTimer = null
    }
  }

  // ── Play / Pause / Speed ─────────────────────────────────────────────────

  function updateSpeedUI(): void {
    const icon = paused ? 'play' : 'pause'
    speedPauseBtn.setAttribute('aria-label', paused ? 'Play' : 'Pause')
    speedPauseBtn.innerHTML = `<i data-lucide="${icon}" aria-hidden="true"></i>`
    createIcons({ icons: { Play, Pause } })
    speedOptBtns.forEach(btn => {
      btn.classList.toggle('speed-opt--active', !paused && Number(btn.dataset.speed) === gameSpeed)
    })
  }

  function setSpeed(speed: number): void {
    gameSpeed = speed
    if (paused) {
      paused = false
      startRegen()
      if (app) {
        app.ticker.speed = gameSpeed
        app.ticker.start()
      }
      const liveEnemies = entities.filter(e => e.role === 'enemy').length
      if (liveEnemies <= balance.wave.nextWaveThreshold) scheduleWave()
    } else {
      if (app) app.ticker.speed = gameSpeed
    }
    updateSpeedUI()
  }

  function togglePause(): void {
    if (!paused) {
      paused = true
      stopRegen()
      app?.ticker.stop()
      updateSpeedUI()
    } else {
      setSpeed(gameSpeed)
    }
  }

  speedPauseBtn.addEventListener('click', togglePause)
  speedOptBtns.forEach(btn => {
    btn.addEventListener('click', () => setSpeed(Number(btn.dataset.speed)))
  })

  // ── Auto-save ───────────────────────────────────────────────────────────

  const saveInterval = setInterval(() => {
    if (char && !playerDead) saveCharacterState(char.id, playerEntity.currentLife, playerEntity.currentMana, playerActionId, actionProgress, lifeProgress, manaProgress, enemyProgress, targetingMode, masteryProgress)
  }, SAVE_INTERVAL_MS)

  function saveAndGoHome(): void {
    if (char && !playerDead) saveCharacterState(char.id, playerEntity.currentLife, playerEntity.currentMana, playerActionId, actionProgress, lifeProgress, manaProgress, enemyProgress, targetingMode, masteryProgress)
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
          scheduleWave(balance.wave.spawnDelay)
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

  el.querySelector<HTMLButtonElement>('[data-action="open-mastery"]')!
    .addEventListener('click', () => {
      if (modalCleanup) { modalCleanup(); modalCleanup = null; return }
      modalCleanup = mountMasteryModal(el, masteryProgress, () => { modalCleanup = null })
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
    if (entity.id === playerRandomTargetId) playerRandomTargetId = null
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

    // Reset per-rebirth trackers
    runActionXp = {}
    runLifeXp = 0
    runManaXp = 0
    runEnemyXp = 0
    runDistancePx = 0
    playerPrevX = playerEntity.x
    playerPrevY = playerEntity.y

    runSnapshot = captureRunSnapshot()
    if (char) saveCharacterState(char.id, playerEntity.currentLife, playerEntity.currentMana, playerActionId, actionProgress, lifeProgress, manaProgress, enemyProgress, targetingMode, masteryProgress)
    scheduleWave(balance.wave.spawnDelay)
  }

  function mountDeathModal(): () => void {
    type SummaryRow = { label: string; fromLv: number; toLv: number; fromMult?: string; toMult?: string }
    const rows: SummaryRow[] = []

    const fmt = (n: number) => `${n.toFixed(1)}xp`

    for (const a of allActions) {
      const fromMax = runSnapshot.actionMaxLevels[a.id] ?? 1
      const toMax   = actionProgress[a.id]?.maxLevel ?? 1
      if (toMax > fromMax) {
        rows.push({ label: a.label, fromLv: fromMax, toLv: toMax,
          fromMult: fmt(Math.sqrt(fromMax)), toMult: fmt(Math.sqrt(toMax)) })
      }
    }
    if (lifeProgress.level > runSnapshot.lifeLevel) {
      const b = balance.stat.bonusPerLevel
      rows.push({ label: 'Life', fromLv: runSnapshot.lifeLevel, toLv: lifeProgress.level,
        fromMult: fmt(1 + (runSnapshot.lifeLevel - 1) * b),
        toMult:   fmt(1 + (lifeProgress.level - 1) * b) })
    }
    if (manaProgress.level > runSnapshot.manaLevel) {
      const b = balance.stat.bonusPerLevel
      rows.push({ label: 'Mana', fromLv: runSnapshot.manaLevel, toLv: manaProgress.level,
        fromMult: fmt(1 + (runSnapshot.manaLevel - 1) * b),
        toMult:   fmt(1 + (manaProgress.level - 1) * b) })
    }
    if (enemyProgress.maxLevel > runSnapshot.enemyMaxLevel) {
      rows.push({ label: 'Enemies', fromLv: runSnapshot.enemyMaxLevel, toLv: enemyProgress.maxLevel })
    }

    const summaryHtml = rows.length === 0 ? '' : `
      <div class="death-summary">
        ${rows.map(r => `
          <div class="death-summary-row">
            <span class="death-summary-label">${escapeHtml(r.label)}</span>
            <span class="death-summary-levels">Lv.${r.fromLv}&thinsp;→&thinsp;Lv.${r.toLv}</span>
            ${r.fromMult !== undefined ? `<span class="death-summary-mult">${r.fromMult}&thinsp;→&thinsp;${r.toMult}</span>` : ''}
          </div>`).join('')}
      </div>`

    // Compute mastery gains for this run (applied on rebirth)
    const pendingGains = computeMasteryGains()
    const gainById = new Map(pendingGains.map(g => [g.id, g.xpGain]))

    const masteryCatsHtml = masteryCategories.map(cat => {
      const rowsHtml = cat.masteries.map(m => {
        const xpGain = gainById.get(m.id) ?? 0
        if (xpGain <= 0) return ''
        const prog = masteryProgress[m.id] ?? { xp: 0, level: 1 }
        const fromLv = prog.level
        let xp = prog.xp
        let level = prog.level
        xp += xpGain
        while (xp >= masteryXpNeeded(level)) { xp -= masteryXpNeeded(level); level++ }
        const levelsGained = level - fromLv
        const neededNow = masteryXpNeeded(level)
        let oldPct: number
        let gainPct: number
        if (levelsGained > 0) {
          oldPct = 0
          gainPct = Math.round((xp / neededNow) * 100)
        } else {
          oldPct = Math.round((prog.xp / neededNow) * 100)
          gainPct = Math.min(Math.round((xpGain / neededNow) * 100), 100 - oldPct)
        }
        return `
          <div class="mastery-row">
            <div class="mastery-bar mastery-bar--layered" style="--old-pct:${oldPct}%;--gain-pct:${gainPct}%"></div>
            <span class="mastery-label">${escapeHtml(m.label)}</span>
            <span class="mastery-level${levelsGained > 0 ? ' mastery-level--gain' : ''}">Lv.${level}</span>
            ${levelsGained > 0 ? `<span class="mastery-gain-badge">+${levelsGained}</span>` : ''}
          </div>`
      }).join('')
      if (!rowsHtml.trim()) return ''
      return `
        <div class="mastery-category">
          <div class="mastery-category-label">${escapeHtml(cat.label)}</div>
          ${rowsHtml}
        </div>`
    }).join('')

    const masterySummaryHtml = masteryCatsHtml.trim() === '' ? '' : `
      <div class="death-mastery-summary">
        <div class="death-summary-section-label">Mastery gains</div>
        <div class="mastery-categories">${masteryCatsHtml}</div>
      </div>`

    const backdrop = document.createElement('div')
    backdrop.className = 'modal-backdrop'
    backdrop.innerHTML = `
      <div class="modal-panel death-modal-panel" role="dialog" aria-modal="true" aria-labelledby="death-title">
        <h2 class="modal-title" id="death-title">${t('game', 'deathTitle')}</h2>
        ${summaryHtml}
        ${masterySummaryHtml}
        <div class="modal-actions">
          <button class="modal-btn modal-btn--primary" data-action="rebirth">${t('game', 'deathRebirth')}</button>
        </div>
      </div>
    `
    backdrop.querySelector<HTMLButtonElement>('[data-action="rebirth"]')!
      .addEventListener('click', () => { applyMasteryGains(pendingGains); backdrop.remove(); rebirth() })
    el.appendChild(backdrop)
    return () => backdrop.remove()
  }

  // ── Mastery ──────────────────────────────────────────────────────────────

  function computeMasteryGains(): Array<{ id: MasteryId; xpGain: number }> {
    const gainMap = new Map<MasteryId, number>()
    for (const [actionId, xp] of Object.entries(runActionXp)) {
      if (xp <= 0) continue
      const def = getAction(actionId as ActionId)
      for (const tag of def.tags) {
        const mastery = allMasteries.find(m => m.tag === tag)
        if (mastery) gainMap.set(mastery.id, (gainMap.get(mastery.id) ?? 0) + xp * balance.mastery.actionXpMultiplier)
      }
    }
    if (runLifeXp > 0) gainMap.set('life', runLifeXp)
    if (runManaXp > 0) gainMap.set('mana', runManaXp)
    if (runEnemyXp > 0) gainMap.set('enemy', runEnemyXp)
    const movementXp = Math.floor(runDistancePx / 50)
    if (movementXp > 0) gainMap.set('movement', movementXp)
    return Array.from(gainMap.entries()).map(([id, xpGain]) => ({ id, xpGain }))
  }

  function applyMasteryGains(gains: Array<{ id: MasteryId; xpGain: number }>): void {
    for (const { id, xpGain } of gains) {
      const prog = masteryProgress[id] ?? { xp: 0, level: 1 }
      let { xp, level } = prog
      xp += xpGain
      while (xp >= masteryXpNeeded(level)) {
        xp -= masteryXpNeeded(level)
        level++
      }
      masteryProgress[id] = { xp, level }
    }
  }

  // ── Targeting ────────────────────────────────────────────────────────────

  function selectPlayerTarget(ents: Entity[]): Entity | null {
    const enemies = ents.filter(e => e.role === 'enemy')
    if (enemies.length === 0) return null
    switch (targetingMode) {
      case 'nearest': {
        let best: Entity | null = null, bestDist = Infinity
        for (const e of enemies) {
          const dx = e.x - playerEntity.x, dy = e.y - playerEntity.y
          const d = dx * dx + dy * dy
          if (d < bestDist) { bestDist = d; best = e }
        }
        return best
      }
      case 'weakest': {
        let best: Entity | null = null, bestHp = Infinity
        for (const e of enemies) if (e.currentLife < bestHp) { bestHp = e.currentLife; best = e }
        return best
      }
      case 'strongest': {
        let best: Entity | null = null, bestHp = -Infinity
        for (const e of enemies) if (e.currentLife > bestHp) { bestHp = e.currentLife; best = e }
        return best
      }
      case 'random': {
        const cached = playerRandomTargetId ? enemies.find(e => e.id === playerRandomTargetId) ?? null : null
        if (cached) return cached
        const pick = enemies[Math.floor(Math.random() * enemies.length)]
        playerRandomTargetId = pick?.id ?? null
        return pick ?? null
      }
    }
  }

  // ── Spawn ────────────────────────────────────────────────────────────────

  function scheduleWave(delay = 0): void {
    if (waveScheduled) return
    waveScheduled = true
    enemySpawnTimeout = setTimeout(() => {
      if (!destroyed) spawnEnemies()
    }, delay)
  }

  function spawnEnemies(): void {
    if (!app) return
    waveScheduled = false
    enemySpawnTimeout = null

    let count = balance.wave.minCount
    const extraChance = Math.min(
      balance.wave.extraChanceCap,
      balance.wave.extraChanceBase + (enemyProgress.level - 1) * balance.wave.extraChancePerLevel,
    )
    while (Math.random() < extraChance) count++

    const halfW = app.screen.width / 2
    const halfH = (app.screen.height - HUD_HEIGHT) / 2
    const clusterAngle = Math.random() * Math.PI * 2
    for (let i = 0; i < count; i++) {
      const angle = clusterAngle + (Math.random() - 0.5) * balance.wave.clusterSpread
      const cosA = Math.abs(Math.cos(angle))
      const sinA = Math.abs(Math.sin(angle))
      const edgeDist = Math.min(halfW / (cosA || 0.001), halfH / (sinA || 0.001))
      const dist = edgeDist + balance.wave.spawnMargin + Math.random() * balance.wave.spawnDepthVariance
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
      enemy.attackDamage *= scale * balance.enemyA.damageMultiplier
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
  scheduleWave(balance.wave.spawnDelay)

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

      instance.ticker.speed = gameSpeed
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
          const target = entity.role === 'player' ? selectPlayerTarget(entities) : nearestTarget(entity, entities)
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

        // Track player movement for movement mastery
        const moveDx = playerEntity.x - playerPrevX
        const moveDy = playerEntity.y - playerPrevY
        runDistancePx += Math.sqrt(moveDx * moveDx + moveDy * moveDy)
        playerPrevX = playerEntity.x
        playerPrevY = playerEntity.y

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
          const target = entity.role === 'player' ? selectPlayerTarget(entities) : nearestTarget(entity, entities)
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
          if (target.role === 'player' && actualDamage > 0) awardStatXp('life', actualDamage * balance.stat.lifeXpFromDamage)
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
          <i data-game-icon="gi-skull" aria-hidden="true"></i>
          <span class="menu-btn-text">
            <span class="menu-btn-title">Die</span>
            <small class="menu-btn-desc">Trigger death and rebirth now</small>
          </span>
        </button>
      </div>
    </div>
  `
  parent.appendChild(backdrop)
  createIcons({ icons: { Home, LogOut } })
  renderGameIcons(backdrop)
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
    const xpNeeded = actionXpNeeded(p.level)
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

function mountBattleConfigModal(
  parent: HTMLElement,
  currentActionId: ActionId,
  currentTargeting: TargetingMode,
  onSelectAction: (id: ActionId) => void,
  onSelectTargeting: (mode: TargetingMode) => void,
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
        ? `Lv.${level} · ${Math.sqrt(maxLevel).toFixed(1)}xp`
        : `Lv.${level}`
      return `
        <button class="action-card${a.id === currentActionId ? ' action-card--selected' : ''}" data-action-id="${a.id}">
          <i data-game-icon="${a.icon}" aria-hidden="true"></i>
          <span class="action-card-name">${escapeHtml(a.label)}</span>
          <span class="action-card-meta">${meta}</span>
        </button>`
    }).join('')

  const startOnWeapons = weaponActions.some(a => a.id === currentActionId)

  const targetingOpts: Array<{ mode: TargetingMode; icon: string; label: string; desc: string }> = [
    { mode: 'nearest',   icon: 'gi-crosshair',       label: 'Nearest',   desc: 'Attack closest enemy' },
    { mode: 'weakest',   icon: 'gi-health-decrease', label: 'Weakest',   desc: 'Focus low HP' },
    { mode: 'strongest', icon: 'gi-health-increase', label: 'Strongest', desc: 'Focus high HP' },
    { mode: 'random',    icon: 'gi-dice',            label: 'Random',    desc: 'Pick random target' },
  ]

  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop'
  backdrop.innerHTML = `
    <div class="modal-panel battle-config-panel" role="dialog" aria-modal="true">
      <div class="battle-tabs">
        <button class="battle-tab battle-tab--active" data-btab="action" aria-label="Actions">
          <i data-game-icon="gi-sword" aria-hidden="true"></i>
        </button>
        <button class="battle-tab" data-btab="targeting" aria-label="Targeting">
          <i data-game-icon="gi-crosshair" aria-hidden="true"></i>
        </button>
        <button class="battle-tab" data-btab="effects" aria-label="Effects">
          <i data-lucide="timer" aria-hidden="true"></i>
        </button>
      </div>
      <div data-bpanel="action">
        <div class="action-tabs">
          <button class="action-tab${startOnWeapons ? ' action-tab--active' : ''}" data-tab="weapon">${t('game', 'weaponsTab')}</button>
          <button class="action-tab${!startOnWeapons ? ' action-tab--active' : ''}" data-tab="spell">${t('game', 'spellsTab')}</button>
        </div>
        <div class="action-grid" data-panel="weapon"${startOnWeapons ? '' : ' hidden'}>${buildCards(weaponActions)}</div>
        <div class="action-grid" data-panel="spell"${!startOnWeapons ? '' : ' hidden'}>${buildCards(spellActions)}</div>
      </div>
      <div data-bpanel="targeting" hidden>
        <div class="targeting-options">
          ${targetingOpts.map(o => `
            <button class="targeting-opt${currentTargeting === o.mode ? ' targeting-opt--active' : ''}" data-targeting="${o.mode}">
              <i data-game-icon="${o.icon}" aria-hidden="true"></i>
              <span class="targeting-opt-name">${o.label}</span>
              <small class="targeting-opt-desc">${o.desc}</small>
            </button>`).join('')}
        </div>
      </div>
      <div data-bpanel="effects" hidden>
        <p class="wip-notice">Timed &amp; automatic effects &mdash; coming soon</p>
      </div>
      <div class="modal-actions">
        <button class="modal-btn modal-btn--ghost" data-action="close">${t('settings', 'close')}</button>
      </div>
    </div>
  `

  // Battle tab switching
  const bTabs   = backdrop.querySelectorAll<HTMLButtonElement>('[data-btab]')
  const bPanels = backdrop.querySelectorAll<HTMLElement>('[data-bpanel]')
  bTabs.forEach(tab => tab.addEventListener('click', () => {
    bTabs.forEach(t => t.classList.toggle('battle-tab--active', t === tab))
    bPanels.forEach(p => { p.hidden = p.dataset.bpanel !== tab.dataset.btab })
  }))

  // Action sub-tab switching (weapon / spell)
  const actionSubTabs = backdrop.querySelectorAll<HTMLButtonElement>('.action-tab')
  const actionPanels  = backdrop.querySelectorAll<HTMLElement>('[data-panel]')
  actionSubTabs.forEach(tab => tab.addEventListener('click', () => {
    actionSubTabs.forEach(t => t.classList.toggle('action-tab--active', t === tab))
    actionPanels.forEach(p => { p.hidden = p.dataset.panel !== tab.dataset.tab })
  }))

  // Action card selection — apply immediately
  backdrop.querySelectorAll<HTMLButtonElement>('[data-action-id]').forEach(card =>
    card.addEventListener('click', () => {
      const id = card.dataset.actionId as ActionId
      backdrop.querySelectorAll('[data-action-id]').forEach(c =>
        c.classList.toggle('action-card--selected', c === card),
      )
      onSelectAction(id)
    }),
  )

  // Targeting option selection — apply immediately
  backdrop.querySelectorAll<HTMLButtonElement>('[data-targeting]').forEach(btn =>
    btn.addEventListener('click', () => {
      const mode = btn.dataset.targeting as TargetingMode
      backdrop.querySelectorAll('[data-targeting]').forEach(b =>
        b.classList.toggle('targeting-opt--active', b === btn),
      )
      onSelectTargeting(mode)
    }),
  )

  const dismiss = () => { backdrop.remove(); onClose() }
  backdrop.querySelector<HTMLButtonElement>('[data-action="close"]')!
    .addEventListener('click', dismiss)
  backdrop.addEventListener('click', e => { if (e.target === backdrop) dismiss() })

  parent.appendChild(backdrop)
  createIcons({ icons: { Timer } })
  renderGameIcons(backdrop)
  return () => backdrop.remove()
}

function mountMasteryModal(
  parent: HTMLElement,
  masteryProgress: Partial<Record<MasteryId, MasteryProgress>>,
  onClose: () => void,
): () => void {
  const categoriesHtml = masteryCategories.map(cat => {
    const rows = cat.masteries.map(m => {
      const prog = masteryProgress[m.id] ?? { xp: 0, level: 1 }
      const xpPct = Math.round((prog.xp / masteryXpNeeded(prog.level)) * 100)
      return `
        <div class="mastery-row">
          <div class="mastery-bar"><div class="mastery-bar-fill" style="width:${xpPct}%"></div></div>
          <span class="mastery-label">${escapeHtml(m.label)}</span>
          <span class="mastery-level">Lv.${prog.level}</span>
        </div>`
    }).join('')
    return `
      <div class="mastery-category">
        <div class="mastery-category-label">${escapeHtml(cat.label)}</div>
        ${rows}
      </div>`
  }).join('')

  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop'
  backdrop.innerHTML = `
    <div class="modal-panel mastery-panel" role="dialog" aria-modal="true" aria-labelledby="mastery-title">
      <h2 class="modal-title" id="mastery-title">Masteries</h2>
      <div class="mastery-categories">${categoriesHtml}</div>
      <div class="modal-actions">
        <button class="modal-btn modal-btn--ghost" data-action="close">Close</button>
      </div>
    </div>
  `
  parent.appendChild(backdrop)
  const dismiss = () => { backdrop.remove(); onClose() }
  backdrop.querySelector<HTMLButtonElement>('[data-action="close"]')!.addEventListener('click', dismiss)
  backdrop.addEventListener('click', e => { if (e.target === backdrop) dismiss() })
  return () => backdrop.remove()
}

function actionXpNeeded(level: number): number {
  return Math.round(balance.action.xpPerLevel * Math.pow(balance.action.xpGrowth, level - 1))
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
