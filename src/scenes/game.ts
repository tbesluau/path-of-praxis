import { Application, Assets, Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js'
import * as Matter from 'matter-js'
import * as PF from 'pathfinding'
import { createIcons, ArrowLeft, Play, Pause, Settings2, Award, Sword, Crosshair, Flame, Zap, Skull, Book, Drumstick, Swords, Droplets } from 'lucide'
import { tokens } from '../theme'
import { t } from '../i18n'
import { getCurrentCharacter, saveCharacterState, masteryPointsAvailable, defaultMasteryNodes, defaultActionRunes, type ActionProgress, type StatProgress, type EnemyProgress, type TargetingMode, type MasteryProgress, type RunProgress, type ActionRunes } from '../core/character'
import { allMasteries, masteryCategories, previewMasteryGain, type MasteryId, type ActionTag } from '../config/masteries'
import { computeActionBonuses, computeLifeBonuses, computeManaBonuses, computeFireBonuses, computeEnemyBonuses, computeProjectileBonuses, computeLightningBonuses, computeStrikeBonuses, computePhysicalBonuses, computeAreaBonuses, computeMovementBonuses, type ActionBonuses, type LifeBonuses, type ManaBonuses, type FireBonuses, type EnemyBonuses, type ProjectileBonuses, type LightningBonuses, type StrikeBonuses, type PhysicalBonuses, type AreaBonuses, type MovementBonuses } from '../config/mastery-nodes'
import { mountMasteryModal, renderMasteryBar } from '../ui/mastery'
import { createPlayerEntity, createEnemyEntity, nearestTarget } from '../core/entity'
import type { Entity } from '../core/entity'
import { balance } from '../config/balance'
import { allActions, getAction, randomAction, type ActionId, type ActionDef } from '../config/actions'
import type { SceneId } from '../core/router'
import { mountSettingsButton } from '../ui/settings'
import { mountActionPickerModal, buildActionThumbnail, refreshActionThumbnailIcons } from '../ui/action-picker'
import { getPrefs } from '../core/prefs'
import { computeRuneBonuses, unlockedSlotCount, SLOT_TYPES, runesByType, type RuneId } from '../config/runes'
import { mountRunesModal } from '../ui/runes'

const HP_BAR_H = 4
const HP_BAR_GAP = 4
const HUD_HEIGHT = 0
const SAVE_INTERVAL_MS = 10_000
const MATTER_BASE_DT = 1 / 60
const PHYSICS_MAX_STEP_MS = 1000 / 60

interface DeathFragment {
  g: Graphics
  vx: number
  vy: number
  spin: number
  age: number
  maxAge: number
}

interface Vfx {
  g: Container
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

  let masteryProgress: Partial<Record<MasteryId, MasteryProgress>> = JSON.parse(
    JSON.stringify(char?.masteryProgress ?? {}),
  ) as Partial<Record<MasteryId, MasteryProgress>>

  const actionRunes: Partial<Record<string, ActionRunes>> = JSON.parse(
    JSON.stringify(char?.actionRunes ?? {}),
  ) as Partial<Record<string, ActionRunes>>

  function getActionRunes(id: string): ActionRunes {
    const r = actionRunes[id]
    if (r) return r
    const fresh = defaultActionRunes()
    actionRunes[id] = fresh
    return fresh
  }

  function getRuneBonuses(id: string) {
    return computeRuneBonuses(getActionRunes(id).selected)
  }

  function enemyDamageScale(): number {
    return Math.pow(balance.enemyLevel.damageMultiplier, enemyProgress.level - 1)
  }

  function enemyLifeScale(): number {
    return Math.pow(balance.enemyLevel.lifeMultiplier, enemyProgress.level - 1)
      * (1 + balance.enemyLevel.lifeAddPerLevel * (enemyProgress.level - 1))
  }

  function statBonus(level: number): number {
    return 1 + (level - 1) * balance.stat.bonusPerLevel
  }

  const playerEntity = createPlayerEntity({
    maxLife:  computePlayerMaxLife(),
    maxMana:  computePlayerMaxMana(),
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

  // When "Full mastery" is on, every node of every tree is treated as assigned.
  // Effects undefined for a (tree, node) return {} from get*NodeEffect, so unused indices are harmless.
  // Arrays are built inline (rather than from module-level consts) so the function is safe to call
  // from other hoisted functions during scene setup, before any module-level const initializers run.
  function masteryNodes(id: MasteryId, width: 4 | 5): number[][] {
    if (getPrefs().fullMastery) {
      const all = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]
      return width === 5 ? [all, all, all, all, all] : [all, all, all, all]
    }
    return masteryProgress[id]?.nodes ?? (width === 5 ? [[], [], [], [], []] : [[], [], [], []])
  }

  function getActionBonuses(): ActionBonuses {
    return computeActionBonuses(masteryNodes('action', 5))
  }

  function getLifeBonuses(): LifeBonuses {
    return computeLifeBonuses(masteryNodes('life', 5))
  }

  function getManaBonuses(): ManaBonuses {
    return computeManaBonuses(masteryNodes('mana', 5))
  }

  function getFireBonuses(): FireBonuses {
    return computeFireBonuses(masteryNodes('fire', 5))
  }

  function getEnemyBonuses(): EnemyBonuses {
    return computeEnemyBonuses(masteryNodes('enemy', 5))
  }

  function getProjectileBonuses(): ProjectileBonuses {
    return computeProjectileBonuses(masteryNodes('projectile', 5))
  }

  function getLightningBonuses(): LightningBonuses {
    return computeLightningBonuses(masteryNodes('lightning', 5))
  }

  function getStrikeBonuses(): StrikeBonuses {
    return computeStrikeBonuses(masteryNodes('strike', 5))
  }

  function getPhysicalBonuses(): PhysicalBonuses {
    return computePhysicalBonuses(masteryNodes('physical', 5))
  }

  function getAreaBonuses(): AreaBonuses {
    return computeAreaBonuses(masteryNodes('area', 5))
  }

  function getMovementBonuses(): MovementBonuses {
    return computeMovementBonuses(masteryNodes('movement', 4))
  }

  // ── Damage-type effects (burning + immolation) ────────────────────────────
  // Per-entity stack list. Only the highest-dps stack ticks; the rest are
  // silent. When the active stack expires, the next highest takes over.
  interface BurnStack { dps: number; remainingMs: number; sourceActionId: ActionId }
  const burnStacks = new Map<string, BurnStack[]>()
  // Accumulator for batched orange damage numbers (avoids visual spam at high tick rates).
  const burnAccum = new Map<string, { damage: number; timeMs: number }>()

  // Player self-burn from immolation (independent of enemy burnStacks).
  // Duration mirrors the buff bar entry; both are refreshed together on re-trigger.
  let playerImmolation: { dps: number; remainingMs: number } | null = null
  let playerImmolAccum = { damage: 0, timeMs: 0 }

  // ── Bleed affliction (physical-tagged hits) ──────────────────────────────
  // Single stack per enemy. baseDps = hitDamage × bleedDpsFraction (mastery bonuses applied at tick time).
  // stackedIncrease accumulates +20% per subsequent weaker proc, multiplicative with mastery bonuses.
  // A proc that beats the current effective dps replaces baseDps while preserving stackedIncrease.
  // Duration always refreshes on any proc.
  interface BleedStack { baseDps: number; stackedIncrease: number; remainingMs: number; sourceActionId: ActionId }
  const bleedStacks = new Map<string, BleedStack>()
  const bleedAccum = new Map<string, { damage: number; timeMs: number }>()

  // ── Knockback debuffs ─────────────────────────────────────────────────────
  // knockbackState: velocity impulse applied to entity movement each frame for the duration.
  const knockbackState = new Map<string, { vx: number; vy: number; remainingMs: number }>()
  // knockbackSlowState: move-speed slow applied to knocked-back enemies.
  const knockbackSlowState = new Map<string, { amount: number; remainingMs: number }>()
  // knockbackDamageReductionState: knocked-back enemies deal reduced damage.
  const knockbackDamageReductionState = new Map<string, { amount: number; remainingMs: number }>()

  function tickKnockbacks(deltaMs: number): void {
    for (const [id, kb] of [...knockbackState]) {
      kb.remainingMs -= deltaMs
      if (kb.remainingMs <= 0) knockbackState.delete(id)
    }
    for (const [id, s] of [...knockbackSlowState]) {
      s.remainingMs -= deltaMs
      if (s.remainingMs <= 0) knockbackSlowState.delete(id)
    }
    for (const [id, d] of [...knockbackDamageReductionState]) {
      d.remainingMs -= deltaMs
      if (d.remainingMs <= 0) knockbackDamageReductionState.delete(id)
    }
  }

  // ── Electrocution debuff ──────────────────────────────────────────────────
  // One entry per entity: remaining duration ms. Re-applying refreshes the timer (no stacking).
  const electrocuteStacks = new Map<string, number>()
  // Per-entity lightning Graphics attached to the entity's Container child list.
  const electrocuteGraphics = new Map<string, Graphics>()
  // Per-entity burn/bleed Graphics attached to the entity's Container child list.
  const burnEffectGraphics  = new Map<string, Graphics>()
  const bleedEffectGraphics = new Map<string, Graphics>()

  // ── Burning ground (Fire mastery — Burning Ground tree) ─────────────────
  // Per-tile state: tileKey "tx,ty" → dps, remainingMs, sourceActionId.
  // A tile is immune to new burning ground until its current instance expires.
  interface BurnGroundTile { dps: number; remainingMs: number; sourceActionId: ActionId }
  const burnGroundTiles    = new Map<string, BurnGroundTile>()
  const burnGroundGraphics = new Map<string, Graphics>()
  const burnGroundAccum    = new Map<string, { damage: number; timeMs: number }>()
  let burnGroundContainer: Container | null = null

  function tileKey(worldX: number, worldY: number): string {
    const gs = balance.world.gridSize
    return `${Math.floor(worldX / gs)},${Math.floor(worldY / gs)}`
  }

  function isOnBurningGround(entity: Entity): boolean {
    return burnGroundTiles.has(tileKey(entity.x, entity.y))
  }

  function isElectrocuted(entity: Entity): boolean {
    return electrocuteStacks.has(entity.id)
  }

  function tickElectrocutions(deltaMs: number): void {
    for (const [id, remaining] of [...electrocuteStacks]) {
      const updated = remaining - deltaMs
      if (updated <= 0) electrocuteStacks.delete(id)
      else electrocuteStacks.set(id, updated)
    }
  }

  function tickElectrocuteEffects(): void {
    if (!app) return
    const frame = Math.floor(Date.now() / 60)

    for (const id of electrocuteStacks.keys()) {
      const entity = entities.find(e => e.id === id)
      if (!entity) continue
      const container = entityContainers.get(id)
      if (!container) continue

      let g = electrocuteGraphics.get(id)
      if (!g) {
        g = new Graphics()
        container.addChild(g)
        electrocuteGraphics.set(id, g)
      }

      g.clear()
      const r = entity.radius

      // Two jagged rings: outer cyan, inner white
      for (let b = 0; b < 2; b++) {
        const seed = b * 19 + frame * 37
        const pts   = 10
        const phase = (b * Math.PI) / pts + frame * 0.25
        for (let i = 0; i <= pts; i++) {
          const a = phase + (i / pts) * Math.PI * 2
          const h = Math.sin(seed + i * 12.9898) * 43758.5453
          const noise = (h - Math.floor(h)) - 0.5
          const x = Math.cos(a) * (r + 5 + noise * r * 0.3)
          const y = Math.sin(a) * (r + 5 + noise * r * 0.3)
          if (i === 0) g.moveTo(x, y); else g.lineTo(x, y)
        }
        g.closePath()
        g.stroke({ color: b === 0 ? 0x66ddff : 0xffffff, width: b === 0 ? 2 : 1, alpha: b === 0 ? 0.9 : 0.55 })
      }

      // Short radiating sparks
      for (let s = 0; s < 3; s++) {
        const sh  = Math.sin(s * 91.7  + frame * 53) * 43758.5453
        const ang = (sh - Math.floor(sh)) * Math.PI * 2
        const lh  = Math.sin(s * 43.3  + frame * 71) * 43758.5453
        const len = r * (0.4 + (lh - Math.floor(lh)) * 0.5)
        g.moveTo(Math.cos(ang) * r, Math.sin(ang) * r)
        g.lineTo(Math.cos(ang) * (r + len), Math.sin(ang) * (r + len))
        g.stroke({ color: 0x99eeff, width: 1.5, alpha: 0.7 })
      }

      // Subtle inner glow
      g.circle(0, 0, r)
      g.fill({ color: 0x66ddff, alpha: 0.12 })
    }

    // Remove graphics for entities no longer electrocuted
    for (const [id, g] of [...electrocuteGraphics]) {
      if (!electrocuteStacks.has(id)) {
        g.destroy()
        electrocuteGraphics.delete(id)
      }
    }
  }

  function tickBurnEffects(): void {
    if (!app) return
    const now = Date.now()
    const frame = Math.floor(now / 40)

    const activeIds = new Set(burnStacks.keys())
    if (playerImmolation !== null) activeIds.add(playerEntity.id)

    for (const id of activeIds) {
      const entity = id === playerEntity.id ? playerEntity : entities.find(e => e.id === id)
      if (!entity) continue
      const container = entityContainers.get(id)
      if (!container) continue

      let g = burnEffectGraphics.get(id)
      if (!g) {
        g = new Graphics()
        container.addChild(g)
        burnEffectGraphics.set(id, g)
      }

      g.clear()
      const r = entity.radius

      // Soft orange inner glow, pulsing
      const glowAlpha = 0.12 + 0.08 * Math.sin(now / 140)
      g.circle(0, 0, r)
      g.fill({ color: 0xff5500, alpha: glowAlpha })

      // Two jagged flame rings — outer orange, inner yellow
      for (let b = 0; b < 2; b++) {
        const color  = b === 0 ? 0xff6600 : 0xffcc00
        const seed   = b * 23 + frame * 41
        const pts    = 10
        const phase  = (b * Math.PI) / pts + frame * 0.3
        for (let i = 0; i <= pts; i++) {
          const a = phase + (i / pts) * Math.PI * 2
          const h = Math.sin(seed + i * 12.9898) * 43758.5453
          const noise = (h - Math.floor(h)) - 0.5
          const upBias = 1 + 0.35 * -Math.sin(a)  // larger at top
          const rad = r + 4 + noise * r * 0.4 * upBias
          const x = Math.cos(a) * rad
          const y = Math.sin(a) * rad
          if (i === 0) g.moveTo(x, y); else g.lineTo(x, y)
        }
        g.closePath()
        g.stroke({ color, width: b === 0 ? 2 : 1.5, alpha: b === 0 ? 0.85 : 0.6 })
      }

      // Short upward sparks
      for (let s = 0; s < 4; s++) {
        const sh  = Math.sin(s * 71.3  + frame * 53) * 43758.5453
        const ang = (sh - Math.floor(sh)) * Math.PI * 2
        const lh  = Math.sin(s * 37.7  + frame * 67) * 43758.5453
        const len = r * (0.3 + (lh - Math.floor(lh)) * 0.5)
        const sx = Math.cos(ang) * r;  const sy = Math.sin(ang) * r
        g.moveTo(sx, sy)
        g.lineTo(sx + Math.cos(ang) * len * 0.4, sy + Math.sin(ang) * len * 0.4 - len * 0.5)
        g.stroke({ color: 0xffcc44, width: 1.5, alpha: 0.75 })
      }
    }

    for (const [id, g] of [...burnEffectGraphics]) {
      const still = burnStacks.has(id) || (id === playerEntity.id && playerImmolation !== null)
      if (!still) { g.destroy(); burnEffectGraphics.delete(id) }
    }
  }

  function tickBleedEffects(): void {
    if (!app) return
    const now = Date.now()
    const pulse = 0.5 + 0.5 * Math.sin(now / 220)

    for (const id of bleedStacks.keys()) {
      const entity = entities.find(e => e.id === id)
      if (!entity) continue
      const container = entityContainers.get(id)
      if (!container) continue

      let g = bleedEffectGraphics.get(id)
      if (!g) {
        g = new Graphics()
        container.addChild(g)
        bleedEffectGraphics.set(id, g)
      }

      g.clear()
      const r = entity.radius

      // Pulsing outer ring
      g.circle(0, 0, r + 2 + pulse * 5)
      g.stroke({ color: 0xcc0000, width: 2, alpha: 0.35 + pulse * 0.5 })

      // Dark red inner tint
      g.circle(0, 0, r)
      g.fill({ color: 0xaa0000, alpha: 0.07 + pulse * 0.11 })

      // Drip streaks radiating outward and slightly downward
      for (let s = 0; s < 4; s++) {
        const sh  = Math.sin(s * 83.5) * 43758.5453
        const ang = (sh - Math.floor(sh)) * Math.PI * 2
        const lh  = Math.sin(s * 47.2 + now / 600) * 43758.5453
        const len = r * (0.25 + (lh - Math.floor(lh)) * 0.35)
        const sx = Math.cos(ang) * r;  const sy = Math.sin(ang) * r
        g.moveTo(sx, sy)
        g.lineTo(sx + Math.cos(ang) * len * 0.35, sy + Math.sin(ang) * len * 0.35 + len * 0.55)
        g.stroke({ color: 0xff2222, width: 1.5, alpha: 0.45 + pulse * 0.45 })
      }
    }

    for (const [id, g] of [...bleedEffectGraphics]) {
      if (!bleedStacks.has(id)) { g.destroy(); bleedEffectGraphics.delete(id) }
    }
  }

  function isBurning(entity: Entity): boolean {
    const s = burnStacks.get(entity.id)
    return !!s && s.length > 0
  }

  // Tick burning effect: all stacks deal damage simultaneously.
  // The highest-dps stack is used for XP/splash attribution.
  // Splashes a fraction to nearby non-burning enemies (fire mastery 11).
  // Adds touched entity IDs to `damagedIds` so the main loop's death pass picks them up.
  function tickBurns(deltaMs: number, damagedIds: Set<string>): void {
    if (burnStacks.size === 0 && burnAccum.size === 0) return
    const dts = deltaMs / 1000
    const fb = getFireBonuses()
    const splashFrac = fb.burnSplashFraction / 100

    // Damage pass — all stacks tick; highest-dps stack used for attribution & splash.
    for (const [entityId, stacks] of burnStacks) {
      const entity = entities.find(e => e.id === entityId)
      if (!entity || entity.role !== 'enemy') continue
      let maxStack = stacks[0]
      for (const s of stacks) if (s.dps > maxStack.dps) maxStack = s
      const totalDps = stacks.reduce((sum, s) => sum + s.dps, 0)
      const tickDmg = totalDps * dts
      if (tickDmg <= 0) continue

      const prev = entity.currentLife
      entity.currentLife = Math.max(0, entity.currentLife - tickDmg)
      const actual = prev - entity.currentLife
      if (actual > 0) {
        const eLevel = enemyLevels.get(entity.id) ?? 1
        const xpMult = Math.pow(balance.enemyLevel.xpMultiplierPerLevel, eLevel - 1) * tierXpMult(entity.id)
        awardXp(maxStack.sourceActionId, actual * xpMult)
        if (enemyProgress.level === enemyProgress.maxLevel) awardEnemyXp(actual)
        recordDps(maxStack.sourceActionId, actual, 'affliction:burn')
        const acc = burnAccum.get(entityId) ?? { damage: 0, timeMs: 0 }
        acc.damage += actual
        burnAccum.set(entityId, acc)
        damagedIds.add(entityId)
      }

      // Splash: 50% (or whatever) of the raw burn dps damage to nearby non-burning enemies.
      if (splashFrac > 0) {
        const splashRaw = tickDmg * splashFrac
        if (splashRaw > 0) {
          for (const other of entities) {
            if (other === entity || other.role !== 'enemy') continue
            if (isBurning(other)) continue
            const dx = other.x - entity.x, dy = other.y - entity.y
            if (Math.sqrt(dx * dx + dy * dy) > balance.effects.burnSplashRadius) continue
            const sprev = other.currentLife
            other.currentLife = Math.max(0, other.currentLife - splashRaw)
            const sActual = sprev - other.currentLife
            if (sActual > 0) {
              const eLevel = enemyLevels.get(other.id) ?? 1
              const xpMult = Math.pow(balance.enemyLevel.xpMultiplierPerLevel, eLevel - 1) * tierXpMult(other.id)
              awardXp(maxStack.sourceActionId, sActual * xpMult)
              if (enemyProgress.level === enemyProgress.maxLevel) awardEnemyXp(sActual)
              const acc = burnAccum.get(other.id) ?? { damage: 0, timeMs: 0 }
              acc.damage += sActual
              burnAccum.set(other.id, acc)
              damagedIds.add(other.id)
            }
          }
        }
      }
    }

    // Decrement timers and drop expired stacks; clean up dead entities' state.
    for (const [entityId, stacks] of [...burnStacks]) {
      for (const s of stacks) s.remainingMs -= deltaMs
      const live = stacks.filter(s => s.remainingMs > 0)
      if (live.length === 0) burnStacks.delete(entityId)
      else burnStacks.set(entityId, live)
    }

    // Display pass — emit one orange damage number per accumulator interval.
    for (const [entityId, acc] of [...burnAccum]) {
      const entity = entities.find(e => e.id === entityId)
      if (!entity) { burnAccum.delete(entityId); continue }
      acc.timeMs += deltaMs
      if (acc.timeMs >= balance.effects.burnDisplayIntervalMs && acc.damage > 0) {
        spawnDamageNumber(entity.x, entity.y - entity.radius - 8, acc.damage, 0xff8800)
        acc.damage = 0
        acc.timeMs = 0
      }
      // Drop accumulator entries for entities that no longer have any stacks
      // and have flushed their pending damage display.
      if (!burnStacks.has(entityId) && acc.damage === 0) burnAccum.delete(entityId)
    }

    // Player self-burn (immolation DOT — independent of burnStacks)
    if (playerImmolation !== null && !playerDead) {
      playerImmolation.remainingMs -= deltaMs
      const elemRes = Math.max(0, Math.min(100, getLifeBonuses().elementalResistance))
      let selfDmg = playerImmolation.dps * dts * (1 - elemRes / 100)
      if (selfDmg > 0) {
        // Mana Shield node 5: intercept DoT sources
        const mb = getManaBonuses()
        if (mb.manaShieldAllSources && mb.manaShieldAbsorb > 0 && playerEntity.currentMana > 0) {
          const absorbFrac = Math.min(1, mb.manaShieldAbsorb / 100)
          const absorbed = selfDmg * absorbFrac
          const manaRate = mb.manaShieldDamageTaken / 100
          const manaCost = absorbed * manaRate
          if (playerEntity.currentMana >= manaCost) {
            playerEntity.currentMana = Math.max(0, playerEntity.currentMana - manaCost)
            selfDmg -= absorbed
          } else {
            const partialAbsorbed = manaRate > 0 ? playerEntity.currentMana / manaRate : 0
            playerEntity.currentMana = 0
            selfDmg -= partialAbsorbed
          }
        }
        playerEntity.currentLife = Math.max(0, playerEntity.currentLife - selfDmg)
        damagedIds.add(playerEntity.id)
        playerImmolAccum.damage += selfDmg
      }
      if (playerImmolation.remainingMs <= 0) playerImmolation = null
    }
    playerImmolAccum.timeMs += deltaMs
    if (playerImmolAccum.timeMs >= balance.effects.burnDisplayIntervalMs && playerImmolAccum.damage > 0) {
      spawnDamageNumber(playerEntity.x, playerEntity.y - playerEntity.radius - 8, playerImmolAccum.damage, 0xff8800)
      playerImmolAccum.damage = 0
      playerImmolAccum.timeMs = 0
    }
  }

  // Tick bleed: single stack per enemy. Effective DPS = baseDps × (1 + stackedIncrease/100)
  // × mastery multipliers (applied at tick time so they stay independent of stacking logic).
  function tickBleeds(deltaMs: number, damagedIds: Set<string>): void {
    if (bleedStacks.size === 0 && bleedAccum.size === 0) return
    const dts = deltaMs / 1000
    const pb = getPhysicalBonuses()

    for (const [entityId, stack] of bleedStacks) {
      const entity = entities.find(e => e.id === entityId)
      if (!entity || entity.role !== 'enemy') continue
      const effectiveDps = stack.baseDps
        * (1 + stack.stackedIncrease / 100)
        * (1 + pb.bleedDamageIncrease / 100)
        * (1 + pb.bleedMoreDamage / 100)
      const tickDmg = effectiveDps * dts
      if (tickDmg <= 0) continue

      const prev = entity.currentLife
      entity.currentLife = Math.max(0, entity.currentLife - tickDmg)
      const actual = prev - entity.currentLife
      if (actual > 0) {
        const eLevel = enemyLevels.get(entity.id) ?? 1
        const xpMult = Math.pow(balance.enemyLevel.xpMultiplierPerLevel, eLevel - 1) * tierXpMult(entity.id)
        awardXp(stack.sourceActionId, actual * xpMult)
        if (enemyProgress.level === enemyProgress.maxLevel) awardEnemyXp(actual)
        recordDps(stack.sourceActionId, actual, 'affliction:bleed')
        const acc = bleedAccum.get(entityId) ?? { damage: 0, timeMs: 0 }
        acc.damage += actual
        bleedAccum.set(entityId, acc)
        damagedIds.add(entityId)
      }

      stack.remainingMs -= deltaMs
      if (stack.remainingMs <= 0) bleedStacks.delete(entityId)
    }

    for (const [entityId, acc] of [...bleedAccum]) {
      const entity = entities.find(e => e.id === entityId)
      if (!entity) { bleedAccum.delete(entityId); continue }
      acc.timeMs += deltaMs
      if (acc.timeMs >= balance.effects.bleedDisplayIntervalMs && acc.damage > 0) {
        spawnDamageNumber(entity.x, entity.y - entity.radius - 8, acc.damage, 0xcc2222)
        acc.damage = 0
        acc.timeMs = 0
      }
      if (!bleedStacks.has(entityId) && acc.damage === 0) bleedAccum.delete(entityId)
    }
  }

  // Tick burning ground: damage every enemy whose tile coordinates match a
  // burning ground tile. Damage uses the tile's stored dps (snapshot at apply time).
  function tickBurnGrounds(deltaMs: number, damagedIds: Set<string>): void {
    if (burnGroundTiles.size === 0 && burnGroundAccum.size === 0) return
    const dts = deltaMs / 1000

    for (const [tk, tile] of burnGroundTiles) {
      const tickDmg = tile.dps * dts
      if (tickDmg > 0) {
        for (const e of entities) {
          if (e.role !== 'enemy') continue
          if (tileKey(e.x, e.y) !== tk) continue
          const prev = e.currentLife
          e.currentLife = Math.max(0, e.currentLife - tickDmg)
          const actual = prev - e.currentLife
          if (actual > 0) {
            const eLevel = enemyLevels.get(e.id) ?? 1
            const xpMult = Math.pow(balance.enemyLevel.xpMultiplierPerLevel, eLevel - 1) * tierXpMult(e.id)
            awardXp(tile.sourceActionId, actual * xpMult)
            if (enemyProgress.level === enemyProgress.maxLevel) awardEnemyXp(actual)
            recordDps(tile.sourceActionId, actual, 'affliction:groundFire')
            const acc = burnGroundAccum.get(e.id) ?? { damage: 0, timeMs: 0 }
            acc.damage += actual
            burnGroundAccum.set(e.id, acc)
            damagedIds.add(e.id)
          }
        }
      }
      tile.remainingMs -= deltaMs
      if (tile.remainingMs <= 0) burnGroundTiles.delete(tk)
    }

    for (const [entityId, acc] of [...burnGroundAccum]) {
      const entity = entities.find(e => e.id === entityId)
      if (!entity) { burnGroundAccum.delete(entityId); continue }
      acc.timeMs += deltaMs
      if (acc.timeMs >= balance.effects.burnDisplayIntervalMs && acc.damage > 0) {
        spawnDamageNumber(entity.x, entity.y - entity.radius - 8, acc.damage, 0xff8800)
        acc.damage = 0
        acc.timeMs = 0
      }
      if (acc.damage === 0) burnGroundAccum.delete(entityId)
    }
  }

  function tickBurnGroundEffects(): void {
    if (!app || !burnGroundContainer) return
    const gs = balance.world.gridSize
    const now = Date.now()
    const frame = Math.floor(now / 40)

    for (const tk of burnGroundTiles.keys()) {
      let g = burnGroundGraphics.get(tk)
      if (!g) {
        g = new Graphics()
        burnGroundContainer.addChild(g)
        burnGroundGraphics.set(tk, g)
      }
      const [txStr, tyStr] = tk.split(',')
      const cx = (Number(txStr) + 0.5) * gs
      const cy = (Number(tyStr) + 0.5) * gs
      const half = gs / 2

      g.clear()
      g.position.set(cx, cy)

      // Filled tile glow
      const glowAlpha = 0.18 + 0.10 * Math.sin(now / 160 + (Number(txStr) + Number(tyStr)) * 0.7)
      g.rect(-half, -half, gs, gs)
      g.fill({ color: 0xff5500, alpha: glowAlpha })

      // Jagged flame ring around the tile centre
      for (let b = 0; b < 2; b++) {
        const color = b === 0 ? 0xff6600 : 0xffcc00
        const seed  = b * 23 + frame * 41
        const pts   = 12
        const phase = (b * Math.PI) / pts + frame * 0.25
        const r0    = half * 0.55
        for (let i = 0; i <= pts; i++) {
          const a = phase + (i / pts) * Math.PI * 2
          const h = Math.sin(seed + i * 12.9898) * 43758.5453
          const noise = (h - Math.floor(h)) - 0.5
          const upBias = 1 + 0.3 * -Math.sin(a)
          const rad = r0 + noise * r0 * 0.4 * upBias
          const x = Math.cos(a) * rad
          const y = Math.sin(a) * rad
          if (i === 0) g.moveTo(x, y); else g.lineTo(x, y)
        }
        g.closePath()
        g.stroke({ color, width: b === 0 ? 2 : 1.5, alpha: b === 0 ? 0.85 : 0.6 })
      }
    }

    for (const [tk, g] of [...burnGroundGraphics]) {
      if (!burnGroundTiles.has(tk)) { g.destroy(); burnGroundGraphics.delete(tk) }
    }
  }

  function computePlayerMaxLife(): number {
    const lb = getLifeBonuses()
    const mb = getManaBonuses()
    return balance.player.maxLife * statBonus(lifeProgress.level)
      * (1 + lb.maxLifeIncrease / 100)
      * (1 + lb.moreMaxLife / 100)
      * (1 + mb.moreMaxLife / 100)
  }

  function computePlayerMaxMana(): number {
    const mb = getManaBonuses()
    return balance.player.maxMana * statBonus(manaProgress.level)
      * (1 + mb.maxManaIncrease / 100)
      * (1 + mb.moreMaxMana / 100)
  }

  function assignAction(entity: Entity, id: ActionId): void {
    const def = getAction(id)
    const level = entity.role === 'player' ? getPlayerLevel(id) : 1
    entity.actionSpeed  = def.speed * (1 + (level - 1) * balance.action.speedBonusPerLevel)
    entity.actionDamage = def.damage * Math.pow(balance.action.damageMult, level - 1) * (1 + (level - 1) * balance.action.damageAddPerLevel)
    // Self-targeted area actions fire at 2/3 of the area radius so the cast catches more enemies.
    const baseRangeUnits = def.selfTargeted ? (def.area ?? 0) * (2 / 3) : def.range
    entity.actionRange  = baseRangeUnits * balance.player.radius
    if (entity.role === 'player') {
      const ab = getActionBonuses()
      entity.actionDamage *= (1 + ab.damageIncrease / 100) * (1 + ab.moreDamage / 100)
      entity.actionSpeed  *= (1 + ab.actionSpeedIncrease / 100) * (1 + ab.moreActionSpeed / 100)
    }
    if (entity.role === 'player' && def.tags.includes('projectile')) {
      const pb = getProjectileBonuses()
      entity.actionDamage *= (1 + pb.damageIncrease / 100) * (1 + pb.moreDamage / 100)
      entity.actionSpeed  *= (1 + pb.actionSpeedIncrease / 100)
      entity.actionRange  *= (1 + pb.rangeIncrease / 100)
    }
    if (entity.role === 'player' && def.tags.includes('strike')) {
      const sb = getStrikeBonuses()
      entity.actionDamage *= (1 + sb.damageIncrease / 100) * (1 + sb.moreDamage / 100)
      entity.actionSpeed  *= (1 + sb.actionSpeedIncrease / 100) * (1 + sb.moreActionSpeed / 100)
      entity.actionRange  *= (1 + sb.rangeIncrease / 100) * (1 + sb.moreRange / 100)
    }
    if (entity.role === 'player' && def.tags.includes('lightning')) {
      const lb = getLightningBonuses()
      entity.actionDamage *= (1 + lb.damageIncrease / 100) * (1 + lb.moreDamage / 100)
      entity.actionSpeed  *= (1 + lb.actionSpeedIncrease / 100) * (1 + lb.moreActionSpeed / 100)
    }
    if (entity.role === 'player' && def.tags.includes('fire')) {
      const fb = getFireBonuses()
      entity.actionDamage *= (1 + fb.damageIncrease / 100) * (1 + fb.moreDamage / 100)
      entity.actionSpeed  *= (1 + fb.actionSpeedIncrease / 100)
    }
    if (entity.role === 'player' && def.tags.includes('physical')) {
      const pb = getPhysicalBonuses()
      entity.actionDamage *= (1 + pb.damageIncrease / 100) * (1 + pb.moreDamage / 100)
      entity.actionSpeed  *= (1 + pb.actionSpeedIncrease / 100)
    }
    if (entity.role === 'player' && def.tags.includes('area')) {
      const ab = getAreaBonuses()
      entity.actionDamage *= (1 + ab.damageIncrease / 100) * (1 + ab.moreDamage / 100)
      entity.actionSpeed  *= Math.max(0.01, 1 - ab.lessActionSpeed / 100)
      // Self-targeted area uses (2/3 × area radius) as trigger range — grow it with size bonuses
      if (def.selfTargeted) {
        entity.actionRange *= (1 + ab.sizeIncrease / 100) * (1 + ab.moreSize / 100)
      }
    }
    if (entity.role === 'player') {
      const rb = getRuneBonuses(id)
      entity.actionDamage *= (1 + rb.damageIncrease / 100) * rb.damageMore
      entity.actionSpeed  *= (1 + rb.speedIncrease  / 100) * rb.speedMore
      if (rb.slowHeavy) { entity.actionDamage *= 2; entity.actionSpeed *= 0.5 }
      // Global action speed from Mana mastery Maximum Mana tree (node 8)
      const mb = getManaBonuses()
      if (mb.actionSpeedIncrease > 0) entity.actionSpeed *= (1 + mb.actionSpeedIncrease / 100)
    }
    entityActions.set(entity.id, id)
  }

  function awardXp(actionId: ActionId, amount: number): void {
    const prev = actionProgress[actionId] ?? { xp: 0, level: 1, maxLevel: 1 }
    let { xp, level, maxLevel } = prev
    // Prestige accelerates XP gain: past peak level → faster leveling next life
    const rb = getRuneBonuses(actionId)
    const scaledXp = amount * (1 + (maxLevel - 1) * 0.1) * (1 + rb.xpIncrease / 100) * rb.xpMore
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
    if (leveled) applyAutoRunes(actionId)
    if (actionId === playerActionId) {
      if (leveled) assignAction(playerEntity, actionId)
      updateActionBar()
    }
  }

  function refreshRuneDot(): void {
    const dot = el.querySelector<HTMLElement>('.rune-notif-dot')
    if (!dot) return
    const r = getActionRunes(playerActionId)
    const level = actionProgress[playerActionId]?.level ?? 1
    const unlocked = unlockedSlotCount(level)
    dot.hidden = r.selected.slice(0, unlocked).every(s => s !== null)
  }

  function applyAutoRunes(actionId: string): void {
    const r = getActionRunes(actionId)
    if (!r.autoApply) return
    const level = actionProgress[actionId]?.level ?? 1
    const slotCount = unlockedSlotCount(level)
    let changed = false
    for (let i = 0; i < slotCount; i++) {
      if (r.selected[i] !== null) continue
      const slotType = SLOT_TYPES[i]
      const taken = new Set(r.selected.filter((x): x is RuneId => x !== null))
      const available = new Set(runesByType(slotType).map(rd => rd.id))
      const next = r.history.find(rune => available.has(rune) && !taken.has(rune))
      if (next) { r.selected[i] = next; changed = true }
    }
    if (changed) {
      actionRunes[actionId] = r
      if (actionId === playerActionId) assignAction(playerEntity, actionId as ActionId)
      refreshRuneDot()
      persistState()
    }
  }

  function assignRune(actionId: string, slotIdx: number, runeId: RuneId | null): void {
    const r = getActionRunes(actionId)
    r.selected[slotIdx] = runeId
    r.autoApply = false
    actionRunes[actionId] = r
    if (actionId === playerActionId) assignAction(playerEntity, actionId as ActionId)
    refreshRuneDot()
    persistState()
  }

  function awardStatXp(stat: 'life' | 'mana', amount: number): void {
    if (stat === 'life') runLifeXp += amount
    else runManaXp += amount
    let prog = stat === 'life' ? lifeProgress : manaProgress
    let { xp, level } = prog
    xp += amount
    let leveled = false
    while (xp >= statXpNeeded(level)) {
      xp -= statXpNeeded(level)
      level++
      leveled = true
    }
    prog = { xp, level }
    if (stat === 'life') {
      lifeProgress = prog
      if (leveled) playerEntity.maxLife = computePlayerMaxLife()
    } else {
      manaProgress = prog
      if (leveled) playerEntity.maxMana = computePlayerMaxMana()
    }
    updateBars()
    updateStatLevels()
  }

  assignAction(playerEntity, playerActionId)
  applyAutoRunes(playerActionId)

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

  // ── Tile map ─────────────────────────────────────────────────────────────

  const blockedTiles    = new Set<string>()
  const generatedChunks = new Set<string>()
  const chunkBodies     = new Map<string, Matter.Body[]>()
  let lastPlayerChunkX  = NaN
  let lastPlayerChunkY  = NaN

  function isTileBlocked(worldX: number, worldY: number): boolean {
    const gs = balance.world.gridSize
    return blockedTiles.has(`${Math.floor(worldX / gs)},${Math.floor(worldY / gs)}`)
  }

  function generateChunk(cx: number, cy: number): void {
    const key = `${cx},${cy}`
    if (generatedChunks.has(key)) return
    generatedChunks.add(key)

    const { chunkSize, blockedDensity, placementGrid,
            wallLengthMin, wallLengthMax, scatterDensity } = balance.world.map
    const gs  = balance.world.gridSize
    const rng = chunkRng(cx, cy)
    const bodies: Matter.Body[] = []
    const originTX = cx * chunkSize
    const originTY = cy * chunkSize

    // Use global-aligned placement points so corridors are consistent across chunk boundaries.
    // Per-chunk-relative offsets would produce 0-tile gaps where adjacent chunks' last/first
    // obstacles meet at a chunk edge.
    const pgStartX = Math.ceil(originTX / placementGrid) * placementGrid
    const pgStartY = Math.ceil(originTY / placementGrid) * placementGrid

    for (let px = pgStartX; px < originTX + chunkSize; px += placementGrid) {
      for (let py = pgStartY; py < originTY + chunkSize; py += placementGrid) {
        if (rng() >= blockedDensity) continue

        const tx0 = px
        const ty0 = py

        const r = rng()
        let w: number, h: number
        if (r < 0.35) {
          w = 1; h = 1
        } else if (r < 0.55) {
          w = 2 + Math.floor(rng() * 2)
          h = 2 + Math.floor(rng() * 2)
        } else if (r < 0.77) {
          w = wallLengthMin + Math.floor(rng() * (wallLengthMax - wallLengthMin + 1))
          h = 1
        } else {
          w = 1
          h = wallLengthMin + Math.floor(rng() * (wallLengthMax - wallLengthMin + 1))
        }

        // Clamp to chunk boundary
        const actualW = Math.min(w, originTX + chunkSize - tx0)
        const actualH = Math.min(h, originTY + chunkSize - ty0)
        if (actualW <= 0 || actualH <= 0) continue

        // Safe zone: never block within 3 tiles of world origin
        let overlapsOrigin = false
        outer: for (let dy = 0; dy < actualH; dy++) {
          for (let dx = 0; dx < actualW; dx++) {
            if (Math.abs(tx0 + dx) <= 3 && Math.abs(ty0 + dy) <= 3) {
              overlapsOrigin = true; break outer
            }
          }
        }
        if (overlapsOrigin) continue

        for (let dy = 0; dy < actualH; dy++) {
          for (let dx = 0; dx < actualW; dx++) {
            blockedTiles.add(`${tx0 + dx},${ty0 + dy}`)
          }
        }

        const bx = (tx0 + actualW / 2) * gs
        const by = (ty0 + actualH / 2) * gs
        const body = Matter.Bodies.rectangle(bx, by, actualW * gs, actualH * gs, {
          isStatic: true,
          label: 'obstacle',
          friction: 0,
          restitution: 0,
        })
        Matter.Composite.add(physicsEngine.world, body)
        bodies.push(body)
      }
    }

    // Scatter pass: place 1×1 tiles only in open areas with ≥3 free cardinal tiles.
    // This adds density without ever narrowing corridors below 3 tiles.
    for (let ty = originTY; ty < originTY + chunkSize; ty++) {
      for (let tx = originTX; tx < originTX + chunkSize; tx++) {
        if (blockedTiles.has(`${tx},${ty}`)) continue
        if (Math.abs(tx) <= 3 && Math.abs(ty) <= 3) continue
        let clear = true
        for (let d = 1; d <= 3 && clear; d++) {
          if (blockedTiles.has(`${tx + d},${ty}`) || blockedTiles.has(`${tx - d},${ty}`) ||
              blockedTiles.has(`${tx},${ty + d}`) || blockedTiles.has(`${tx},${ty - d}`)) clear = false
        }
        if (!clear || rng() >= scatterDensity) continue
        blockedTiles.add(`${tx},${ty}`)
        const body = Matter.Bodies.rectangle((tx + 0.5) * gs, (ty + 0.5) * gs, gs, gs, {
          isStatic: true,
          label: 'obstacle',
          friction: 0,
          restitution: 0,
        })
        Matter.Composite.add(physicsEngine.world, body)
        bodies.push(body)
      }
    }

    chunkBodies.set(key, bodies)
  }

  function forgetChunk(cx: number, cy: number): void {
    const key = `${cx},${cy}`
    if (!generatedChunks.has(key)) return
    for (const b of (chunkBodies.get(key) ?? [])) Matter.Composite.remove(physicsEngine.world, b)
    chunkBodies.delete(key)
    const { chunkSize } = balance.world.map
    const originTX = cx * chunkSize
    const originTY = cy * chunkSize
    for (let dy = 0; dy < chunkSize; dy++) {
      for (let dx = 0; dx < chunkSize; dx++) {
        blockedTiles.delete(`${originTX + dx},${originTY + dy}`)
      }
    }
    generatedChunks.delete(key)
  }

  function updateChunks(): void {
    const gs = balance.world.gridSize
    const { chunkSize, forgetRange } = balance.world.map
    const pcx = Math.floor(Math.floor(playerEntity.x / gs) / chunkSize)
    const pcy = Math.floor(Math.floor(playerEntity.y / gs) / chunkSize)
    if (pcx === lastPlayerChunkX && pcy === lastPlayerChunkY) return
    lastPlayerChunkX = pcx
    lastPlayerChunkY = pcy

    for (let dy = -forgetRange; dy <= forgetRange; dy++) {
      for (let dx = -forgetRange; dx <= forgetRange; dx++) {
        generateChunk(pcx + dx, pcy + dy)
      }
    }
    for (const key of [...generatedChunks]) {
      const [cx, cy] = key.split(',').map(Number) as [number, number]
      if (Math.abs(cx - pcx) > forgetRange || Math.abs(cy - pcy) > forgetRange) {
        forgetChunk(cx, cy)
      }
    }
  }

  let paused = false
  let gameSpeed = 1
  let playerDead = false
  let waveScheduled = false
  let lastWaveAngle: number | null = null
  let enemyIdCounter = 0
  let enemySpawnTimeout: ReturnType<typeof setTimeout> | null = null
  let playerRandomTargetId: string | null = null
  let targetingMode: TargetingMode = char?.targetingMode ?? 'nearest'

  // Per-rebirth XP accumulators — persisted in char.runProgress, reset in rebirth()
  let runActionXp: Record<string, number> = { ...(char?.runProgress?.actionXp ?? {}) }
  let runLifeXp = char?.runProgress?.lifeXp ?? 0
  let runManaXp = char?.runProgress?.manaXp ?? 0
  let runEnemyXp = char?.runProgress?.enemyXp ?? 0
  let runDistancePx = char?.runProgress?.distancePx ?? 0

  function currentRunProgress(): RunProgress {
    return {
      actionXp: { ...runActionXp },
      lifeXp: runLifeXp,
      manaXp: runManaXp,
      enemyXp: runEnemyXp,
      distancePx: runDistancePx,
    }
  }

  function persistState(): void {
    if (!char) return
    saveCharacterState(
      char.id,
      playerEntity.currentLife,
      playerEntity.currentMana,
      playerActionId,
      actionProgress,
      lifeProgress,
      manaProgress,
      enemyProgress,
      targetingMode,
      masteryProgress,
      currentRunProgress(),
      actionRunes,
    )
  }
  let playerPrevX = 0
  let playerPrevY = 0

  const el = document.createElement('div')
  el.className = 'scene scene-game'
  el.innerHTML = `
    <div class="game-top-bar">
      <div class="game-top-left">
        <button class="game-action-btn game-action-btn--icon" data-action="go-home" aria-label="Back to menu">
          <i data-lucide="arrow-left" aria-hidden="true"></i>
        </button>
        <button class="game-action-btn game-action-btn--icon" data-action="die" aria-label="Die and rebirth">
          <i data-lucide="skull" aria-hidden="true"></i>
        </button>
      </div>
      <div class="game-top-center">
        <button class="game-action-btn game-action-btn--icon" data-action="open-config" aria-label="Battle configuration">
          <i data-lucide="settings-2" aria-hidden="true"></i>
        </button>
        <button class="game-action-btn game-action-btn--icon" data-action="open-mastery" aria-label="Masteries" style="position:relative">
          <i data-lucide="award" aria-hidden="true"></i>
          <span class="notif-dot mastery-notif-dot" hidden></span>
        </button>
        <button class="game-action-btn game-action-btn--icon game-action-btn--enemy-toggle" data-action="toggle-enemy" aria-label="Enemy level">
          <span class="enemy-level-display">1 / 1</span>
        </button>
      </div>
      <div class="game-top-right">
        <div class="speed-ctrl">
          <button class="speed-pause-btn" data-action="playpause" aria-label="Pause">
            <i data-lucide="pause" aria-hidden="true"></i>
          </button>
          <button class="speed-opt speed-opt--active" data-speed="1">×1</button>
          <button class="speed-opt" data-speed="2">×2</button>
          <button class="speed-opt" data-speed="5">×5</button>
          <button class="speed-opt" data-speed="10">×10</button>
        </div>
      </div>
    </div>
    <div class="game-viewport">
      <div class="buff-bar"></div>
      <div class="dps-meter" hidden></div>
      <div class="enemy-level-ctrl">
        <span class="enemy-level-title">Enemy level</span>
        <div class="enemy-level-main">
          <button class="enemy-level-btn" data-action="enemy-level-down" aria-label="Decrease enemy level"><img class="enemy-level-arrow" src="${import.meta.env.BASE_URL}ui/kenney_ui-pack-rpg-expansion/PNG/arrowSilver_left.png" alt=""></button>
          <span class="enemy-level-display">1 / 1</span>
          <button class="enemy-level-btn" data-action="enemy-level-up" aria-label="Increase enemy level"><img class="enemy-level-arrow" src="${import.meta.env.BASE_URL}ui/kenney_ui-pack-rpg-expansion/PNG/arrowSilver_right.png" alt=""></button>
          <label class="enemy-autolevel" title="Auto-advance enemy level on unlock">
            <input type="checkbox" class="enemy-autolevel-input" aria-label="Auto-level enemies">
            <span class="enemy-autolevel-track"></span>
            <span class="enemy-autolevel-label">Auto</span>
          </label>
        </div>
        <div class="enemy-xp-bar">
          <div class="enemy-xp-bar-fill"></div>
        </div>
      </div>
    </div>
    <div class="game-bottom-bar">
      <div class="stat-bars">
        <div class="stat-bar-row">
          <div class="stat-bar stat-bar--life">
            <div class="stat-bar-fill stat-bar-fill--life"></div>
            <span class="stat-bar-label stat-bar-label--life"></span>
            <span class="stat-bar-regen stat-bar-regen--life"></span>
          </div>
          <div class="stat-level stat-level--life"><div class="stat-level-fill"></div><span>Lv.1</span></div>
        </div>
        <div class="stat-bar-row">
          <div class="stat-bar stat-bar--mana">
            <div class="stat-bar-fill stat-bar-fill--mana"></div>
            <span class="stat-bar-label stat-bar-label--mana"></span>
            <span class="stat-bar-regen stat-bar-regen--mana"></span>
          </div>
          <div class="stat-level stat-level--mana"><div class="stat-level-fill"></div><span>Lv.1</span></div>
        </div>
        <div class="stat-bar-row stat-bar-row--action">
          <button class="action-icon-btn" aria-label="Runes" style="position:relative">
            <i data-lucide="sword" aria-hidden="true"></i>
            <span class="notif-dot rune-notif-dot" hidden></span>
          </button>
          <div class="stat-bar stat-bar--action">
            <div class="stat-bar-fill stat-bar-fill--action"></div>
            <span class="action-level-label">Lv.1</span>
            <span class="stat-bar-regen stat-bar-regen--action"></span>
          </div>
        </div>
      </div>
    </div>
  `
  container.appendChild(el)
  const viewportEl = el.querySelector<HTMLElement>('.game-viewport')!
  const dpsMeterEl = el.querySelector<HTMLElement>('.dps-meter')!
  createIcons({ icons: { ArrowLeft, Play, Pause, Settings2, Award, Sword, Book, Skull } })

  const DPS_MULTI_LABELS: Record<MultiActionType, string> = {
    doubleAction: 'Double action', additionalTarget: 'Bonus target', additionalProjectile: 'Extra projectile',
    splitAction: 'Split cast', jump: 'Chain jump', tremor: 'Tremor',
  }
  const DPS_AFFLICTION_LABELS: Record<string, string> = {
    'affliction:burn': 'Burn', 'affliction:bleed': 'Bleed', 'affliction:groundFire': 'Ground fire',
  }
  // Smoothed scale denominator so bars don't visually wobble when the top action's DPS fluctuates.
  // Jumps up instantly to new peaks; decays toward instant max with ~2s half-life at the 200 ms tick.
  let smoothedDpsMax = 0
  function updateDpsMeter(): void {
    if (!getPrefs().showDpsMeter) { dpsMeterEl.hidden = true; return }
    const data = computeDps()
    if (data.size === 0) { dpsMeterEl.hidden = true; smoothedDpsMax = 0; return }
    dpsMeterEl.hidden = false

    let instantMax = 0
    for (const byKind of data.values()) {
      let total = 0
      for (const v of byKind.values()) total += v
      instantMax = Math.max(instantMax, total)
    }
    if (instantMax <= 0) { dpsMeterEl.hidden = true; smoothedDpsMax = 0; return }
    smoothedDpsMax = instantMax >= smoothedDpsMax ? instantMax : smoothedDpsMax * 0.93 + instantMax * 0.07
    const maxDps = smoothedDpsMax

    const bar = (val: number): string =>
      `<div class="dps-bar-track"><div class="dps-bar" style="width:${(val / maxDps * 100).toFixed(1)}%"></div></div>`
    const row = (cls: string, name: string, val: number): string =>
      `<div class="dps-row ${cls}"><span class="dps-name">${name}</span><span class="dps-value">${fmtDps(val)}</span>${bar(val)}</div>`

    let html = ''
    for (const [actionId, byKind] of data) {
      let total = 0
      for (const v of byKind.values()) total += v
      const label = allActions.find(a => a.id === actionId)?.label ?? actionId
      html += row('dps-row--action', label, total)

      const direct = byKind.get('direct') ?? 0
      if (direct > 0) html += row('dps-row--sub', 'Direct', direct)

      for (const type of Object.keys(DPS_MULTI_LABELS) as MultiActionType[]) {
        const val = byKind.get(`multi:${type}`) ?? 0
        if (val > 0) html += row('dps-row--sub', DPS_MULTI_LABELS[type], val)
      }
      for (const key of Object.keys(DPS_AFFLICTION_LABELS)) {
        const val = byKind.get(key) ?? 0
        if (val > 0) html += row('dps-row--sub', DPS_AFFLICTION_LABELS[key], val)
      }
    }
    dpsMeterEl.innerHTML = html
  }
  const dpsMeterInterval = setInterval(updateDpsMeter, 1000)

  let zoomLevel = getPrefs().zoomLevel ?? 1.0
  const topCenter = el.querySelector<HTMLElement>('.game-top-center')!
  const unmountSettings = mountSettingsButton(topCenter, container, {
    onZoomChange: (z) => {
      zoomLevel = z
      updateCamera()
      drawGrid()
    },
    getTargetingMode: () => targetingMode,
    onTargetingChange: (mode) => {
      targetingMode = mode
      playerRandomTargetId = null
      persistState()
    },
  })

  const lifeFill        = el.querySelector<HTMLElement>('.stat-bar-fill--life')!
  const manaFill        = el.querySelector<HTMLElement>('.stat-bar-fill--mana')!
  const lifeLabel       = el.querySelector<HTMLElement>('.stat-bar-label--life')!
  const manaLabel       = el.querySelector<HTMLElement>('.stat-bar-label--mana')!
  const lifeRegenEl     = el.querySelector<HTMLElement>('.stat-bar-regen--life')!
  const manaRegenEl     = el.querySelector<HTMLElement>('.stat-bar-regen--mana')!
  const lifeLevelEl     = el.querySelector<HTMLElement>('.stat-level--life')!
  const manaLevelEl     = el.querySelector<HTMLElement>('.stat-level--mana')!
  const enemyXpBarFill  = el.querySelector<HTMLElement>('.enemy-xp-bar-fill')!
  const actionBarFill    = el.querySelector<HTMLElement>('.stat-bar-fill--action')!
  const actionLevelLabel = el.querySelector<HTMLElement>('.action-level-label')!
  const actionDpsEl      = el.querySelector<HTMLElement>('.stat-bar-regen--action')!
  const actionIconWrap   = el.querySelector<HTMLButtonElement>('.action-icon-btn')!

  function updateStatLevels(): void {
    const lifePct = Math.round(lifeProgress.xp / statXpNeeded(lifeProgress.level) * 100)
    lifeLevelEl.style.setProperty('--xp-pct', `${lifePct}%`)
    lifeLevelEl.querySelector('span')!.textContent = `Lv.${lifeProgress.level}`
    const manaPct = Math.round(manaProgress.xp / statXpNeeded(manaProgress.level) * 100)
    manaLevelEl.style.setProperty('--xp-pct', `${manaPct}%`)
    manaLevelEl.querySelector('span')!.textContent = `Lv.${manaProgress.level}`
  }

  function computeActionDps(): { min: number; max: number } {
    const action = getAction(playerActionId)
    const level = getPlayerLevel(playerActionId)
    let dmg = action.damage * Math.pow(balance.action.damageMult, level - 1) * (1 + (level - 1) * balance.action.damageAddPerLevel)
    let spd = action.speed * (1 + (level - 1) * balance.action.speedBonusPerLevel)
    const b = getActionBonuses()
    dmg *= (1 + b.damageIncrease / 100) * (1 + b.moreDamage / 100)
    spd *= (1 + b.actionSpeedIncrease / 100) * (1 + b.moreActionSpeed / 100)
    if (b.doubleDamageChance > 0) {
      return { min: dmg * spd, max: dmg * 2 * spd }
    }
    return { min: dmg * spd, max: dmg * spd }
  }

  function updateActionBar(): void {
    const prog = actionProgress[playerActionId] ?? { xp: 0, level: 1, maxLevel: 1 }
    const pct = Math.min(100, Math.round(prog.xp / actionXpNeeded(prog.level) * 100))
    actionBarFill.style.width = `${pct}%`
    actionLevelLabel.textContent = `Lv.${prog.level}`
    const { min, max } = computeActionDps()
    actionDpsEl.textContent = min === max
      ? `${min.toFixed(1)}/s`
      : `${min.toFixed(1)}–${max.toFixed(1)}/s`
    refreshRuneDot()
  }

  function updateActionIcon(): void {
    const action = getAction(playerActionId)
    actionIconWrap.innerHTML = `<i data-lucide="${action.icon}" aria-hidden="true"></i><span class="notif-dot rune-notif-dot" hidden></span>`
    createIcons({ icons: { Sword, Crosshair, Flame, Zap } })
    refreshRuneDot()
  }

  let runesModalCleanup: (() => void) | null = null

  function openRunesModal(): void {
    if (runesModalCleanup) { runesModalCleanup(); runesModalCleanup = null }
    const action = getAction(playerActionId)
    const level = actionProgress[playerActionId]?.level ?? 1
    const maxLevel = actionProgress[playerActionId]?.maxLevel ?? 1
    const r = getActionRunes(playerActionId)
    runesModalCleanup = mountRunesModal(
      el,
      playerActionId,
      action.label,
      level,
      maxLevel,
      r,
      (slotIdx, runeId) => { assignRune(playerActionId, slotIdx, runeId) },
      () => { runesModalCleanup = null },
    )
  }

  const enemyCtrlEl         = el.querySelector<HTMLElement>('.enemy-level-ctrl')!
  const enemyLevelDownBtn   = el.querySelector<HTMLButtonElement>('[data-action="enemy-level-down"]')!
  const enemyLevelUpBtn     = el.querySelector<HTMLButtonElement>('[data-action="enemy-level-up"]')!
  const enemyAutoLevelInput = el.querySelector<HTMLInputElement>('.enemy-autolevel-input')!

  function updateEnemyLevelUI(): void {
    const txt = `${enemyProgress.level} / ${enemyProgress.maxLevel}`
    el.querySelectorAll<HTMLElement>('.enemy-level-display').forEach(d => { d.textContent = txt })
    enemyLevelDownBtn.disabled = enemyProgress.level <= 1
    enemyLevelUpBtn.disabled   = enemyProgress.level >= enemyProgress.maxLevel
    enemyAutoLevelInput.checked = enemyProgress.autoLevel
    const xpMax = enemyMaxLevelXpNeeded(enemyProgress.maxLevel)
    enemyXpBarFill.style.width = `${Math.min(100, Math.round(enemyProgress.xp / xpMax * 100))}%`
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
  })

  el.querySelector<HTMLButtonElement>('[data-action="toggle-enemy"]')!
    .addEventListener('click', () => { enemyCtrlEl.classList.toggle('is-open') })

  function awardEnemyXp(amount: number): void {
    runEnemyXp += amount
    enemyProgress.xp += amount
    while (enemyProgress.xp >= enemyMaxLevelXpNeeded(enemyProgress.maxLevel)) {
      enemyProgress.xp -= enemyMaxLevelXpNeeded(enemyProgress.maxLevel)
      enemyProgress.maxLevel++
    }
    updateEnemyLevelUI()
  }

  updateEnemyLevelUI()

  const speedPauseBtn = el.querySelector<HTMLButtonElement>('[data-action="playpause"]')!
  const speedOptBtns = el.querySelectorAll<HTMLButtonElement>('.speed-opt')
  const battleConfigBtn = el.querySelector<HTMLButtonElement>('[data-action="open-config"]')!

  battleConfigBtn.addEventListener('click', () => {
    if (modalCleanup) { modalCleanup(); modalCleanup = null; return }
    const currentId = entityActions.get(playerEntity.id) ?? allActions[0].id as ActionId
    modalCleanup = mountBattleConfigModal(
      container,
      currentId,
      (id) => {
        playerActionId = id
        assignAction(playerEntity, id)
        applyAutoRunes(id)
        updateActionBar()
        updateActionIcon()
        persistState()
      },
      () => { modalCleanup = null },
    )
  })

  // Must be declared before computeLifeRegenPerSec / computeManaRegenPerSec, which are
  // called synchronously in updateBars() during setup — before the buffs block below.
  interface ActiveEffect {
    id: string
    iconName: string
    kind: 'buff' | 'debuff' | 'mixed'
    remainingMs: number
  }
  const activeEffects: ActiveEffect[] = []
  let frenzyCharges = 0

  // ── Movement mastery state ───────────────────────────────────────────────
  let playerAnimLockMs = 0       // ms remaining where player is locked in animation phase
  let dashCharges = 0
  let dashChargeTimerMs = 0
  const DASH_MAX_CHARGES = 1     // soft cap; future key nodes can increase
  const DASH_DURATION_MS = 100   // 0.1s
  const DASH_SPEED_MULT = 10     // covers 1s of distance in 0.1s
  let dashRemainingMs = 0
  let dashMoveX = 0
  let dashMoveY = 0
  let playerIsKiting = false

  function computeLifeRegenPerSec(): number {
    const lb = getLifeBonuses()
    const frenzyBonus = hasEffect('feedingFrenzy') ? balance.buffs.feedingFrenzyRegenBonus : 0
    return playerEntity.maxLife * (balance.player.regenRate + lb.regenFractionBonus)
      * (1 + (lb.regenIncrease + frenzyBonus) / 100)
  }

  function computeManaRegenPerSec(): number {
    const frenzyBonus = hasEffect('feedingFrenzy') ? balance.buffs.feedingFrenzyRegenBonus : 0
    return playerEntity.maxMana * balance.player.regenRate
      * (1 + (getManaBonuses().regenIncrease + frenzyBonus) / 100)
  }

  function applyLifeSteal(hitDamage: number): void {
    if (playerDead) return
    const lb = getLifeBonuses()
    if (lb.lifeStealPercent <= 0) return
    const frenzyStealBonus = hasEffect('feedingFrenzy') ? balance.buffs.feedingFrenzyStealBonus : 0
    const stealRaw = hitDamage * (lb.lifeStealPercent / 100)
      * (1 + (lb.lifeStealIncrease + frenzyStealBonus) / 100)
    const cap = playerEntity.maxLife * 0.01 * (1 + lb.lifeStealCapIncrease / 100)
    const stolen = Math.min(stealRaw, cap)
    if (stolen <= 0) return
    const before = playerEntity.currentLife
    playerEntity.currentLife = Math.min(playerEntity.maxLife, before + stolen)
    const healed = playerEntity.currentLife - before
    if (healed > 0) {
      spawnHealNumber(playerEntity.x, playerEntity.y - playerEntity.radius - 8, healed)
    }
    if (lb.feedingFrenzyChance > 0 && Math.random() * 100 < lb.feedingFrenzyChance) {
      applyEffect({ id: 'feedingFrenzy', iconName: 'drumstick', kind: 'buff' }, balance.buffs.feedingFrenzyDurationMs)
    }
  }

  function applyManaSteal(hitDamage: number): void {
    if (playerDead) return
    const mb = getManaBonuses()
    if (mb.manaStealPercent <= 0) return
    const frenzyStealBonus = hasEffect('feedingFrenzy') ? balance.buffs.feedingFrenzyStealBonus : 0
    const stealRaw = hitDamage * (mb.manaStealPercent / 100)
      * (1 + (mb.manaStealIncrease + frenzyStealBonus) / 100)
    const cap = playerEntity.maxMana * 0.01 * (1 + mb.manaStealCapIncrease / 100)
    const stolen = Math.min(stealRaw, cap)
    if (stolen <= 0) return
    playerEntity.currentMana = Math.min(playerEntity.maxMana, playerEntity.currentMana + stolen)
    if (mb.feedingFrenzyChance > 0 && Math.random() * 100 < mb.feedingFrenzyChance) {
      applyEffect({ id: 'feedingFrenzy', iconName: 'drumstick', kind: 'buff' }, balance.buffs.feedingFrenzyDurationMs)
    }
  }

  function updateBars(): void {
    lifeFill.style.width = `${(playerEntity.currentLife / playerEntity.maxLife) * 100}%`
    manaFill.style.width = `${(playerEntity.currentMana / playerEntity.maxMana) * 100}%`
    lifeLabel.textContent = `${Math.round(playerEntity.currentLife)} / ${Math.round(playerEntity.maxLife)}`
    manaLabel.textContent = `${Math.round(playerEntity.currentMana)} / ${Math.round(playerEntity.maxMana)}`
    lifeRegenEl.textContent = `+${computeLifeRegenPerSec().toFixed(1)}/s`
    manaRegenEl.textContent = `+${computeManaRegenPerSec().toFixed(1)}/s`
  }

  updateBars()
  updateStatLevels()
  updateActionBar()
  updateActionIcon()

  // ── Regen ───────────────────────────────────────────────────────────────

  let regenTimer: ReturnType<typeof setInterval> | null = null

  const REGEN_INTERVAL_MS = 100
  const REGEN_TICK = REGEN_INTERVAL_MS / 1000  // fraction of per-second rate per tick

  function startRegen(): void {
    if (regenTimer !== null) return
    regenTimer = setInterval(() => {
      if (playerDead) return
      const lb = getLifeBonuses()
      const frenzyBonus = hasEffect('feedingFrenzy') ? balance.buffs.feedingFrenzyRegenBonus : 0
      const lifeRegenBase = playerEntity.maxLife * (balance.player.regenRate + lb.regenFractionBonus)
      const lifeRegenMult = 1 + (lb.regenIncrease + frenzyBonus) / 100
      playerEntity.currentLife = Math.min(playerEntity.maxLife, playerEntity.currentLife + lifeRegenBase * lifeRegenMult * gameSpeed * REGEN_TICK)
      const manaRegenMult = 1 + (getManaBonuses().regenIncrease + frenzyBonus) / 100
      playerEntity.currentMana = Math.min(playerEntity.maxMana, playerEntity.currentMana + playerEntity.maxMana * balance.player.regenRate * manaRegenMult * gameSpeed * REGEN_TICK)
      updateBars()
    }, REGEN_INTERVAL_MS)
  }

  function stopRegen(): void {
    if (regenTimer !== null) {
      clearInterval(regenTimer)
      regenTimer = null
    }
  }

  // ── Buffs / Debuffs ──────────────────────────────────────────────────────
  // Game-time-scaled durations: tickEffects() runs each frame with deltaMS so
  // pause/speed work naturally. Display order: buffs (oldest first), then debuffs.
  // (ActiveEffect interface + activeEffects array declared above updateBars() to avoid TDZ.)

  const buffBarEl = el.querySelector<HTMLElement>('.buff-bar')!

  function applyEffect(template: Omit<ActiveEffect, 'remainingMs'>, durationMs: number): void {
    const existing = activeEffects.find(e => e.id === template.id)
    if (existing) {
      existing.remainingMs = durationMs
    } else {
      activeEffects.push({ ...template, remainingMs: durationMs })
      renderBuffBar()
    }
  }

  function applyFrenzy(): void {
    const sb = getStrikeBonuses()
    const maxCharges = balance.buffs.frenzyMaxCharges + sb.frenzyMaxChargesBonus
    if (frenzyCharges < maxCharges) frenzyCharges++
    const durationMs = balance.buffs.frenzyDurationMs * (1 + sb.frenzyDurationIncrease / 100)
    applyEffect({ id: 'frenzy', iconName: 'swords', kind: 'buff' }, durationMs)
    renderBuffBar()
  }

  function applyBloodlust(): void {
    const pb = getPhysicalBonuses()
    const durationMs = balance.buffs.bloodlustDurationMs * (1 + pb.bloodlustDurationIncrease / 100)
    applyEffect({ id: 'bloodlust', iconName: 'droplets', kind: 'buff' }, durationMs)
  }

  function applyElectrified(): void {
    const lb = getLightningBonuses()
    const durationMs = balance.buffs.electrifiedDurationMs * (1 + lb.electrifyDurationIncrease / 100)
    applyEffect({ id: 'electrified', iconName: 'zap', kind: 'buff' }, durationMs)
  }

  function tickEffects(deltaMs: number): void {
    if (activeEffects.length === 0) return
    let removed = false
    for (let i = activeEffects.length - 1; i >= 0; i--) {
      activeEffects[i].remainingMs -= deltaMs
      if (activeEffects[i].remainingMs <= 0) {
        activeEffects.splice(i, 1)
        removed = true
      }
    }
    if (removed) renderBuffBar()
  }

  function hasEffect(id: string): boolean {
    return activeEffects.some(e => e.id === id)
  }

  function renderBuffBar(): void {
    const ordered = [
      ...activeEffects.filter(e => e.kind === 'buff'),
      ...activeEffects.filter(e => e.kind === 'mixed'),
      ...activeEffects.filter(e => e.kind === 'debuff'),
    ]
    buffBarEl.innerHTML = ordered.map(e => {
      const badge = e.id === 'frenzy' && frenzyCharges > 0
        ? `<span class="buff-charge">${frenzyCharges}</span>`
        : ''
      return `<div class="buff-icon buff-icon--${e.kind}" data-effect="${e.id}"><i data-lucide="${e.iconName}" aria-hidden="true"></i>${badge}</div>`
    }).join('')
    if (ordered.length > 0) createIcons({ icons: { Book, Flame, Drumstick, Swords, Droplets, Zap } })
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
    if (!playerDead) persistState()
  }, SAVE_INTERVAL_MS)

  function saveAndGoHome(): void {
    if (!playerDead) persistState()
    navigate('menu')
  }

  el.querySelector<HTMLButtonElement>('[data-action="go-home"]')!
    .addEventListener('click', () => saveAndGoHome())

  el.querySelector<HTMLButtonElement>('[data-action="die"]')!
    .addEventListener('click', () => {
      playerEntity.currentLife = 0
      killEntity(playerEntity)
    })

  // ── PixiJS ──────────────────────────────────────────────────────────────

  let app: Application | null = null
  let floorContainer: Container | null = null
  let wallContainer: Container | null = null
  let floorOptions:       { tex: Texture; w: number }[] = []
  let largeObstOptions:   { tex: Texture; w: number }[] = []
  let smallFillerOptions: { tex: Texture; w: number }[] = []
  const entityTextures = new Map<string, Texture>()
  const floorSprites: Sprite[] = []
  const wallSprites: Sprite[] = []
  let destroyed = false
  let modalCleanup: (() => void) | null = null

  const entityContainers = new Map<string, Container>()
  const lifeBarGraphics = new Map<string, Graphics>()
  const actionCooldowns = new Map<string, number>()
  type MultiActionType = 'doubleAction' | 'additionalTarget' | 'additionalProjectile' | 'splitAction' | 'jump' | 'tremor'
  interface PendingMultiAction {
    type:                   MultiActionType
    inheritedDamageMult:    number   // accumulated ×0.9^depth × parent ownMult
    target?:                Entity   // pre-selected target (additionalTarget / additionalProjectile / jump / tremor)
    isChainProjectile?:     boolean  // second additional projectile from extraDoubleRoll; cannot chain further
    guaranteedAfflictions?: boolean  // inherited from a doubleCast root when Cast Speed node 11 is active
    jumpedTargetIds?:       Set<string> // enemies already hit in the current jump chain
  }
  const MULTI_ACTION_PRIORITY: Record<MultiActionType, number> = {
    doubleAction: 0, additionalTarget: 1, additionalProjectile: 2, splitAction: 3, jump: 4, tremor: 5,
  }
  const MULTI_ACTION_COOLDOWN_DIV: Record<MultiActionType, number> = {
    doubleAction: 10, additionalTarget: 10, additionalProjectile: 10, splitAction: 10, jump: 10, tremor: 10,
  }
  // Cap the per-entity multi-action queue at the cooldown divisor — i.e. the number
  // of multi-action ticks that fit inside one primary cooldown. Without this, actions
  // with many overlapping multi-action sources (e.g. bolt: doubleAction + additionalTarget
  // + additionalProjectile + splitAction + jump, all at once, with chain-rerolls enabled)
  // can spawn children faster than they drain, growing the queue without bound.
  const MAX_MULTI_QUEUE = Math.max(...Object.values(MULTI_ACTION_COOLDOWN_DIV))
  const pendingMultiActions = new Map<string, PendingMultiAction[]>()

  interface PendingHit {
    attacker:              Entity
    target:                Entity
    damage:                number
    action:                ActionDef
    actionId:              ActionId
    countdown:             number   // ms remaining until impact
    guaranteedAfflictions: boolean
    multiActionType?:      MultiActionType
  }
  const pendingHits = new Map<string, PendingHit>()  // keyed by unique hit id (entity.id:seq)
  let hitSeq = 0

  const DPS_WINDOW_MS = 20_000
  type DpsKind = 'direct' | `multi:${MultiActionType}` | 'affliction:burn' | 'affliction:bleed' | 'affliction:groundFire'
  interface DpsEvent { t: number; actionId: ActionId; dmg: number; kind: DpsKind }
  const dpsLog: DpsEvent[] = []
  function recordDps(actionId: ActionId, dmg: number, kind: DpsKind): void {
    dpsLog.push({ t: Date.now(), actionId, dmg, kind })
  }
  function fmtDps(n: number): string {
    const f = (x: number) => x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2)
    if (n >= 1e9) return f(n / 1e9) + 'b'
    if (n >= 1e6) return f(n / 1e6) + 'm'
    if (n >= 1e3) return f(n / 1e3) + 'k'
    return f(n)
  }
  function computeDps(): Map<ActionId, Map<string, number>> {
    const cutoff = Date.now() - DPS_WINDOW_MS
    while (dpsLog.length > 0 && dpsLog[0].t < cutoff) dpsLog.shift()
    const out = new Map<ActionId, Map<string, number>>()
    for (const e of dpsLog) {
      let byKind = out.get(e.actionId)
      if (!byKind) { byKind = new Map(); out.set(e.actionId, byKind) }
      byKind.set(e.kind, (byKind.get(e.kind) ?? 0) + e.dmg / (DPS_WINDOW_MS / 1000))
    }
    return out
  }
  const strongEntities = new Set<string>()    // strong-or-elite enemies (elite is a subset)
  const eliteEntities = new Set<string>()
  const highResistEntities = new Set<string>() // enemies with physRot or ele resist ≥ threshold

  function tierXpMult(entityId: string): number {
    if (eliteEntities.has(entityId)) return balance.enemyVariance.eliteXpMultiplier
    if (strongEntities.has(entityId)) return balance.enemyVariance.strongXpMultiplier
    return 1
  }
  const enemyLevels = new Map<string, number>()  // enemy entity id → enemy level at spawn time
  const deathFragments: DeathFragment[] = []
  const vfxList: Vfx[] = []

  interface EntityPath {
    waypoints: { tx: number; ty: number }[]
    waypointIdx: number
    targetTileKey: string
    entityTileKey: string
    lastUpdateTime: number
  }
  const entityPaths = new Map<string, EntityPath>()

  el.querySelector<HTMLButtonElement>('[data-action="open-mastery"]')!
    .addEventListener('click', () => {
      if (modalCleanup) { modalCleanup(); modalCleanup = null; return }
      modalCleanup = mountMasteryModal(
        container,
        masteryProgress,
        () => { modalCleanup = null },
        (id, treeIdx, nodeIdx) => { assignMasteryNode(id, treeIdx, nodeIdx) },
        id => { resetMasteryPoints(id) },
        computeMasteryGains,
        balance.mastery.levelsPerRebirth,
      )
    })

  actionIconWrap.addEventListener('click', () => { openRunesModal() })

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
      bar.fill({ color: 0xdd2222 })
    }
  }

  function enemySpriteKey(action: ActionDef): 'fireball' | 'zap' | 'bow' | 'sword' {
    const elemental = action.tags.some(tag => tag === 'fire' || tag === 'cold' || tag === 'lightning')
    const ranged = action.range > 4
    if (elemental) return ranged ? 'fireball' : 'zap'
    return ranged ? 'bow' : 'sword'
  }

  function initEntityDisplay(entity: Entity): void {
    if (!app || entityContainers.has(entity.id)) return
    const c = new Container()
    let texKey: string
    if (entity.role === 'player') {
      texKey = 'player'
    } else {
      const actionId = entityActions.get(entity.id) ?? 'sword' as ActionId
      texKey = enemySpriteKey(getAction(actionId as ActionId))
    }
    const tex = entityTextures.get(texKey)
    if (tex) {
      const s = new Sprite(tex)
      s.anchor.set(0.5)
      s.roundPixels = true
      const size = entity.radius * 2
      s.width = size
      s.height = size
      c.addChild(s)
    }
    if (entity.role !== 'player') {
      const bar = new Graphics()
      bar.position.set(0, -(entity.radius + HP_BAR_GAP + HP_BAR_H))
      c.addChild(bar)
      lifeBarGraphics.set(entity.id, bar)
      drawLifeBar(entity)
      if (strongEntities.has(entity.id)) {
        const diamond = new Graphics()
        diamond.poly([0, -6, 6, 0, 0, 6, -6, 0])
        diamond.fill({ color: eliteEntities.has(entity.id) ? 0xaa44ff : 0x4499ff })
        diamond.position.set(0, -(entity.radius + HP_BAR_GAP + HP_BAR_H + 11))
        c.addChild(diamond)
      }
      if (highResistEntities.has(entity.id)) {
        const shield = new Graphics()
        shield.poly([0, -6, 5, -3, 5, 2, 0, 6, -5, 2, -5, -3])
        shield.fill({ color: 0xffffff })
        const barW = entity.radius * 2
        shield.position.set(barW / 2, -(entity.radius + HP_BAR_GAP + HP_BAR_H + 11))
        c.addChild(shield)
      }
    }
    c.position.set(entity.x, entity.y)
    app.stage.addChild(c)
    entityContainers.set(entity.id, c)
  }

  function countBlockedNeighbors(tx: number, ty: number): number {
    let n = 0
    if (blockedTiles.has(`${tx + 1},${ty}`)) n++
    if (blockedTiles.has(`${tx - 1},${ty}`)) n++
    if (blockedTiles.has(`${tx},${ty + 1}`)) n++
    if (blockedTiles.has(`${tx},${ty - 1}`)) n++
    return n
  }

  function drawGrid(): void {
    if (!app) return
    const { width, height } = app.screen
    const gs = balance.world.gridSize
    // Divide by zoom so the visible-world rectangle grows when zoomed out;
    // multiply by 1.5 to render 50% beyond the visible screen edge.
    const halfW = (width  / zoomLevel) / 2 * 1.5
    const halfH = ((height - HUD_HEIGHT) / zoomLevel) / 2 * 1.5
    const left   = playerEntity.x - halfW - gs
    const right  = playerEntity.x + halfW + gs
    const top    = playerEntity.y - halfH - gs
    const bottom = playerEntity.y + halfH + gs

    // Tilemap sprites — floor under every tile, obstacle on top of blocked ones.
    const tStartX = Math.floor(left  / gs)
    const tStartY = Math.floor(top   / gs)
    const tEndX   = Math.ceil(right  / gs)
    const tEndY   = Math.ceil(bottom / gs)
    let floorIdx = 0
    let wallIdx = 0
    if (floorContainer && wallContainer && floorOptions.length && largeObstOptions.length) {
      for (let ty = tStartY; ty <= tEndY; ty++) {
        for (let tx = tStartX; tx <= tEndX; tx++) {
          const fSprite = floorSprites[floorIdx] ?? (() => {
            const s = new Sprite()
            s.roundPixels = true
            floorContainer!.addChild(s)
            floorSprites.push(s)
            return s
          })()
          fSprite.texture = pickWeighted(tx, ty, floorOptions)
          fSprite.x = Math.round(tx * gs)
          fSprite.y = Math.round(ty * gs)
          fSprite.width = gs + 1
          fSprite.height = gs + 1
          fSprite.visible = true
          floorIdx++

          if (blockedTiles.has(`${tx},${ty}`)) {
            const isLarge = countBlockedNeighbors(tx, ty) >= 1
            const opts = isLarge ? largeObstOptions : smallFillerOptions
            const wSprite = wallSprites[wallIdx] ?? (() => {
              const s = new Sprite()
              s.roundPixels = true
              wallContainer!.addChild(s)
              wallSprites.push(s)
              return s
            })()
            wSprite.texture = pickWeighted(tx, ty, opts)
            wSprite.x = Math.round(tx * gs)
            wSprite.y = Math.round(ty * gs)
            wSprite.width = gs + 1
            wSprite.height = gs + 1
            wSprite.visible = true
            wallIdx++
          }
        }
      }
      for (let i = floorIdx; i < floorSprites.length; i++) floorSprites[i].visible = false
      for (let i = wallIdx;  i < wallSprites.length;  i++) wallSprites[i].visible = false
    }
  }

  function updateCamera(): void {
    if (!app) return
    const { width, height } = app.screen
    app.stage.scale.set(zoomLevel)
    app.stage.position.set(
      width / 2 - playerEntity.x * zoomLevel,
      (height - HUD_HEIGHT) / 2 - playerEntity.y * zoomLevel,
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
    actionCooldowns.delete(entity.id)
    pendingMultiActions.delete(entity.id)
    strongEntities.delete(entity.id)
    eliteEntities.delete(entity.id)
    highResistEntities.delete(entity.id)
    enemyLevels.delete(entity.id)
    entityActions.delete(entity.id)
    entityPaths.delete(entity.id)
    burnStacks.delete(entity.id)
    burnAccum.delete(entity.id)
    bleedStacks.delete(entity.id)
    bleedAccum.delete(entity.id)
    electrocuteStacks.delete(entity.id)
    electrocuteGraphics.delete(entity.id)  // container.destroy() already destroyed the child
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
    if (runesModalCleanup) { runesModalCleanup(); runesModalCleanup = null }

    // Snapshot rune selections into history; reset selections and re-enable auto-apply
    for (const id of Object.keys(actionRunes)) {
      const r = actionRunes[id]
      if (!r) continue
      const newHistory = r.selected.filter((x): x is RuneId => x !== null)
      actionRunes[id] = { selected: [null, null, null, null, null, null], history: newHistory, autoApply: true }
    }

    // Action XP reset; maxLevel persists so prestige multiplier carries forward
    for (const id of Object.keys(actionProgress)) {
      const { maxLevel } = actionProgress[id]
      actionProgress[id] = { xp: 0, level: 1, maxLevel }
    }

    // Life/mana levels reset; maxLife/maxMana return to base (mastery bonuses still apply)
    lifeProgress = { xp: 0, level: 1 }
    manaProgress = { xp: 0, level: 1 }
    playerEntity.maxLife = computePlayerMaxLife()
    playerEntity.maxMana = computePlayerMaxMana()

    // Enemy: max level and auto-level persist; selected level resets so auto can climb back wave-by-wave
    enemyProgress = { ...enemyProgress, level: 1 }
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
    lastWaveAngle = null

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
    updateActionBar()
    updateActionIcon()

    // Reset per-rebirth trackers
    runActionXp = {}
    runLifeXp = 0
    runManaXp = 0
    runEnemyXp = 0
    runDistancePx = 0
    dpsLog.length = 0
    playerPrevX = playerEntity.x
    playerPrevY = playerEntity.y

    runSnapshot = captureRunSnapshot()
    persistState()
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
        const prog = masteryProgress[m.id] ?? { xp: 0, level: 1, nodes: defaultMasteryNodes() }
        const pv = previewMasteryGain(prog.xp, prog.level, xpGain, prog.level + balance.mastery.levelsPerRebirth)
        return `
          <div class="mastery-row">
            ${renderMasteryBar(pv.oldPct, pv.gainPct)}
            <span class="mastery-label">${escapeHtml(m.label)}</span>
            <span class="mastery-level${pv.levelsGained > 0 ? ' mastery-level--gain' : ''}">Lv.${pv.toLv}</span>
            ${pv.levelsGained > 0 ? `<span class="mastery-gain-badge">+${pv.levelsGained}</span>` : ''}
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
        <div class="death-modal-scroll">
          ${summaryHtml}
          ${masterySummaryHtml}
        </div>
        <div class="modal-actions">
          <button class="modal-btn modal-btn--primary" data-action="rebirth">${t('game', 'deathRebirth')}</button>
        </div>
      </div>
    `
    backdrop.querySelector<HTMLButtonElement>('[data-action="rebirth"]')!
      .addEventListener('click', () => { applyMasteryGains(pendingGains); backdrop.remove(); rebirth() })
    container.appendChild(backdrop)
    return () => backdrop.remove()
  }

  // ── Mastery ──────────────────────────────────────────────────────────────

  function computeMasteryGains(): Array<{ id: MasteryId; xpGain: number }> {
    const gainMap = new Map<MasteryId, number>()
    let totalActionXp = 0
    for (const [actionId, xp] of Object.entries(runActionXp)) {
      if (xp <= 0) continue
      totalActionXp += xp
      const def = getAction(actionId as ActionId)
      for (const tag of def.tags) {
        const mastery = allMasteries.find(m => m.tag === tag)
        if (mastery) gainMap.set(mastery.id, (gainMap.get(mastery.id) ?? 0) + xp * balance.mastery.actionXpMultiplier)
      }
    }
    if (totalActionXp > 0) gainMap.set('action', totalActionXp * balance.mastery.actionXpMultiplier)
    if (runLifeXp > 0) gainMap.set('life', runLifeXp)
    if (runManaXp > 0) gainMap.set('mana', runManaXp)
    const movementXp = Math.floor(runDistancePx / 50)
    if (movementXp > 0) gainMap.set('movement', movementXp)
    return Array.from(gainMap.entries()).map(([id, xpGain]) => ({ id, xpGain }))
  }

  function applyMasteryGains(gains: Array<{ id: MasteryId; xpGain: number }>): void {
    for (const { id, xpGain } of gains) {
      const existing = masteryProgress[id]
      const nodes = existing?.nodes ?? defaultMasteryNodes()
      const { xp, level } = existing ?? { xp: 0, level: 1, nodes: defaultMasteryNodes() }
      const preview = previewMasteryGain(xp, level, xpGain, level + balance.mastery.levelsPerRebirth)
      masteryProgress[id] = { xp: preview.newXp, level: preview.toLv, nodes }
    }
    // Enemy mastery level = max enemy level reached (not XP-based; no partial level)
    const existingEnemy = masteryProgress['enemy']
    const newEnemyLevel = enemyProgress.maxLevel
    if (!existingEnemy || newEnemyLevel > existingEnemy.level) {
      masteryProgress['enemy'] = {
        xp: 0,
        level: newEnemyLevel,
        nodes: existingEnemy?.nodes ?? defaultMasteryNodes(),
      }
    }
    refreshMasteryDot()
  }

  function refreshMasteryDot(): void {
    const dot = el.querySelector<HTMLElement>('.mastery-notif-dot')
    if (!dot) return
    const hasUnspent = allMasteries.some(m => {
      const p = masteryProgress[m.id]
      return p ? masteryPointsAvailable(p) > 0 : false
    })
    dot.hidden = !hasUnspent
  }

  function assignMasteryNode(id: MasteryId, treeIdx: number, nodeIdx: number): void {
    const existing = masteryProgress[id]
    if (!existing) return
    const nodes = existing.nodes.map(t => [...t])
    if (!nodes[treeIdx].includes(nodeIdx)) nodes[treeIdx].push(nodeIdx)
    masteryProgress[id] = { ...existing, nodes }
    if (id === 'action' || (['projectile', 'strike', 'lightning', 'fire', 'physical'].includes(id) && getAction(playerActionId).tags.includes(id as unknown as ActionTag))) {
      assignAction(playerEntity, playerActionId)
    }
    if (id === 'life') {
      playerEntity.maxLife = computePlayerMaxLife()
    }
    if (id === 'mana') {
      playerEntity.maxMana = computePlayerMaxMana()
      // moreMaxLife (Maximum Mana node 11) and actionSpeedIncrease affect life/action stats too
      playerEntity.maxLife = computePlayerMaxLife()
      assignAction(playerEntity, playerActionId)
    }
    persistState()
    refreshMasteryDot()
  }

  // Spend one mastery level to clear all assigned nodes and refund the rest.
  // Net cost: -1 level (and the XP toward the next level resets to 0).
  function resetMasteryPoints(id: MasteryId): void {
    const existing = masteryProgress[id]
    if (!existing || existing.level <= 1) return
    masteryProgress[id] = {
      xp: 0,
      level: existing.level - 1,
      nodes: defaultMasteryNodes(),
    }
    if (id === 'action' || (['projectile', 'strike', 'lightning', 'fire', 'physical'].includes(id) && getAction(playerActionId).tags.includes(id as unknown as ActionTag))) {
      assignAction(playerEntity, playerActionId)
    }
    if (id === 'life') {
      playerEntity.maxLife = computePlayerMaxLife()
    }
    if (id === 'mana') {
      playerEntity.maxMana = computePlayerMaxMana()
      playerEntity.maxLife = computePlayerMaxLife()
      assignAction(playerEntity, playerActionId)
    }
    persistState()
    refreshMasteryDot()
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

  // Finds the next jump target from `fromTarget`'s position.
  // Prefers the closest enemy not yet in the jump chain; falls back to any
  // in-range enemy (excluding fromTarget itself) if all nearby have been jumped.
  function selectJumpTarget(fromTarget: Entity, jumpedIds: Set<string>, range: number): Entity | null {
    let bestPref: Entity | null = null, bestPrefDist = Infinity
    let bestFall: Entity | null = null, bestFallDist = Infinity
    for (const e of entities) {
      if (e.role !== 'enemy' || e === fromTarget) continue
      const dx = e.x - fromTarget.x, dy = e.y - fromTarget.y
      const dist = Math.sqrt(dx * dx + dy * dy) - e.radius
      if (dist > range) continue
      if (!jumpedIds.has(e.id)) {
        if (dist < bestPrefDist) { bestPrefDist = dist; bestPref = e }
      } else {
        if (dist < bestFallDist) { bestFallDist = dist; bestFall = e }
      }
    }
    return bestPref ?? bestFall
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

    if (enemyProgress.autoLevel && enemyProgress.level < enemyProgress.maxLevel) {
      enemyProgress.level++
      updateEnemyLevelUI()
    }

    const eb = getEnemyBonuses()

    // Guaranteed: 1 at level 1, +1 every 3 levels, plus any mastery flat bonus
    let count = 1 + Math.floor(enemyProgress.level / 3) + eb.guaranteedExtra
    const ext1Chance = Math.min(1, balance.wave.extraOneChance + eb.extraOneChance / 100)
    const ext2Chance = Math.min(1, balance.wave.extraTwoChance + eb.extraTwoChance / 100)
    if (Math.random() < ext1Chance) count++
    if (Math.random() < ext2Chance) count += 2

    // Determine tier per spawn (random rolls), then enforce minimum guarantees
    type Tier = 'normal' | 'strong' | 'elite'
    const ev = balance.enemyVariance
    const strongRoll = Math.min(1, ev.strongChance + eb.strongChance / 100)
    const eliteRoll = Math.min(1, ev.eliteChance + eb.eliteChance / 100)
    const tiers: Tier[] = []
    for (let i = 0; i < count; i++) {
      if (Math.random() < strongRoll) {
        tiers.push(Math.random() < eliteRoll ? 'elite' : 'strong')
      } else {
        tiers.push('normal')
      }
    }
    // Promote to satisfy minimum elite guarantees first (prefer upgrading existing strongs)
    let curElites = tiers.filter(t => t === 'elite').length
    while (curElites < eb.minEliteCount) {
      let idx = tiers.indexOf('strong')
      if (idx < 0) idx = tiers.indexOf('normal')
      if (idx < 0) break
      tiers[idx] = 'elite'
      curElites++
    }
    // Then promote normals to strong to satisfy minStrongCount (counts strong-or-elite)
    let curStrongs = tiers.filter(t => t !== 'normal').length
    while (curStrongs < eb.minStrongCount) {
      const idx = tiers.indexOf('normal')
      if (idx < 0) break
      tiers[idx] = 'strong'
      curStrongs++
    }

    const halfW = app.screen.width / 2
    const halfH = (app.screen.height - HUD_HEIGHT) / 2
    const clusterAngle = lastWaveAngle === null
      ? Math.random() * Math.PI * 2
      : lastWaveAngle + gaussian() * balance.wave.directionStdDev
    lastWaveAngle = clusterAngle

    for (let i = 0; i < count; i++) {
      const tier = tiers[i]
      const angle = clusterAngle + (Math.random() - 0.5) * balance.wave.clusterSpread
      const cosA = Math.abs(Math.cos(angle))
      const sinA = Math.abs(Math.sin(angle))
      const edgeDist = Math.min(halfW / (cosA || 0.001), halfH / (sinA || 0.001))
      const dist = edgeDist + balance.wave.spawnMargin + Math.random() * balance.wave.spawnDepthVariance

      // Find a free spawn position — retry with random angles if blocked
      let spawnX = playerEntity.x + Math.cos(angle) * dist
      let spawnY = playerEntity.y + Math.sin(angle) * dist
      for (let attempt = 0; attempt < 8 && isTileBlocked(spawnX, spawnY); attempt++) {
        const a = Math.random() * Math.PI * 2
        spawnX = playerEntity.x + Math.cos(a) * dist
        spawnY = playerEntity.y + Math.sin(a) * dist
      }
      if (isTileBlocked(spawnX, spawnY)) continue

      const damageScale = enemyDamageScale()
      const lifeScale = enemyLifeScale()
      let lifeMult: number, dmgMult: number
      if (tier === 'elite') {
        lifeMult = ev.eliteLifeMin   + Math.random() * (ev.eliteLifeMax   - ev.eliteLifeMin)
        dmgMult  = ev.eliteDamageMin + Math.random() * (ev.eliteDamageMax - ev.eliteDamageMin)
      } else if (tier === 'strong') {
        lifeMult = ev.strongLifeMin  + Math.random() * (ev.strongLifeMax  - ev.strongLifeMin)
        dmgMult  = ev.strongDamageMin + Math.random() * (ev.strongDamageMax - ev.strongDamageMin)
      } else {
        lifeMult = ev.lifeMin   + Math.random() * (ev.lifeMax   - ev.lifeMin)
        dmgMult  = ev.damageMin + Math.random() * (ev.damageMax - ev.damageMin)
      }

      const speedScale = 1 + balance.enemyLevel.speedAddPerLevel * (enemyProgress.level - 1)
      const moveSpeedMult = tier === 'elite' ? ev.eliteSpeedMult : 1
      const enemy = createEnemyEntity(
        `enemy-${++enemyIdCounter}`,
        spawnX, spawnY,
        'enemyA',
        balance.enemyA.radius,
        { moveSpeed: balance.enemyA.moveSpeed * speedScale * moveSpeedMult, maxLife: Math.round(balance.enemyA.maxLife * lifeScale * lifeMult) },
      )
      assignAction(enemy, randomAction().id as ActionId)
      enemy.actionDamage *= damageScale * balance.enemyA.damageMultiplier * dmgMult
      const rMin = tier === 'elite' ? ev.eliteResistMin : tier === 'strong' ? ev.strongResistMin : ev.normalResistMin
      const rMax = tier === 'elite' ? ev.eliteResistMax : tier === 'strong' ? ev.strongResistMax : ev.normalResistMax
      enemy.physRotResist = Math.round(rMin + Math.random() * (rMax - rMin))
      enemy.eleResist     = Math.round(rMin + Math.random() * (rMax - rMin))
      if (enemy.physRotResist >= ev.highResistThreshold || enemy.eleResist >= ev.highResistThreshold) {
        highResistEntities.add(enemy.id)
      }
      if (tier === 'elite') {
        enemy.actionSpeed *= ev.eliteSpeedMult
        strongEntities.add(enemy.id)
        eliteEntities.add(enemy.id)
      } else if (tier === 'strong') {
        enemy.actionSpeed *= ev.strongSpeedMult
        strongEntities.add(enemy.id)
      }
      enemyLevels.set(enemy.id, enemyProgress.level)
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

  // Pre-hit VFX: spawned at attack-start, plays until damage lands (1/3 of cycle).
  // Each action has a natural duration; if it's less than preHitDuration the animation
  // starts late (startFraction > 0) so it completes right at impact.
  function spawnPreHitVfx(attacker: Entity, target: Entity, action: ActionDef, preHitDuration: number): void {
    const ax = attacker.x, ay = attacker.y
    const tx = target.x, ty = target.y
    const baseAng = Math.atan2(ty - ay, tx - ax)

    if (action.id === 'sword') {
      // Natural duration 100 ms — starts late so the arc completes right at impact.
      const naturalMs = 100
      const startFraction = Math.max(0, 1 - naturalMs / preHitDuration)
      addVfx(preHitDuration, (g, p) => {
        g.clear()
        if (p < startFraction) return
        const lp = (p - startFraction) / (1 - startFraction)  // local 0→1
        // Windup arc sweeping from perpendicular to pointing at target.
        const ang = baseAng - Math.PI * 0.5 * (1 - lp)
        const len = attacker.radius * (1.0 + lp * 0.8)
        g.moveTo(ax, ay)
        g.lineTo(ax + Math.cos(ang) * len, ay + Math.sin(ang) * len)
        g.stroke({ color: 0xffffff, width: Math.max(0.5, 3 * lp), alpha: lp * 0.7 })
      })
    } else if (action.id === 'bow') {
      // Arrow in flight — fills the full pre-hit window.
      const cos = Math.cos(baseAng), sin = Math.sin(baseAng)
      addVfx(preHitDuration, (g, p) => {
        g.clear()
        const cx = ax + (tx - ax) * p
        const cy = ay + (ty - ay) * p
        const trailLen = 60
        g.moveTo(cx - cos * trailLen, cy - sin * trailLen)
        g.lineTo(cx, cy)
        g.stroke({ color: 0xfff0aa, width: 6, alpha: 0.35 })
        g.moveTo(cx - cos * (trailLen * 0.6), cy - sin * (trailLen * 0.6))
        g.lineTo(cx, cy)
        g.stroke({ color: 0xffee66, width: 3, alpha: 0.7 })
        g.moveTo(cx - cos * 14, cy - sin * 14)
        g.lineTo(cx, cy)
        g.stroke({ color: 0xffffff, width: 2.5 })
        g.moveTo(cx, cy)
        g.lineTo(cx - cos * 6 + sin * 4, cy - sin * 6 - cos * 4)
        g.lineTo(cx - cos * 6 - sin * 4, cy - sin * 6 + cos * 4)
        g.closePath()
        g.fill({ color: 0xffffff })
      })
    } else if (action.id === 'fireball') {
      // Fireball in flight — fills the full pre-hit window.
      const cos = Math.cos(baseAng), sin = Math.sin(baseAng)
      addVfx(preHitDuration, (g, p) => {
        g.clear()
        const cx = ax + (tx - ax) * p
        const cy = ay + (ty - ay) * p
        const pulse = 1 + 0.12 * Math.sin(p * 40)
        const tr = target.radius
        for (let i = 0; i < 5; i++) {
          const back = (i + 1) * 12
          const trad = tr * (0.7 - i * 0.1)
          g.circle(cx - cos * back, cy - sin * back, trad)
          g.fill({ color: i < 2 ? 0xff6600 : 0x553322, alpha: 0.5 - i * 0.08 })
        }
        g.circle(cx, cy, tr * 1.2 * pulse)
        g.fill({ color: 0xff3300, alpha: 0.45 })
        g.circle(cx, cy, tr * 0.85 * pulse)
        g.fill({ color: 0xff8800, alpha: 0.85 })
        g.circle(cx, cy, tr * 0.45)
        g.fill({ color: 0xffee66, alpha: 1 })
      })
    }
    // zap, bolt: no pre-hit animation (instant strike)
  }

  // Pre-hit VFX for area actions: an expanding ring at the area centre.
  function spawnAreaPreHitVfx(attacker: Entity, center: Entity, areaRadiusPx: number, action: ActionDef, preHitDuration: number): void {
    const cx = center.x, cy = center.y
    if (action.id === 'fire-nova') {
      addVfx(preHitDuration, (g, p) => {
        g.clear()
        const r = areaRadiusPx * p
        const pulse = 1 + 0.08 * Math.sin(p * 30)
        // Outer expanding fire ring
        g.circle(cx, cy, r * pulse)
        g.stroke({ color: 0xff6600, width: Math.max(1, 5 * (1 - p * 0.4)), alpha: 0.55 + p * 0.35 })
        g.circle(cx, cy, r * 0.85 * pulse)
        g.stroke({ color: 0xffcc33, width: Math.max(1, 3 * (1 - p * 0.4)), alpha: 0.7 })
        // Inner flame body building up at the centre
        g.circle(cx, cy, areaRadiusPx * 0.22 * (0.5 + p * 0.7) * pulse)
        g.fill({ color: 0xff8800, alpha: 0.45 + p * 0.4 })
        g.circle(cx, cy, areaRadiusPx * 0.12 * (0.6 + p * 0.6))
        g.fill({ color: 0xffee66, alpha: 0.7 + p * 0.3 })
        // Sparks fanning out toward the ring
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * Math.PI * 2 + i * 0.3
          const sd = areaRadiusPx * (0.2 + p * 0.85)
          g.circle(cx + Math.cos(a) * sd, cy + Math.sin(a) * sd, Math.max(0.5, 2.5 * (1 - p * 0.5)))
          g.fill({ color: i % 2 ? 0xffaa33 : 0xffee66, alpha: 1 - p * 0.3 })
        }
      })
    } else if (action.id === 'lightning-nova') {
      addVfx(preHitDuration, (g, p) => {
        g.clear()
        const r = areaRadiusPx * p
        const pulse = 1 + 0.08 * Math.sin(p * 30)
        g.circle(cx, cy, r * pulse)
        g.stroke({ color: 0x66ddff, width: Math.max(1, 5 * (1 - p * 0.4)), alpha: 0.55 + p * 0.35 })
        g.circle(cx, cy, r * 0.85 * pulse)
        g.stroke({ color: 0xaaeeff, width: Math.max(1, 3 * (1 - p * 0.4)), alpha: 0.7 })
        g.circle(cx, cy, areaRadiusPx * 0.22 * (0.5 + p * 0.7) * pulse)
        g.fill({ color: 0x88e8ff, alpha: 0.45 + p * 0.4 })
        g.circle(cx, cy, areaRadiusPx * 0.12 * (0.6 + p * 0.6))
        g.fill({ color: 0xffffff, alpha: 0.7 + p * 0.3 })
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * Math.PI * 2 + i * 0.3
          const sd = areaRadiusPx * (0.2 + p * 0.85)
          g.circle(cx + Math.cos(a) * sd, cy + Math.sin(a) * sd, Math.max(0.5, 2.5 * (1 - p * 0.5)))
          g.fill({ color: i % 2 ? 0x99ddff : 0xffffff, alpha: 1 - p * 0.3 })
        }
      })
    } else if (action.id === 'grenade') {
      // Lobbed projectile flying from attacker to impact centre over the full windup.
      const ax = attacker.x, ay = attacker.y
      const dx = cx - ax, dy = cy - ay
      const arcLift = Math.min(80, Math.sqrt(dx * dx + dy * dy) * 0.25)
      addVfx(preHitDuration, (g, p) => {
        g.clear()
        const px = ax + dx * p
        const py = ay + dy * p - Math.sin(p * Math.PI) * arcLift
        const r = 7 + p * 4
        g.circle(px, py, r)
        g.fill({ color: 0x332211, alpha: 0.95 })
        g.circle(px, py, r * 0.55)
        g.fill({ color: 0xff8800, alpha: 0.7 + Math.sin(p * 40) * 0.25 })
        g.circle(px, py, r * 0.25)
        g.fill({ color: 0xffd060, alpha: 0.95 })
      })
    } else if (action.id === 'hammer-slam') {
      // Combined windup + slam: telegraph during preHitDuration, then a heavy
      // shockwave aftermath lasting an extra ~700 ms past impact.
      const aftermath = 700
      const total = preHitDuration + aftermath
      const windupFrac = preHitDuration / total
      addVfx(total, (g, p) => {
        g.clear()
        if (p < windupFrac) {
          const wp = p / windupFrac
          const ease = wp * wp
          // Faint outer telegraph at the full strike radius
          g.circle(cx, cy, areaRadiusPx)
          g.stroke({ color: 0xddaa55, width: 1.5, alpha: 0.25 + ease * 0.45 })
          // Charge ring growing under the caster
          g.circle(cx, cy, areaRadiusPx * (0.15 + ease * 0.35))
          g.stroke({ color: 0xffcc66, width: 2 + ease * 4, alpha: 0.3 + ease * 0.7 })
          // Build-up glow
          g.circle(cx, cy, areaRadiusPx * 0.18 * (1 + ease * 0.4))
          g.fill({ color: 0xffaa33, alpha: 0.25 + ease * 0.55 })
          // Hammer raised above the caster: rises smoothly to ~110 px up, then crashes down at wp >= 0.85
          const lift = wp < 0.85
            ? -(20 + 90 * Math.sin((wp / 0.85) * (Math.PI / 2)))
            : -(110 * Math.pow(1 - (wp - 0.85) / 0.15, 2))
          const hx = cx, hy = cy + lift
          // Handle
          g.rect(hx - 2.5, hy + 4, 5, 22)
          g.fill({ color: 0x553311, alpha: 0.9 })
          // Head
          const headHalfW = 14, headH = 11
          g.rect(hx - headHalfW, hy - headH * 0.5, headHalfW * 2, headH)
          g.fill({ color: 0x888888, alpha: 0.95 })
          g.rect(hx - headHalfW, hy - headH * 0.5, headHalfW * 2, headH)
          g.stroke({ color: 0xffffff, width: 1.5, alpha: 0.6 })
          // Pre-impact flash at the very end of windup
          if (wp > 0.92) {
            const fp = (wp - 0.92) / 0.08
            g.circle(cx, cy, areaRadiusPx * 0.3 * fp)
            g.fill({ color: 0xffffff, alpha: fp * 0.85 })
          }
        } else {
          const sp = (p - windupFrac) / (1 - windupFrac)
          // White impact flash (fades fast)
          if (sp < 0.25) {
            const fp = sp / 0.25
            g.circle(cx, cy, areaRadiusPx * (0.4 + fp * 0.6))
            g.fill({ color: 0xffffff, alpha: (1 - fp) * 0.85 })
          }
          // Primary shockwave ring expanding past the strike radius
          const r1 = areaRadiusPx * (0.2 + sp * 1.15)
          g.circle(cx, cy, r1)
          g.stroke({ color: 0xffeecc, width: Math.max(1, 9 * (1 - sp)), alpha: (1 - sp) * 0.95 })
          // Secondary shockwave trailing behind
          const r2 = areaRadiusPx * (0.05 + sp * 0.85)
          g.circle(cx, cy, r2)
          g.stroke({ color: 0xcc8844, width: Math.max(1, 6 * (1 - sp)), alpha: (1 - sp) * 0.75 })
          // Inner glow at impact
          g.circle(cx, cy, areaRadiusPx * 0.25 * (1 - sp * 0.6))
          g.fill({ color: 0xffaa33, alpha: (1 - sp) * 0.6 })
          // Radial cracks
          for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2 + i * 0.27
            const cr0 = areaRadiusPx * 0.1
            const cr1 = areaRadiusPx * (0.4 + sp * 0.95)
            g.moveTo(cx + Math.cos(a) * cr0, cy + Math.sin(a) * cr0)
            g.lineTo(cx + Math.cos(a) * cr1, cy + Math.sin(a) * cr1)
            g.stroke({ color: 0xeedfb6, width: Math.max(0.5, 2.5 * (1 - sp)), alpha: (1 - sp) * 0.85 })
          }
          // Dust + debris flying outward with a small hop
          for (let i = 0; i < 18; i++) {
            const a = (i / 18) * Math.PI * 2 + i * 0.41
            const d = areaRadiusPx * (0.3 + sp * 1.0)
            const yhop = -Math.sin(sp * Math.PI) * 6
            g.circle(cx + Math.cos(a) * d, cy + Math.sin(a) * d + yhop, Math.max(0.5, 3.5 * (1 - sp)))
            g.fill({ color: i % 3 === 0 ? 0xffffff : i % 3 === 1 ? 0xddbb88 : 0x886644, alpha: (1 - sp) * 0.85 })
          }
        }
      })
    }
  }

  // Post-hit VFX: spawned when damage lands, duration does not affect game timing.
  function spawnPostHitVfx(attacker: Entity, target: Entity, action: ActionDef): void {
    const ax = attacker.x, ay = attacker.y
    const tx = target.x, ty = target.y
    const tr = target.radius
    const baseAng = Math.atan2(ty - ay, tx - ax)

    if (action.id === 'sword') {
      addVfx(280, (g, p) => {
        g.clear()
        for (let i = -1; i <= 1; i++) {
          const ang = baseAng + Math.PI / 2 + i * 0.35
          const len = tr * (1.8 - Math.abs(i) * 0.3)
          const dx = Math.cos(ang) * len
          const dy = Math.sin(ang) * len
          g.moveTo(tx - dx, ty - dy); g.lineTo(tx + dx, ty + dy)
          g.stroke({ color: 0xffffff, width: Math.max(0.5, 5 * (1 - p)), alpha: 1 - p })
        }
        const sp = Math.min(1, p * 1.4)
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 + i * 0.7
          const d = tr * (0.3 + sp * 2.4)
          g.circle(tx + Math.cos(a) * d, ty + Math.sin(a) * d, Math.max(0.5, 3.5 * (1 - sp)))
          g.fill({ color: i % 2 ? 0xfff0aa : 0xffffff, alpha: 1 - sp })
        }
        if (p < 0.35) {
          const fp = p / 0.35
          g.circle(tx, ty, tr * (0.6 + fp * 2.4))
          g.fill({ color: 0xffffff, alpha: (1 - fp) * 0.6 })
        }
      })
    } else if (action.id === 'bow') {
      addVfx(160, (g, p) => {
        g.clear()
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2
          const r0 = tr * 0.4
          const r1 = tr * (0.9 + p * 2)
          g.moveTo(tx + Math.cos(a) * r0, ty + Math.sin(a) * r0)
          g.lineTo(tx + Math.cos(a) * r1, ty + Math.sin(a) * r1)
          g.stroke({ color: 0xfff0aa, width: 2.5 * (1 - p), alpha: 1 - p })
        }
        g.circle(tx, ty, tr * (0.8 + p * 2))
        g.stroke({ color: 0xffee66, width: 3 * (1 - p), alpha: (1 - p) * 0.9 })
        g.circle(tx, ty, tr * (1 - p * 0.5))
        g.fill({ color: 0xffffff, alpha: (1 - p) * 0.5 })
      })
    } else if (action.id === 'fireball') {
      addVfx(310, (g, p) => {
        g.clear()
        g.circle(tx, ty, tr * (0.8 + p * 5))
        g.stroke({ color: 0xff9900, width: 5 * (1 - p), alpha: (1 - p) * 0.9 })
        g.circle(tx, ty, tr * (0.5 + p * 4))
        g.stroke({ color: 0xffcc00, width: 3 * (1 - p), alpha: (1 - p) * 0.7 })
        g.circle(tx, ty, tr * (1 + p * 2.5))
        g.fill({ color: 0xff5500, alpha: (1 - p) * 0.55 })
        g.circle(tx, ty, tr * (0.8 + p * 1.2))
        g.fill({ color: 0xffee66, alpha: (1 - p) * 0.85 })
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2 + i * 0.4
          const d = tr * (0.6 + p * 6) + (i % 4) * 6
          const ex = tx + Math.cos(a) * d
          const ey = ty + Math.sin(a) * d
          g.circle(ex, ey, Math.max(0.5, 3.5 * (1 - p)))
          g.fill({ color: i % 3 === 0 ? 0xffee66 : (i % 2 ? 0xffaa00 : 0xff5500), alpha: 1 - p })
        }
      })
    } else if (action.id === 'fire-nova') {
      addVfx(260, (g, p) => {
        g.clear()
        g.circle(tx, ty, tr * (0.7 + p * 1.8))
        g.fill({ color: 0xff5500, alpha: (1 - p) * 0.6 })
        g.circle(tx, ty, tr * (0.45 + p * 1.0))
        g.fill({ color: 0xff9900, alpha: (1 - p) * 0.85 })
        g.circle(tx, ty, tr * (0.25 + p * 0.5))
        g.fill({ color: 0xffee66, alpha: (1 - p) * 0.95 })
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + i * 0.4
          const d = tr * (0.5 + p * 2.0)
          g.circle(tx + Math.cos(a) * d, ty + Math.sin(a) * d, Math.max(0.5, 2.5 * (1 - p)))
          g.fill({ color: i % 2 ? 0xffaa00 : 0xffee66, alpha: 1 - p })
        }
      })
    } else if (action.id === 'zap') {
      addVfx(240, (g, p) => {
        g.clear()
        const dx = tx - ax, dy = ty - ay
        const len = Math.sqrt(dx * dx + dy * dy) || 1
        const nx = dx / len, ny = dy / len
        const px = -ny, py = nx
        const flicker = Math.floor(p * 8)
        const segments = 10
        for (let b = 0; b < 3; b++) {
          const seed = b * 17 + flicker * 31
          g.moveTo(ax, ay)
          for (let i = 1; i <= segments; i++) {
            const t = i / segments
            const fade = 1 - Math.abs(t - 0.5) * 2
            const r = Math.sin(seed + i * 12.9898) * 43758.5453
            const noise = (r - Math.floor(r)) - 0.5
            const off = noise * len * 0.18 * fade
            g.lineTo(ax + dx * t + px * off, ay + dy * t + py * off)
          }
          g.stroke({
            color: b === 0 ? 0xffffff : 0x66ddff,
            width: Math.max(0.6, (4 - b * 1.2) * (1 - p * 0.6)),
            alpha: (1 - p) * (b === 0 ? 1 : 0.7),
          })
          if (b === 0) {
            for (let f = 0; f < 3; f++) {
              const ft = 0.3 + f * 0.2
              const fr = Math.sin(seed + f * 91.7) * 43758.5453
              const fNoise = (fr - Math.floor(fr)) - 0.5
              const fLen = len * 0.18
              const startX = ax + dx * ft + px * fNoise * len * 0.08
              const startY = ay + dy * ft + py * fNoise * len * 0.08
              g.moveTo(startX, startY)
              g.lineTo(startX + (px + nx * 0.3) * fLen * (fNoise > 0 ? 1 : -1),
                       startY + (py + ny * 0.3) * fLen * (fNoise > 0 ? 1 : -1))
              g.stroke({ color: 0x99eeff, width: 1.5, alpha: (1 - p) * 0.6 })
            }
          }
        }
        g.circle(tx, ty, tr * (1.2 + p * 0.5))
        g.fill({ color: 0x66ddff, alpha: (1 - p) * 0.45 })
        g.circle(tx, ty, tr * (0.6 + p * 0.3))
        g.fill({ color: 0xffffff, alpha: (1 - p) * 0.85 })
        g.circle(ax, ay, tr * 0.5)
        g.fill({ color: 0xffffff, alpha: (1 - p) * 0.6 })
      })
    } else if (action.id === 'grenade') {
      addVfx(310, (g, p) => {
        g.clear()
        g.circle(tx, ty, tr * (0.8 + p * 4))
        g.stroke({ color: 0xff8800, width: 5 * (1 - p), alpha: (1 - p) * 0.85 })
        g.circle(tx, ty, tr * (0.5 + p * 3))
        g.stroke({ color: 0xffcc33, width: 3 * (1 - p), alpha: (1 - p) * 0.7 })
        g.circle(tx, ty, tr * (0.9 + p * 1.8))
        g.fill({ color: 0xff5500, alpha: (1 - p) * 0.55 })
        g.circle(tx, ty, tr * (0.5 + p * 0.9))
        g.fill({ color: 0xffee66, alpha: (1 - p) * 0.85 })
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 + i * 0.5
          const d = tr * (0.5 + p * 2.6)
          g.circle(tx + Math.cos(a) * d, ty + Math.sin(a) * d, Math.max(0.5, 3 * (1 - p)))
          g.fill({ color: i % 2 ? 0xffaa00 : 0xffee66, alpha: 1 - p })
        }
      })
    } else if (action.id === 'hammer-slam') {
      addVfx(360, (g, p) => {
        g.clear()
        // Two fast-expanding rings around the target
        g.circle(tx, ty, tr * (0.8 + p * 3.2))
        g.stroke({ color: 0xffffff, width: 6 * (1 - p), alpha: (1 - p) * 0.95 })
        g.circle(tx, ty, tr * (0.5 + p * 2.4))
        g.stroke({ color: 0xddccaa, width: 4 * (1 - p), alpha: (1 - p) * 0.8 })
        // Radial cracks reaching well past the target's body
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 + i * 0.3
          const r0 = tr * 0.4
          const r1 = tr * (1.0 + p * 1.9)
          g.moveTo(tx + Math.cos(a) * r0, ty + Math.sin(a) * r0)
          g.lineTo(tx + Math.cos(a) * r1, ty + Math.sin(a) * r1)
          g.stroke({ color: 0xeeeeee, width: 2.5 * (1 - p), alpha: 1 - p })
        }
        // Dust burst with a small hop
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2 + i * 0.5
          const d = tr * (0.4 + p * 2.0)
          const yhop = -Math.sin(p * Math.PI) * 5
          g.circle(tx + Math.cos(a) * d, ty + Math.sin(a) * d + yhop, Math.max(0.5, 3 * (1 - p)))
          g.fill({ color: i % 2 ? 0xddbb88 : 0xffffff, alpha: 1 - p })
        }
      })
    } else if (action.id === 'lightning-nova') {
      addVfx(260, (g, p) => {
        g.clear()
        g.circle(tx, ty, tr * (0.7 + p * 1.8))
        g.fill({ color: 0x66ddff, alpha: (1 - p) * 0.6 })
        g.circle(tx, ty, tr * (0.45 + p * 1.0))
        g.fill({ color: 0xaaeeff, alpha: (1 - p) * 0.85 })
        g.circle(tx, ty, tr * (0.25 + p * 0.5))
        g.fill({ color: 0xffffff, alpha: (1 - p) * 0.95 })
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + i * 0.4
          const d = tr * (0.5 + p * 2.0)
          g.circle(tx + Math.cos(a) * d, ty + Math.sin(a) * d, Math.max(0.5, 2.5 * (1 - p)))
          g.fill({ color: i % 2 ? 0x99ddff : 0xffffff, alpha: 1 - p })
        }
      })
    } else if (action.id === 'bolt') {
      addVfx(120, (g, p) => {
        g.clear()
        // Quick flicker: cyan ring + white center, plus a short zigzag streak from attacker.
        const dx = tx - ax, dy = ty - ay
        const len = Math.sqrt(dx * dx + dy * dy) || 1
        const nx = dx / len, ny = dy / len
        const px = -ny, py = nx
        const segments = 6
        g.moveTo(ax, ay)
        for (let i = 1; i <= segments; i++) {
          const t = i / segments
          const fade = 1 - Math.abs(t - 0.5) * 2
          const r = Math.sin(p * 100 + i * 12.9898) * 43758.5453
          const noise = (r - Math.floor(r)) - 0.5
          const off = noise * len * 0.12 * fade
          g.lineTo(ax + dx * t + px * off, ay + dy * t + py * off)
        }
        g.stroke({ color: 0xffffff, width: 2.5 * (1 - p), alpha: (1 - p) * 0.95 })
        g.circle(tx, ty, tr * (1.0 + p * 0.4))
        g.fill({ color: 0x66ddff, alpha: (1 - p) * 0.5 })
        g.circle(tx, ty, tr * (0.5 + p * 0.2))
        g.fill({ color: 0xffffff, alpha: (1 - p) * 0.9 })
      })
    }
  }

  function spawnDamageNumber(wx: number, wy: number, damage: number, color: number): void {
    if (!app) return
    if (!getPrefs().showDamageNumbers) return
    const text = new Text({
      text: String(Math.round(damage * 10) / 10),
      style: {
        fill: color,
        fontSize: 16,
        fontWeight: 'bold',
        dropShadow: { color: 0x000000, blur: 3, angle: Math.PI / 2, distance: 1 },
      },
    })
    text.anchor.set(0.5)
    text.x = wx
    text.y = wy
    app.stage.addChild(text)
    // Drift up + fade over 2000ms, no static phase.
    const originY = wy
    vfxList.push({
      g: text,
      age: 0,
      maxAge: 2000,
      tick: (p) => {
        text.y = originY - p * 80
        text.alpha = 1 - p
      },
    })
  }

  function spawnHealNumber(wx: number, wy: number, amount: number): void {
    if (!app) return
    if (!getPrefs().showDamageNumbers) return
    const text = new Text({
      text: `+${Math.round(amount * 10) / 10}`,
      style: {
        fill: 0x44dd44,
        fontSize: 16,
        fontWeight: 'bold',
        dropShadow: { color: 0x000000, blur: 3, angle: Math.PI / 2, distance: 1 },
      },
    })
    text.anchor.set(0.5)
    text.x = wx
    text.y = wy
    app.stage.addChild(text)
    const originY = wy
    vfxList.push({
      g: text,
      age: 0,
      maxAge: 2000,
      tick: (p) => {
        text.y = originY - p * 80
        text.alpha = 1 - p
      },
    })
  }

  // Generate initial chunks around the player before the first wave spawns
  updateChunks()

  // Start immediately — paused=false so regen and wave timer kick off now
  startRegen()
  scheduleWave(balance.wave.spawnDelay)

  ;(async () => {
    try {
      const instance = new Application()
      await instance.init({
        background: tokens.color.surface,
        resizeTo: viewportEl,
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
      viewportEl.appendChild(wrapper)

      // Load Tiny Dungeon tilesheet and slice tile variants.
      // Packed sheet: 12 cols × 11 rows of 16×16 px tiles, no spacing.
      // Tile (col, row) lives at pixel (col*16, row*16).
      const sheet = await Assets.load<Texture>(
        `${import.meta.env.BASE_URL}ui/kenney_tiny-dungeon/Tilemap/tilemap_packed.png`,
      )
      sheet.source.scaleMode = 'nearest'
      const TILE = 16
      // N = tile number (0-indexed), col = N%12, row = floor(N/12).
      // See src/assets/tile-notes.md for full rationale.
      const t = (N: number) => new Texture({
        source: sheet.source,
        frame: new Rectangle((N % 12) * TILE, Math.floor(N / 12) * TILE, TILE, TILE),
      })
      const w = (N: number, wt: number) => ({ tex: t(N), w: wt })
      floorOptions       = [ w(48, 100), w(49, 25), w(42, 2) ]
      largeObstOptions   = [ w(40, 100), w(28, 10), w(29, 1) ]
      smallFillerOptions = [ w(54, 1), w(55, 1), w(63, 1), w(64, 1), w(65, 1),
                             w(72, 1), w(74, 1), w(82, 1), w(89, 1) ]
      entityTextures.set('player',   t(108))
      entityTextures.set('sword',    t(97))
      entityTextures.set('bow',      t(112))
      entityTextures.set('fireball', t(84))
      entityTextures.set('zap',      t(100))

      if (destroyed) return

      floorContainer = new Container()
      wallContainer  = new Container()
      burnGroundContainer = new Container()
      app.stage.addChild(floorContainer)
      app.stage.addChild(wallContainer)
      app.stage.addChild(burnGroundContainer)

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

        tickEffects(ticker.deltaMS)
        if (!hasEffect('frenzy')) frenzyCharges = 0
        updateChunks()

        // ── Movement ────────────────────────────────────────────────────────
        // Per-tick: decrement animation lock, tick dash charge roll
        if (playerAnimLockMs > 0) playerAnimLockMs = Math.max(0, playerAnimLockMs - ticker.deltaMS)
        dashChargeTimerMs += ticker.deltaMS
        if (dashChargeTimerMs >= 1000) {
          dashChargeTimerMs -= 1000
          const movBonuses = getMovementBonuses()
          if (movBonuses.dashChargeChance > 0 && dashCharges < DASH_MAX_CHARGES
              && Math.random() * 100 < movBonuses.dashChargeChance) {
            dashCharges++
          }
        }

        const lbForMove = electrocuteStacks.size > 0 ? getLightningBonuses() : null
        for (const entity of entities) {
          const body = entityBodies.get(entity.id)
          if (!body) continue

          // Animation lock: player cannot move during the action animation phase
          if (entity.role === 'player' && playerAnimLockMs > 0) {
            Matter.Body.setVelocity(body, { x: 0, y: 0 })
            continue
          }

          const target = entity.role === 'player' ? selectPlayerTarget(entities) : nearestTarget(entity, entities)
          if (!target) { Matter.Body.setVelocity(body, { x: 0, y: 0 }); continue }
          const gs = balance.world.gridSize
          const dx = target.x - entity.x, dy = target.y - entity.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const stopDist = entity.actionRange + target.radius

          // Kite check for player (before stop-distance check to avoid early exit)
          const playerMb = entity.role === 'player' ? getMovementBonuses() : null
          const shouldKite = playerMb !== null && playerMb.kiteSpeedFraction > 0 && dist <= entity.actionRange / 2

          if (!shouldKite && dist <= stopDist) {
            if (entity.role === 'player') playerIsKiting = false
            Matter.Body.setVelocity(body, { x: 0, y: 0 })
            continue
          }

          // Pathfinding toward target (skipped when kiting to avoid wasteful A* calls)
          const fromTx = Math.floor(entity.x / gs), fromTy = Math.floor(entity.y / gs)
          const toTx   = Math.floor(target.x / gs), toTy   = Math.floor(target.y / gs)
          const targetKey = `${toTx},${toTy}`
          const entityKey = `${fromTx},${fromTy}`
          const now = performance.now()
          let moveX = dx / dist, moveY = dy / dist  // default: move directly

          if (!shouldKite) {
            let path = entityPaths.get(entity.id)
            const needsRepath = !path
              || path.targetTileKey !== targetKey
              || path.entityTileKey !== entityKey
              || (path.waypoints.length === 0 && now - path.lastUpdateTime > 500)
            if (needsRepath) {
              const waypoints = astar(fromTx, fromTy, toTx, toTy, blockedTiles)
              path = { waypoints, waypointIdx: 0, targetTileKey: targetKey, entityTileKey: entityKey, lastUpdateTime: now }
              entityPaths.set(entity.id, path)
            }
            const activePath = path!
            if (activePath.waypoints.length > 0) {
              while (activePath.waypointIdx < activePath.waypoints.length) {
                const wp = activePath.waypoints[activePath.waypointIdx]
                const wpX = (wp.tx + 0.5) * gs, wpY = (wp.ty + 0.5) * gs
                const wdx = wpX - entity.x, wdy = wpY - entity.y
                if (wdx * wdx + wdy * wdy < (gs * 0.6) ** 2) { activePath.waypointIdx++; continue }
                const wd = Math.sqrt(wdx * wdx + wdy * wdy)
                moveX = wdx / wd; moveY = wdy / wd
                break
              }
            }
          }

          // Player movement: move speed bonuses, kite, and dash
          if (entity.role === 'player') {
            const mb = playerMb!
            const effectiveMs = entity.moveSpeed
              * (1 + mb.moveSpeedIncrease / 100)
              * (1 + mb.moveMoreSpeed / 100)

            // Active dash — run to completion
            if (dashRemainingMs > 0) {
              dashRemainingMs = Math.max(0, dashRemainingMs - ticker.deltaMS)
              const dashSpeed = effectiveMs * DASH_SPEED_MULT * (1 + mb.dashDistanceIncrease / 100)
              Matter.Body.setVelocity(body, {
                x: dashMoveX * dashSpeed * MATTER_BASE_DT,
                y: dashMoveY * dashSpeed * MATTER_BASE_DT,
              })
              continue
            }

            playerIsKiting = shouldKite
            if (shouldKite) {
              const kiteMoveX = -(dx / dist)
              const kiteMoveY = -(dy / dist)
              if (dashCharges > 0 && mb.kiteAllowDash) {
                dashCharges--
                dashRemainingMs = DASH_DURATION_MS
                dashMoveX = kiteMoveX; dashMoveY = kiteMoveY
                const dashSpeed = effectiveMs * DASH_SPEED_MULT * (1 + mb.dashDistanceIncrease / 100)
                Matter.Body.setVelocity(body, {
                  x: dashMoveX * dashSpeed * MATTER_BASE_DT,
                  y: dashMoveY * dashSpeed * MATTER_BASE_DT,
                })
              } else {
                const kiteMs = effectiveMs * mb.kiteSpeedFraction
                Matter.Body.setVelocity(body, {
                  x: kiteMoveX * kiteMs * MATTER_BASE_DT,
                  y: kiteMoveY * kiteMs * MATTER_BASE_DT,
                })
              }
              continue
            }

            // Moving toward enemy — trigger dash if a charge is available
            if (dashCharges > 0) {
              dashCharges--
              dashRemainingMs = DASH_DURATION_MS
              dashMoveX = moveX; dashMoveY = moveY
              const dashSpeed = effectiveMs * DASH_SPEED_MULT * (1 + mb.dashDistanceIncrease / 100)
              Matter.Body.setVelocity(body, {
                x: dashMoveX * dashSpeed * MATTER_BASE_DT,
                y: dashMoveY * dashSpeed * MATTER_BASE_DT,
              })
            } else {
              Matter.Body.setVelocity(body, {
                x: moveX * effectiveMs * MATTER_BASE_DT,
                y: moveY * effectiveMs * MATTER_BASE_DT,
              })
            }
            continue
          }

          // Enemy movement
          // Velocity is set per Matter base step (1/60 s), not per frame dt;
          // otherwise per-frame displacement scales with dt² and the simulation
          // diverges from a true sped-up x1 at higher gameSpeed.
          let ms = entity.moveSpeed
          if (entity.role === 'enemy' && lbForMove && lbForMove.electrocuteSlowOnDamageTaken && isElectrocuted(entity)) {
            const total = balance.effects.electrocutionBaseDamageTakenPct + lbForMove.electrocuteDamageTakenIncrease
            ms *= Math.max(0, 1 - total / 100)
          }
          if (entity.role === 'enemy' && burnGroundTiles.size > 0 && isOnBurningGround(entity)) {
            const slow = getFireBonuses().burnGroundSlowAmount
            if (slow > 0) ms *= Math.max(0, 1 - slow / 100)
          }
          if (entity.role === 'enemy' && (entity.physRotResist ?? 0) <= 0) {
            const breakSlow = getPhysicalBonuses().resistBreakSlowAtZero
            if (breakSlow > 0) ms *= Math.max(0, 1 - breakSlow / 100)
          }
          // Knockback slow debuff
          const kbSlow = knockbackSlowState.get(entity.id)
          if (kbSlow) ms *= Math.max(0, 1 - kbSlow.amount / 100)
          // Knockback velocity impulse
          const kb = knockbackState.get(entity.id)
          const kbVx = kb ? kb.vx * MATTER_BASE_DT : 0
          const kbVy = kb ? kb.vy * MATTER_BASE_DT : 0
          Matter.Body.setVelocity(body, {
            x: moveX * ms * MATTER_BASE_DT + kbVx,
            y: moveY * ms * MATTER_BASE_DT + kbVy,
          })
        }

        // ── Physics step ────────────────────────────────────────────────────
        // Substep so each Matter step stays near its design timestep (~16.7 ms),
        // keeping integration stable at high gameSpeed (deltaMS up to ~167 ms).
        let physicsRemaining = ticker.deltaMS
        while (physicsRemaining > 0) {
          const step = Math.min(physicsRemaining, PHYSICS_MAX_STEP_MS)
          Matter.Engine.update(physicsEngine, step)
          physicsRemaining -= step
        }

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
        let currentHitMultiType: MultiActionType | undefined = undefined  // set before each applyHit call, read inside for DPS tracking

        // Apply a single hit: damage + XP + damage number + VFX. Mana / cooldown / triggers handled by caller.
        const applyHit = (attacker: Entity, target: Entity, damage: number, action: ActionDef, actionId: ActionId, guaranteedAfflictions = false): void => {
          const isPlayerAttacker = attacker.role === 'player'
          const sbHit = isPlayerAttacker ? getStrikeBonuses() : null
          const strikeAfflBonus = (sbHit && action.tags.includes('strike')) ? sbHit.afflictionChanceIncrease : 0
          const frenzyAfflBonus = (isPlayerAttacker && frenzyCharges > 0 && sbHit) ? frenzyCharges * sbHit.frenzyAfflictionChancePerCharge : 0
          const extraAfflChance = strikeAfflBonus + frenzyAfflBonus

          let finalDamage = damage
          if (target.role === 'player') {
            const lb = getLifeBonuses()
            let totalResistance = 0
            if (action.tags.includes('physical') || action.tags.includes('rot')) totalResistance += lb.physRotResistance
            if (action.tags.includes('fire') || action.tags.includes('lightning') || action.tags.includes('cold')) {
              totalResistance += lb.elementalResistance
            }
            if (playerIsKiting) {
              const movB = getMovementBonuses()
              totalResistance += movB.kiteResistance
            }
            totalResistance = Math.max(0, Math.min(100, totalResistance))
            finalDamage = damage * (1 - totalResistance / 100)
            if (lb.resistAbsorbLifePercent > 0 && totalResistance > 0) {
              const absorbed = damage - finalDamage
              playerEntity.currentLife = Math.min(playerEntity.maxLife, playerEntity.currentLife + absorbed * lb.resistAbsorbLifePercent / 100)
            }
            if (hasEffect('electrified')) {
              const lbElectrified = getLightningBonuses()
              if (lbElectrified.electrifyDamageReduction > 0) {
                finalDamage *= Math.max(0, 1 - lbElectrified.electrifyDamageReduction / 100)
              }
            }
          }
          // Burning enemies take additional damage from any source (fire mastery 8)
          if (target.role === 'enemy' && attacker.role === 'player' && isBurning(target)) {
            const fb = getFireBonuses()
            if (fb.burningTakeIncreased > 0) {
              finalDamage *= 1 + fb.burningTakeIncreased / 100
            }
          }
          // Bleeding enemies take more physical damage (Physical Damage tree node 11)
          if (target.role === 'enemy' && attacker.role === 'player' && action.tags.includes('physical') && bleedStacks.has(target.id)) {
            const pbBleed = getPhysicalBonuses()
            if (pbBleed.bleedingTakeMore > 0) {
              finalDamage *= 1 + pbBleed.bleedingTakeMore / 100
            }
          }
          // Electrocution: additional damage taken — own multiplier, applies from all sources
          if (target.role === 'enemy' && isElectrocuted(target)) {
            const lbElec = getLightningBonuses()
            const totalDmgTaken = balance.effects.electrocutionBaseDamageTakenPct + lbElec.electrocuteDamageTakenIncrease
            finalDamage *= 1 + totalDmgTaken / 100
          }
          // Enemy resistance: last calculation before applying the hit
          if (target.role === 'enemy') {
            let physRotR = 0
            let eleR = 0
            if (action.tags.includes('physical') || action.tags.includes('rot')) physRotR = target.physRotResist ?? 0
            if (action.tags.includes('fire') || action.tags.includes('lightning') || action.tags.includes('cold')) eleR = target.eleResist ?? 0
            if (action.tags.includes('fire') && isBurning(target)) {
              const fbResist = getFireBonuses()
              if (fbResist.burnEnemyResistReduction > 0) eleR = Math.max(0, eleR - fbResist.burnEnemyResistReduction)
            }
            const enemyResist = physRotR + eleR
            if (enemyResist > 0) finalDamage *= 1 - Math.min(100, enemyResist) / 100
          }
          // Knockback damage reduction: knocked-back enemies deal less damage to the player
          if (target.role === 'player' && attacker.role === 'enemy') {
            const kbDR = knockbackDamageReductionState.get(attacker.id)
            if (kbDR) finalDamage *= Math.max(0, 1 - kbDR.amount / 100)
          }
          // Mana Shield: intercept a fraction of player-targeted damage to mana before life
          if (target.role === 'player') {
            const mb = getManaBonuses()
            if (mb.manaShieldAbsorb > 0 && playerEntity.currentMana > 0) {
              const absorbFrac = Math.min(1, mb.manaShieldAbsorb / 100)
              const absorbed = finalDamage * absorbFrac
              let manaRate = mb.manaShieldDamageTaken / 100
              if (mb.manaShieldResistancesApply) {
                const lbMS = getLifeBonuses()
                let totalRes = 0
                if (action.tags.includes('physical') || action.tags.includes('rot')) totalRes += lbMS.physRotResistance
                if (action.tags.includes('fire') || action.tags.includes('lightning') || action.tags.includes('cold')) totalRes += lbMS.elementalResistance
                manaRate *= Math.max(0, 1 - Math.min(100, totalRes) / 100)
              }
              const manaCost = absorbed * manaRate
              if (playerEntity.currentMana >= manaCost) {
                playerEntity.currentMana = Math.max(0, playerEntity.currentMana - manaCost)
                finalDamage -= absorbed
              } else {
                const partialAbsorbed = manaRate > 0 ? playerEntity.currentMana / manaRate : 0
                playerEntity.currentMana = 0
                finalDamage -= partialAbsorbed
              }
            }
          }
          const prevLife = target.currentLife
          target.currentLife = Math.max(0, target.currentLife - finalDamage)
          const actualDamage = prevLife - target.currentLife
          if (attacker.role === 'player' && actualDamage > 0) {
            const eLevel = enemyLevels.get(target.id) ?? 1
            const xpMult = Math.pow(balance.enemyLevel.xpMultiplierPerLevel, eLevel - 1) * tierXpMult(target.id)
            awardXp(actionId, actualDamage * xpMult)
            if (enemyProgress.level === enemyProgress.maxLevel) awardEnemyXp(actualDamage)
            spawnDamageNumber(target.x, target.y - target.radius - 8, actualDamage, 0xffffff)
            applyLifeSteal(actualDamage)
            applyManaSteal(actualDamage)
            recordDps(actionId, actualDamage, currentHitMultiType ? `multi:${currentHitMultiType}` : 'direct')
          }
          if (target.role === 'player' && actualDamage > 0) {
            const eLevel = enemyLevels.get(attacker.id) ?? 1
            const xpMult = Math.pow(balance.enemyLevel.xpMultiplierPerLevel, eLevel - 1) * tierXpMult(attacker.id)
            awardStatXp('life', actualDamage * balance.stat.lifeXpFromDamage * xpMult)
            spawnDamageNumber(target.x, target.y - target.radius - 8, actualDamage, 0xff3333)
          }
          damagedIds.add(target.id)

          // Knockback: roll on player area/projectile hits to enemy targets
          if (isPlayerAttacker && target.role === 'enemy' && actualDamage > 0) {
            let kbChance = 0
            let kbBaseRange = 0
            let kbMoreRange = 0
            let kbSlowAmount = 0
            let kbDamageReduction = 0
            if (action.tags.includes('area')) {
              const ab = getAreaBonuses()
              kbChance += ab.knockbackChance
              kbBaseRange = Math.max(kbBaseRange, balance.player.radius * 1.0)
              kbMoreRange = Math.max(kbMoreRange, ab.knockbackMoreRange)
              kbSlowAmount = Math.max(kbSlowAmount, ab.knockbackMoveSlowAmount)
              kbDamageReduction = Math.max(kbDamageReduction, ab.knockbackDamageReduction)
            }
            if (action.tags.includes('projectile')) {
              const pb = getProjectileBonuses()
              kbChance += pb.knockbackChance
              kbBaseRange = Math.max(kbBaseRange, balance.player.radius * 0.5)
              kbMoreRange = Math.max(kbMoreRange, pb.knockbackMoreRange)
              kbSlowAmount = Math.max(kbSlowAmount, pb.knockbackMoveSlowAmount)
              kbDamageReduction = Math.max(kbDamageReduction, pb.knockbackDamageReduction)
            }
            if (kbChance > 0 && Math.random() * 100 < kbChance) {
              const kbRange = kbBaseRange * (1 + kbMoreRange / 100)
              const dx = target.x - attacker.x
              const dy = target.y - attacker.y
              const dist = Math.sqrt(dx * dx + dy * dy)
              const dirX = dist > 0 ? dx / dist : 1
              const dirY = dist > 0 ? dy / dist : 0
              const kbSpeedPxPerSec = kbRange / (balance.buffs.knockbackDurationMs / 1000)
              knockbackState.set(target.id, {
                vx: dirX * kbSpeedPxPerSec,
                vy: dirY * kbSpeedPxPerSec,
                remainingMs: balance.buffs.knockbackDurationMs,
              })
              if (kbSlowAmount > 0) {
                knockbackSlowState.set(target.id, { amount: kbSlowAmount, remainingMs: balance.buffs.knockbackSlowDurationMs })
              }
              if (kbDamageReduction > 0) {
                knockbackDamageReductionState.set(target.id, { amount: kbDamageReduction, remainingMs: balance.buffs.knockbackDamageReductionDurationMs })
              }
            }
          }

          // Burning: roll on fire-tagged player hits to enemy targets
          if (attacker.role === 'player' && target.role === 'enemy' && action.tags.includes('fire') && actualDamage > 0) {
            const fb = getFireBonuses()
            const immolBurnBonus = hasEffect('immolation') ? fb.immolateBurnChance : 0
            const chance = balance.effects.baseApplyChance + fb.burnApplyChance + immolBurnBonus + extraAfflChance
            if (guaranteedAfflictions || Math.random() * 100 < chance) {
              const dps = damage * balance.effects.burnDpsFraction
                * (1 + fb.burnDamageIncrease / 100)
                * (1 + fb.burnMoreDamage / 100)
              const duration = balance.effects.burnBaseDurationMs * (1 + fb.burnDurationIncrease / 100)
              const list = burnStacks.get(target.id) ?? []
              list.push({ dps, remainingMs: duration, sourceActionId: actionId })
              burnStacks.set(target.id, list)
            }
            // Burning Ground: roll on fire-tagged player hits; tile must be clear of burning ground
            if (fb.burnGroundChance > 0) {
              const tk = tileKey(target.x, target.y)
              if (!burnGroundTiles.has(tk) && Math.random() * 100 < fb.burnGroundChance) {
                const groundDps = damage * balance.effects.burnDpsFraction
                  * (1 + fb.burnGroundDamageIncrease / 100)
                  * (1 + fb.burnGroundMoreDamage / 100)
                const groundDuration = balance.effects.burnGroundBaseDurationMs * (1 + fb.burnGroundDurationIncrease / 100)
                burnGroundTiles.set(tk, { dps: groundDps, remainingMs: groundDuration, sourceActionId: actionId })
              }
            }
          }
          // Electrocution: roll on lightning-tagged player hits to enemy targets
          if (attacker.role === 'player' && target.role === 'enemy' && action.tags.includes('lightning') && actualDamage > 0) {
            const lbElec = getLightningBonuses()
            const chance = balance.effects.baseApplyChance + lbElec.electrocuteApplyChance + extraAfflChance
            if (guaranteedAfflictions || Math.random() * 100 < chance) {
              const duration = balance.effects.electrocutionBaseDurationMs * (1 + lbElec.electrocuteDurationIncrease / 100)
              electrocuteStacks.set(target.id, duration)
            }
          }
          // Electrifying: lightning-tagged player hits roll a chance to apply Electrified to the player
          if (attacker.role === 'player' && action.tags.includes('lightning') && actualDamage > 0) {
            const lbElec = getLightningBonuses()
            if (lbElec.electrifyChance > 0 && Math.random() * 100 < lbElec.electrifyChance) applyElectrified()
          }
          // Bleeding: roll on physical-tagged player hits to enemy targets
          if (attacker.role === 'player' && target.role === 'enemy' && action.tags.includes('physical') && actualDamage > 0) {
            const pb = getPhysicalBonuses()
            const bloodlustBleedBonus = hasEffect('bloodlust') ? pb.bloodlustBleedChance : 0
            const chance = balance.effects.baseApplyChance + pb.bleedApplyChance + bloodlustBleedBonus + extraAfflChance
            if (guaranteedAfflictions || Math.random() * 100 < chance) {
              const newBaseDps  = damage * balance.effects.bleedDpsFraction
              const duration    = balance.effects.bleedBaseDurationMs * (1 + pb.bleedDurationIncrease / 100)
              const existing    = bleedStacks.get(target.id)
              if (!existing) {
                bleedStacks.set(target.id, { baseDps: newBaseDps, stackedIncrease: 0, remainingMs: duration, sourceActionId: actionId })
              } else {
                const currentEffective = existing.baseDps * (1 + existing.stackedIncrease / 100)
                if (newBaseDps > currentEffective) {
                  existing.baseDps = newBaseDps
                } else {
                  existing.stackedIncrease += balance.effects.bleedStackIncreasePerProc
                }
                existing.remainingMs    = duration
                existing.sourceActionId = actionId
              }
              // Bloodlust: roll on each successful bleed application
              if (pb.bloodlustChance > 0 && Math.random() * 100 < pb.bloodlustChance) applyBloodlust()
            }
          }
          // Resistance Breaking: roll on physical-tagged player hits to permanently reduce enemy physRot resistance
          if (attacker.role === 'player' && target.role === 'enemy' && action.tags.includes('physical') && actualDamage > 0) {
            const pbBreak = getPhysicalBonuses()
            if (pbBreak.resistBreakChance > 0 && (target.physRotResist ?? 0) > 0
                && Math.random() * 100 < pbBreak.resistBreakChance) {
              target.physRotResist = Math.max(0, (target.physRotResist ?? 0) - 1)
            }
          }
          // Frenzy: roll on strike-tagged player hits to enemy targets
          if (attacker.role === 'player' && target.role === 'enemy' && action.tags.includes('strike') && actualDamage > 0) {
            if (sbHit && sbHit.frenzyChance > 0 && Math.random() * 100 < sbHit.frenzyChance) applyFrenzy()
          }
        }

        // ── Pending-hit countdown: apply damage when the pre-hit window expires ─
        for (const [entityId, ph] of pendingHits) {
          ph.countdown -= ticker.deltaMS
          if (ph.countdown > 0) continue
          pendingHits.delete(entityId)
          if (!entities.includes(ph.target) || ph.target.currentLife <= 0) continue
          if (!entities.includes(ph.attacker)) continue
          currentHitMultiType = ph.multiActionType
          applyHit(ph.attacker, ph.target, ph.damage, ph.action, ph.actionId, ph.guaranteedAfflictions)
          spawnPostHitVfx(ph.attacker, ph.target, ph.action)
        }

        for (const entity of entities) {
          const actionId = entityActions.get(entity.id)
          if (!actionId) continue
          const action = getAction(actionId)
          const cd = (actionCooldowns.get(entity.id) ?? 0) - ticker.deltaMS
          actionCooldowns.set(entity.id, cd)
          if (cd > 0) continue

          // ── Determine next pending multi-action ───────────────────────────
          const queue = pendingMultiActions.get(entity.id)
          const pending = queue?.[0] ?? null

          // Determine target:
          // - additionalTarget uses the queued entity (skip cast if it died)
          // - all others use normal target selection
          let target: Entity | null
          if (pending?.type === 'additionalTarget' || pending?.type === 'jump' || pending?.type === 'tremor') {
            const et = pending.target!
            if (!entities.includes(et) || et.currentLife <= 0) {
              queue!.shift()
              if (queue!.length === 0) pendingMultiActions.delete(entity.id)
              continue
            }
            target = et
          } else {
            target = entity.role === 'player' ? selectPlayerTarget(entities) : nearestTarget(entity, entities)
            if (!target) continue
            const dx = target.x - entity.x
            const dy = target.y - entity.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist - target.radius > entity.actionRange) continue
          }

          const isPlayer = entity.role === 'player'
          const actionBonuses = isPlayer ? getActionBonuses() : null
          const isPlayerProjectile = entity.role === 'player' && action.tags.includes('projectile')
          const pb = isPlayerProjectile ? getProjectileBonuses() : null
          const tranceActive = isPlayer && hasEffect('trance')
          const rb = entity.role === 'player' ? getRuneBonuses(actionId) : null

          // Cast Speed node 11: doubleCast second cast guarantees afflictions; propagates to its branched multi-actions.
          const guaranteedAfflictions =
            pending?.guaranteedAfflictions === true
            || (pending?.type === 'doubleAction' && actionBonuses?.guaranteedAfflictions === true)

          // additionalProjectile: prefer the queued different target if still alive and in range
          if (pending?.type === 'additionalProjectile' && pending.target && pending.target !== target) {
            const stored = pending.target
            if (entities.includes(stored) && stored.currentLife > 0) {
              const dx = stored.x - entity.x
              const dy = stored.y - entity.y
              const dist = Math.sqrt(dx * dx + dy * dy)
              if (dist - stored.radius <= entity.actionRange) target = stored
            }
          }

          // ── Mana cost computation ─────────────────────────────────────────
          // additionalTarget casts are always free (triggered by trance; no resource spend)
          // additionalTarget and tremor are free continuation casts (no extra mana cost)
          const isFreeMultiCast = pending?.type === 'additionalTarget' || pending?.type === 'tremor'
          let gateCost = action.manaCost
          let paidCost = action.manaCost
          if (!isFreeMultiCast && isPlayer && actionBonuses && action.manaCost > 0) {
            const reduction = actionBonuses.manaCostReduction / 100
              + (actionBonuses.manaCostRandomReductionMax > 0
                ? (Math.random() * actionBonuses.manaCostRandomReductionMax) / 100
                : 0)
            gateCost = action.manaCost * Math.max(0, 1 - reduction)
            paidCost = gateCost
            if (actionBonuses.noManaCostChance > 0 && Math.random() * 100 < actionBonuses.noManaCostChance) {
              paidCost = 0
            }
          }
          if (!isFreeMultiCast && entity.role === 'player' && rb) {
            if (rb.manaCostReduce > 0) { gateCost *= Math.max(0, 1 - rb.manaCostReduce / 100); paidCost *= Math.max(0, 1 - rb.manaCostReduce / 100) }
            if (rb.manaCostMore !== 1) { gateCost *= rb.manaCostMore; paidCost *= rb.manaCostMore }
          }
          // Gate: additionalTarget free; doubleCast may skip with repeatNoMana; manaless bypasses
          const skipGate = isFreeMultiCast
            || (pending?.type === 'doubleAction' && actionBonuses?.repeatNoMana === true)
            || (rb?.manaless === true)
          if (entity.maxMana > 0 && !skipGate && entity.currentMana < gateCost) continue

          // ── Damage computation ────────────────────────────────────────────
          // Primary cast: attackDamage (split rune halves it on the primary; not inherited)
          // Multi-action: attackDamage × inheritedDamageMult × ownMult(type)
          // Children inherit: currentInherited × ownMult × 0.9 (×0.9 per depth level)
          let effectiveDamage: number
          let childInherited: number

          if (pending) {
            let ownMult = 1.0
            if (pending.type === 'splitAction') ownMult = 0.5
            else if (pending.type === 'additionalProjectile') ownMult = 0.5 * (1 + (pb?.extraDamage ?? 0) / 100)
            else if (pending.type === 'jump') {
              const lbJ = getLightningBonuses()
              ownMult = Math.max(0, 1 - (balance.effects.jumpBaseDamagePenalty - lbJ.jumpDamagePenaltyReduce) / 100)
            }
            else if (pending.type === 'tremor') {
              ownMult = 0.5 * (1 + getAreaBonuses().tremorDamage / 100)
            }
            effectiveDamage = entity.actionDamage * pending.inheritedDamageMult * ownMult
            childInherited = pending.inheritedDamageMult * ownMult * 0.9
          } else {
            effectiveDamage = entity.actionDamage * (rb?.splitCast ? 0.5 : 1.0)
            childInherited = 0.9
          }

          // Layered bonuses applied after base × inheritance
          if (tranceActive && actionBonuses && actionBonuses.tranceDamageIncrease > 0) {
            effectiveDamage *= 1 + actionBonuses.tranceDamageIncrease / 100
          }
          if (entity.role === 'player' && action.tags.includes('fire') && hasEffect('immolation')) {
            const fb = getFireBonuses()
            if (fb.immolateDamageBonus > 0) effectiveDamage *= 1 + fb.immolateDamageBonus / 100
          }
          if (entity.role === 'player' && action.tags.includes('physical') && hasEffect('bloodlust')) {
            const pbBl = getPhysicalBonuses()
            if (pbBl.bloodlustDamage > 0) effectiveDamage *= 1 + pbBl.bloodlustDamage / 100
          }
          const isPlayerStrike = entity.role === 'player' && action.tags.includes('strike')
          const isPlayerArea = entity.role === 'player' && action.tags.includes('area')
          const totalDDC = (actionBonuses?.doubleDamageChance ?? 0)
            + (isPlayerStrike ? getStrikeBonuses().doubleDamageChance : 0)
            + (isPlayerProjectile ? (pb?.doubleDamageChance ?? 0) : 0)
            + (isPlayerArea ? getAreaBonuses().doubleDamageChance : 0)
          if (totalDDC > 0 && Math.random() * 100 < totalDDC) {
            effectiveDamage *= 2
          }
          if (pb && pb.damagePerRange > 0) {
            const rangeUnits = entity.actionRange / balance.player.radius
            effectiveDamage *= 1 + (rangeUnits * pb.damagePerRange) / 100
          }
          if (entity.role === 'player' && frenzyCharges > 0) {
            const sb = getStrikeBonuses()
            const dmgBonus = sb.frenzyFlatDamage + frenzyCharges * sb.frenzyDamagePerCharge
            if (dmgBonus > 0) effectiveDamage *= 1 + dmgBonus / 100
          }

          // ── Cycle duration ────────────────────────────────────────────────
          const tranceSpeedMult = (tranceActive && actionBonuses && actionBonuses.tranceActionSpeedIncrease > 0)
            ? 1 + actionBonuses.tranceActionSpeedIncrease / 100
            : 1
          let effectiveAttackSpeed = entity.actionSpeed
          if (entity.role === 'enemy' && isElectrocuted(entity)) {
            const lbAtk = getLightningBonuses()
            if (lbAtk.electrocuteSlowOnDamageTaken) {
              const total = balance.effects.electrocutionBaseDamageTakenPct + lbAtk.electrocuteDamageTakenIncrease
              effectiveAttackSpeed *= Math.max(0, 1 - total / 100)
            }
          }
          if (entity.role === 'enemy' && burnGroundTiles.size > 0 && isOnBurningGround(entity)) {
            const slow = getFireBonuses().burnGroundSlowAmount
            if (slow > 0) effectiveAttackSpeed *= Math.max(0, 1 - slow / 100)
          }
          if (entity.role === 'enemy' && (entity.physRotResist ?? 0) <= 0) {
            const breakSlow = getPhysicalBonuses().resistBreakSlowAtZero
            if (breakSlow > 0) effectiveAttackSpeed *= Math.max(0, 1 - breakSlow / 100)
          }
          if (entity.role === 'player' && frenzyCharges > 0) {
            const sb = getStrikeBonuses()
            const speedBonus = sb.frenzyFlatSpeed + frenzyCharges * sb.frenzySpeedPerCharge
            if (speedBonus > 0) effectiveAttackSpeed *= 1 + speedBonus / 100
          }
          if (entity.role === 'player' && action.tags.includes('physical') && hasEffect('bloodlust')) {
            const pbSpeed = getPhysicalBonuses()
            if (pbSpeed.bloodlustActionSpeed > 0) effectiveAttackSpeed *= 1 + pbSpeed.bloodlustActionSpeed / 100
          }
          if (entity.role === 'player' && hasEffect('electrified')) {
            const lbSpeed = getLightningBonuses()
            if (lbSpeed.electrifyActionSpeed > 0) effectiveAttackSpeed *= 1 + lbSpeed.electrifyActionSpeed / 100
          }
          const baseCooldown = (1000 / effectiveAttackSpeed) / tranceSpeedMult
          const preHitDuration = baseCooldown / 3

          const areaVictims: Entity[] = []
          if (action.tags.includes('area')) {
            const ab = entity.role === 'player' ? getAreaBonuses() : null
            let areaRadiusPx = (action.area ?? 0) * balance.player.radius
            if (ab) areaRadiusPx *= (1 + ab.sizeIncrease / 100) * (1 + ab.moreSize / 100)
            // Tremor: 0.5× base radius, then add tremor radius bonuses
            const isTremor = pending?.type === 'tremor'
            if (isTremor && ab) areaRadiusPx *= 0.5 * (1 + ab.tremorSize / 100)
            // Tremor always centers on the queued target (the entity that triggered it)
            const center = (isTremor || !action.selfTargeted) ? target : entity
            const enemyRole: Entity['role'] = entity.role === 'player' ? 'enemy' : 'player'
            for (const v of entities) {
              if (v.role !== enemyRole) continue
              const dx = v.x - center.x, dy = v.y - center.y
              const dist = Math.sqrt(dx * dx + dy * dy)
              if (dist - v.radius > areaRadiusPx) continue
              pendingHits.set(`${entity.id}:${++hitSeq}`, {
                attacker: entity, target: v, damage: effectiveDamage,
                action, actionId, countdown: preHitDuration,
                guaranteedAfflictions, multiActionType: pending?.type,
              })
              areaVictims.push(v)
            }
            spawnAreaPreHitVfx(entity, center, areaRadiusPx, action, preHitDuration)
          } else {
            pendingHits.set(`${entity.id}:${++hitSeq}`, {
              attacker: entity, target, damage: effectiveDamage,
              action, actionId, countdown: preHitDuration,
              guaranteedAfflictions, multiActionType: pending?.type,
            })
            spawnPreHitVfx(entity, target, action, preHitDuration)
          }

          // Lock player movement during the animation phase and cancel any active dash
          if (entity.role === 'player') {
            playerAnimLockMs = preHitDuration
            dashRemainingMs = 0
          }

          // ── Mana payment ──────────────────────────────────────────────────
          if (entity.maxMana > 0 && !isFreeMultiCast) {
            const mb = entity.role === 'player' ? getManaBonuses() : null
            const replenish = mb && mb.replenishChance > 0 && paidCost > 0
              && Math.random() * 100 < mb.replenishChance
            if (replenish) {
              entity.currentMana = Math.min(entity.maxMana, entity.currentMana + paidCost)
            } else {
              entity.currentMana = Math.max(0, entity.currentMana - paidCost)
            }
            if (entity.role === 'player') {
              playerManaSpent = true
              if (!replenish && paidCost > 0) {
                const eLevel = enemyLevels.get(target.id) ?? 1
                const xpMult = Math.pow(balance.enemyLevel.xpMultiplierPerLevel, eLevel - 1) * tierXpMult(target.id)
                awardStatXp('mana', paidCost * balance.stat.manaXpMultiplier * xpMult)
              }
            }
          }

          // ── Status triggers — all casts (including multi-actions) can trigger ──
          if (isPlayer && actionBonuses && actionBonuses.tranceTriggerChance > 0
              && Math.random() * 100 < actionBonuses.tranceTriggerChance) {
            applyEffect({ id: 'trance', iconName: 'book', kind: 'buff' }, balance.buffs.tranceDurationMs)
          }
          if (entity.role === 'player' && action.tags.includes('fire')) {
            const fb = getFireBonuses()
            if (fb.immolateChance > 0 && Math.random() * 100 < fb.immolateChance) {
              const capDps = playerEntity.maxLife * balance.effects.immolationSelfBurnCapFraction * fb.immolateDamageMult
              const rawDps = Math.min(
                effectiveDamage * balance.effects.burnDpsFraction * 0.5 * fb.immolateDamageMult,
                capDps,
              )
              const duration = balance.effects.burnBaseDurationMs * (1 + fb.burnDurationIncrease / 100)
              if (playerImmolation) {
                playerImmolation.dps = rawDps
                playerImmolation.remainingMs = duration
              } else {
                playerImmolation = { dps: rawDps, remainingMs: duration }
              }
              applyEffect({ id: 'immolation', iconName: 'flame', kind: 'mixed' }, duration)
            }
          }

          // ── Consume the pending multi-action ──────────────────────────────
          if (queue && pending) {
            queue.shift()
            if (queue.length === 0) pendingMultiActions.delete(entity.id)
          }

          // Find a different in-range enemy (null if none; used when queuing multi-actions)
          const pickOtherTarget = (): Entity | null => {
            let best: Entity | null = null
            let bestDist = Infinity
            for (const e of entities) {
              if (e === target || e.role !== 'enemy') continue
              const ex = e.x - entity.x, ey = e.y - entity.y
              const d = Math.sqrt(ex * ex + ey * ey)
              if (d - e.radius > entity.actionRange) continue
              if (d < bestDist) { bestDist = d; best = e }
            }
            return best
          }

          // Insert a multi-action into the per-entity queue sorted by priority.
          // Cap at MAX_MULTI_QUEUE so a single primary cast can't kick off a chain that
          // grows the queue faster than it drains.
          const queueMA = (type: MultiActionType, inherited: number, maTarget?: Entity, chainProjectile?: boolean, jumpedTargetIds?: Set<string>): void => {
            const arr = pendingMultiActions.get(entity.id) ?? []
            if (arr.length >= MAX_MULTI_QUEUE) return
            const idx = arr.findIndex(x => MULTI_ACTION_PRIORITY[x.type] > MULTI_ACTION_PRIORITY[type])
            const entry: PendingMultiAction = { type, inheritedDamageMult: inherited, target: maTarget }
            if (chainProjectile) entry.isChainProjectile = true
            if (guaranteedAfflictions) entry.guaranteedAfflictions = true
            if (jumpedTargetIds) entry.jumpedTargetIds = jumpedTargetIds
            if (idx === -1) arr.push(entry)
            else arr.splice(idx, 0, entry)
            pendingMultiActions.set(entity.id, arr)
          }

          // ── Roll for new multi-actions ────────────────────────────────────
          // Only the primary cast (pending === null) spawns multi-actions. Children never chain,
          // so the queue fills cleanly from one primary, drains over up to MAX_MULTI_QUEUE ticks,
          // then the primary fires again at full damage. This prevents the deep-chain decay
          // (inheritedDamageMult^N × ownMult^N) that drove per-hit damage to ~0 over a second or two.

          // additionalTarget: trance multi-target + strike additional-target + projectile additional-target (summed)
          if (!pending && entity.role === 'player') {
            let totalChance = 0
            if (tranceActive && actionBonuses) totalChance += actionBonuses.tranceMultiTargetChance
            if (action.tags.includes('strike')) {
              const sb = getStrikeBonuses()
              totalChance += sb.additionalTargetChance * (1 + sb.additionalTargetMore / 100)
            }
            if (isPlayerProjectile && pb) totalChance += pb.additionalTargetChance
            if (totalChance > 0 && Math.random() * 100 < totalChance) {
              const extra = pickOtherTarget()
              if (extra) queueMA('additionalTarget', childInherited, extra)
            }
          }

          // doubleAction
          if (!pending && isPlayer && actionBonuses
              && actionBonuses.doubleActionChance > 0
              && Math.random() * 100 < actionBonuses.doubleActionChance) {
            queueMA('doubleAction', childInherited)
          }

          // additionalProjectile
          if (!pending && isPlayerProjectile && pb && pb.extraChance > 0
              && Math.random() * 100 < pb.extraChance) {
            queueMA('additionalProjectile', childInherited, pickOtherTarget() ?? (target as Entity), false)
          }

          // splitCast (key rune)
          if (!pending && entity.role === 'player' && rb?.splitCast) {
            queueMA('splitAction', childInherited)
          }

          // jump: on any lightning-tagged player primary hit
          if (!pending && entity.role === 'player' && action.tags.includes('lightning')) {
            const lbJump = getLightningBonuses()
            if (lbJump.jumpChance > 0 && Math.random() * 100 < lbJump.jumpChance) {
              const jumpedSoFar = new Set<string>()
              jumpedSoFar.add((target as Entity).id)
              const jumpRange = entity.actionRange * (1 + lbJump.jumpRangeIncrease / 100)
              const jumpTarget = selectJumpTarget(target as Entity, jumpedSoFar, jumpRange)
              if (jumpTarget) queueMA('jump', childInherited, jumpTarget, false, jumpedSoFar)
            }
          }

          // tremor: roll once per non-primary area victim
          if (!pending && isPlayerArea && areaVictims.length > 0) {
            const tremorChance = getAreaBonuses().tremorChance
            if (tremorChance > 0) {
              for (const v of areaVictims) {
                if (v === target) continue
                if (Math.random() * 100 < tremorChance) {
                  queueMA('tremor', childInherited, v)
                }
              }
            }
          }

          // ── Set cooldown ──────────────────────────────────────────────────
          const nextQueue = pendingMultiActions.get(entity.id)
          actionCooldowns.set(entity.id,
            nextQueue && nextQueue.length > 0
              ? baseCooldown / MULTI_ACTION_COOLDOWN_DIV[nextQueue[0].type]
              : baseCooldown)
        }
        if (playerManaSpent) updateBars()

        // ── Burning effect tick (registers burned entities for death pass) ─
        tickBurns(ticker.deltaMS, damagedIds)
        tickBleeds(ticker.deltaMS, damagedIds)
        tickBurnGrounds(ticker.deltaMS, damagedIds)
        tickElectrocutions(ticker.deltaMS)
        tickKnockbacks(ticker.deltaMS)
        tickElectrocuteEffects()
        tickBurnEffects()
        tickBleedEffects()
        tickBurnGroundEffects()

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
    clearInterval(dpsMeterInterval)
    if (enemySpawnTimeout !== null) { clearTimeout(enemySpawnTimeout); enemySpawnTimeout = null }
    if (modalCleanup) { modalCleanup(); modalCleanup = null }
    unmountSettings()
    for (const f of deathFragments) f.g.destroy()
    deathFragments.length = 0
    for (const v of vfxList) v.g.destroy()
    vfxList.length = 0
    for (const g of electrocuteGraphics.values()) g.destroy()
    electrocuteGraphics.clear()
    for (const g of burnGroundGraphics.values()) g.destroy()
    burnGroundGraphics.clear()
    burnGroundTiles.clear()
    burnGroundAccum.clear()
    blockedTiles.clear()
    generatedChunks.clear()
    chunkBodies.clear()
    entityPaths.clear()
    Matter.Composite.clear(physicsEngine.world, false)
    Matter.Engine.clear(physicsEngine)
    app?.destroy(true)
    app = null
    el.remove()
  }
}

function mountBattleConfigModal(
  parent: HTMLElement,
  currentActionId: ActionId,
  onSelectAction: (id: ActionId) => void,
  onClose: () => void,
): () => void {
  let selectedActionId = currentActionId

  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop'

  const panel = document.createElement('div')
  panel.className = 'modal-panel battle-config-panel'
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-modal', 'true')
  panel.innerHTML = `
    <button class="modal-close-btn" data-action="close" aria-label="Close"></button>
    <h2 class="modal-title">${t('game', 'triggersTitle')}</h2>
    <div class="trigger-list"></div>
  `

  const triggerList = panel.querySelector<HTMLElement>('.trigger-list')!

  function renderTriggerCard(): void {
    const action = getAction(selectedActionId)
    triggerList.innerHTML = ''

    const wrap = document.createElement('div')
    wrap.className = 'action-trigger-wrap'

    const title = document.createElement('div')
    title.className = 'action-trigger-title'
    title.textContent = t('game', 'triggerAutoAction')
    wrap.appendChild(title)

    const card = document.createElement('button')
    card.className = 'action-trigger-card'
    card.appendChild(buildActionThumbnail(action))
    wrap.appendChild(card)

    triggerList.appendChild(wrap)

    card.addEventListener('click', () => {
      mountActionPickerModal(
        parent,
        allActions,
        selectedActionId,
        (id) => {
          selectedActionId = id as ActionId
          onSelectAction(id as ActionId)
          renderTriggerCard()
        },
        () => { /* picker closed */ },
      )
    })

    refreshActionThumbnailIcons()
  }

  const dismiss = () => { backdrop.remove(); onClose() }
  panel.querySelector<HTMLButtonElement>('[data-action="close"]')!
    .addEventListener('click', dismiss)

  backdrop.appendChild(panel)
  backdrop.addEventListener('click', e => { if (e.target === backdrop) dismiss() })

  parent.appendChild(backdrop)
  renderTriggerCard()
  return () => backdrop.remove()
}

function actionXpNeeded(level: number): number {
  return Math.round(balance.action.xpPerLevel * Math.pow(balance.action.xpGrowth, level - 1))
}

function statXpNeeded(level: number): number {
  return Math.round(balance.stat.xpPerLevel * Math.pow(balance.stat.xpGrowth, level - 1))
}

function enemyMaxLevelXpNeeded(maxLevel: number): number {
  return Math.round(balance.enemyLevel.xpPerMaxLevel * Math.pow(balance.enemyLevel.xpGrowth, maxLevel - 1))
}

// Box-Muller transform: standard normal sample (mean 0, variance 1).
function gaussian(): number {
  const u = 1 - Math.random()
  const v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

// One-shot deterministic hash for a tile coordinate, returns [0, 1).
// Uses the same mulberry32 pattern as chunkRng but evaluates a single step.
function tileHash(tx: number, ty: number): number {
  const ux = tx >= 0 ? tx * 2 : -tx * 2 - 1
  const uy = ty >= 0 ? ty * 2 : -ty * 2 - 1
  let s = ((Math.imul(ux, 73856093) ^ Math.imul(uy, 19349663)) >>> 0) || 1
  s = (Math.imul(s ^ (s >>> 15), s | 1) ^ (s + Math.imul(s ^ (s >>> 7), s | 61))) >>> 0
  return s / 0x100000000
}

// Pick a texture from a weighted list, deterministically by tile coordinate.
function pickWeighted(tx: number, ty: number, options: { tex: Texture; w: number }[]): Texture {
  const total = options.reduce((s, o) => s + o.w, 0)
  let r = tileHash(tx, ty) * total
  for (const o of options) {
    r -= o.w
    if (r < 0) return o.tex
  }
  return options[options.length - 1].tex
}

// Deterministic per-chunk PRNG (mulberry32 variant). Negative coords handled
// by mapping integers to non-negative before hashing.
function chunkRng(cx: number, cy: number): () => number {
  const ux = cx >= 0 ? cx * 2 : -cx * 2 - 1
  const uy = cy >= 0 ? cy * 2 : -cy * 2 - 1
  let s = ((Math.imul(ux, 73856093) ^ Math.imul(uy, 19349663)) >>> 0) || 1
  return function () {
    s = (Math.imul(s ^ (s >>> 15), s | 1) ^ (s + Math.imul(s ^ (s >>> 7), s | 61))) >>> 0
    return s / 0x100000000
  }
}

const ASTAR_PAD = 20

function astar(
  fromTx: number, fromTy: number,
  toTx: number,   toTy: number,
  blocked: Set<string>,
): { tx: number; ty: number }[] {
  if (fromTx === toTx && fromTy === toTy) return []
  const minX = Math.min(fromTx, toTx) - ASTAR_PAD
  const minY = Math.min(fromTy, toTy) - ASTAR_PAD
  const maxX = Math.max(fromTx, toTx) + ASTAR_PAD
  const maxY = Math.max(fromTy, toTy) + ASTAR_PAD
  const w = maxX - minX + 1
  const h = maxY - minY + 1
  const grid = new PF.Grid(w, h)

  for (let ty = minY; ty <= maxY; ty++) {
    for (let tx = minX; tx <= maxX; tx++) {
      if (blocked.has(`${tx},${ty}`)) grid.setWalkableAt(tx - minX, ty - minY, false)
    }
  }

  // Force start/end walkable so entities that physics has pushed slightly
  // adjacent to a wall can still initiate a path.
  const sx = fromTx - minX, sy = fromTy - minY
  const ex = toTx   - minX, ey = toTy   - minY
  grid.setWalkableAt(sx, sy, true)
  grid.setWalkableAt(ex, ey, true)

  const finder = new PF.AStarFinder({ diagonalMovement: PF.DiagonalMovement.OnlyWhenNoObstacles })
  const raw = finder.findPath(sx, sy, ex, ey, grid)
  return raw.map(([x, y]) => ({ tx: x + minX, ty: y + minY }))
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
