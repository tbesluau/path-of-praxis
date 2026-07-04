import { Application, Container, Graphics, Sprite, Text, Texture } from 'pixi.js'
import * as Matter from 'matter-js'
import * as PF from 'pathfinding'
import { createIcons, ArrowLeft, Play, Pause, Settings2, Award, Sword, Flame, Zap, User, Book, Drumstick, Swords, Droplets, ArrowUp, Star, Snowflake, Skull } from 'lucide'
import { tokens } from '../theme'
import { t } from '../i18n'
import { getCurrentCharacter, saveCharacterState, masteryPointsAvailable, defaultMasteryNodes, defaultActionRunes, computeAward, universePointsForAscent, STOCKPILE_MAX_MS, STOCKPILE_DOUBLED_MAX_MS, AWAY_DETECT_MS, type ActionProgress, type StatProgress, type EnemyProgress, type TargetingMode, type MasteryProgress, type RunProgress, type ActionRunes, type UniversePointAllocations, type ExtraActionSlot, type TriggerType } from '../core/character'
import { allMasteries, masteryCategories, previewMasteryGain, nodeCost, nodeType, type MasteryId, type ActionTag } from '../config/masteries'
import { computeActionBonuses, computeLifeBonuses, computeManaBonuses, computeFireBonuses, computeEnemyBonuses, computeProjectileBonuses, computeLightningBonuses, computeStrikeBonuses, computePhysicalBonuses, computeAreaBonuses, computeMovementBonuses, computeCriticalHitBonuses, computeColdBonuses, computeRotBonuses, computeBlockBonuses, getActionNodeEffect, getLifeNodeEffect, getManaNodeEffect, getFireNodeEffect, getLightningNodeEffect, getStrikeNodeEffect, getPhysicalNodeEffect, getAreaNodeEffect, getProjectileNodeEffect, getCriticalHitNodeEffect, getColdNodeEffect, getRotNodeEffect, MASTERY_DUMP, type ActionBonuses, type LifeBonuses, type ManaBonuses, type FireBonuses, type EnemyBonuses, type ProjectileBonuses, type LightningBonuses, type StrikeBonuses, type PhysicalBonuses, type AreaBonuses, type MovementBonuses, type CriticalHitBonuses, type ColdBonuses, type RotBonuses, type BlockBonuses } from '../config/mastery-nodes'
import { mountMasteryModal, renderMasteryBar } from '../ui/mastery'
import { mountAscentModal } from '../ui/ascent'
import { mountArtifactsModal, mountArtifactCardModal } from '../ui/artifacts'
import { rollArtifact, computeArtifactMods, maxEquippedArtifacts, maxBaggedArtifacts, scrapsForArtifact, upgradeCost, upgradeArtifact, ZERO_ARTIFACT_MODS, type Artifact, type ArtifactMods } from '../config/artifacts'
import { ALL_RELICS, ascentsGainedFor, type RelicId } from '../config/relics'
import { mountAwayBonusModal } from '../ui/away-bonus'
import { mountRefillAdModal } from '../ui/refill-ad'
import { isPaid } from '../core/entitlement'
import { adsAvailable, type AdLifecycle } from '../ads'
import { setGameplayActive } from '../sdk/crazygames-gameplay'
import { createPlayerEntity, createEnemyEntity, nearestTarget } from '../core/entity'
import type { Entity } from '../core/entity'
import { balance } from '../config/balance'
import { allActions, getAction, randomAction, getActionLabel, type ActionId, type ActionDef } from '../config/actions'
import type { SceneId } from '../core/router'
import { mountSettingsButton, mountGuideModal } from '../ui/settings'
import { hiddenGuideSectionIds } from '../core/guide-visibility'
import { showTutorial, isTutorialSeen, getTutorialMessage } from '../ui/tutorial'
import { mountNoteModal, getNoteTitle } from '../ui/notes'
import { mountCharacterModal } from '../ui/character'
import { mountCharacterCustomizeModal } from '../ui/character-customize'
import { mountCharacterStatsModal, type PlayerStatsSnapshot, type StatFactor, type StatLine, type OddsLine, type ActionStatBlock } from '../ui/character-stats'
import { mountActionPickerModal, buildActionThumbnail, refreshActionThumbnailIcons, type ActionThumbXp } from '../ui/action-picker'
import { getPrefs, setPref, isCheatMode } from '../core/prefs'
import { computeRuneBonuses, SLOT_TYPES, runesByType, unlockedSlotCount, type RuneId } from '../config/runes'
import { mountRunesModal } from '../ui/runes'
import { playSound, preloadSounds, essenceSfxId } from '../audio'
import { loadTileTextures } from '../assets/tile-svgs'
import { preloadEntityArt, weaponForAction, type Tier, type HeadVariant, type PlayerColorKey, type ShieldVariant } from '../assets/entity-art'
import { createEntityRig, rigTopOffset, type EntityRig } from './entity-rig'
import { createBackgroundTicker, type BackgroundTicker } from '../core/background-ticker'
import { trackEvent } from '../core/analytics'

const HP_BAR_H = 4
const HP_BAR_GAP = 4
const HUD_HEIGHT = 0
const SAVE_INTERVAL_MS = 10_000
const MATTER_BASE_DT = 1 / 60
const PHYSICS_MAX_STEP_MS = 1000 / 60
// Background simulation: how often the worker tries to pump the ticker while the
// tab is hidden (browsers clamp hidden timers to ~1 Hz regardless), and the most
// wall-clock time a single pump will catch up. The cap stays under AWAY_DETECT_MS
// so that anything longer (a deep OS suspend that freezes even the worker) falls
// through to the existing away/stockpile path instead of being fast-simulated.
//
// BG_STEP_MS must match the visible frame cadence (~1/60 s). The per-tick action
// loop fires each entity at most once and resets its cooldown to the full base
// value, so a step larger than an actor's cooldown throttles its fire rate. At
// 100 ms that capped fast attackers (cooldown < 100 ms) to ~10 hits/s while
// hidden, starving the player's per-hit-capped life steal and slowing clears —
// causing deaths that never happen while visible. Stepping at one frame makes the
// hidden sim advance identically to the foreground (combat, life steal, projectile
// travel, afflictions all fine-grained). Worst-case work per pump is bounded by
// BG_MAX_CATCHUP_MS / BG_STEP_MS sub-ticks, matching 60 fps compute — only while
// hidden, with no rendering.
const BG_TICK_INTERVAL_MS = 250
const BG_STEP_MS = PHYSICS_MAX_STEP_MS  // one frame (~16.67 ms); see note above
const BG_MAX_CATCHUP_MS = 1900

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
  onComplete?: () => void
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
  let masteryDumpPoints: Partial<Record<MasteryId, number>> = { ...(char?.masteryDumpPoints ?? {}) }

  // Artifacts — deep-copied so mutations don't bleed into the cached Character.
  // Declared early (ahead of the bonus getters that fold in artifactMods and the
  // setup-time recomputeArtifactMods() call) to avoid a temporal-dead-zone access.
  let artifacts: Artifact[] = JSON.parse(JSON.stringify(char?.artifacts ?? [])) as Artifact[]
  let artifactMods: ArtifactMods = { ...ZERO_ARTIFACT_MODS }
  let scraps = char?.scraps ?? 0

  // Transcendence — also declared early: computePlayerMaxLife() (and the
  // transcend power multipliers) run during scene construction, well before
  // the mid-file state block executes.
  let transcendCount = char?.transcendCount ?? 0
  let relics: RelicId[] = [...(char?.relics ?? [])]
  let transcendReady = char?.transcendReady ?? false
  let freeRebirthUsed = char?.runProgress?.freeRebirthUsed ?? false
  let charNotifSeen = char?.runProgress?.charNotifSeen ?? false

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
    const level = actionProgress[id]?.level ?? 1
    return computeRuneBonuses(getActionRunes(id).selected, level)
  }

  function enemyDamageScale(): number {
    // Low-level damage penalty: 0.5× at L1, +0.05 per level, capped at 1.0× from L11
    const lowLevelPenalty = Math.min(1, 0.5 + 0.05 * (enemyProgress.level - 1))
    return Math.pow(balance.enemyLevel.damageMultiplier, enemyProgress.level - 1) * lowLevelPenalty
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
    moveSpeed: balance.player.moveSpeed * (1 + (char?.ascentCount ?? 0) * balance.ascent.moveSpeedPerAscent),
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

  function dumpedFor(id: MasteryId): number {
    return masteryDumpPoints[id] ?? 0
  }

  function getActionBonuses(): ActionBonuses {
    const b = computeActionBonuses(masteryNodes('action', 5), dumpedFor('action'))
    b.moreDamage += artifactMods.globalMoreDamage
    b.moreActionSpeed += artifactMods.globalActionSpeedMore
    b.lessActionSpeed += artifactMods.actionSpeedLess
    b.doubleDamageChance += artifactMods.doubleDamageChance
    b.doubleActionChance += artifactMods.doubleActionChance
    return b
  }

  function getCriticalHitBonuses(): CriticalHitBonuses {
    return computeCriticalHitBonuses(masteryNodes('criticalHit', 5), dumpedFor('criticalHit'))
  }

  // Universe point A: +10% multi-action speed per point (queue cap and cooldown div scale together).
  function multiActionSpeedMult(): number {
    return 1 + universePointAllocations.placeholderA * 0.10
  }

  // Total additive crit-base-chance bonus, in percentage points. Combines the
  // Critical Chance major node and the universe point B allocation (+1% each).
  function critBaseAddTotal(): number {
    return getCriticalHitBonuses().chanceBaseAdd + universePointAllocations.placeholderB
  }

  // Universe point C: +7% more damage per point (global multiplier on all player damage).
  function universeDamageMult(): number {
    return 1 + universePointAllocations.placeholderC * balance.ascent.universePointDamagePerPoint
  }

  // Universe point D: +4% more action speed per point (global multiplier on all player action speed).
  function universeActionSpeedMult(): number {
    return 1 + universePointAllocations.placeholderD * balance.ascent.universePointActionSpeedPerPoint
  }

  function hasRelic(id: RelicId): boolean {
    return relics.includes(id)
  }

  // Transcendence power: +10% increased XP/damage per transcendence (additive
  // with itself), times the onslaught relic's 10% more (multiplicative).
  function transcendXpMult(): number {
    return (1 + transcendCount * balance.transcend.xpPerTranscend)
      * (hasRelic('onslaught') ? 1 + balance.transcend.onslaughtMoreXp : 1)
  }

  function transcendDamageMult(): number {
    return (1 + transcendCount * balance.transcend.damagePerTranscend)
      * (hasRelic('onslaught') ? 1 + balance.transcend.onslaughtMoreDamage : 1)
  }

  // Active extra trigger slots: ascent-gated 0/1/2, +1 with the extraTrigger
  // relic, capped at 3. Damage penalties are positional (see balance.transcend).
  function activeExtraSlotCount(): number {
    const gated = ascentCount >= balance.ascent.slot3UnlockAscent ? 2
      : ascentCount >= balance.ascent.slot2UnlockAscent ? 1 : 0
    return Math.min(3, gated + (hasRelic('extraTrigger') ? 1 : 0))
  }

  function getLifeBonuses(): LifeBonuses {
    return computeLifeBonuses(masteryNodes('life', 5), dumpedFor('life'))
  }

  function getBlockBonuses(): BlockBonuses {
    return computeBlockBonuses(masteryNodes('block', 5), dumpedFor('block'))
  }

  function getManaBonuses(): ManaBonuses {
    return computeManaBonuses(masteryNodes('mana', 5), dumpedFor('mana'))
  }

  function getFireBonuses(): FireBonuses {
    const b = computeFireBonuses(masteryNodes('fire', 5), dumpedFor('fire'))
    b.moreDamage += artifactMods.fireMoreDamage
    b.actionSpeedIncrease += artifactMods.fireActionSpeedAdd
    b.burnMoreDamage += artifactMods.burnMoreDamage
    return b
  }

  function getEnemyBonuses(): EnemyBonuses {
    const nodes = masteryNodes('enemy', 5)
    if (ascentCount < 2 && !getPrefs().fullMastery) nodes[2] = []
    return computeEnemyBonuses(nodes, dumpedFor('enemy'))
  }

  function getProjectileBonuses(): ProjectileBonuses {
    const b = computeProjectileBonuses(masteryNodes('projectile', 5), dumpedFor('projectile'))
    b.rangeMore += artifactMods.rangeMore
    return b
  }

  function getLightningBonuses(): LightningBonuses {
    const b = computeLightningBonuses(masteryNodes('lightning', 5), dumpedFor('lightning'))
    b.moreDamage += artifactMods.lightningMoreDamage
    b.moreActionSpeed += artifactMods.lightningMoreActionSpeed
    b.electrocuteDamageTakenIncrease += artifactMods.electrocuteEffectAdd
    return b
  }

  function getStrikeBonuses(): StrikeBonuses {
    const b = computeStrikeBonuses(masteryNodes('strike', 5), dumpedFor('strike'))
    b.moreRange += artifactMods.rangeMore
    return b
  }

  function getPhysicalBonuses(): PhysicalBonuses {
    const b = computePhysicalBonuses(masteryNodes('physical', 5), dumpedFor('physical'))
    b.moreDamage += artifactMods.physicalMoreDamage
    b.actionSpeedIncrease += artifactMods.physicalActionSpeedAdd
    b.bleedMoreDamage += artifactMods.bleedMoreDamage
    return b
  }

  function getColdBonuses(): ColdBonuses {
    const b = computeColdBonuses(masteryNodes('cold', 5), dumpedFor('cold'))
    b.moreDamage += artifactMods.coldMoreDamage
    b.actionSpeedIncrease += artifactMods.coldActionSpeedAdd
    b.frostSlowIncrease += artifactMods.frostEffectAdd
    return b
  }

  function getRotBonuses(): RotBonuses {
    const b = computeRotBonuses(masteryNodes('rot', 5), dumpedFor('rot'))
    b.moreDamage += artifactMods.rotMoreDamage
    b.actionSpeedIncrease += artifactMods.rotActionSpeedAdd
    b.poisonMoreDamage += artifactMods.poisonMoreDamage
    return b
  }

  function getAreaBonuses(): AreaBonuses {
    const b = computeAreaBonuses(masteryNodes('area', 5), dumpedFor('area'))
    b.moreSize += artifactMods.areaMore
    return b
  }

  function getMovementBonuses(): MovementBonuses {
    return computeMovementBonuses(masteryNodes('movement', 4), dumpedFor('movement'))
  }

  function recomputeArtifactMods(): void {
    artifactMods = computeArtifactMods(artifacts)
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

  // ── Poison affliction (rot-tagged hits) ─────────────────────────────────
  // Multi-stack system (same as burn): all stacks tick simultaneously, damage summed.
  // Base dps = hitDamage × poisonBaseDamagePct/100 (mastery bonuses applied at tick time).
  interface PoisonStack { dps: number; remainingMs: number; sourceActionId: ActionId }
  const poisonStacks = new Map<string, PoisonStack[]>()
  const poisonAccum  = new Map<string, { damage: number; timeMs: number }>()

  // ── Green Veins player buff (rot mastery — Green Veins tree) ────────────
  // Charges on poison applications; on threshold fires, gain 1 Green Vein stack and
  // restart the 10-second buff window. Stacks clear when the timer expires.
  let greenVeinsStacks      = 0
  let greenVeinsTimer       = 0   // ms remaining on the buff (0 = no buff)
  let totalPoisonApplications = 0 // poison applications since last threshold reset

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

  // ── Frost affliction (cold-tagged hits) ──────────────────────────────────
  // One entry per entity: remaining duration ms. Immune while active — no refresh on re-apply.
  const frostTimers = new Map<string, number>()
  // Per-entity block cooldowns (ms until the entity may block again). Generic —
  // only the player has block params today, but enemies may block later.
  const blockCooldowns = new Map<string, number>()
  // Per-entity frost Graphics (icy aura) attached to the entity's Container child list.
  const frostEffectGraphics = new Map<string, Graphics>()
  let totalFrostRolls = 0   // cumulative successful frost rolls per life; drives the frozen armor threshold
  let frozenArmorStacks = 0
  let frozenArmorDecayTimer = 0
  // Per-entity burn/bleed/poison Graphics attached to the entity's Container child list.
  const burnEffectGraphics   = new Map<string, Graphics>()
  const bleedEffectGraphics  = new Map<string, Graphics>()
  const poisonEffectGraphics = new Map<string, Graphics>()

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

  function hasAnyAffliction(entity: Entity): boolean {
    return burnStacks.has(entity.id) || bleedStacks.has(entity.id) || electrocuteStacks.has(entity.id) || frostTimers.has(entity.id) || poisonStacks.has(entity.id)
  }

  function isPoisoned(entity: Entity): boolean {
    const stacks = poisonStacks.get(entity.id)
    return stacks !== undefined && stacks.length > 0
  }

  function tickElectrocutions(deltaMs: number): void {
    for (const [id, remaining] of [...electrocuteStacks]) {
      const updated = remaining - deltaMs
      if (updated <= 0) electrocuteStacks.delete(id)
      else electrocuteStacks.set(id, updated)
    }
  }

  function tickFrosts(deltaMs: number): void {
    for (const [id, remaining] of [...frostTimers]) {
      const updated = remaining - deltaMs
      if (updated <= 0) frostTimers.delete(id)
      else frostTimers.set(id, updated)
    }
  }

  function tickBlockCooldowns(deltaMs: number): void {
    for (const [id, remaining] of [...blockCooldowns]) {
      const updated = remaining - deltaMs
      if (updated <= 0) blockCooldowns.delete(id)
      else blockCooldowns.set(id, updated)
    }
  }

  interface BlockParams {
    chancePct: number
    blockedPct: number
    cooldownMs: number
    healPct: number
    suppressAfflictions: boolean
  }

  // The player's shield (non-weapon hand) — visible only while Block is
  // enabled, i.e. from the first Transcendence (same gate as blockParamsFor).
  function playerShieldVariant(): ShieldVariant | null {
    if (transcendCount < 1 && !getPrefs().fullMastery) return null
    return (getPrefs().playerShieldVariant as ShieldVariant | undefined) ?? 'buckler'
  }

  // Resolves an entity's block parameters, or null when it cannot block.
  // Generic seam for future enemy blocking; today only the player blocks,
  // and only once Transcendence has been reached (live check, like crit's
  // ascent gate in critChanceForAction).
  function blockParamsFor(entity: Entity): BlockParams | null {
    if (entity.role !== 'player') return null
    if (transcendCount < 1 && !getPrefs().fullMastery) return null
    const bb = getBlockBonuses()
    return {
      chancePct: balance.block.baseChancePct * (1 + bb.chanceIncrease / 100) * (1 + bb.moreChance / 100),
      blockedPct: Math.min(100, balance.block.baseBlockedPct * (1 + bb.amountIncrease / 100)),
      cooldownMs: balance.block.baseCooldownMs / (1 + bb.recoveryIncrease / 100),
      healPct: bb.healOnBlockPct,
      suppressAfflictions: bb.noAfflictions,
    }
  }

  function tickFrozenArmor(deltaMs: number): void {
    if (frozenArmorStacks === 0) { frozenArmorDecayTimer = 0; return }
    // Stacks deplete one at a time; the Frozen Armor tree can slow the interval.
    const decayMs = balance.frozenArmor.stackDecayMs * (1 + getColdBonuses().frozenArmorSlowerDepletion / 100)
    frozenArmorDecayTimer += deltaMs
    let changed = false
    while (frozenArmorDecayTimer >= decayMs && frozenArmorStacks > 0) {
      frozenArmorStacks--
      frozenArmorDecayTimer -= decayMs
      changed = true
    }
    if (frozenArmorStacks === 0) frozenArmorDecayTimer = 0
    if (changed) renderBuffBar()
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

  function tickFrostEffects(): void {
    if (!app) return
    const frame = Math.floor(Date.now() / 90)

    for (const id of frostTimers.keys()) {
      const entity = entities.find(e => e.id === id)
      if (!entity) continue
      const container = entityContainers.get(id)
      if (!container) continue

      let g = frostEffectGraphics.get(id)
      if (!g) {
        g = new Graphics()
        container.addChild(g)
        frostEffectGraphics.set(id, g)
      }

      g.clear()
      const r = entity.radius

      // Pale blue chilled glow surrounding the body
      g.circle(0, 0, r + 3)
      g.fill({ color: 0x88ccff, alpha: 0.16 })

      // Ring of ice crystal shards pointing outward, slowly rotating
      const shards = 8
      for (let i = 0; i < shards; i++) {
        const a = (i / shards) * Math.PI * 2 + frame * 0.04
        const baseX = Math.cos(a) * (r + 1)
        const baseY = Math.sin(a) * (r + 1)
        const tipX = Math.cos(a) * (r + 7)
        const tipY = Math.sin(a) * (r + 7)
        // Perpendicular for the shard's width
        const px = -Math.sin(a), py = Math.cos(a)
        const w = 2.2
        g.moveTo(baseX + px * w, baseY + py * w)
        g.lineTo(tipX, tipY)
        g.lineTo(baseX - px * w, baseY - py * w)
        g.closePath()
        g.fill({ color: i % 2 ? 0xcceeff : 0x99d6ff, alpha: 0.8 })
      }

      // Faint outer frost ring
      g.circle(0, 0, r + 6)
      g.stroke({ color: 0xbbe6ff, width: 1, alpha: 0.4 })
    }

    // Remove graphics for entities no longer frosted
    for (const [id, g] of [...frostEffectGraphics]) {
      if (!frostTimers.has(id)) {
        g.destroy()
        frostEffectGraphics.delete(id)
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

  function tickPoisonEffects(): void {
    if (!app) return
    const now = Date.now()
    const pulse = 0.5 + 0.5 * Math.sin(now / 250)

    for (const id of poisonStacks.keys()) {
      const entity = entities.find(e => e.id === id)
      if (!entity) continue
      const container = entityContainers.get(id)
      if (!container) continue

      let g = poisonEffectGraphics.get(id)
      if (!g) {
        g = new Graphics()
        container.addChild(g)
        poisonEffectGraphics.set(id, g)
      }

      g.clear()
      const r = entity.radius

      // Pulsing outer ring
      g.circle(0, 0, r + 2 + pulse * 5)
      g.stroke({ color: 0x44cc44, width: 2, alpha: 0.35 + pulse * 0.5 })

      // Green inner tint
      g.circle(0, 0, r)
      g.fill({ color: 0x228822, alpha: 0.07 + pulse * 0.11 })
    }

    for (const [id, g] of [...poisonEffectGraphics]) {
      if (!poisonStacks.has(id)) { g.destroy(); poisonEffectGraphics.delete(id) }
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
      if (!entity) continue
      let maxStack = stacks[0]
      for (const s of stacks) if (s.dps > maxStack.dps) maxStack = s
      const totalDps = stacks.reduce((sum, s) => sum + s.dps, 0)
      let tickDmg = totalDps * dts
      if (tickDmg <= 0) continue

      if (entity.role === 'player') {
        // Player-targeted burn: apply elemental resistance, no XP, no DPS attribution.
        const elemRes = Math.max(0, Math.min(100, getLifeBonuses().elementalResistance))
        tickDmg *= 1 - elemRes / 100
        if (tickDmg <= 0) continue
        const prev = entity.currentLife
        entity.currentLife = Math.max(0, entity.currentLife - tickDmg)
        const actual = prev - entity.currentLife
        if (actual > 0) {
          const acc = burnAccum.get(entityId) ?? { damage: 0, timeMs: 0 }
          acc.damage += actual
          burnAccum.set(entityId, acc)
          damagedIds.add(entityId)
        }
        continue
      }

      const prev = entity.currentLife
      entity.currentLife = Math.max(0, entity.currentLife - tickDmg)
      const actual = prev - entity.currentLife
      if (actual > 0) {
        const eLevel = enemyLevels.get(entity.id) ?? 1
        const xpMult = Math.pow(balance.enemyLevel.xpMultiplierPerLevel, eLevel - 1) * tierXpMult(entity.id)
        awardXp(maxStack.sourceActionId, actual * xpMult)
        if (enemyProgress.level === enemyProgress.maxLevel) awardEnemyXp(actual)
        awardAscentXp(actual)
        recordDps(maxStack.sourceActionId, actual, 'affliction:burn')
        if (getLifeBonuses().stealFromAfflictions) { applyLifeSteal(actual); applyManaSteal(actual) }
        const acc = burnAccum.get(entityId) ?? { damage: 0, timeMs: 0 }
        acc.damage += actual
        burnAccum.set(entityId, acc)
        damagedIds.add(entityId)
        if (bossEntities.has(entityId)) { bossLastHitWasAffl.set(entityId, true); bossLastHitWasCrit.set(entityId, false) }
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
      if (!entity) continue
      const isPlayerTarget = entity.role === 'player'
      // Player-targeted bleed ignores player-side mastery bonuses (those buff outgoing bleed).
      const effectiveDps = isPlayerTarget
        ? stack.baseDps * (1 + stack.stackedIncrease / 100)
        : stack.baseDps
            * (1 + stack.stackedIncrease / 100)
            * (1 + pb.bleedDamageIncrease / 100)
            * (1 + pb.bleedMoreDamage / 100)
            * Math.max(0, 1 - pb.bleedLessDamage / 100)
            * pb.bleedDamageMult
      let tickDmg = effectiveDps * dts
      if (tickDmg <= 0) {
        stack.remainingMs -= deltaMs
        if (stack.remainingMs <= 0) bleedStacks.delete(entityId)
        continue
      }

      if (isPlayerTarget) {
        const physRes = Math.max(0, Math.min(100, getLifeBonuses().physRotResistance))
        tickDmg *= 1 - physRes / 100
        if (tickDmg > 0) {
          const prev = entity.currentLife
          entity.currentLife = Math.max(0, entity.currentLife - tickDmg)
          const actual = prev - entity.currentLife
          if (actual > 0) {
            const acc = bleedAccum.get(entityId) ?? { damage: 0, timeMs: 0 }
            acc.damage += actual
            bleedAccum.set(entityId, acc)
            damagedIds.add(entityId)
          }
        }
        stack.remainingMs -= deltaMs
        if (stack.remainingMs <= 0) bleedStacks.delete(entityId)
        continue
      }

      const prev = entity.currentLife
      entity.currentLife = Math.max(0, entity.currentLife - tickDmg)
      const actual = prev - entity.currentLife
      if (actual > 0) {
        const eLevel = enemyLevels.get(entity.id) ?? 1
        const xpMult = Math.pow(balance.enemyLevel.xpMultiplierPerLevel, eLevel - 1) * tierXpMult(entity.id)
        awardXp(stack.sourceActionId, actual * xpMult)
        if (enemyProgress.level === enemyProgress.maxLevel) awardEnemyXp(actual)
        awardAscentXp(actual)
        recordDps(stack.sourceActionId, actual, 'affliction:bleed')
        if (getLifeBonuses().stealFromAfflictions) { applyLifeSteal(actual); applyManaSteal(actual) }
        const acc = bleedAccum.get(entityId) ?? { damage: 0, timeMs: 0 }
        acc.damage += actual
        bleedAccum.set(entityId, acc)
        damagedIds.add(entityId)
        if (bossEntities.has(entityId)) { bossLastHitWasAffl.set(entityId, true); bossLastHitWasCrit.set(entityId, false) }
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

  // Tick poison: all stacks deal damage simultaneously (burn model).
  // Mastery bonuses applied at tick time; resist and weakening multipliers applied per entity.
  function tickPoisons(deltaMs: number, damagedIds: Set<string>): void {
    if (poisonStacks.size === 0 && poisonAccum.size === 0) return
    const dts = deltaMs / 1000
    const rb = getRotBonuses()

    for (const [entityId, stacks] of poisonStacks) {
      const entity = entities.find(e => e.id === entityId)
      if (!entity) continue
      let maxStack = stacks[0]
      for (const s of stacks) if (s.dps > maxStack.dps) maxStack = s
      const totalDps = stacks.reduce((sum, s) => sum + s.dps, 0)
      let tickDmg = totalDps * dts
      if (tickDmg <= 0) continue

      if (entity.role === 'player') {
        const physRotRes = Math.max(0, Math.min(100, getLifeBonuses().physRotResistance))
        tickDmg *= 1 - physRotRes / 100
        if (tickDmg <= 0) continue
        const prev = entity.currentLife
        entity.currentLife = Math.max(0, entity.currentLife - tickDmg)
        const actual = prev - entity.currentLife
        if (actual > 0) {
          const acc = poisonAccum.get(entityId) ?? { damage: 0, timeMs: 0 }
          acc.damage += actual
          poisonAccum.set(entityId, acc)
          damagedIds.add(entityId)
        }
        continue
      }

      // Apply mastery bonuses to tick damage
      tickDmg *= (1 + rb.poisonDamageIncrease / 100)
      tickDmg *= (1 + rb.poisonMoreDamage / 100)
      tickDmg *= Math.max(0, 1 - rb.poisonLessDamage / 100)
      tickDmg *= rb.poisonDamageMult
      // poisonedTakeMore (Rot Damage tree node 11) and Weakening rot-damage-taken: both apply since entity is in poisonStacks
      if (rb.poisonedTakeMore > 0)        tickDmg *= 1 + rb.poisonedTakeMore / 100
      if (rb.weakeningRotDamageTaken > 0) tickDmg *= 1 + rb.weakeningRotDamageTaken / 100
      // Green Veins: +1% rot damage per stack
      if (greenVeinsStacks > 0 && rb.greenVeinsDamagePerStack > 0) {
        tickDmg *= 1 + greenVeinsStacks * rb.greenVeinsDamagePerStack / 100
      }
      // Enemy physRot resistance, reduced by Weakening node 5 per stack
      const stackCount = stacks.length
      const effectiveResist = Math.max(0, (entity.physRotResist ?? 0) - stackCount * rb.weakeningResistPerStack)
      if (effectiveResist > 0) tickDmg *= Math.max(0, 1 - effectiveResist / 100)

      const prev = entity.currentLife
      entity.currentLife = Math.max(0, entity.currentLife - tickDmg)
      const actual = prev - entity.currentLife
      if (actual > 0) {
        const eLevel = enemyLevels.get(entity.id) ?? 1
        const xpMult = Math.pow(balance.enemyLevel.xpMultiplierPerLevel, eLevel - 1) * tierXpMult(entity.id)
        awardXp(maxStack.sourceActionId, actual * xpMult)
        if (enemyProgress.level === enemyProgress.maxLevel) awardEnemyXp(actual)
        awardAscentXp(actual)
        recordDps(maxStack.sourceActionId, actual, 'affliction:poison')
        if (getLifeBonuses().stealFromAfflictions) { applyLifeSteal(actual); applyManaSteal(actual) }
        const acc = poisonAccum.get(entityId) ?? { damage: 0, timeMs: 0 }
        acc.damage += actual
        poisonAccum.set(entityId, acc)
        damagedIds.add(entityId)
        if (bossEntities.has(entityId)) { bossLastHitWasAffl.set(entityId, true); bossLastHitWasCrit.set(entityId, false) }
      }
    }

    // Decrement timers; drop expired stacks
    for (const [entityId, stacks] of [...poisonStacks]) {
      for (const s of stacks) s.remainingMs -= deltaMs
      const live = stacks.filter(s => s.remainingMs > 0)
      if (live.length === 0) poisonStacks.delete(entityId)
      else poisonStacks.set(entityId, live)
    }

    // Display pass — green damage numbers
    for (const [entityId, acc] of [...poisonAccum]) {
      const entity = entities.find(e => e.id === entityId)
      if (!entity) { poisonAccum.delete(entityId); continue }
      acc.timeMs += deltaMs
      if (acc.timeMs >= balance.ascent.poisonDisplayIntervalMs && acc.damage > 0) {
        spawnDamageNumber(entity.x, entity.y - entity.radius - 8, acc.damage, 0x44cc44)
        acc.damage = 0
        acc.timeMs = 0
      }
      if (!poisonStacks.has(entityId) && acc.damage === 0) poisonAccum.delete(entityId)
    }
  }

  // Tick Green Veins: decrement buff timer; clear stacks on expiry.
  function tickGreenVeins(deltaMs: number): void {
    if (greenVeinsStacks === 0) { greenVeinsTimer = 0; return }
    greenVeinsTimer -= deltaMs
    if (greenVeinsTimer <= 0) {
      greenVeinsStacks = 0
      greenVeinsTimer = 0
      totalPoisonApplications = 0
      renderBuffBar()
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
            awardAscentXp(actual)
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
    let increasedExtra = 0
    if (lb.regenAlsoAppliesToMax) increasedExtra += lb.regenIncrease + (lb.regenDouble ? 100 : 0)
    if (lb.maxPerLifeLevel) increasedExtra += lifeProgress.level
    return balance.player.maxLife * statBonus(lifeProgress.level)
      * (1 + (lb.maxLifeIncrease + increasedExtra) / 100)
      * (1 + lb.moreMaxLife / 100)
      * Math.max(0, 1 - lb.lessMaxLife / 100)
      * (1 + mb.moreMaxLife / 100)
      * (1 + transcendCount * balance.transcend.maxLifePerTranscend)
  }

  function computePlayerMaxMana(): number {
    const mb = getManaBonuses()
    return balance.player.maxMana * statBonus(manaProgress.level)
      * (1 + mb.maxManaIncrease / 100)
      * (1 + mb.moreMaxMana / 100)
  }

  // NOTE: buildPlayerStatsSnapshot() (Character → Stats modal) mirrors this exact
  // multiplier chain for its damage/speed breakdown — keep the two in sync.
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
      const lbAct = getLifeBonuses()
      entity.actionDamage *= (1 + ab.damageIncrease / 100) * (1 + ab.moreDamage / 100)
        * Math.max(0, 1 - ab.lessActionDamage / 100)
        * Math.max(0, 1 - lbAct.lessActionDamage / 100)
      entity.actionSpeed  *= (1 + ab.actionSpeedIncrease / 100) * (1 + ab.moreActionSpeed / 100)
        * Math.max(0, 1 - ab.lessActionSpeed / 100)
    }
    if (entity.role === 'player' && def.tags.includes('projectile')) {
      const pb = getProjectileBonuses()
      entity.actionDamage *= (1 + pb.damageIncrease / 100) * (1 + pb.moreDamage / 100)
      entity.actionSpeed  *= (1 + pb.actionSpeedIncrease / 100)
      entity.actionRange  *= (1 + pb.rangeIncrease / 100) * (1 + pb.rangeMore / 100) * Math.max(0, 1 - artifactMods.rangeLess / 100)
    }
    if (entity.role === 'player' && def.tags.includes('strike')) {
      const sb = getStrikeBonuses()
      entity.actionDamage *= (1 + sb.damageIncrease / 100) * (1 + sb.moreDamage / 100)
      entity.actionSpeed  *= (1 + sb.actionSpeedIncrease / 100) * (1 + sb.moreActionSpeed / 100)
      entity.actionRange  *= (1 + sb.rangeIncrease / 100) * (1 + sb.moreRange / 100) * Math.max(0, 1 - artifactMods.rangeLess / 100)
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
    if (entity.role === 'player' && def.tags.includes('cold')) {
      const cb = getColdBonuses()
      entity.actionDamage *= (1 + cb.damageIncrease / 100) * (1 + cb.moreDamage / 100)
      entity.actionSpeed  *= (1 + cb.actionSpeedIncrease / 100)
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
        entity.actionRange *= (1 + ab.sizeIncrease / 100) * (1 + ab.moreSize / 100) * Math.max(0, 1 - artifactMods.areaLess / 100)
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
    amount *= (1 + ascentCount * balance.ascent.xpGainPerAscent) * transcendXpMult()
    const prev = actionProgress[actionId] ?? { xp: 0, level: 1, maxLevel: 1 }
    // Fields default-guarded so a legacy/corrupted entry can't poison the math
    // with NaN (which would silently zero out action/tag mastery gains).
    let xp = Number.isFinite(prev.xp) ? prev.xp : 0
    let level = Number.isFinite(prev.level) ? prev.level : 1
    let maxLevel = Number.isFinite(prev.maxLevel) ? prev.maxLevel : Math.max(1, level)
    // Prestige accelerates XP gain: past peak level → faster leveling next life
    const rb = getRuneBonuses(actionId)
    const scaledXp = amount * (1 + (maxLevel - 1) * 0.1) * (1 + rb.xpIncrease / 100) * rb.xpMore
    xp += scaledXp
    runActionXp[actionId] = (Number.isFinite(runActionXp[actionId]) ? runActionXp[actionId] : 0) + scaledXp
    let leveled = false
    while (xp >= actionXpNeeded(level)) {
      xp -= actionXpNeeded(level)
      level++
      if (level > maxLevel) maxLevel = level
      leveled = true
    }
    actionProgress[actionId] = { xp, level, maxLevel }
    if (leveled) applyAutoRunes(actionId)
    if (actionId === playerActionId && leveled) assignAction(playerEntity, actionId)
    // Always refresh — the trigger modal may show any action's thumbnail (main slot or extra slot).
    updateActionBar()
  }

  // Tracks the previous "has an unassigned rune slot" state so the first-rune
  // tutorial only fires on a clean false→true transition. Stays null until
  // the first refreshRuneDot call so a returning player whose dot is already
  // visible on load doesn't get the tutorial out of context.
  let previousRuneDotState: boolean | null = null

  function refreshRuneDot(): void {
    const r = getActionRunes(playerActionId)
    const level = actionProgress[playerActionId]?.level ?? 1
    const unlocked = unlockedSlotCount(level)
    const anyUnlockedEmpty = r.selected.slice(0, unlocked).some(s => s == null)
    container.querySelectorAll<HTMLElement>('.rune-notif-dot').forEach(dot => {
      dot.hidden = !anyUnlockedEmpty
    })
    if (previousRuneDotState === false && anyUnlockedEmpty) {
      startFirstRuneTutorial()
    }
    previousRuneDotState = anyUnlockedEmpty
  }

  function startFirstRuneTutorial(): void {
    if (isTutorialSeen('first-rune') || getPrefs().tutorialDisabled) return
    const wasPaused = paused
    if (!wasPaused) togglePause()
    showTutorial({
      id: 'first-rune',
      steps: [
        {
          message: getTutorialMessage('first-rune', 0),
          targetSelector: '[data-action="open-config"]',
          requiresInteraction: true,
        },
        {
          message: getTutorialMessage('first-rune', 1),
          targetSelector: '.action-trigger-rune-btn',
          requiresInteraction: true,
          transparent: true,  // keep the action modal visible
        },
      ],
      parent: container,
      openGuide,
      onDone: () => { if (!wasPaused && paused) togglePause() },
    })
  }

  let runesModal: { cleanup: () => void; refresh: () => void } | null = null
  let runesModalActionId: string | null = null

  function applyAutoRunes(actionId: string): void {
    const r = getActionRunes(actionId)
    if (!r.autoApply) return
    // Pre-fill every empty slot (locked or not) from the action's rune history.
    // Locked-slot assignments persist and activate as soon as the slot unlocks.
    let changed = false
    for (let i = 0; i < SLOT_TYPES.length; i++) {
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
      // Re-sync an open runes overview so auto-filled slots don't show as
      // empty cards hiding an actually-equipped rune.
      if (runesModal && runesModalActionId === actionId) runesModal.refresh()
      persistState()
    }
  }

  function assignRune(actionId: string, slotIdx: number, runeId: RuneId | null): void {
    const r = getActionRunes(actionId)
    const previous = r.selected[slotIdx] ?? null
    r.selected[slotIdx] = runeId
    // Explicit removal forgets the rune: otherwise the level-up auto-fill
    // would immediately re-equip it from history, making it impossible to
    // keep a slot empty. Re-picking it manually re-adds it to history.
    if (runeId === null && previous !== null) {
      r.history = r.history.filter(h => h !== previous)
    }
    // Track newly chosen runes for future auto-fill; keep autoApply on so any
    // remaining empty slot continues to be pre-filled from history.
    if (runeId && !r.history.includes(runeId)) r.history.unshift(runeId)
    actionRunes[actionId] = r
    if (actionId === playerActionId) assignAction(playerEntity, actionId as ActionId)
    refreshRuneDot()
    persistState()
  }

  // Block mastery XP: same global multipliers as stat XP (life model), but it
  // only feeds the run accumulator — block has no stat level of its own.
  function awardBlockXp(amount: number): void {
    amount *= (1 + ascentCount * balance.ascent.xpGainPerAscent) * transcendXpMult()
    runBlockXp += amount
  }

  function awardStatXp(stat: 'life' | 'mana', amount: number): void {
    amount *= (1 + ascentCount * balance.ascent.xpGainPerAscent) * transcendXpMult()
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

  recomputeArtifactMods()
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
    groupSizeCache.clear()
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
    groupSizeCache.clear()
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
  // ×2-speed stockpile: per-character resource earned by being away.
  let fastForwardMs = char?.fastForwardMs ?? 0
  let lastTickAt    = char?.lastSeenAt ?? Date.now()
  // Runtime session integrity — checked once after a short warm-up period.
  let _gg = false, _gi = true
  const _gT = Date.now() + 45_000
  let playerDead = false
  let waveScheduled = false
  let lastWaveAngle: number | null = null
  let enemyIdCounter = 0
  let enemySpawnTimeout: ReturnType<typeof setTimeout> | null = null
  let cheatForceBoss = false
  let playerRandomTargetId: string | null = null
  let playerStrongestTargetId: string | null = null
  let playerWeakestTargetId: string | null = null
  let targetingMode: TargetingMode = char?.targetingMode ?? 'nearest'

  // Ascension state — persists through rebirths and across sessions
  let ascentCount = char?.ascentCount ?? 0
  let ascentXp    = char?.ascentXp ?? 0
  let universePointAllocations: UniversePointAllocations = char?.universePointAllocations ?? { placeholderA: 0, placeholderB: 0, placeholderC: 0, placeholderD: 0 }
  let extraSlots: ExtraActionSlot[] = (char?.extraSlots ?? []).map(s => ({ ...s }))
  let freeMasteryPointsUsed: Partial<Record<MasteryId, number>> = { ...(char?.freeMasteryPointsUsed ?? {}) }
  // Point counts already "seen" per mastery (tree modal viewed) — unused
  // points only light the notif dots until seen at that exact count.
  let masteryPointsSeen: Partial<Record<MasteryId, number>> = { ...(char?.masteryPointsSeen ?? {}) }
  let unlockedTriggers: ('crit' | 'affliction')[] = [...(char?.unlockedTriggers ?? [])]
  const extraSlotTimers: number[] = []  // ms remaining per slot (time trigger)
  // Per-extra-slot state sized for the maximum of 3 slots (3rd via the extraTrigger relic).
  const afflictionTriggerCounters = [0, 0, 0]  // per extra slot, counts applied afflictions
  const manaTriggerCounters = [0, 0, 0]        // per extra slot, counts mana spent by the player
  let manaSpentThisTick = 0                 // player mana paid this tick (any slot, any cast)
  let mainSlotCritTarget: Entity | null = null
  let afflictionAppliedThisTick = 0
  let afflictionLastTarget: Entity | null = null
  const bossLastHitWasCrit = new Map<string, boolean>()
  const bossLastHitWasAffl = new Map<string, boolean>()
  const extraSlotMAQueues: ExtraSlotMA[][] = [[], [], []]
  const extraSlotMACooldowns: number[] = [0, 0, 0]

  // Per-rebirth XP accumulators — persisted in char.runProgress, reset in rebirth()
  let runActionXp: Record<string, number> = { ...(char?.runProgress?.actionXp ?? {}) }
  let runLifeXp = char?.runProgress?.lifeXp ?? 0
  let runBlockXp = char?.runProgress?.blockXp ?? 0
  let runManaXp = char?.runProgress?.manaXp ?? 0
  let runEnemyXp = char?.runProgress?.enemyXp ?? 0
  let runDistancePx = char?.runProgress?.distancePx ?? 0
  let runCritXp = char?.runProgress?.critXp ?? 0

  function currentRunProgress(): RunProgress {
    return {
      actionXp: { ...runActionXp },
      lifeXp: runLifeXp,
      blockXp: runBlockXp,
      manaXp: runManaXp,
      enemyXp: runEnemyXp,
      distancePx: runDistancePx,
      critXp: runCritXp,
      freeRebirthUsed,
      charNotifSeen,
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
      ascentCount,
      ascentXp,
      universePointAllocations,
      extraSlots,
      freeMasteryPointsUsed,
      unlockedTriggers,
      Date.now(),
      fastForwardMs,
      masteryDumpPoints,
      artifacts,
      scraps,
      transcendCount,
      relics,
      transcendReady,
      masteryPointsSeen,
    )
  }
  let playerPrevX = 0
  let playerPrevY = 0

  const el = document.createElement('div')
  el.className = 'scene scene-game'
  el.innerHTML = `
    <div class="game-top-bar">
      <div class="game-top-left">
        <button class="game-action-btn game-action-btn--icon" data-action="go-home" aria-label="${t('game', 'backToMenu')}" data-tooltip="${t('game', 'backToMenu')}">
          <i data-lucide="arrow-left" aria-hidden="true"></i>
        </button>
        <button class="game-action-btn game-action-btn--icon" data-action="open-character" data-sfx="modal" aria-label="Main Character" data-tooltip="Main Character" style="position:relative">
          <i data-lucide="user" aria-hidden="true"></i>
          <span class="notif-dot char-notif-dot" hidden></span>
        </button>
      </div>
      <div class="game-top-center">
        <button class="game-action-btn game-action-btn--icon" data-action="open-config" data-sfx="modal" aria-label="${t('game', 'battleConfig')}" data-tooltip="${t('game', 'battleConfig')}" style="position:relative">
          <i data-lucide="settings-2" aria-hidden="true"></i>
          <span class="notif-dot rune-notif-dot rune-notif-dot--top" hidden></span>
        </button>
        <button class="game-action-btn game-action-btn--icon" data-action="open-mastery" data-sfx="modal" aria-label="${t('game', 'masteries')}" data-tooltip="${t('game', 'masteries')}" style="position:relative">
          <i data-lucide="award" aria-hidden="true"></i>
          <span class="notif-dot mastery-notif-dot" hidden></span>
        </button>
        <button class="game-action-btn game-action-btn--icon" data-action="open-ascent" data-sfx="modal" aria-label="${t('game', 'ascentBtnLabel')}" data-tooltip="${t('game', 'ascentBtnLabel')}" hidden style="position:relative">
          <i data-lucide="arrow-up" aria-hidden="true"></i>
          <span class="notif-dot artifact-notif-dot" hidden></span>
        </button>
        <button class="game-action-btn game-action-btn--icon game-action-btn--enemy-toggle" data-action="toggle-enemy" aria-label="${t('game', 'enemyLevelLabel')}" data-tooltip="${t('game', 'enemyLevelLabel')}" style="position:relative">
          <span class="enemy-level-display">1 / 1</span>
          <span class="notif-dot enemy-notif-dot" hidden></span>
        </button>
      </div>
      <div class="game-top-right">
        <div class="speed-ctrl">
          <button class="speed-pause-btn" data-action="playpause" aria-label="${t('game', 'pauseLabel')}">
            <i data-lucide="pause" aria-hidden="true"></i>
          </button>
          <button class="speed-opt speed-opt--active" data-speed="1">×1</button>
          <button class="speed-opt speed-opt--timed" data-speed="2">
            <span>×2</span>
            <span class="speed-stockpile" aria-label="${t('game', 'x2SpeedRemaining')}">0:00</span>
          </button>
          ${isCheatMode() ? '<button class="speed-opt" data-speed="5">×5</button>' : ''}
        </div>
      </div>
    </div>
    <div class="game-viewport">
      <div class="buff-bar"></div>
      <div class="dps-meter" hidden></div>
      <div class="enemy-level-ctrl">
        <span class="enemy-level-title">${t('game', 'enemyLevelLabel')}</span>
        <div class="enemy-level-main">
          <button class="enemy-level-btn" data-action="enemy-level-down" aria-label="${t('game', 'enemyLevelDown')}"><img class="enemy-level-arrow" src="${import.meta.env.BASE_URL}ui/kenney_ui-pack-rpg-expansion/PNG/arrowSilver_left.png" alt=""></button>
          <span class="enemy-level-display">1 / 1</span>
          <button class="enemy-level-btn" data-action="enemy-level-up" aria-label="${t('game', 'enemyLevelUp')}"><img class="enemy-level-arrow" src="${import.meta.env.BASE_URL}ui/kenney_ui-pack-rpg-expansion/PNG/arrowSilver_right.png" alt=""></button>
          <label class="enemy-autolevel" title="${t('game', 'autoAdvanceTitle')}">
            <input type="checkbox" class="enemy-autolevel-input" aria-label="${t('game', 'autoLevelAriaLabel')}">
            <span class="enemy-autolevel-track"></span>
            <span class="enemy-autolevel-label">${t('game', 'autoLevelText')}</span>
          </label>
        </div>
        <div class="enemy-xp-bar">
          <div class="enemy-xp-bar-fill"></div>
        </div>
        <div class="ascent-bar-section" hidden>
          <span class="ascent-bar-title">${t('ascent', 'title')}</span>
          <div class="ascent-xp-bar">
            <div class="ascent-xp-bar-fill"></div>
          </div>
          <button class="ascent-action-btn" data-action="ascend" hidden>${t('game', 'ascendBtn')}</button>
        </div>
        <button class="ascent-action-btn transcend-btn" data-action="transcend" hidden>${t('transcend', 'btn')}</button>
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
      </div>
    </div>
  `
  container.appendChild(el)
  const viewportEl = el.querySelector<HTMLElement>('.game-viewport')!
  const dpsMeterEl = el.querySelector<HTMLElement>('.dps-meter')!
  createIcons({ icons: { ArrowLeft, Play, Pause, Settings2, Award, Sword, Book, User, ArrowUp, Star } })

  function hiddenGuideSections(): string[] {
    return hiddenGuideSectionIds({
      ascentCount,
      transcendCount,
      transcendReady,
      relics,
      enemyMaxLevel: enemyProgress.maxLevel,
      fullMastery: getPrefs().fullMastery,
    })
  }

  function openGuide(section: string): void {
    if (modalCleanup) { modalCleanup(); modalCleanup = null }
    mountGuideModal(el, () => {}, section, hiddenGuideSections())
  }

  const DPS_MULTI_LABELS: Record<MultiActionType, string> = {
    doubleAction: t('game', 'dpsDoubleAction'), additionalTarget: t('game', 'dpsBonusTarget'), additionalProjectile: t('game', 'dpsExtraProjectile'),
    splitAction: t('game', 'dpsSplitCast'), jump: t('game', 'dpsChainJump'), tremor: t('game', 'dpsTremor'),
  }
  const DPS_AFFLICTION_LABELS: Record<string, string> = {
    'affliction:burn': t('game', 'dpsAfflictionBurn'), 'affliction:bleed': t('game', 'dpsAfflictionBleed'), 'affliction:groundFire': t('game', 'dpsAfflictionGroundFire'), 'affliction:poison': t('game', 'dpsAfflictionPoison'),
  }
  const DPS_MULTI_TYPES = Object.keys(DPS_MULTI_LABELS) as MultiActionType[]
  const DPS_AFFLICTION_KEYS = Object.keys(DPS_AFFLICTION_LABELS)
  const COL_DIRECT = '#ffe0a0'
  const COL_MULTI  = '#ff9944'
  const COL_CRIT   = '#ff9944'
  // Smoothed scale denominator so bars don't visually wobble when the top action's DPS fluctuates.
  // Jumps up instantly to new peaks; decays toward instant max with ~2s half-life at the 200 ms tick.
  let smoothedDpsMax = 0
  function updateDpsMeter(): void {
    if (!getPrefs().showDpsMeter) { dpsMeterEl.hidden = true; return }
    const data = computeDps()
    if (data.size === 0) { dpsMeterEl.hidden = true; smoothedDpsMax = 0; return }
    dpsMeterEl.hidden = false

    // hit:base and hit:crit are auxiliary (they duplicate hit data) — exclude from scale computation.
    let instantMax = 0
    for (const byKind of data.values()) {
      let total = 0
      for (const [kind, v] of byKind.entries()) if (!kind.startsWith('hit:')) total += v
      instantMax = Math.max(instantMax, total)
    }
    if (instantMax <= 0) { dpsMeterEl.hidden = true; smoothedDpsMax = 0; return }
    smoothedDpsMax = instantMax >= smoothedDpsMax ? instantMax : smoothedDpsMax * 0.93 + instantMax * 0.07
    const maxDps = smoothedDpsMax

    const pct = (v: number) => (v / maxDps * 100).toFixed(1)

    const singleBar = (val: number): string =>
      `<div class="dps-bar-track"><div class="dps-bar" style="width:${pct(val)}%"></div></div>`

    const splitBar = (segA: number, colA: string, segB: number, colB: string): string => {
      const total = segA + segB
      if (total <= 0) return '<div class="dps-bar-track"></div>'
      const segs = (segA > 0 ? `<div style="flex:${segA};background:${colA}"></div>` : '')
                 + (segB > 0 ? `<div style="flex:${segB};background:${colB}"></div>` : '')
      return `<div class="dps-bar-track"><div class="dps-split-bar" style="width:${pct(total)}%">${segs}</div></div>`
    }

    const actionRow = (name: string, val: number): string =>
      `<div class="dps-row dps-row--action"><span class="dps-name">${name}</span><span class="dps-value">${fmtDps(val)}</span>${singleBar(val)}</div>`

    const comboRow = (nameHtml: string, val: number, barHtml: string): string =>
      `<div class="dps-row dps-row--combo"><span class="dps-name">${nameHtml}</span><span class="dps-value">${fmtDps(val)}</span>${barHtml}</div>`

    const subRow = (name: string, val: number): string =>
      `<div class="dps-row dps-row--sub"><span class="dps-name">${name}</span><span class="dps-value">${fmtDps(val)}</span>${singleBar(val)}</div>`

    let html = ''
    const orderedEntries = [...data.entries()].sort(
      (a, b) => dpsActionOrder.indexOf(a[0]) - dpsActionOrder.indexOf(b[0]),
    )
    for (const [actionId, byKind] of orderedEntries) {
      let total = 0
      for (const [kind, v] of byKind.entries()) if (!kind.startsWith('hit:')) total += v
      const label = getActionLabel(actionId)
      html += actionRow(label, total)

      const direct   = byKind.get('direct') ?? 0
      const multiDps = DPS_MULTI_TYPES.reduce((s, t) => s + (byKind.get(`multi:${t}`) ?? 0), 0)
      const totalHit = direct + multiDps

      if (totalHit > 0) {
        const multiLabel = `Hit (<span style="color:${COL_MULTI}">multi-action</span>)`
        html += comboRow(multiLabel, totalHit, splitBar(direct, COL_DIRECT, multiDps, COL_MULTI))
      }

      if (ascentCount >= 1 && totalHit > 0) {
        const base      = byKind.get('hit:base') ?? 0
        const critBonus = byKind.get('hit:crit') ?? 0
        const critLabel = `Hit (<span style="color:${COL_CRIT}">crit</span>)`
        html += comboRow(critLabel, base + critBonus, splitBar(base, COL_DIRECT, critBonus, COL_CRIT))
      }

      for (const key of DPS_AFFLICTION_KEYS) {
        const val = byKind.get(key) ?? 0
        if (val > 0) html += subRow(DPS_AFFLICTION_LABELS[key], val)
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
      playerStrongestTargetId = null
      playerWeakestTargetId = null
      persistState()
    },
    onForceAscend: isCheatMode() ? () => ascend() : undefined,
    onAddFastForwardTime: isCheatMode() ? () => {
      fastForwardMs = Math.min(STOCKPILE_MAX_MS, fastForwardMs + 60_000)
      updateSpeedUI()
    } : undefined,
    onSpawnBoss: isCheatMode() ? () => spawnBossWave() : undefined,
    // Readies the Transcend button exactly like a lvl-100+ boss kill would —
    // does NOT transcend; the player still clicks the gold button themselves.
    onForceTranscendReady: isCheatMode() ? () => {
      transcendReady = true
      persistState()
      updateTranscendButton()
    } : undefined,
    getHiddenGuideSections: () => hiddenGuideSections(),
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
  function updateStatLevels(): void {
    const lifePct = Math.round(lifeProgress.xp / statXpNeeded(lifeProgress.level) * 100)
    lifeLevelEl.style.setProperty('--xp-pct', `${lifePct}%`)
    lifeLevelEl.querySelector('span')!.textContent = `Lv.${lifeProgress.level}`
    const manaPct = Math.round(manaProgress.xp / statXpNeeded(manaProgress.level) * 100)
    manaLevelEl.style.setProperty('--xp-pct', `${manaPct}%`)
    manaLevelEl.querySelector('span')!.textContent = `Lv.${manaProgress.level}`
  }

  // Update the action XP bar live inside the battle config modal, if open.
  let liveModalXpUpdater: (() => void) | null = null
  function updateActionBar(): void {
    liveModalXpUpdater?.()
    refreshRuneDot()
  }
  // Mastery cap state changes as XP accrues during a run (action, stat, and
  // distance XP all feed into it from different paths). A throttled refresh
  // keeps the gear-button dot honest without sprinkling calls everywhere.
  const masteryDotInterval = setInterval(refreshMasteryDot, 500)

  function openRunesModalFor(actionId: string): void {
    if (runesModal) { runesModal.cleanup(); runesModal = null; runesModalActionId = null }
    const r = getActionRunes(actionId)
    // Mount on `container` (not `el`): the .scene-game element has a transform
    // that creates a stacking context, which would clip our modal beneath
    // sibling backdrops like the trigger config. Container sits above that.
    runesModal = mountRunesModal(
      container,
      actionId,
      getActionLabel(actionId),
      () => {
        const p = actionProgress[actionId]
        return { level: p?.level ?? 1, maxLevel: p?.maxLevel ?? 1 }
      },
      r,
      (slotIdx, runeId) => { assignRune(actionId, slotIdx, runeId) },
      () => { runesModal = null; runesModalActionId = null },
    )
    runesModalActionId = actionId
  }

  function openRunesModal(): void {
    openRunesModalFor(playerActionId)
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
    updateAscentBar()
  }

  // ── Ascension helpers ──────────────────────────────────────────────────────

  function ascentRequiredLevel(): number {
    return balance.ascent.requiredEnemyLevelBase + ascentCount * balance.ascent.requiredLevelStep
  }
  function ascentXpNeeded(): number {
    return Math.round(balance.ascent.xpMultiplier * enemyMaxLevelXpNeeded(ascentRequiredLevel()))
  }
  function isAscentUnlocked(): boolean {
    return enemyProgress.maxLevel >= ascentRequiredLevel()
  }
  function updateAscentBar(): void {
    const section = el.querySelector<HTMLElement>('.ascent-bar-section')!
    const notifDot = el.querySelector<HTMLElement>('.enemy-notif-dot')!
    if (!isAscentUnlocked()) {
      section.hidden = true
      // The dot also announces a ready Transcend, independent of ascent state.
      notifDot.hidden = !transcendReady
      return
    }
    section.hidden = false
    const xpNeeded = ascentXpNeeded()
    const isFull = ascentXp >= xpNeeded
    const bar = section.querySelector<HTMLElement>('.ascent-xp-bar')!
    const barFill = section.querySelector<HTMLElement>('.ascent-xp-bar-fill')!
    const btn = section.querySelector<HTMLButtonElement>('[data-action="ascend"]')!
    bar.hidden = isFull
    btn.hidden = !isFull
    notifDot.hidden = !isFull && !transcendReady
    // multiAscend relic: the button announces multi-count jumps ("Ascend (+x)").
    const gain = pendingAscentGain()
    btn.textContent = gain > 1
      ? t('transcend', 'ascendPlus').replace('{label}', t('game', 'ascendBtn')).replace('{n}', String(gain))
      : t('game', 'ascendBtn')
    if (!isFull) barFill.style.width = `${(ascentXp / xpNeeded * 100).toFixed(1)}%`
  }
  // How many ascent counts the next Ascend grants (multiAscend relic can jump).
  function pendingAscentGain(): number {
    return hasRelic('multiAscend') ? ascentsGainedFor(enemyProgress.maxLevel, ascentCount) : 1
  }
  function updateAscentButtonVisibility(): void {
    const btn = el.querySelector<HTMLButtonElement>('[data-action="open-ascent"]')!
    // Grandfathered post-transcend: the ascent menu (universe points + artifacts
    // panel) stays reachable even while ascentCount is back at 0.
    btn.hidden = ascentCount < 1 && transcendCount < 1
  }
  function updateTranscendButton(): void {
    const btn = el.querySelector<HTMLButtonElement>('[data-action="transcend"]')
    if (btn) btn.hidden = !transcendReady
    // Ready Transcend lights the red dot on the enemy toggle (union with the
    // ascent-full condition handled in updateAscentBar).
    if (transcendReady) {
      const dot = el.querySelector<HTMLElement>('.enemy-notif-dot')
      if (dot) dot.hidden = false
    }
  }

  // Character-button dot: signals the freeRebirth relic is armed again (a free
  // mastery bank is waiting behind the "Free Rebirth" button).
  function refreshCharNotifDot(): void {
    const dot = el.querySelector<HTMLElement>('.char-notif-dot')
    // Lights while an armed Free Rebirth hasn't been seen this run; opening
    // the character screen marks it seen (re-arms on the next rebirth).
    if (dot) dot.hidden = !freeRebirthActive() || charNotifSeen
  }
  function awardAscentXp(amount: number): void {
    if (!isAscentUnlocked()) return
    ascentXp = Math.min(ascentXpNeeded(), ascentXp + amount)
    updateAscentBar()
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
    .addEventListener('click', () => {
      const opening = !enemyCtrlEl.classList.contains('is-open')
      enemyCtrlEl.classList.toggle('is-open')
      playSound(opening ? 'modal.open' : 'modal.close')
    })

  function awardEnemyXp(amount: number): void {
    amount *= (1 + ascentCount * balance.ascent.xpGainPerAscent) * transcendXpMult()
    // Ascent-8 unlock: extra flat boost to enemy-level XP.
    if (ascentCount >= balance.ascent.enemyBoostUnlockAscent) amount *= 1 + balance.ascent.enemyBoostMoreLevelXp
    runEnemyXp += amount
    enemyProgress.xp += amount
    const prevMaxLevel = enemyProgress.maxLevel
    while (enemyProgress.xp >= enemyMaxLevelXpNeeded(enemyProgress.maxLevel)) {
      enemyProgress.xp -= enemyMaxLevelXpNeeded(enemyProgress.maxLevel)
      enemyProgress.maxLevel++
    }
    if (prevMaxLevel < 2 && enemyProgress.maxLevel >= 2) startEnemyLevelTutorial()
    updateEnemyLevelUI()
  }

  updateEnemyLevelUI()
  updateAscentButtonVisibility()
  updateTranscendButton()
  refreshCharNotifDot()

  const speedPauseBtn = el.querySelector<HTMLButtonElement>('[data-action="playpause"]')!
  const speedOptBtns = el.querySelectorAll<HTMLButtonElement>('.speed-opt')
  const battleConfigBtn = el.querySelector<HTMLButtonElement>('[data-action="open-config"]')!

  battleConfigBtn.addEventListener('click', () => {
    if (modalCleanup) { modalCleanup(); modalCleanup = null; liveModalXpUpdater = null; return }
    const currentId = entityActions.get(playerEntity.id) ?? allActions[0].id as ActionId
    const { cleanup, updateXp } = mountBattleConfigModal(
      container,
      currentId,
      ascentCount >= 1,
      critBaseAddTotal(),
      activeExtraSlotCount(),
      extraSlots.map(s => ({ ...s })),
      {
        getActionXp: (id) => {
          const p = actionProgress[id] ?? { xp: 0, level: 1, maxLevel: 1 }
          return { level: p.level, xp: p.xp, xpNeeded: actionXpNeeded(p.level) }
        },
        hasUnassignedRune: (id) => {
          const level = actionProgress[id]?.level ?? 1
          const unlocked = unlockedSlotCount(level)
          return getActionRunes(id).selected.slice(0, unlocked).some(s => s == null)
        },
        openRunesModal: () => { openRunesModal() },
        openRunesModalForSlot: (actionId) => { openRunesModalFor(actionId) },
        getUnlockedTriggers: () => [...unlockedTriggers],
      },
      (id) => {
        playerActionId = id
        assignAction(playerEntity, id)
        applyAutoRunes(id)
        entityRigs.get('player')?.setWeapon(weaponForAction(getAction(id)))
        updateActionBar()
        persistState()
      },
      (slotIndex, update) => {
        if (!extraSlots[slotIndex]) extraSlots[slotIndex] = { actionId: null, triggerType: null }
        extraSlots[slotIndex] = { ...extraSlots[slotIndex], ...update }
        persistState()
      },
      () => { modalCleanup = null; liveModalXpUpdater = null },
    )
    modalCleanup = cleanup
    liveModalXpUpdater = updateXp
  })

  // Must be declared before computeLifeRegenPerSec / computeManaRegenPerSec, which are
  // called synchronously in updateBars() during setup — before the buffs block below.
  interface ActiveEffect {
    id: string
    iconName: string
    kind: 'buff' | 'debuff' | 'mixed'
    remainingMs: number
    stacks: number   // 1 for singleton buffs; >1 for stacking buffs (trance with key 12)
  }
  const activeEffects: ActiveEffect[] = []
  let frenzyCharges = 0

  // ── Movement mastery state ───────────────────────────────────────────────
  let playerAnimLockMs = 0       // ms remaining where player is locked in animation phase
  let dashCharges = 0
  let dashChargeTimerMs = 0
  const DASH_DURATION_MS = 100   // 0.1s
  const DASH_SPEED_MULT = 10     // covers 1s of distance in 0.1s
  let dashRemainingMs = 0
  let dashMoveX = 0
  let dashMoveY = 0
  let dashStartX = 0          // player position when the current dash began
  let dashStartY = 0
  let dashMaxDist = 0         // theoretical full-dash distance (px) for this dash
  const DASH_SOUND_MIN_FRACTION = 0.2  // only play the land sound past this share of max distance

  // Play the dash land sound if the player covered at least DASH_SOUND_MIN_FRACTION
  // of the full dash. Called whenever a dash ends — both on natural completion and
  // when an action cast cancels it mid-flight — so a quick attack on arrival still
  // sounds. dashMaxDist is zeroed afterwards to guarantee a single play per dash.
  function endDashSound(curX: number, curY: number): void {
    if (dashMaxDist <= 0) return
    const ddx = curX - dashStartX
    const ddy = curY - dashStartY
    if (Math.hypot(ddx, ddy) >= DASH_SOUND_MIN_FRACTION * dashMaxDist) {
      playSound('player.dash')
    }
    dashMaxDist = 0
  }

  let playerIsKiting = false
  let playerMovedSinceLastAction = false  // key 12: first-action-after-moving
  let playerStationaryActionCount = 0    // key 13: consecutive actions without moving (0-10)

  function computeLifeRegenPerSec(): number {
    const lb = getLifeBonuses()
    if (lb.cannotRegen) return 0
    const frenzyBonus = hasEffect('feedingFrenzy') ? balance.buffs.feedingFrenzyRegenBonus : 0
    let regenMult = 1 + (lb.regenIncrease + frenzyBonus) / 100
    if (lb.regenDouble) regenMult *= 2
    return playerEntity.maxLife * (balance.player.regenRate + lb.regenFractionBonus) * regenMult
  }

  function computeManaRegenPerSec(): number {
    const frenzyBonus = hasEffect('feedingFrenzy') ? balance.buffs.feedingFrenzyRegenBonus : 0
    return playerEntity.maxMana * balance.player.regenRate
      * (1 + (getManaBonuses().regenIncrease + frenzyBonus) / 100)
  }

  function applyLifeSteal(hitDamage: number): void {
    if (playerDead) return
    const lb = getLifeBonuses()
    if (lb.cannotSteal) return
    if (lb.lifeStealPercent <= 0) return
    const frenzyStealBonus = hasEffect('feedingFrenzy') ? balance.buffs.feedingFrenzyStealBonus : 0
    const stealRaw = hitDamage * (lb.lifeStealPercent / 100)
      * (1 + (lb.lifeStealIncrease + frenzyStealBonus) / 100)
      * (1 + lb.stealMore / 100)
    const cap = playerEntity.maxLife * 0.01
      * (1 + lb.lifeStealCapIncrease / 100)
      * (1 + lb.stealCapMore / 100)
      * Math.max(0, 1 - lb.lessStealCap / 100)
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

  // ── Regen ───────────────────────────────────────────────────────────────

  let regenTimer: ReturnType<typeof setInterval> | null = null

  const REGEN_INTERVAL_MS = 100
  let lastRegenAt = performance.now()

  function startRegen(): void {
    if (regenTimer !== null) return
    lastRegenAt = performance.now()
    regenTimer = setInterval(() => {
      // Credit by measured wall-clock instead of a fixed step: while the tab is
      // hidden this interval is throttled to ~1 Hz, so a fixed 0.1 s step would
      // starve regen relative to the worker-driven combat loop. Cap the step so a
      // deep suspend (handled by the away/stockpile path) can't dump free regen.
      const now = performance.now()
      const elapsedS = Math.min(now - lastRegenAt, BG_MAX_CATCHUP_MS) / 1000
      lastRegenAt = now
      if (playerDead) return
      const lb = getLifeBonuses()
      const frenzyBonus = hasEffect('feedingFrenzy') ? balance.buffs.feedingFrenzyRegenBonus : 0
      if (!lb.cannotRegen) {
        const lifeRegenBase = playerEntity.maxLife * (balance.player.regenRate + lb.regenFractionBonus)
        let lifeRegenMult = 1 + (lb.regenIncrease + frenzyBonus) / 100
        if (lb.regenDouble) lifeRegenMult *= 2
        playerEntity.currentLife = Math.min(playerEntity.maxLife, playerEntity.currentLife + lifeRegenBase * lifeRegenMult * gameSpeed * elapsedS)
      }
      const manaRegenMult = 1 + (getManaBonuses().regenIncrease + frenzyBonus) / 100
      playerEntity.currentMana = Math.min(playerEntity.maxMana, playerEntity.currentMana + playerEntity.maxMana * balance.player.regenRate * manaRegenMult * gameSpeed * elapsedS)
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

  // Maps each status-effect id to the note that explains it (most match 1:1).
  const EFFECT_NOTE_ID: Record<string, string> = {
    frenzy:        'frenzy',
    bloodlust:     'bloodlust',
    electrified:   'electrified',
    trance:        'trance',
    immolation:    'immolation',
    feedingFrenzy: 'feeding-frenzy',
    frozenArmor:   'frozen-armor',
  }

  // Hovering a status icon shows its name; clicking it opens the matching note.
  buffBarEl.addEventListener('click', (e) => {
    const icon = (e.target as HTMLElement).closest<HTMLElement>('.buff-icon')
    if (!icon) return
    const noteId = icon.dataset.note
    if (!noteId) return
    if (modalCleanup) { modalCleanup(); modalCleanup = null }
    modalCleanup = mountNoteModal(el, noteId, () => { modalCleanup = null })
  })

  function applyEffect(template: Omit<ActiveEffect, 'remainingMs' | 'stacks'>, durationMs: number, maxStacks = 1): void {
    const existing = activeEffects.find(e => e.id === template.id)
    if (existing) {
      if (existing.stacks < maxStacks) {
        existing.stacks++
        renderBuffBar()
      }
      existing.remainingMs = durationMs
    } else {
      activeEffects.push({ ...template, remainingMs: durationMs, stacks: 1 })
      renderBuffBar()
    }
  }

  function effectStacks(id: string): number {
    return activeEffects.find(e => e.id === id)?.stacks ?? 0
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
    let html = ordered.map(e => {
      let badge = ''
      if (e.id === 'frenzy' && frenzyCharges > 0) {
        badge = `<span class="buff-charge">${frenzyCharges}</span>`
      } else if (e.stacks > 1) {
        badge = `<span class="buff-charge">${e.stacks}</span>`
      }
      const noteId = EFFECT_NOTE_ID[e.id]
      const title  = noteId ? getNoteTitle(noteId) : undefined
      const attrs  = [
        `class="buff-icon buff-icon--${e.kind}"`,
        `data-effect="${e.id}"`,
        noteId ? `data-note="${noteId}"` : '',
        title  ? `data-tooltip="${title}"` : '',
      ].filter(Boolean).join(' ')
      return `<div ${attrs}><i data-lucide="${e.iconName}" aria-hidden="true"></i>${badge}</div>`
    }).join('')
    if (frozenArmorStacks > 0) {
      const badge = `<span class="buff-charge">${frozenArmorStacks}</span>`
      html += `<div class="buff-icon buff-icon--buff" data-effect="frozenArmor" data-note="frozen-armor"><i data-lucide="snowflake" aria-hidden="true"></i>${badge}</div>`
    }
    if (greenVeinsStacks > 0) {
      const badge = `<span class="buff-charge">${greenVeinsStacks}</span>`
      html += `<div class="buff-icon buff-icon--buff" data-effect="greenVeins" data-note="green-veins"><i data-lucide="skull" aria-hidden="true"></i>${badge}</div>`
    }
    buffBarEl.innerHTML = html
    if (ordered.length > 0 || frozenArmorStacks > 0 || greenVeinsStacks > 0) createIcons({ icons: { Book, Flame, Drumstick, Swords, Droplets, Zap, Snowflake, Skull } })
  }

  // ── Play / Pause / Speed ─────────────────────────────────────────────────

  function formatStockpile(ms: number): string {
    const s = Math.max(0, Math.floor(ms / 1000))
    const m = Math.floor(s / 60)
    const r = s % 60
    return `${m}:${r.toString().padStart(2, '0')}`
  }

  let lastPauseIcon = ''
  function updateSpeedUI(): void {
    const icon = paused ? 'play' : 'pause'
    // Only rebuild the button's icon DOM when the state actually flips. This
    // refresh runs once a second (stockpile countdown); recreating the <svg> on
    // every tick would destroy the node a click started on if the tick landed
    // between mousedown and mouseup, swallowing the click ("pause needs several
    // taps to register").
    if (icon !== lastPauseIcon) {
      lastPauseIcon = icon
      speedPauseBtn.setAttribute('aria-label', paused ? t('game', 'playLabel') : t('game', 'pauseLabel'))
      speedPauseBtn.innerHTML = `<i data-lucide="${icon}" aria-hidden="true"></i>`
      createIcons({ icons: { Play, Pause } })
    }
    const x2Locked = fastForwardMs <= 0
    speedOptBtns.forEach(btn => {
      const speed = Number(btn.dataset.speed)
      btn.classList.toggle('speed-opt--active', !paused && speed === gameSpeed)
    })
    const meter = el.querySelector<HTMLElement>('.speed-stockpile')
    if (meter) {
      meter.textContent = x2Locked ? t('refillAd', 'refill') : formatStockpile(fastForwardMs)
      meter.classList.toggle('speed-stockpile--empty', x2Locked)
    }
  }

  function offerRefillAd(): void {
    const addedMs = 15 * 60 * 1000
    if (isPaid() || !adsAvailable()) {
      trackEvent('x2_speed_refill', { outcome: 'auto_granted', ascent: String(ascentCount) })
      fastForwardMs = Math.min(STOCKPILE_MAX_MS, fastForwardMs + addedMs)
      updateSpeedUI()
      persistState()
      return
    }
    mountRefillAdModal(el, addedMs, ascentCount, (granted) => {
      fastForwardMs = Math.min(STOCKPILE_MAX_MS, fastForwardMs + granted)
      updateSpeedUI()
      persistState()
    }, () => {}, makeAdLifecycle())
  }

  function setSpeed(speed: number): void {
    if (speed === 2 && fastForwardMs <= 0) { offerRefillAd(); return }
    gameSpeed = speed
    setGameplayActive(true)  // running (covers unpause and live speed changes)
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
      setGameplayActive(false)  // paused
      stopRegen()
      app?.ticker.stop()
      updateSpeedUI()
    } else {
      setSpeed(gameSpeed)
    }
  }

  // Pause the game while a rewarded ad plays, then resume only if we paused it
  // (don't un-pause a player who had paused manually). Each ad gets a fresh one
  // so its captured pre-ad state can't leak across requests.
  function makeAdLifecycle(): AdLifecycle {
    let wasPaused = false
    return {
      onAdStart: () => { wasPaused = paused; if (!paused) togglePause() },
      onAdEnd:   () => { if (!wasPaused && paused) togglePause() },
    }
  }

  speedPauseBtn.addEventListener('click', togglePause)
  speedOptBtns.forEach(btn => {
    btn.addEventListener('click', () => setSpeed(Number(btn.dataset.speed)))
  })
  // Initial paint so the ×2 button reflects the loaded stockpile from the start.
  updateSpeedUI()

  // ── Auto-save ───────────────────────────────────────────────────────────

  const saveInterval = setInterval(() => {
    if (!playerDead) persistState()
  }, SAVE_INTERVAL_MS)

  // Refresh the ×2-speed stockpile indicator every second so it visibly counts down.
  const stockpileUiInterval = setInterval(updateSpeedUI, 1000)

  function saveAndGoHome(): void {
    if (!playerDead) persistState()
    navigate('menu')
  }

  el.querySelector<HTMLButtonElement>('[data-action="go-home"]')!
    .addEventListener('click', () => saveAndGoHome())

  // Converts a mastery node index to its position label in the tree UI.
  // Line nodes 0-11 → "1" to "12"; key nodes 12-15 → "6t","6b","12t","12b".
  const nodeLabel = (n: number): string => {
    if (n < 12) return `${n + 1}`
    if (n === 12) return '6t'
    if (n === 13) return '6b'
    if (n === 14) return '12t'
    return '12b'
  }

  // ── Character stats snapshot ───────────────────────────────────────────────
  // Mirrors assignAction()'s multiplier chain (keep in sync) plus the cast-time
  // affliction/crit/multi-strike/trigger expressions, recording each factor's
  // origin so the Stats modal can show where every modifier comes from.
  function buildPlayerStatsSnapshot(): PlayerStatsSnapshot {
    const fmt  = (n: number, d = 1): string => {
      const s = n.toFixed(d)
      return s.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')
    }
    const pct  = (n: number): string => `${fmt(n, 1)}%`
    const mul  = (n: number): string => `×${fmt(n, 3)}`

    // Composes an origin label for an aggregate 'more' factor by listing the
    // specific contributing nodes: "fire mastery 1.6, 1.6b, overflow".
    // Same-category 'more' factors stack additively in the engine, so one
    // aggregate factor is displayed (with the total %) rather than per-node.
    const moreNodeLabel = (
      nodes: number[][],
      dumpedPts: number,
      dumpedRate: number,
      effFn: (t: number, n: number) => number,
      masteryLabel: string,
    ): string => {
      const parts: string[] = []
      if (dumpedPts > 0 && dumpedRate > 0) parts.push('overflow')
      for (let t = 0; t < nodes.length; t++) {
        for (const n of nodes[t]) {
          if (effFn(t, n) > 0) parts.push(`${t + 1}.${nodeLabel(n)}`)
        }
      }
      return parts.length > 0 ? `${masteryLabel} ${parts.join(', ')}` : masteryLabel
    }

    const incF = (pct2: number, origin: string, group?: string): StatFactor =>
      ({ text: mul(1 + pct2 / 100), origin, kind: 'mul', group })
    const moreF = (pct2: number, origin: string, group?: string): StatFactor =>
      ({ text: mul(1 + pct2 / 100), origin, kind: 'more', group })

    // ── Vitals ────────────────────────────────────────────────────────────
    const lb = getLifeBonuses()
    const mb = getManaBonuses()
    const lifeNodes = masteryNodes('life', 5)
    const lifeDumped = dumpedFor('life')
    const manaNodes = masteryNodes('mana', 5)

    const lifeFactors: StatFactor[] = [{ text: fmt(balance.player.maxLife), origin: 'base', kind: 'base' }]
    const lifeLevelBonus = statBonus(lifeProgress.level)
    if (lifeLevelBonus !== 1) lifeFactors.push({ text: mul(lifeLevelBonus), origin: `levels (${lifeProgress.level})`, kind: 'mul' })
    let lifeExtra = 0
    if (lb.regenAlsoAppliesToMax) lifeExtra += lb.regenIncrease + (lb.regenDouble ? 100 : 0)
    if (lb.maxPerLifeLevel) lifeExtra += lifeProgress.level
    if (lb.maxLifeIncrease + lifeExtra !== 0) lifeFactors.push(incF(lb.maxLifeIncrease + lifeExtra, 'life mastery total increased', 'life mastery'))
    if (lb.moreMaxLife !== 0) lifeFactors.push(moreF(lb.moreMaxLife, moreNodeLabel(lifeNodes, lifeDumped, MASTERY_DUMP.life.rate, (t, n) => getLifeNodeEffect(t, n).lifeMoreMax ?? 0, 'life mastery'), 'life mastery'))
    if (lb.lessMaxLife !== 0) lifeFactors.push({ text: mul(Math.max(0, 1 - lb.lessMaxLife / 100)), origin: 'life mastery (less)', kind: 'less', group: 'life mastery' })
    if (mb.moreMaxLife !== 0) lifeFactors.push(moreF(mb.moreMaxLife, moreNodeLabel(manaNodes, 0, 0, (t, n) => getManaNodeEffect(t, n).manaMoreLife ?? 0, 'mana mastery'), 'mana mastery'))
    const life: StatLine = { label: 'Life', total: fmt(computePlayerMaxLife()), factors: lifeFactors }

    const manaFactors: StatFactor[] = [{ text: fmt(balance.player.maxMana), origin: 'base', kind: 'base' }]
    const manaLevelBonus = statBonus(manaProgress.level)
    if (manaLevelBonus !== 1) manaFactors.push({ text: mul(manaLevelBonus), origin: `levels (${manaProgress.level})`, kind: 'mul' })
    if (mb.maxManaIncrease !== 0) manaFactors.push(incF(mb.maxManaIncrease, 'mana mastery total increased', 'mana mastery'))
    if (mb.moreMaxMana !== 0) manaFactors.push(moreF(mb.moreMaxMana, moreNodeLabel(manaNodes, dumpedFor('mana'), MASTERY_DUMP.mana.rate, (t, n) => getManaNodeEffect(t, n).manaMoreMax ?? 0, 'mana mastery'), 'mana mastery'))
    const mana: StatLine = { label: 'Mana', total: fmt(computePlayerMaxMana()), factors: manaFactors }

    const physRes = Math.max(0, Math.min(100, lb.physRotResistance))
    const eleRes  = Math.max(0, Math.min(100, lb.elementalResistance))

    // ── Equipped actions ──────────────────────────────────────────────────
    const entries: { id: ActionId; slot: number }[] = [{ id: playerActionId, slot: 0 }]
    for (let i = 0; i < activeExtraSlotCount(); i++) {
      const sid = extraSlots[i]?.actionId
      if (sid) entries.push({ id: sid as ActionId, slot: i + 1 })
    }

    const TRIGGER_LABEL: Record<string, string> = { time: 'Time', crit: 'Crit', affliction: 'Affliction', mana: 'Mana' }
    const critUnlocked = ascentCount >= 1 || getPrefs().fullMastery

    // Pre-compute node arrays shared across all action entries
    const actionNodes = masteryNodes('action', 5)
    const actionDumped = dumpedFor('action')
    const critNodes = masteryNodes('criticalHit', 5)
    const critDumped = dumpedFor('criticalHit')

    const actions: ActionStatBlock[] = entries.map(({ id, slot }) => {
      const def = getAction(id)
      const level = getPlayerLevel(id)
      const tags = def.tags
      const triggerType = slot > 0 ? (extraSlots[slot - 1]?.triggerType ?? null) : null
      // Fixed-frequency triggers (crit/affliction/mana): speed converts to damage, not cast rate
      const isDependentTrigger = triggerType === 'crit' || triggerType === 'affliction' || triggerType === 'mana'
      const slotPenalty = slot > 0 ? (balance.transcend.slotDamagePenalties[slot - 1] ?? 1) : 1

      // Pre-compute tag-specific mastery data (used in damage chain and affliction)
      const ab = getActionBonuses()
      const lbAct = getLifeBonuses()
      const rb = getRuneBonuses(id)
      const pbData  = tags.includes('projectile') ? { b: getProjectileBonuses(), nodes: masteryNodes('projectile', 5), dumped: dumpedFor('projectile') } : null
      const sbData  = tags.includes('strike')     ? { b: getStrikeBonuses(),     nodes: masteryNodes('strike', 5),     dumped: dumpedFor('strike') }     : null
      const libData = tags.includes('lightning')  ? { b: getLightningBonuses(),  nodes: masteryNodes('lightning', 5),  dumped: dumpedFor('lightning') }  : null
      const fbData  = tags.includes('fire')       ? { b: getFireBonuses(),       nodes: masteryNodes('fire', 5),       dumped: dumpedFor('fire') }       : null
      const cbData  = tags.includes('cold')       ? { b: getColdBonuses(),       nodes: masteryNodes('cold', 5),       dumped: dumpedFor('cold') }       : null
      const rotData = tags.includes('rot')        ? { b: getRotBonuses(),        nodes: masteryNodes('rot', 5),        dumped: dumpedFor('rot') }        : null
      const phbData = tags.includes('physical')   ? { b: getPhysicalBonuses(),   nodes: masteryNodes('physical', 5),   dumped: dumpedFor('physical') }   : null
      const arbData = tags.includes('area')       ? { b: getAreaBonuses(),       nodes: masteryNodes('area', 5),       dumped: dumpedFor('area') }       : null

      // Damage chain — mirrors assignAction() multiplier order
      const dmgFactors: StatFactor[] = []
      const baseDmgLevel = def.damage * Math.pow(balance.action.damageMult, level - 1) * (1 + (level - 1) * balance.action.damageAddPerLevel)
      dmgFactors.push({ text: fmt(def.damage, 2), origin: 'base', kind: 'base' })
      if (level > 1) dmgFactors.push({ text: mul(baseDmgLevel / def.damage), origin: `levels (${level})`, kind: 'mul' })

      // Extra slot: penalty and trigger-type bonus shown right after base & level
      if (slot > 0) {
        dmgFactors.push({ text: mul(slotPenalty), origin: `slot ${slot + 1} penalty`, kind: 'less' })
        if (triggerType === 'crit') {
          dmgFactors.push({ text: mul(balance.ascent.critTriggerDamageMult), origin: 'crit trigger penalty', kind: 'less' })
        } else if (triggerType === 'affliction') {
          dmgFactors.push({ text: mul(balance.ascent.afflictionTriggerDamageMult), origin: 'affliction trigger penalty', kind: 'less' })
        }
      }

      // Speed chain
      const spdFactors: StatFactor[] = []
      const baseSpdLevel = def.speed * (1 + (level - 1) * balance.action.speedBonusPerLevel)
      spdFactors.push({ text: fmt(def.speed, 2), origin: 'base', kind: 'base' })
      if (level > 1) spdFactors.push({ text: mul(baseSpdLevel / def.speed), origin: `levels (${level})`, kind: 'mul' })

      // Action mastery
      if (ab.damageIncrease !== 0) dmgFactors.push(incF(ab.damageIncrease, 'action mastery total increased', 'action mastery'))
      if (ab.moreDamage !== 0) dmgFactors.push(moreF(ab.moreDamage,
        moreNodeLabel(actionNodes, actionDumped, MASTERY_DUMP.action.rate,
          (t, n) => getActionNodeEffect(t, n).actionMoreDamage ?? 0, 'action mastery'), 'action mastery'))
      if (ab.lessActionDamage !== 0) dmgFactors.push({ text: mul(Math.max(0, 1 - ab.lessActionDamage / 100)), origin: 'action mastery (less)', kind: 'less', group: 'action mastery' })
      if (lbAct.lessActionDamage !== 0) dmgFactors.push({ text: mul(Math.max(0, 1 - lbAct.lessActionDamage / 100)), origin: 'life mastery (less)', kind: 'less', group: 'life mastery' })
      if (ab.actionSpeedIncrease !== 0) spdFactors.push(incF(ab.actionSpeedIncrease, 'action mastery total increased', 'action mastery'))
      if (ab.moreActionSpeed !== 0) spdFactors.push(moreF(ab.moreActionSpeed,
        moreNodeLabel(actionNodes, 0, 0,
          (t, n) => getActionNodeEffect(t, n).actionMoreSpeed ?? 0, 'action mastery'), 'action mastery'))
      if (ab.lessActionSpeed !== 0) spdFactors.push({ text: mul(Math.max(0, 1 - ab.lessActionSpeed / 100)), origin: 'action mastery (less)', kind: 'less', group: 'action mastery' })

      if (pbData) {
        const { b: pb, nodes: projNodes } = pbData
        if (pb.damageIncrease !== 0) dmgFactors.push(incF(pb.damageIncrease, 'projectile mastery total increased', 'projectile mastery'))
        if (pb.moreDamage !== 0) dmgFactors.push(moreF(pb.moreDamage,
          moreNodeLabel(projNodes, 0, 0,
            (t, n) => getProjectileNodeEffect(t, n).projMoreDamage ?? 0, 'projectile mastery'), 'projectile mastery'))
        if (pb.actionSpeedIncrease !== 0) spdFactors.push(incF(pb.actionSpeedIncrease, 'projectile mastery total increased', 'projectile mastery'))
      }
      if (sbData) {
        const { b: sb, nodes: strikeNodes, dumped: strikeDumped } = sbData
        if (sb.damageIncrease !== 0) dmgFactors.push(incF(sb.damageIncrease, 'strike mastery total increased', 'strike mastery'))
        if (sb.moreDamage !== 0) dmgFactors.push(moreF(sb.moreDamage,
          moreNodeLabel(strikeNodes, 0, 0,
            (t, n) => getStrikeNodeEffect(t, n).strikeMoreDamage ?? 0, 'strike mastery'), 'strike mastery'))
        if (sb.actionSpeedIncrease !== 0) spdFactors.push(incF(sb.actionSpeedIncrease, 'strike mastery total increased', 'strike mastery'))
        if (sb.moreActionSpeed !== 0) spdFactors.push(moreF(sb.moreActionSpeed,
          moreNodeLabel(strikeNodes, strikeDumped, MASTERY_DUMP.strike.rate,
            (t, n) => getStrikeNodeEffect(t, n).strikeMoreActionSpeed ?? 0, 'strike mastery'), 'strike mastery'))
      }
      if (libData) {
        const { b: lib, nodes: lightNodes, dumped: lightDumped } = libData
        if (lib.damageIncrease !== 0) dmgFactors.push(incF(lib.damageIncrease, 'lightning mastery total increased', 'lightning mastery'))
        if (lib.moreDamage !== 0) dmgFactors.push(moreF(lib.moreDamage,
          moreNodeLabel(lightNodes, lightDumped, MASTERY_DUMP.lightning.rate,
            (t, n) => getLightningNodeEffect(t, n).lightningMoreDamage ?? 0, 'lightning mastery'), 'lightning mastery'))
        if (lib.actionSpeedIncrease !== 0) spdFactors.push(incF(lib.actionSpeedIncrease, 'lightning mastery total increased', 'lightning mastery'))
        if (lib.moreActionSpeed !== 0) spdFactors.push(moreF(lib.moreActionSpeed,
          moreNodeLabel(lightNodes, 0, 0,
            (t, n) => getLightningNodeEffect(t, n).lightningMoreActionSpeed ?? 0, 'lightning mastery'), 'lightning mastery'))
      }
      if (fbData) {
        const { b: fb, nodes: fireNodes, dumped: fireDumped } = fbData
        if (fb.damageIncrease !== 0) dmgFactors.push(incF(fb.damageIncrease, 'fire mastery total increased', 'fire mastery'))
        if (fb.moreDamage !== 0) dmgFactors.push(moreF(fb.moreDamage,
          moreNodeLabel(fireNodes, fireDumped, MASTERY_DUMP.fire.rate,
            (t, n) => getFireNodeEffect(t, n).fireMoreDamage ?? 0, 'fire mastery'), 'fire mastery'))
        if (fb.actionSpeedIncrease !== 0) spdFactors.push(incF(fb.actionSpeedIncrease, 'fire mastery total increased', 'fire mastery'))
      }
      if (cbData) {
        const { b: cb2, nodes: coldNodes, dumped: coldDumped } = cbData
        if (cb2.damageIncrease !== 0) dmgFactors.push(incF(cb2.damageIncrease, 'cold mastery total increased', 'cold mastery'))
        if (cb2.moreDamage !== 0) dmgFactors.push(moreF(cb2.moreDamage,
          moreNodeLabel(coldNodes, coldDumped, MASTERY_DUMP.cold.rate,
            (t, n) => getColdNodeEffect(t, n).coldMoreDamage ?? 0, 'cold mastery'), 'cold mastery'))
        if (cb2.actionSpeedIncrease !== 0) spdFactors.push(incF(cb2.actionSpeedIncrease, 'cold mastery total increased', 'cold mastery'))
      }
      if (rotData) {
        const { b: rotb, nodes: rotNodes, dumped: rotDumped } = rotData
        if (rotb.damageIncrease !== 0) dmgFactors.push(incF(rotb.damageIncrease, 'rot mastery total increased', 'rot mastery'))
        if (rotb.moreDamage !== 0) dmgFactors.push(moreF(rotb.moreDamage,
          moreNodeLabel(rotNodes, rotDumped, MASTERY_DUMP.rot.rate,
            (t, n) => getRotNodeEffect(t, n).rotMoreDamage ?? 0, 'rot mastery'), 'rot mastery'))
        if (rotb.actionSpeedIncrease !== 0) spdFactors.push(incF(rotb.actionSpeedIncrease, 'rot mastery total increased', 'rot mastery'))
      }
      if (phbData) {
        const { b: phb, nodes: physNodes, dumped: physDumped } = phbData
        if (phb.damageIncrease !== 0) dmgFactors.push(incF(phb.damageIncrease, 'physical mastery total increased', 'physical mastery'))
        if (phb.moreDamage !== 0) dmgFactors.push(moreF(phb.moreDamage,
          moreNodeLabel(physNodes, physDumped, MASTERY_DUMP.physical.rate,
            (t, n) => getPhysicalNodeEffect(t, n).physicalMoreDamage ?? 0, 'physical mastery'), 'physical mastery'))
        if (phb.actionSpeedIncrease !== 0) spdFactors.push(incF(phb.actionSpeedIncrease, 'physical mastery total increased', 'physical mastery'))
      }
      if (arbData) {
        const { b: arb, nodes: areaNodes, dumped: areaDumped } = arbData
        if (arb.damageIncrease !== 0) dmgFactors.push(incF(arb.damageIncrease, 'area mastery total increased', 'area mastery'))
        if (arb.moreDamage !== 0) dmgFactors.push(moreF(arb.moreDamage,
          moreNodeLabel(areaNodes, areaDumped, 0,
            (t, n) => getAreaNodeEffect(t, n).areaMoreDamage ?? 0, 'area mastery'), 'area mastery'))
        if (arb.lessActionSpeed !== 0) spdFactors.push({ text: mul(Math.max(0.01, 1 - arb.lessActionSpeed / 100)), origin: 'area mastery (less)', kind: 'less', group: 'area mastery' })
      }

      if (rb.damageIncrease !== 0) dmgFactors.push(incF(rb.damageIncrease, 'runes total increased', 'runes'))
      if (rb.damageMore !== 1) dmgFactors.push({ text: mul(rb.damageMore), origin: 'runes (more)', kind: 'more', group: 'runes' })
      if (rb.speedIncrease !== 0) spdFactors.push(incF(rb.speedIncrease, 'runes total increased', 'runes'))
      if (rb.speedMore !== 1) spdFactors.push({ text: mul(rb.speedMore), origin: 'runes (more)', kind: 'more', group: 'runes' })
      if (rb.slowHeavy) {
        dmgFactors.push({ text: '×2', origin: 'rune: Slow & Heavy', kind: 'more', group: 'runes' })
        spdFactors.push({ text: '×0.5', origin: 'rune: Slow & Heavy', kind: 'less', group: 'runes' })
      }
      if (mb.actionSpeedIncrease > 0) spdFactors.push(incF(mb.actionSpeedIncrease, 'mana mastery total increased', 'mana mastery'))

      // Recompute totals exactly as assignAction would (authoritative source of
      // truth for the displayed totals), via a temp entity with a throwaway id so
      // assignAction's entityActions.set() can't corrupt real player state.
      const tmp = { ...playerEntity, id: '__stats_preview__', role: 'player' } as Entity
      assignAction(tmp, id)
      entityActions.delete('__stats_preview__')

      // Extra slot total: assignAction doesn't apply slot penalties, so adjust.
      // Crit/affliction trigger slots take an extra flat damage penalty.
      const triggerMult = triggerType === 'crit'       ? balance.ascent.critTriggerDamageMult
                        : triggerType === 'affliction'  ? balance.ascent.afflictionTriggerDamageMult
                        : 1
      const adjustedDamage = tmp.actionDamage * slotPenalty * triggerMult

      const damage: StatLine = { label: 'Total damage', total: fmt(adjustedDamage, 2), factors: dmgFactors }
      const speed:  StatLine = { label: 'Total speed (actions/sec)', total: fmt(tmp.actionSpeed, 2), factors: spdFactors }

      // ── Multi-strike (calculation order) ──────────────────────────────────
      const multiStrike: OddsLine[] = []
      {
        let chance = 0
        const parts: string[] = []
        if (sbData) {
          const sb = sbData.b
          const c = sb.additionalTargetChance * (1 + sb.additionalTargetMore / 100)
          if (c > 0) { chance += c; parts.push('strike mastery') }
        }
        if (pbData) {
          const pb = pbData.b
          if (pb.additionalTargetChance > 0) { chance += pb.additionalTargetChance; parts.push('projectile mastery') }
        }
        if (chance > 0) multiStrike.push({ label: 'Additional target', odds: pct(chance), origin: parts.join(' + '), note: 'plus trance bonus while active' })
      }
      if (ab.doubleActionChance > 0) {
        multiStrike.push({ label: 'Double action', odds: pct(ab.doubleActionChance), origin: 'action mastery', note: ab.doubleActionReroll ? 'rerolls once' : undefined })
      }
      if (pbData) {
        const pb = pbData.b
        if (pb.extraChance > 0) multiStrike.push({ label: 'Additional projectile', odds: pct(pb.extraChance), origin: 'projectile mastery' })
      }
      if (rb.splitCast) multiStrike.push({ label: 'Split action', odds: 'always', origin: 'rune: Split Action', note: 'second cast at ×0.5 damage' })
      if (libData) {
        const lib = libData.b
        if (lib.jumpChance > 0) multiStrike.push({ label: 'Chain jump', odds: pct(lib.jumpChance), origin: 'lightning mastery', note: lib.jumpFromElectrocutedChance > 0 ? `+${pct(lib.jumpFromElectrocutedChance)} vs electrocuted` : undefined })
      }
      if (arbData) {
        const arb = arbData.b
        if (arb.tremorChance > 0) multiStrike.push({ label: 'Tremor', odds: pct(arb.tremorChance), origin: 'area mastery', note: 'rolled per extra area victim' })
      }

      // ── Affliction chance + damage ────────────────────────────────────────
      let afflictionChance: OddsLine | undefined
      let afflictionDamage: StatLine | undefined
      const baseAffl = balance.effects.baseApplyChance
      const strikeAffl = sbData ? sbData.b.afflictionChanceIncrease : 0
      const slotHitDmg = adjustedDamage  // slot-adjusted hit damage (penalty + crit trigger) for affliction base

      if (fbData) {
        const { b: fb, nodes: fireNodes, dumped: fireDumped } = fbData
        const chance = baseAffl + fb.burnApplyChance + strikeAffl
        afflictionChance = { label: 'Burn chance', odds: pct(chance), origin: `base ${pct(baseAffl)} + fire mastery${strikeAffl ? ' + strike' : ''}` }
        const dps = slotHitDmg * balance.effects.burnDpsFraction * (1 + fb.burnDamageIncrease / 100) * (1 + fb.burnMoreDamage / 100) * Math.max(0, 1 - fb.burnLessDamage / 100) * fb.burnDamageMult
        const df: StatFactor[] = [
          { text: fmt(slotHitDmg, 2), origin: 'hit damage', kind: 'base' },
          { text: mul(balance.effects.burnDpsFraction), origin: 'burn fraction', kind: 'mul' },
        ]
        if (fb.burnDamageIncrease !== 0) df.push(incF(fb.burnDamageIncrease, 'fire mastery total increased', 'fire mastery'))
        if (fb.burnMoreDamage !== 0) df.push(moreF(fb.burnMoreDamage,
          moreNodeLabel(fireNodes, fireDumped, 0,
            (t, n) => getFireNodeEffect(t, n).fireBurnMoreDamage ?? 0, 'fire mastery'), 'fire mastery'))
        afflictionDamage = { label: 'Burn DPS', total: fmt(dps, 2), factors: df }
      } else if (phbData) {
        const { b: phb, nodes: physNodes, dumped: physDumped } = phbData
        const chance = baseAffl + phb.bleedApplyChance + strikeAffl
        afflictionChance = { label: 'Bleed chance', odds: pct(chance), origin: `base ${pct(baseAffl)} + physical mastery${strikeAffl ? ' + strike' : ''}` }
        const dps = slotHitDmg * balance.effects.bleedDpsFraction * (1 + phb.bleedDamageIncrease / 100) * (1 + phb.bleedMoreDamage / 100) * Math.max(0, 1 - phb.bleedLessDamage / 100) * phb.bleedDamageMult
        const df: StatFactor[] = [
          { text: fmt(slotHitDmg, 2), origin: 'hit damage', kind: 'base' },
          { text: mul(balance.effects.bleedDpsFraction), origin: 'bleed fraction', kind: 'mul' },
        ]
        if (phb.bleedDamageIncrease !== 0) df.push(incF(phb.bleedDamageIncrease, 'physical mastery total increased', 'physical mastery'))
        if (phb.bleedMoreDamage !== 0) df.push(moreF(phb.bleedMoreDamage,
          moreNodeLabel(physNodes, physDumped, 0,
            (t, n) => getPhysicalNodeEffect(t, n).physicalBleedMoreDamage ?? 0, 'physical mastery'), 'physical mastery'))
        afflictionDamage = { label: 'Bleed DPS', total: fmt(dps, 2), factors: df }
      } else if (libData) {
        const { b: lib } = libData
        const chance = baseAffl + lib.electrocuteApplyChance + strikeAffl
        afflictionChance = { label: 'Electrocute chance', odds: pct(chance), origin: `base ${pct(baseAffl)} + lightning mastery${strikeAffl ? ' + strike' : ''}`, note: `electrocuted enemies take +${pct(balance.effects.electrocutionBaseDamageTakenPct + lib.electrocuteDamageTakenIncrease)} damage` }
      } else if (rotData) {
        const { b: rotb, nodes: rotNodes, dumped: rotDumped } = rotData
        const chance = baseAffl + rotb.poisonApplyChance + strikeAffl
        afflictionChance = { label: 'Poison chance', odds: pct(chance), origin: `base ${pct(baseAffl)} + rot mastery${strikeAffl ? ' + strike' : ''}` }
        const dps = slotHitDmg * (balance.ascent.poisonBaseDamagePct / 100) * (1 + rotb.poisonDamageIncrease / 100) * (1 + rotb.poisonMoreDamage / 100) * Math.max(0, 1 - rotb.poisonLessDamage / 100) * rotb.poisonDamageMult
        const df: StatFactor[] = [
          { text: fmt(slotHitDmg, 2), origin: 'hit damage', kind: 'base' },
          { text: mul(balance.ascent.poisonBaseDamagePct / 100), origin: 'poison fraction', kind: 'mul' },
        ]
        if (rotb.poisonDamageIncrease !== 0) df.push(incF(rotb.poisonDamageIncrease, 'rot mastery total increased', 'rot mastery'))
        if (rotb.poisonMoreDamage !== 0) df.push(moreF(rotb.poisonMoreDamage,
          moreNodeLabel(rotNodes, rotDumped, 0,
            (t, n) => getRotNodeEffect(t, n).rotPoisonMoreDamage ?? 0, 'rot mastery'), 'rot mastery'))
        afflictionDamage = { label: 'Poison DPS', total: fmt(dps, 2), factors: df }
      } else if (cbData) {
        const { b: cb2 } = cbData
        const chance = balance.frost.baseFrostChancePct + cb2.frostApplyChance + strikeAffl
        afflictionChance = { label: 'Frost chance', odds: pct(chance), origin: `base ${pct(balance.frost.baseFrostChancePct)} + cold mastery${strikeAffl ? ' + strike' : ''}`, note: 'frosted enemies are slowed and take more damage from non-cold sources' }
      }

      // ── Critical hit ──────────────────────────────────────────────────────
      const cb = getCriticalHitBonuses()
      const basCrit = baseCritChancePct(tags)
      let critChance: OddsLine
      if (!critUnlocked) {
        critChance = { label: 'Crit chance', odds: 'Locked', origin: 'unlocks at 1st ascension' }
      } else if (basCrit <= 0) {
        critChance = { label: 'Crit chance', odds: '0%', origin: 'this action cannot crit' }
      } else {
        const total = (basCrit + critBaseAddTotal()) * (1 + cb.chanceIncrease / 100) * (1 + cb.chanceMore / 100)
        critChance = { label: 'Crit chance', odds: pct(Math.min(100, total)), origin: `base ${pct(basCrit)} + crit mastery` }
      }
      const critMultVal = critDamageMultiplier()
      const critDmgFactors: StatFactor[] = [{ text: `×${fmt(balance.criticalHit.damageMultiplier)}`, origin: 'base', kind: 'base' }]
      if (cb.damageIncrease !== 0) critDmgFactors.push({ text: `+${pct(cb.damageIncrease)}`, origin: 'crit mastery total increased', kind: 'mul', group: 'crit mastery' })
      if (cb.damageMore !== 0) critDmgFactors.push(moreF(cb.damageMore,
        moreNodeLabel(critNodes, critDumped, MASTERY_DUMP.criticalHit.rate,
          (t, n) => getCriticalHitNodeEffect(t, n).critDamageMore ?? 0, 'crit mastery'), 'crit mastery'))
      const critDamage: StatLine = { label: 'Crit damage', total: mul(critMultVal), factors: critDmgFactors }

      // ── Triggerable buffs ─────────────────────────────────────────────────
      const triggerBuffs: { name: string; odds: string; effect: string }[] = []
      if (sbData) {
        const sb = sbData.b
        if (sb.frenzyChance > 0) triggerBuffs.push({ name: 'Frenzy', odds: pct(sb.frenzyChance), effect: `+${fmt(sb.frenzyDamagePerCharge)}% dmg & +${fmt(sb.frenzySpeedPerCharge)}% speed per charge (strike mastery)` })
      }
      if (phbData) {
        const phb = phbData.b
        if (phb.bloodlustChance > 0) triggerBuffs.push({ name: 'Bloodlust', odds: pct(phb.bloodlustChance), effect: `+${fmt(phb.bloodlustDamage)}% physical dmg & +${fmt(phb.bloodlustActionSpeed)}% speed while active (on bleed)` })
      }
      if (libData) {
        const lib = libData.b
        if (lib.electrifyChance > 0) triggerBuffs.push({ name: 'Electrified', odds: pct(lib.electrifyChance), effect: `+${fmt(lib.electrifyActionSpeed)}% speed & −${fmt(lib.electrifyDamageReduction)}% damage taken while active` })
      }
      if (fbData) {
        const fb = fbData.b
        if (fb.immolateChance > 0) triggerBuffs.push({ name: 'Immolation', odds: pct(fb.immolateChance), effect: `+${fmt(fb.immolateDamageBonus)}% fire dmg while active (self-burns)` })
      }
      if (ab.tranceTriggerChance > 0) {
        triggerBuffs.push({ name: 'Trance', odds: pct(ab.tranceTriggerChance), effect: `+${fmt(ab.tranceDamageIncrease)}% dmg & +${fmt(ab.tranceActionSpeedIncrease)}% speed per stack while active` })
      }
      if (lb.feedingFrenzyChance > 0 || mb.feedingFrenzyChance > 0) {
        const c = Math.max(lb.feedingFrenzyChance, mb.feedingFrenzyChance)
        triggerBuffs.push({ name: 'Feeding Frenzy', odds: pct(c), effect: `+${balance.buffs.feedingFrenzyStealBonus}% steal & +${balance.buffs.feedingFrenzyRegenBonus}% regen (on life/mana steal)` })
      }

      const slotNote = slot === 0 ? undefined
        : `Extra slot ${slot + 1} — ${Math.round(slotPenalty * 100)}% damage${triggerType ? `, fires on ${TRIGGER_LABEL[triggerType] ?? triggerType}` : ''}`

      return {
        name: getActionLabel(id),
        damage, speed, isDependentTrigger,
        multiStrike,
        afflictionChance, afflictionDamage,
        critChance, critDamage, triggerBuffs, slotNote,
      } as ActionStatBlock
    })

    return {
      life, mana,
      physRotResist: pct(physRes),
      elementalResist: pct(eleRes),
      resistNote: 'Phys/Rot applies to physical & rot hits; Elemental to fire, lightning & cold. Kiting adds more. Capped at 100%.',
      actions,
    }
  }

  el.querySelector<HTMLButtonElement>('[data-action="open-character"]')!
    .addEventListener('click', () => {
      if (modalCleanup) { modalCleanup(); modalCleanup = null }
      // Seeing the character screen clears its notification for this run.
      if (!charNotifSeen) {
        charNotifSeen = true
        persistState()
        refreshCharNotifDot()
      }
      modalCleanup = mountCharacterModal(el, {
        dieLabel: dieButtonLabel(),
        transcendCount,
        relics: [...relics],
        onDie: () => {
          modalCleanup = null
          handleManualDie()
        },
        onCustomize: () => {
          modalCleanup = null
          const prefs = getPrefs()
          const initHat   = (prefs.playerHatVariant  as HeadVariant)   ?? 'hood'
          const initColor = (prefs.playerColorKey     as PlayerColorKey) ?? 'teal'
          modalCleanup = mountCharacterCustomizeModal(el, {
            initialHat:    initHat,
            initialShield: (prefs.playerShieldVariant as ShieldVariant) ?? 'buckler',
            initialColor:  initColor,
            shieldsUnlocked: transcendCount >= 1 || getPrefs().fullMastery,
            onChange: (hat, shield, color) => {
              setPref('playerHatVariant', hat)
              setPref('playerShieldVariant', shield)
              setPref('playerColorKey', color)
              rebuildPlayerRig(hat, color)
            },
            onClose: () => { modalCleanup = null },
          })
        },
        onStats: () => {
          modalCleanup = null
          modalCleanup = mountCharacterStatsModal(el, {
            snapshot: buildPlayerStatsSnapshot(),
            onClose: () => { modalCleanup = null },
          })
        },
        onClose: () => { modalCleanup = null },
      })
    })

  // ── PixiJS ──────────────────────────────────────────────────────────────

  let app: Application | null = null
  let floorContainer: Container | null = null
  let wallContainer: Container | null = null
  let floorOptions: { tex: Texture; w: number }[] = []
  let treeOptions:  { tex: Texture; w: number }[] = []
  let decoOptions:  { tex: Texture; w: number }[] = []
  const entityRigs = new Map<string, EntityRig>()
  const floorSprites: Sprite[] = []
  const wallSprites: Sprite[] = []
  let destroyed = false
  let modalCleanup: (() => void) | null = null

  // Keep the simulation advancing while the tab is hidden. requestAnimationFrame
  // (which drives Pixi's ticker) stops entirely in a backgrounded tab, so we pump
  // the ticker manually from a Web Worker timer instead. See onVisibilityChange.
  let bgTicker: BackgroundTicker | null = null
  let onVisibilityChange: (() => void) | null = null

  const entityContainers = new Map<string, Container>()
  const lifeBarGraphics = new Map<string, Graphics>()
  const actionCooldowns = new Map<string, number>()
  type MultiActionType = 'doubleAction' | 'additionalTarget' | 'additionalProjectile' | 'splitAction' | 'jump' | 'tremor'
  interface PendingMultiAction {
    type:                   MultiActionType
    inheritedDamageMult:    number   // accumulated ×0.9^depth × parent ownMult
    target?:                Entity   // pre-selected target (additionalTarget / additionalProjectile / jump / tremor)
    isChainProjectile?:     boolean  // second additional projectile from extraDoubleRoll; cannot chain further
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

  interface ExtraSlotMA {
    type:                MultiActionType
    inheritedDamageMult: number
    slotDmg:             number        // primary-hit damage (all bonuses baked in)
    slotDef:             ActionDef
    slotActionId:        ActionId
    slotI:               number
    trigger:             TriggerType
    target?:             Entity        // pre-selected for additionalTarget / jump / tremor
    slotPreHitDuration:  number
    areaOriginX?:        number        // for self-targeted area: position snapshot of the area centre
    areaOriginY?:        number
  }

  interface PendingHit {
    attacker:              Entity
    target:                Entity
    damage:                number
    action:                ActionDef
    actionId:              ActionId
    countdown:             number   // ms remaining until impact
    guaranteedAfflictions: boolean
    isDoubleDamage?:       boolean  // true when the double-damage roll already multiplied this hit's damage by ×2
    multiActionType?:      MultiActionType
    isMainSlot?:           boolean  // true when fired from the auto-attack slot (for crit trigger detection)
    impactX?:              number   // area center x for knockback direction (area attacks only)
    impactY?:              number   // area center y for knockback direction (area attacks only)
  }
  const pendingHits = new Map<string, PendingHit>()  // keyed by unique hit id (entity.id:seq)
  let hitSeq = 0

  const DPS_WINDOW_MS = 20_000
  type DpsKind = 'direct' | `multi:${MultiActionType}` | 'hit:base' | 'hit:crit' | 'affliction:burn' | 'affliction:bleed' | 'affliction:groundFire' | 'affliction:poison'
  interface DpsEvent { t: number; actionId: ActionId; dmg: number; kind: DpsKind }
  const dpsLog: DpsEvent[] = []
  const dpsActionOrder: ActionId[] = []  // stable first-fire order for display
  // Game-time clock — advances by ticker.deltaMS each frame (which is already
  // scaled by app.ticker.speed = gameSpeed). Using this instead of Date.now()
  // keeps DPS values stable across game-speed changes.
  let gameTimeMs = 0
  function recordDps(actionId: ActionId, dmg: number, kind: DpsKind): void {
    dpsLog.push({ t: gameTimeMs, actionId, dmg, kind })
    if (!dpsActionOrder.includes(actionId)) dpsActionOrder.push(actionId)
  }
  function fmtDps(n: number): string {
    const f = (x: number) => x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2)
    if (n >= 1e9) return f(n / 1e9) + 'b'
    if (n >= 1e6) return f(n / 1e6) + 'm'
    if (n >= 1e3) return f(n / 1e3) + 'k'
    return f(n)
  }
  function computeDps(): Map<ActionId, Map<string, number>> {
    const cutoff = gameTimeMs - DPS_WINDOW_MS
    while (dpsLog.length > 0 && dpsLog[0].t < cutoff) dpsLog.shift()
    const out = new Map<ActionId, Map<string, number>>()
    for (const e of dpsLog) {
      let byKind = out.get(e.actionId)
      if (!byKind) { byKind = new Map(); out.set(e.actionId, byKind) }
      byKind.set(e.kind, (byKind.get(e.kind) ?? 0) + e.dmg / (DPS_WINDOW_MS / 1000))
    }
    return out
  }
  const strongEntities = new Set<string>()      // strong-or-better enemies
  const eliteEntities = new Set<string>()        // elite-or-better enemies
  const championEntities = new Set<string>()     // champion-or-boss enemies
  const bossEntities = new Set<string>()         // boss enemies
  const highResistEntities = new Set<string>()   // enemies with physRot or ele resist ≥ threshold
  const proliferateSourceEntities = new Set<string>()  // enemies from this tree (don't roll for proliferate on kill)
  let pendingProliferateSpawns = 0  // extra enemies to add to the next wave from proliferate kills

  function tierXpMult(entityId: string): number {
    if (bossEntities.has(entityId)) return balance.enemyVariance.bossXpMultiplier
    if (championEntities.has(entityId)) return balance.enemyVariance.championXpMultiplier
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
        (id, count) => { dumpMasteryPoints(id, count) },
        id => { resetMasteryPoints(id) },
        computeMasteryGains,
        ascentCount,
        freeMasteryPointsUsed,
        masteryDumpPoints,
        (id: MasteryId) => remainingFreeMasteryPointsFor(id),
        () => { handleManualDie() },
        dieButtonLabel(),
        (id: MasteryId) => masteryPointsSeen[id] ?? 0,
        (id: MasteryId) => { markMasteryTreeSeen(id) },
      )
    })

  // Tutorial deferred until the next modal closes (used for tutorials that
  // need to point at top-bar buttons hidden behind the just-opened modal).
  let pendingPostModalTutorial: (() => void) | null = null

  function openAscentModal(): void {
    modalCleanup = mountAscentModal(
      container,
      () => ascentCount,
      () => ({ ...universePointAllocations }),
      (slot, delta) => {
        const alloc = universePointAllocations[slot] + delta
        const SLOT_MAX: Record<keyof UniversePointAllocations, number> = {
          placeholderA: balance.ascent.universePointMaxA,
          placeholderB: balance.ascent.universePointMaxB,
          placeholderC: balance.ascent.universePointMaxC,
          placeholderD: balance.ascent.universePointMaxD,
        }
        const maxForSlot = SLOT_MAX[slot]
        const totalSpent = (Object.values(universePointAllocations) as number[]).reduce((s, v) => s + v, 0)
        const available = universePointsForAscent(ascentCount) - totalSpent
        if (delta > 0 && (available <= 0 || alloc > maxForSlot)) return
        if (delta < 0 && alloc < 0) return
        universePointAllocations = { ...universePointAllocations, [slot]: alloc }
        persistState()
      },
      () => {
        modalCleanup = null
        const queued = pendingPostModalTutorial
        pendingPostModalTutorial = null
        queued?.()
      },
      () => openArtifactsModal(),
      transcendCount > 0,
    )
  }

  function openArtifactsModal(): void {
    if (modalCleanup) { modalCleanup(); modalCleanup = null }
    modalCleanup = mountArtifactsModal(
      container,
      {
        getArtifacts: () => [...artifacts],
        getMaxEquipped: () => maxEquippedArtifacts(ascentCount, transcendCount > 0),
        getMax: () => maxBaggedArtifacts(ascentCount),
        getScraps: () => scraps,
      },
      {
        onEquip: (id) => {
          const art = artifacts.find(a => a.id === id)
          if (!art) return
          const usedEq = artifacts.filter(a => a.equipped).length
          if (usedEq >= maxEquippedArtifacts(ascentCount, transcendCount > 0)) return
          art.equipped = true
          recomputeArtifactMods()
          assignAction(playerEntity, playerActionId)
          persistState()
          refreshArtifactDot()
        },
        onUnequip: (id) => {
          const art = artifacts.find(a => a.id === id)
          if (!art) return
          art.equipped = false
          recomputeArtifactMods()
          assignAction(playerEntity, playerActionId)
          persistState()
          refreshArtifactDot()
        },
        onDelete: (id) => {
          const idx = artifacts.findIndex(a => a.id === id)
          if (idx === -1) return
          const wasEquipped = artifacts[idx].equipped
          scraps += scrapsForArtifact(artifacts[idx])
          artifacts.splice(idx, 1)
          if (wasEquipped) {
            recomputeArtifactMods()
            assignAction(playerEntity, playerActionId)
          }
          persistState()
          refreshArtifactDot()
        },
        onUpgrade: (id) => {
          const art = artifacts.find(a => a.id === id)
          if (!art) return null
          const cost = upgradeCost(art)
          if (scraps < cost) return null
          const res = upgradeArtifact(art)
          if (res.kind === 'upgraded') {
            scraps -= cost
            if (art.equipped) {
              recomputeArtifactMods()
              assignAction(playerEntity, playerActionId)
            }
            persistState()
          }
          return res
        },
      },
      () => { modalCleanup = null },
    )
  }

  function refreshArtifactDot(): void {
    const dot = el.querySelector<HTMLElement>('.artifact-notif-dot')
    if (!dot) return
    dot.hidden = artifacts.length < maxBaggedArtifacts(ascentCount)
  }

  el.querySelector<HTMLButtonElement>('[data-action="open-ascent"]')!
    .addEventListener('click', () => {
      if (modalCleanup) { modalCleanup(); modalCleanup = null; return }
      openAscentModal()
    })

  el.querySelector<HTMLButtonElement>('[data-action="ascend"]')!
    .addEventListener('click', () => { ascend() })

  el.querySelector<HTMLButtonElement>('[data-action="transcend"]')!
    .addEventListener('click', () => {
      if (!transcendReady) return
      if (modalCleanup) { modalCleanup(); modalCleanup = null }
      const unowned = ALL_RELICS.filter(r => !relics.includes(r))
      if (unowned.length > 0) {
        modalCleanup = mountRelicPickerModal(container, (relic) => {
          modalCleanup = null
          transcend(relic)
        }, () => { modalCleanup = null })
      } else {
        modalCleanup = mountTranscendConfirmModal(container, () => {
          modalCleanup = null
          transcend(null)
        })
      }
    })

  function drawLifeBar(entity: Entity): void {
    const bar = lifeBarGraphics.get(entity.id)
    if (!bar) return
    const barW = entity.radius * 2
    const isBoss = bossEntities.has(entity.id)
    const h = isBoss ? HP_BAR_H * 2 : HP_BAR_H
    bar.clear()
    bar.rect(-barW / 2, 0, barW, h)
    bar.fill({ color: tokens.color.surfacePanel })
    const pct = Math.max(0, entity.currentLife / entity.maxLife)
    if (pct > 0) {
      bar.rect(-barW / 2, 0, barW * pct, h)
      bar.fill({ color: 0xdd2222 })
    }
    // Bosses get a thicker bar with a bold black contour to stand out.
    if (isBoss) {
      bar.rect(-barW / 2, 0, barW, h)
      bar.stroke({ color: 0x000000, width: 2 })
    }
  }

  function entityTier(id: string): Tier {
    if (bossEntities.has(id))     return 'boss'
    if (championEntities.has(id)) return 'champion'
    if (eliteEntities.has(id))    return 'elite'
    if (strongEntities.has(id))   return 'strong'
    return 'normal'
  }

  function initEntityDisplay(entity: Entity): void {
    if (!app || entityContainers.has(entity.id)) return
    const c = new Container()

    const tier: Tier = entity.role === 'player' ? 'player' : entityTier(entity.id)
    const actionId = entity.role === 'player'
      ? playerActionId
      : (entityActions.get(entity.id) ?? 'sword') as ActionId
    const isPlayer = entity.role === 'player'
    const savedPrefs = getPrefs()
    const rig = createEntityRig({
      role:   entity.role,
      tier,
      weapon: weaponForAction(getAction(actionId)),
      radius: entity.radius,
      seed:   entity.id,
      ...(isPlayer && savedPrefs.playerColorKey  ? { colorKey:     savedPrefs.playerColorKey  as PlayerColorKey } : {}),
      ...(isPlayer && savedPrefs.playerHatVariant ? { headOverride: savedPrefs.playerHatVariant as HeadVariant  } : {}),
      ...(isPlayer ? { shield: playerShieldVariant() } : {}),
    })
    c.addChild(rig.container)
    entityRigs.set(entity.id, rig)

    if (entity.role !== 'player') {
      // Anchor bars/markers above the rendered rig (head), not just the body radius.
      const topY = rigTopOffset(entity.radius)
      const barH = bossEntities.has(entity.id) ? HP_BAR_H * 2 : HP_BAR_H
      const bar = new Graphics()
      bar.position.set(0, -(topY + HP_BAR_GAP + barH))
      c.addChild(bar)
      lifeBarGraphics.set(entity.id, bar)
      drawLifeBar(entity)
      if (bossEntities.has(entity.id)) {
        const halo = new Graphics()
        halo.circle(0, 0, entity.radius + 10)
        halo.stroke({ color: 0xff8800, width: 4, alpha: 0.8 })
        c.addChildAt(halo, 0)
      } else if (championEntities.has(entity.id)) {
        const halo = new Graphics()
        halo.circle(0, 0, entity.radius + 8)
        halo.stroke({ color: 0xffffff, width: 3, alpha: 0.75 })
        c.addChildAt(halo, 0)
      }
    }
    c.position.set(entity.x, entity.y)
    app.stage.addChild(c)
    entityContainers.set(entity.id, c)
  }

  function rebuildPlayerRig(hat: HeadVariant, color: PlayerColorKey): void {
    const c = entityContainers.get('player')
    const old = entityRigs.get('player')
    if (!c || !old) return
    old.container.destroy()
    entityRigs.delete('player')
    const rig = createEntityRig({
      role:         'player',
      tier:         'player',
      weapon:       weaponForAction(getAction(playerActionId as ActionId)),
      radius:       playerEntity.radius,
      seed:         playerEntity.id,
      colorKey:     color,
      headOverride: hat,
      shield:       playerShieldVariant(),
    })
    c.addChildAt(rig.container, 0)
    entityRigs.set('player', rig)
  }

  const groupSizeCache = new Map<string, number>()

  function getBlockedGroupSize(tx: number, ty: number): number {
    const startKey = `${tx},${ty}`
    const cached = groupSizeCache.get(startKey)
    if (cached !== undefined) return cached
    const visited = new Set<string>()
    const queue: string[] = [startKey]
    visited.add(startKey)
    while (queue.length) {
      const cur = queue.shift()!
      const comma = cur.indexOf(',')
      const cx = parseInt(cur.slice(0, comma), 10)
      const cy = parseInt(cur.slice(comma + 1), 10)
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
        const nk = `${cx + dx},${cy + dy}`
        if (!visited.has(nk) && blockedTiles.has(nk)) {
          visited.add(nk)
          queue.push(nk)
        }
      }
    }
    const size = visited.size
    for (const k of visited) groupSizeCache.set(k, size)
    return size
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
    if (floorContainer && wallContainer && floorOptions.length && treeOptions.length) {
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
            const groupSize = getBlockedGroupSize(tx, ty)
            if (groupSize > 2) {
              // Tree tile — draw 1–3 sprites per the layout
              const layout = pickTreeLayout(tx, ty, gs)
              layout.forEach((item, idx) => {
                const wSprite = wallSprites[wallIdx] ?? (() => {
                  const s = new Sprite()
                  s.roundPixels = true
                  wallContainer!.addChild(s)
                  wallSprites.push(s)
                  return s
                })()
                // ±10% jitter (deterministic per tile + sprite) so trees never
                // sit on a perfect grid.
                const jx = (tileHash(tx * 4 + idx + 1, ty * 4 + 7)       - 0.5) * 0.2 * gs
                const jy = (tileHash(tx * 4 + 11,      ty * 4 + idx + 3) - 0.5) * 0.2 * gs
                // 20% taller, anchored at the trunk base so the extra canopy
                // grows up into the tile above.
                const h = item.h * 1.2
                wSprite.texture = pickWeighted(tx + item.sdx, ty + item.sdy, treeOptions)
                wSprite.x = Math.round(tx * gs + item.ox + jx)
                wSprite.y = Math.round(ty * gs + item.oy - item.h * 0.2 + jy)
                wSprite.width  = Math.round(item.w)
                wSprite.height = Math.round(h)
                wSprite.zIndex = wallIdx
                wSprite.visible = true
                wallIdx++
              })
            } else {
              // Deco tile — single sprite
              const wSprite = wallSprites[wallIdx] ?? (() => {
                const s = new Sprite()
                s.roundPixels = true
                wallContainer!.addChild(s)
                wallSprites.push(s)
                return s
              })()
              wSprite.texture = pickWeighted(tx, ty, decoOptions)
              wSprite.x = Math.round(tx * gs)
              wSprite.y = Math.round(ty * gs)
              wSprite.width  = gs + 1
              wSprite.height = gs + 1
              wSprite.zIndex = wallIdx
              wSprite.visible = true
              wallIdx++
            }
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

  // Forces a single canvas render when the ticker is stopped (e.g. paused during
  // rebirth/ascent) so the map snaps to the new player position immediately.
  function renderSingleFrame(): void {
    if (!app) return
    updateCamera()
    drawGrid()
    app.renderer.render(app.stage)
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

  function triggerShatter(srcX: number, srcY: number, srcMaxLife: number, coldBonuses: ColdBonuses): void {
    // Shatter damage is purely a fraction of the shattered enemy's max life — base
    // 5% plus the Shatter tree's "% of life" nodes. It is not an action and gets no
    // cold-damage or area-damage bonuses (only its own mastery).
    const baseDmg = srcMaxLife * (balance.shatter.damageBaseFraction + coldBonuses.shatterDamagePctLife / 100)
    const rangePx = balance.shatter.rangeUnits * (1 + coldBonuses.shatterRangeIncrease / 100) * balance.player.radius
    // White star-shaped shatter burst: a central flash and an expanding 5-pointed
    // star that grows to the edge of the blast radius.
    const STAR_POINTS = 5
    addVfx(450, (g, p) => {
      g.clear()
      g.position.set(srcX, srcY)
      const ease = 1 - Math.pow(1 - p, 2)
      // Central white flash early on
      if (p < 0.25) {
        const fp = p / 0.25
        g.circle(0, 0, rangePx * (0.2 + fp * 0.3))
        g.fill({ color: 0xffffff, alpha: (1 - fp) * 0.9 })
      }
      // Trace a star polygon of the given outer/inner radius, rotated `rot`.
      const rot = -Math.PI / 2 + p * 0.5
      const traceStar = (outerR: number, innerR: number): void => {
        for (let i = 0; i < STAR_POINTS * 2; i++) {
          const r = i % 2 === 0 ? outerR : innerR
          const a = rot + (i / (STAR_POINTS * 2)) * Math.PI * 2
          const x = Math.cos(a) * r, y = Math.sin(a) * r
          if (i === 0) g.moveTo(x, y); else g.lineTo(x, y)
        }
        g.closePath()
      }
      const outerR = rangePx * (0.2 + ease * 0.95)
      const innerR = outerR * 0.42
      // Filled translucent white body
      traceStar(outerR, innerR)
      g.fill({ color: 0xffffff, alpha: (1 - p) * 0.35 })
      // Crisp white outline
      traceStar(outerR, innerR)
      g.stroke({ color: 0xffffff, width: Math.max(1, 3 * (1 - p)), alpha: (1 - p) * 0.95 })
      // Smaller inner star for depth
      traceStar(outerR * 0.55, innerR * 0.55)
      g.stroke({ color: 0xffffff, width: Math.max(0.5, 2 * (1 - p)), alpha: (1 - p) * 0.7 })
    })
    for (const enemy of [...entities]) {
      if (enemy.role !== 'enemy' || enemy.currentLife <= 0) continue
      const dx = enemy.x - srcX
      const dy = enemy.y - srcY
      if (Math.sqrt(dx * dx + dy * dy) > rangePx) continue
      let dmg = baseDmg
      const eleR = enemy.eleResist ?? 0
      if (eleR > 0) dmg *= 1 - Math.min(100, eleR) / 100
      if (dmg <= 0) continue
      const prev = enemy.currentLife
      enemy.currentLife = Math.max(0, enemy.currentLife - dmg)
      const actual = prev - enemy.currentLife
      if (actual > 0) {
        const eLevel = enemyLevels.get(enemy.id) ?? 1
        const xpMult = Math.pow(balance.enemyLevel.xpMultiplierPerLevel, eLevel - 1) * tierXpMult(enemy.id)
        awardXp(playerActionId, actual * xpMult)
        if (enemyProgress.level === enemyProgress.maxLevel) awardEnemyXp(actual)
        awardAscentXp(actual)
        spawnDamageNumber(enemy.x, enemy.y - enemy.radius - 8, actual, 0x66ccff)
        if (enemy.currentLife <= 0) killEntity(enemy)
      }
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
    entityRigs.delete(entity.id)
    lifeBarGraphics.delete(entity.id)
    actionCooldowns.delete(entity.id)
    blockCooldowns.delete(entity.id)
    pendingMultiActions.delete(entity.id)
    strongEntities.delete(entity.id)
    eliteEntities.delete(entity.id)
    championEntities.delete(entity.id)
    bossEntities.delete(entity.id)
    highResistEntities.delete(entity.id)
    proliferateSourceEntities.delete(entity.id)
    enemyLevels.delete(entity.id)
    entityActions.delete(entity.id)
    entityPaths.delete(entity.id)
    burnStacks.delete(entity.id)
    burnAccum.delete(entity.id)
    bleedStacks.delete(entity.id)
    bleedAccum.delete(entity.id)
    poisonStacks.delete(entity.id)
    poisonAccum.delete(entity.id)
    poisonEffectGraphics.delete(entity.id)  // container.destroy() already destroyed the child
    electrocuteStacks.delete(entity.id)
    electrocuteGraphics.delete(entity.id)  // container.destroy() already destroyed the child
    frostTimers.delete(entity.id)
    frostEffectGraphics.delete(entity.id)  // container.destroy() already destroyed the child
    if (entity.id === playerRandomTargetId) playerRandomTargetId = null
    if (entity.id === playerStrongestTargetId) playerStrongestTargetId = null
    if (entity.id === playerWeakestTargetId) playerWeakestTargetId = null
    const idx = entities.indexOf(entity)
    if (idx !== -1) entities.splice(idx, 1)
  }

  // On-death hook: runs the shatter animation then cleans up the entity.
  function killEntity(entity: Entity): void {
    // Trigger unlock detection: check if boss was killed by crit or affliction last-hit.
    if (bossEntities.has(entity.id)) {
      const wasCrit = bossLastHitWasCrit.get(entity.id) ?? false
      const wasAffl = bossLastHitWasAffl.get(entity.id) ?? false
      if (wasCrit && !unlockedTriggers.includes('crit')) {
        unlockedTriggers.push('crit')
        persistState()
      }
      if (wasAffl && !unlockedTriggers.includes('affliction')) {
        unlockedTriggers.push('affliction')
        persistState()
      }
      bossLastHitWasCrit.delete(entity.id)
      bossLastHitWasAffl.delete(entity.id)
      playSound('boss.defeat')
      // Transcendence unlock: killing a boss at enemy level 100+ readies the
      // Transcend option for this cycle (consumed when the player transcends).
      if (!transcendReady && (enemyLevels.get(entity.id) ?? 1) >= balance.transcend.requiredBossLevel) {
        transcendReady = true
        persistState()
        updateTranscendButton()
      }
      if (ascentCount >= balance.ascent.artifactSlot1UnlockAscent
          && artifacts.length < maxBaggedArtifacts(ascentCount)) {
        const bossX = entity.x, bossY = entity.y
        // Boss level gates how many lines an artifact may roll; below the
        // threshold that tier's chance folds into the no-drop pool.
        const bossLevel = enemyLevels.get(entity.id) ?? 1
        const lu = balance.artifacts.lineUnlockLevels
        const maxLines: 1 | 2 | 3 = bossLevel > lu.three ? 3 : bossLevel > lu.two ? 2 : 1
        const dropped = rollArtifact(Math.random, maxLines)
        if (dropped) playArtifactDropAnimation(bossX, bossY, dropped)
      }
    }
    // Proliferate roll: enemies not spawned by this tree get a chance to add one to the next wave.
    if (entity.role === 'enemy' && !proliferateSourceEntities.has(entity.id)) {
      const eb = getEnemyBonuses()
      if (eb.proliferateChance > 0 && Math.random() < eb.proliferateChance / 100) {
        pendingProliferateSpawns++
      }
    }
    // Shatter: a frosted enemy that dies has a chance (from the Shatter tree) to
    // burst into a cold AoE. Base chance is 0 — it requires Shatter mastery nodes.
    if (entity.role === 'enemy' && frostTimers.has(entity.id)) {
      frostTimers.delete(entity.id)  // pre-clear before shatter to prevent re-triggering on this entity
      const cbShatter = getColdBonuses()
      if (Math.random() * 100 < cbShatter.shatterChance) {
        triggerShatter(entity.x, entity.y, entity.maxLife, cbShatter)
      }
    }
    spawnDeathFragments(entity)
    removeEntity(entity)
    if (entity.role === 'player') {
      playerDead = true
      modalCleanup = mountDeathModal()
    } else {
      if (!bossEntities.has(entity.id)) playSound('enemy.death')
      const liveEnemies = entities.filter(e => e.role === 'enemy').length
      if (!paused && liveEnemies <= balance.wave.nextWaveThreshold) scheduleWave()
    }
  }

  function rebirth(): void {
    modalCleanup = null
    if (runesModal) { runesModal.cleanup(); runesModal = null; runesModalActionId = null }

    // Rune assignments persist across rebirth: locked-slot pre-assignments stay
    // intact and reactivate as the action levels back up. Only update history so
    // newly chosen runes are remembered for future auto-fills.
    for (const id of Object.keys(actionRunes)) {
      const r = actionRunes[id]
      if (!r) continue
      const selectedNonNull = r.selected.filter((x): x is RuneId => x !== null)
      const mergedHistory = [...selectedNonNull, ...r.history.filter(h => !selectedNonNull.includes(h))]
      actionRunes[id] = { ...r, history: mergedHistory }
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

    // Reset per-rebirth trackers
    runActionXp = {}
    runLifeXp = 0
    runBlockXp = 0
    runManaXp = 0
    runEnemyXp = 0
    runDistancePx = 0
    runCritXp = 0
    freeRebirthUsed = false
    charNotifSeen = false
    refreshCharNotifDot()
    dpsLog.length = 0
    dpsActionOrder.length = 0
    pendingProliferateSpawns = 0
    proliferateSourceEntities.clear()
    extraSlotTimers.length = 0
    afflictionTriggerCounters[0] = 0
    afflictionTriggerCounters[1] = 0
    manaTriggerCounters[0] = 0
    manaTriggerCounters[1] = 0
    manaSpentThisTick = 0
    mainSlotCritTarget = null
    afflictionAppliedThisTick = 0
    afflictionLastTarget = null
    bossLastHitWasCrit.clear()
    bossLastHitWasAffl.clear()
    extraSlotMAQueues[0].length = 0
    extraSlotMAQueues[1].length = 0
    extraSlotMACooldowns[0] = 0
    extraSlotMACooldowns[1] = 0
    playerPrevX = playerEntity.x
    playerPrevY = playerEntity.y
    frostTimers.clear()
    totalFrostRolls = 0
    frozenArmorStacks = 0
    frozenArmorDecayTimer = 0
    poisonStacks.clear()
    poisonAccum.clear()
    greenVeinsStacks = 0
    greenVeinsTimer = 0
    totalPoisonApplications = 0

    renderSingleFrame()
    persistState()
    scheduleWave(balance.wave.spawnDelay)
  }

  // Shared deep reset used by both prestige layers (ascend and transcend):
  // wipes everything including prestige multipliers (unlike rebirth). Reads the
  // already-updated ascentCount for the move-speed recompute.
  function deepPrestigeReset(): void {
    ascentXp = 0
    for (const id of Object.keys(actionProgress)) {
      actionProgress[id] = { xp: 0, level: 1, maxLevel: 1 }
    }
    masteryProgress = {}
    freeMasteryPointsUsed = {}
    masteryDumpPoints = {}
    masteryPointsSeen = {}
    setPref('activeMasteryPlan', undefined)
    lifeProgress = { xp: 0, level: 1 }
    manaProgress = { xp: 0, level: 1 }
    enemyProgress = { xp: 0, level: 1, maxLevel: 1, autoLevel: false }
    // Rune assignments persist across prestiges — preserve selections
    // and merge them into history so auto-fill keeps working.
    for (const id of Object.keys(actionRunes)) {
      const r = actionRunes[id]
      if (!r) continue
      const selectedNonNull = r.selected.filter((x): x is RuneId => x !== null)
      const mergedHistory = [...selectedNonNull, ...r.history.filter(h => !selectedNonNull.includes(h))]
      actionRunes[id] = { ...r, history: mergedHistory }
    }

    // Re-apply move speed with new ascentCount
    playerEntity.moveSpeed = balance.player.moveSpeed * (1 + ascentCount * balance.ascent.moveSpeedPerAscent)
    // extraSlots configuration persists; only reset timers and transient trigger state
    extraSlotTimers.length = 0
    afflictionTriggerCounters.fill(0)
    manaTriggerCounters.fill(0)
    manaSpentThisTick = 0
    mainSlotCritTarget = null
    afflictionAppliedThisTick = 0
    afflictionLastTarget = null
    bossLastHitWasCrit.clear()
    bossLastHitWasAffl.clear()
    blockCooldowns.clear()
    for (const q of extraSlotMAQueues) q.length = 0
    extraSlotMACooldowns.fill(0)
  }

  function ascend(): void {
    if (modalCleanup) { modalCleanup(); modalCleanup = null }
    if (runesModal) { runesModal.cleanup(); runesModal = null; runesModalActionId = null }

    const prevAscentCount = ascentCount
    // multiAscend relic: a single Ascend can jump several counts at once.
    ascentCount += pendingAscentGain()
    // Capture enemy max level before the deep reset below wipes it.
    trackEvent('ascent_completed', {
      ascent:          String(ascentCount),
      action:          playerActionId,
      slot2_trigger:   extraSlots[0]?.triggerType ?? 'none',
      slot2_action:    extraSlots[0]?.actionId    ?? 'none',
      slot3_trigger:   extraSlots[1]?.triggerType ?? 'none',
      slot3_action:    extraSlots[1]?.actionId    ?? 'none',
      enemy_max_level: String(enemyProgress.maxLevel),
    })
    // universePointAllocations persists; action is preserved
    deepPrestigeReset()

    updateAscentButtonVisibility()
    persistState()
    rebirth()  // handles entity/physics reset, player stats, UI refresh, wave scheduling

    const showFirstAscentTutorial = !isTutorialSeen('first-ascent') && !getPrefs().tutorialDisabled
    if (!showFirstAscentTutorial) {
      // Returning player: auto-surface the ascent modal immediately.
      openAscentModal()
    } else {
      // First-time player: let them discover the ascent button themselves.
      showTutorial({
        id: 'first-ascent',
        steps: [{
          message: getTutorialMessage('first-ascent', 0),
          targetSelector: '[data-action="open-ascent"]',
          requiresInteraction: true,
        }],
        parent: container,
        openGuide,
        onDone: () => {},
      })
    }

    if (prevAscentCount < balance.ascent.slot2UnlockAscent && ascentCount >= balance.ascent.slot2UnlockAscent
        && !isTutorialSeen('second-trigger') && !getPrefs().tutorialDisabled) {
      // Defer until the ascent modal closes — the action button is behind it.
      pendingPostModalTutorial = () => {
        const wasPaused = paused
        if (!wasPaused) togglePause()
        showTutorial({
          id: 'second-trigger',
          steps: [
            {
              message: getTutorialMessage('second-trigger', 0),
              targetSelector: '[data-action="open-config"]',
              requiresInteraction: true,
            },
            {
              message: getTutorialMessage('second-trigger', 1),
              targetSelector: '.action-trigger-select-btn',
              requiresInteraction: true,
              transparent: true,  // keep the action modal visible behind
            },
          ],
          guideSection: 'Action Triggers',
          parent: container,
          openGuide,
          onDone:  () => { if (!wasPaused && paused) togglePause() },
          onGuide: () => { /* leave paused */ },
        })
      }
    }

    if (prevAscentCount < balance.ascent.endgameTutorialAscent && ascentCount >= balance.ascent.endgameTutorialAscent
        && !isTutorialSeen('ascent-10') && !getPrefs().tutorialDisabled) {
      showTutorial({
        id: 'ascent-10',
        steps: [{ message: getTutorialMessage('ascent-10', 0) }],
        parent: container,
        openGuide,
        onDone: () => {},
      })
    }
  }

  // ── Transcendence ──────────────────────────────────────────────────────────

  function transcend(relic: RelicId | null): void {
    if (modalCleanup) { modalCleanup(); modalCleanup = null }
    if (runesModal) { runesModal.cleanup(); runesModal = null; runesModalActionId = null }

    if (relic && !relics.includes(relic)) relics.push(relic)
    transcendCount++
    transcendReady = false
    trackEvent('transcend_completed', {
      transcend: String(transcendCount),
      relic:     relic ?? 'none',
      ascent:    String(ascentCount),
      enemy_max_level: String(enemyProgress.maxLevel),
    })

    // Everything ascent resets, plus the ascent layer itself. Equipped
    // artifacts (and relics) survive; the bag does not.
    ascentCount = 0
    universePointAllocations = { placeholderA: 0, placeholderB: 0, placeholderC: 0, placeholderD: 0 }
    artifacts = artifacts.filter(a => a.equipped)
    recomputeArtifactMods()
    deepPrestigeReset()

    updateAscentButtonVisibility()
    updateTranscendButton()
    updateAscentBar()
    persistState()
    rebirth()
    // Block just unlocked (or stays unlocked): show the shield in-hand.
    entityRigs.get('player')?.setShield(playerShieldVariant())
  }

  // Relic picker — mirrors the trigger-picker option list. Backdrop/close
  // cancels without transcending; choosing a relic transcends immediately.
  function mountRelicPickerModal(parent: HTMLElement, onSelect: (relic: RelicId) => void, onClose: () => void): () => void {
    const backdrop = document.createElement('div')
    backdrop.className = 'modal-backdrop settings-submodal-backdrop'
    const panel = document.createElement('div')
    panel.className = 'modal-panel'
    panel.setAttribute('role', 'dialog')
    panel.setAttribute('aria-modal', 'true')
    panel.innerHTML = `
      <button class="modal-close-btn" data-action="close" aria-label="${t('settings', 'close')}"></button>
      <h2 class="modal-title">${t('transcend', 'pickerTitle')}</h2>
      <p class="save-data-desc save-data-warning">${t('transcend', 'pickerHint')}</p>
      <div class="trigger-picker-options"></div>
    `
    const optionsEl = panel.querySelector<HTMLElement>('.trigger-picker-options')!
    const relicKey = (id: RelicId): 'relicFreeRebirth' => (`relic${id.charAt(0).toUpperCase()}${id.slice(1)}`) as 'relicFreeRebirth'
    for (const id of ALL_RELICS) {
      if (relics.includes(id)) continue
      const btn = document.createElement('button')
      btn.className = 'trigger-picker-opt relic-picker-opt'
      btn.dataset.sfx = 'modal'
      btn.innerHTML = `
        <span class="trigger-picker-opt-name">${t('transcend', relicKey(id))}</span>
        <span class="trigger-picker-opt-desc">${t('transcend', `${relicKey(id)}Desc` as 'relicFreeRebirthDesc')}</span>
      `
      btn.addEventListener('click', () => {
        playSound('modal.close')
        backdrop.remove()
        onClose()
        onSelect(id)
      })
      optionsEl.appendChild(btn)
    }
    const dismiss = (): void => { playSound('modal.close'); backdrop.remove(); onClose() }
    panel.querySelector<HTMLButtonElement>('[data-action="close"]')!.addEventListener('click', dismiss)
    backdrop.appendChild(panel)
    playSound('modal.open')
    parent.appendChild(backdrop)
    backdrop.addEventListener('click', e => { if (e.target === backdrop) dismiss() })
    return () => backdrop.remove()
  }

  function mountTranscendConfirmModal(parent: HTMLElement, onConfirm: () => void): () => void {
    const backdrop = document.createElement('div')
    backdrop.className = 'modal-backdrop settings-submodal-backdrop'
    backdrop.innerHTML = `
      <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="transcend-confirm-title">
        <button class="modal-close-btn" data-action="close" aria-label="${t('settings', 'close')}"></button>
        <h2 class="modal-title" id="transcend-confirm-title">${t('transcend', 'confirmTitle')}</h2>
        <p class="save-data-desc save-data-warning">${t('transcend', 'confirmBody')}</p>
        <div class="modal-actions">
          <button class="modal-btn modal-btn--ghost" data-action="cancel" data-sfx="modal">${t('settings', 'cancel')}</button>
          <button class="modal-btn modal-btn--danger" data-action="confirm" data-sfx="modal">${t('transcend', 'btn')}</button>
        </div>
      </div>
    `
    playSound('modal.open')
    parent.appendChild(backdrop)
    const dismiss = (): void => { playSound('modal.close'); backdrop.remove() }
    backdrop.querySelector<HTMLButtonElement>('[data-action="close"]')!.addEventListener('click', dismiss)
    backdrop.querySelector<HTMLButtonElement>('[data-action="cancel"]')!.addEventListener('click', dismiss)
    backdrop.addEventListener('click', e => { if (e.target === backdrop) dismiss() })
    backdrop.querySelector<HTMLButtonElement>('[data-action="confirm"]')!.addEventListener('click', () => {
      playSound('modal.close')
      backdrop.remove()
      onConfirm()
    })
    return () => backdrop.remove()
  }

  function mountDeathModal(): () => void {
    if (!isTutorialSeen('first-death') && !getPrefs().tutorialDisabled) {
      showTutorial({
        id: 'first-death',
        steps: [{ message: getTutorialMessage('first-death', 0) }],
        guideSection: 'Death & Rebirth',
        parent: container,
        openGuide,
        onDone: () => {},
      })
    }

    // Compute mastery gains for this run (applied on rebirth)
    const pendingGains = computeMasteryGains()
    const gainById = new Map(pendingGains.map(g => [g.id, g.xpGain]))

    const masteryCatsHtml = masteryCategories.map(cat => {
      const rowsHtml = cat.masteries.map(m => {
        const xpGain = gainById.get(m.id) ?? 0
        if (xpGain <= 0) return ''
        const prog = masteryProgress[m.id] ?? { xp: 0, level: 1, nodes: defaultMasteryNodes() }
        let oldPct: number, gainPct: number, levelsGained: number
        if (m.id === 'enemy') {
          // xpGain is the new absolute level (sentinel for non-XP enemy mastery)
          levelsGained = Math.max(0, xpGain - prog.level)
          oldPct = 0; gainPct = levelsGained > 0 ? 1 : 0
        } else {
          const pv = previewMasteryGain(prog.xp, prog.level, xpGain, m.id)
          oldPct = pv.oldPct; gainPct = pv.gainPct; levelsGained = pv.levelsGained
        }
        const levelMod = levelsGained > 0 ? ' mastery-level--gain' : ''
        return `
          <div class="mastery-row">
            ${renderMasteryBar(oldPct, gainPct)}
            <span class="mastery-label">${escapeHtml(m.label)}</span>
            <span class="mastery-level${levelMod}">Lv.${prog.level}</span>
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
        <div class="death-summary-section-label">${t('game', 'masteryGains')}</div>
        <div class="mastery-categories">${masteryCatsHtml}</div>
      </div>`

    const backdrop = document.createElement('div')
    backdrop.className = 'modal-backdrop'
    backdrop.innerHTML = `
      <div class="modal-panel death-modal-panel" role="dialog" aria-modal="true" aria-labelledby="death-title">
        <h2 class="modal-title" id="death-title">${t('game', 'deathTitle')}</h2>
        <p class="death-subtitle">${t('game', 'deathSubtitle')}</p>
        <div class="death-modal-scroll">
          ${masterySummaryHtml}
        </div>
        <div class="modal-actions">
          <button class="modal-btn modal-btn--primary" data-action="rebirth">${t('game', 'deathRebirth')}</button>
        </div>
      </div>
    `
    backdrop.querySelector<HTMLButtonElement>('[data-action="rebirth"]')!
      .addEventListener('click', () => {
        playSound('modal.close')
        applyMasteryGains(pendingGains)
        backdrop.remove()
        rebirth()
        if (!isTutorialSeen('first-rebirth') && !getPrefs().tutorialDisabled) {
          const wasPaused = paused
          if (!wasPaused) togglePause()
          showTutorial({
            id: 'first-rebirth',
            steps: [
              {
                message: getTutorialMessage('first-rebirth', 0),
                targetSelector: '[data-action="open-mastery"]',
                requiresInteraction: true,
              },
              {
                message: getTutorialMessage('first-rebirth', 1),
                transparent: true,
              },
            ],
            guideSection: 'Masteries',
            parent: container,
            openGuide,
            onDone:  () => { if (!wasPaused && paused) togglePause() },
            onGuide: () => { /* leave paused while the user reads the guide */ },
          })
        }
      })
    playSound('modal.open')
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
    // criticalHit mastery: awards 2× the standard rate so it levels at half the base requirement
    if (runCritXp > 0) gainMap.set('criticalHit', runCritXp * balance.mastery.actionXpMultiplier * 2)
    if (runLifeXp > 0) gainMap.set('life', runLifeXp)
    if (runBlockXp > 0) gainMap.set('block', runBlockXp)
    if (runManaXp > 0) gainMap.set('mana', runManaXp)
    const movementXp = Math.floor(runDistancePx / 50) * balance.mastery.movementXpMult
    if (movementXp > 0) gainMap.set('movement', movementXp)
    // Enemy mastery is non-XP-based; use xpGain as a sentinel carrying the new absolute level
    const enemyCurrentLevel = masteryProgress['enemy']?.level ?? 1
    if (enemyProgress.maxLevel > enemyCurrentLevel) gainMap.set('enemy', enemyProgress.maxLevel)
    return Array.from(gainMap.entries()).map(([id, xpGain]) => ({ id, xpGain }))
  }

  function applyMasteryGains(gains: Array<{ id: MasteryId; xpGain: number }>): void {
    for (const { id, xpGain } of gains) {
      const existing = masteryProgress[id]
      const nodes = existing?.nodes ?? defaultMasteryNodes()
      const { xp, level } = existing ?? { xp: 0, level: 1, nodes: defaultMasteryNodes() }
      const preview = previewMasteryGain(xp, level, xpGain, id)
      masteryProgress[id] = { xp: preview.newXp, level: preview.toLv, nodes, nodeHistory: existing ? existing.nodeHistory : [] }
    }
    // Enemy mastery level = max enemy level reached (not XP-based; no partial level)
    const existingEnemy = masteryProgress['enemy']
    const newEnemyLevel = enemyProgress.maxLevel
    if (!existingEnemy || newEnemyLevel > existingEnemy.level) {
      masteryProgress['enemy'] = {
        xp: 0,
        level: newEnemyLevel,
        nodes: existingEnemy?.nodes ?? defaultMasteryNodes(),
        nodeHistory: existingEnemy ? existingEnemy.nodeHistory : [],
      }
    }
    refreshMasteryDot()
  }

  // ── freeRebirth relic: bank pending mastery gains without dying ────────────

  function freeRebirthActive(): boolean {
    return hasRelic('freeRebirth') && !freeRebirthUsed
  }

  function dieButtonLabel(): string {
    return freeRebirthActive() ? t('game', 'freeRebirth') : t('game', 'dieRebirth')
  }

  function grantMasteryWithoutDeath(): void {
    applyMasteryGains(computeMasteryGains())
    // The banked run progress is consumed — same accumulator reset rebirth()
    // performs, but the run itself continues untouched.
    runActionXp = {}
    runLifeXp = 0
    runBlockXp = 0
    runManaXp = 0
    runEnemyXp = 0
    runDistancePx = 0
    runCritXp = 0
    freeRebirthUsed = true
    refreshCharNotifDot()
    persistState()
  }

  // Shared behavior for the die-and-rebirth buttons (character + mastery
  // modals). With an unused freeRebirth relic this run, the click banks the
  // mastery gains instead — no confirmation, no death.
  function handleManualDie(): void {
    if (freeRebirthActive()) {
      grantMasteryWithoutDeath()
      return
    }
    const doDie = (): void => {
      playerEntity.currentLife = 0
      killEntity(playerEntity)
    }
    if (getPrefs().confirmManualDeath) mountDieConfirmModal(container, doDie)
    else doDie()
  }

  function totalFreeMasteryPointsEarned(): number {
    return ascentCount >= balance.ascent.freeMasteryPointsUnlockAscent ? ascentCount : 0
  }
  // Each mastery has its own independent budget of free points (not a shared pool).
  function remainingFreeMasteryPointsFor(id: MasteryId): number {
    return Math.max(0, totalFreeMasteryPointsEarned() - (freeMasteryPointsUsed[id] ?? 0))
  }

  // A mastery's notification-worthy point count: level points plus free points
  // (free points only count once the mastery is visible, mirroring the modal).
  function masteryNotifPoints(id: MasteryId): number {
    const p = masteryProgress[id]
    const levelPts = p ? masteryPointsAvailable(p, freeMasteryPointsUsed[id] ?? 0, masteryDumpPoints[id] ?? 0) : 0
    const isAlwaysShown = id === 'enemy' || id === 'action'
    const freeVisible = isAlwaysShown || (p && (p.level > 1 || p.xp > 0))
    const freePts = freeVisible ? remainingFreeMasteryPointsFor(id) : 0
    return levelPts + freePts
  }

  // Viewing a mastery's tree marks its current point count as seen; the dots
  // stay dark until the count changes (new points earned or refunded).
  function markMasteryTreeSeen(id: MasteryId): void {
    masteryPointsSeen = { ...masteryPointsSeen, [id]: masteryNotifPoints(id) }
    persistState()
    refreshMasteryDot()
  }

  function refreshMasteryDot(): void {
    const dot = el.querySelector<HTMLElement>('.mastery-notif-dot')
    if (!dot) return
    const hasUnseenPoints = allMasteries.some(m => {
      const pts = masteryNotifPoints(m.id)
      return pts > 0 && pts !== (masteryPointsSeen[m.id] ?? 0)
    })
    dot.hidden = !hasUnseenPoints
  }

  function assignMasteryNode(id: MasteryId, treeIdx: number, nodeIdx: number): void {
    // Free ascent points can target a mastery that has never earned XP, so it
    // may have no progress entry yet (e.g. right after an ascent wipes them).
    // Synthesize a fresh level-1 entry rather than bailing — otherwise those
    // free points are unspendable.
    const existing = masteryProgress[id] ?? { xp: 0, level: 1, nodes: defaultMasteryNodes(), nodeHistory: [] }
    if (existing.nodes[treeIdx]?.includes(nodeIdx)) return  // already assigned — nothing to charge
    const freeUsed = freeMasteryPointsUsed[id] ?? 0
    const dumped = masteryDumpPoints[id] ?? 0
    // A node costs nodeCost() points (major 2, key 3, else 1). Pay from level
    // points first, then top up the shortfall from this mastery's free budget.
    const cost = nodeCost(nodeIdx)
    const avail = masteryPointsAvailable(existing, freeUsed, dumped)
    if (avail < cost) {
      const need = cost - avail
      if (remainingFreeMasteryPointsFor(id) < need) return
      freeMasteryPointsUsed[id] = freeUsed + need
    }
    const nodes = existing.nodes.map(t => [...t])
    nodes[treeIdx].push(nodeIdx)
    // Record the exact assignment order (interleaved across trees) for build
    // plans. Recording is active only when nodeHistory already exists: legacy
    // progress predating the field stays unrecorded — a history started
    // mid-way would misstate the order — until the next ascent wipes all
    // masteries and fresh entries (created with []) start recording.
    const nodeHistory = existing.nodeHistory !== undefined
      ? [...existing.nodeHistory, [treeIdx, nodeIdx] as [number, number]]
      : undefined
    if (nodeType(nodeIdx) === 'key') {
      trackEvent('mastery_key_taken', { node: `${id}${treeIdx + 1}.${nodeLabel(nodeIdx)}` })
    }
    masteryProgress[id] = { ...existing, nodes, nodeHistory }
    if (id === 'action' || (['projectile', 'strike', 'lightning', 'fire', 'cold', 'physical'].includes(id) && getAction(playerActionId).tags.includes(id as unknown as ActionTag))) {
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

  // Sink up to `count` available mastery points into the per-mastery dump (a
  // persistent "more <X>" bonus per spec). Consumes level points first; then
  // free points; clamped to whatever's actually available.
  function dumpMasteryPoints(id: MasteryId, count: number): void {
    if (count <= 0) return
    // As with assignMasteryNode: free points may be dumped into a mastery that
    // has no progress entry yet, so synthesize a level-1 entry when missing.
    const existing = masteryProgress[id] ?? { xp: 0, level: 1, nodes: defaultMasteryNodes() }
    const freeUsed = freeMasteryPointsUsed[id] ?? 0
    const dumped = masteryDumpPoints[id] ?? 0
    const levelAvail = masteryPointsAvailable(existing, freeUsed, dumped)
    const freeRemaining = remainingFreeMasteryPointsFor(id)
    const totalAvail = levelAvail + freeRemaining
    const take = Math.min(count, totalAvail)
    if (take <= 0) return
    const fromFree = Math.max(0, take - levelAvail)
    if (fromFree > 0) freeMasteryPointsUsed[id] = freeUsed + fromFree
    masteryDumpPoints[id] = dumped + take
    if (id === 'action' || (['projectile', 'strike', 'lightning', 'fire', 'cold', 'physical'].includes(id) && getAction(playerActionId).tags.includes(id as unknown as ActionTag))) {
      assignAction(playerEntity, playerActionId)
    }
    if (id === 'life') playerEntity.maxLife = computePlayerMaxLife()
    if (id === 'mana') {
      playerEntity.maxMana = computePlayerMaxMana()
      playerEntity.maxLife = computePlayerMaxLife()
      assignAction(playerEntity, playerActionId)
    }
    persistState()
    refreshMasteryDot()
  }

  // Spend one mastery level to clear all assigned nodes and refund the rest.
  // Net cost: -1 level (and the XP toward the next level resets to 0).
  // If no level to lose but free points were used here, just reclaim them.
  function resetMasteryPoints(id: MasteryId): void {
    const existing = masteryProgress[id]
    const freeUsed = freeMasteryPointsUsed[id] ?? 0
    const dumped = masteryDumpPoints[id] ?? 0
    if (!existing || (existing.level <= 1 && freeUsed === 0 && dumped === 0)) return
    freeMasteryPointsUsed[id] = 0
    masteryDumpPoints[id] = 0
    masteryProgress[id] = {
      xp: 0,
      level: existing.level > 1 ? existing.level - 1 : 1,
      nodes: defaultMasteryNodes(),
      // Recording status is preserved, not granted: resets are per-mastery,
      // so they don't re-enable plan saving on legacy characters — only the
      // next ascent does. Active recording simply restarts empty.
      nodeHistory: existing.nodeHistory !== undefined ? [] : undefined,
    }
    if (id === 'action' || (['projectile', 'strike', 'lightning', 'fire', 'cold', 'physical'].includes(id) && getAction(playerActionId).tags.includes(id as unknown as ActionTag))) {
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
    // Primary calls (movement, auto-attack) pass `entities` directly. MA calls
    // pass a filtered array. Only primary calls should update the sticky cache.
    const isPrimary = ents === entities
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
        // Sticky: keep current target while it's alive — switching mid-fight on
        // every spawn felt like constant retargeting even with maxLife sorting.
        if (isPrimary && playerWeakestTargetId) {
          const cached = enemies.find(e => e.id === playerWeakestTargetId)
          if (cached) return cached
        }
        let best: Entity | null = null, bestHp = Infinity
        for (const e of enemies) if (e.maxLife < bestHp) { bestHp = e.maxLife; best = e }
        if (isPrimary) playerWeakestTargetId = best?.id ?? null
        return best
      }
      case 'strongest': {
        if (isPrimary && playerStrongestTargetId) {
          const cached = enemies.find(e => e.id === playerStrongestTargetId)
          if (cached) return cached
        }
        let best: Entity | null = null, bestHp = -Infinity
        for (const e of enemies) if (e.maxLife > bestHp) { bestHp = e.maxLife; best = e }
        if (isPrimary) playerStrongestTargetId = best?.id ?? null
        return best
      }
      case 'random': {
        if (isPrimary && playerRandomTargetId) {
          const cached = enemies.find(e => e.id === playerRandomTargetId)
          if (cached) return cached
        }
        const pick = enemies[Math.floor(Math.random() * enemies.length)]
        if (isPrimary) playerRandomTargetId = pick?.id ?? null
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

    // Proliferation: consume pending additional spawns from previous wave's kills (tree 3).
    // Apply "more" multiplier on top of (base + proliferate additional), then reset both.
    const baseCount = count
    count += pendingProliferateSpawns
    pendingProliferateSpawns = 0
    if (eb.moreSpawned > 0) count = Math.ceil(count * (1 + eb.moreSpawned / 100))
    // Ascent-8 unlock: extra flat boost to enemy spawn count.
    if (ascentCount >= balance.ascent.enemyBoostUnlockAscent) count = Math.ceil(count * (1 + balance.ascent.enemyBoostMoreEnemies))
    // Onslaught relic: +30% enemy spawn count.
    if (hasRelic('onslaught')) count = Math.ceil(count * (1 + balance.transcend.onslaughtMoreEnemies))

    // Determine tier per spawn (random rolls), then enforce minimum guarantees
    type Tier = 'normal' | 'strong' | 'elite' | 'champion' | 'boss'
    const ev = balance.enemyVariance
    // Champions and bosses are gated until the second ascension is reached.
    const forceBoss = cheatForceBoss
    cheatForceBoss = false
    const championBossAllowed = ascentCount >= 2 || getPrefs().fullMastery || forceBoss
    const strongRoll = Math.min(1, ev.strongChance + eb.strongChance / 100)
    const eliteRoll = Math.min(1, ev.eliteChance + eb.eliteChance / 100)
    const championRoll = championBossAllowed ? Math.min(1, ev.championChance + eb.championChance / 100) : 0
    const bossRoll = championBossAllowed ? Math.min(1, ev.bossChance + eb.bossChance / 100) : 0
    const tiers: Tier[] = []
    for (let i = 0; i < count; i++) {
      if (Math.random() < strongRoll) {
        if (Math.random() < eliteRoll) {
          if (Math.random() < championRoll) {
            tiers.push(Math.random() < bossRoll ? 'boss' : 'champion')
          } else {
            tiers.push('elite')
          }
        } else {
          tiers.push('strong')
        }
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

    if (forceBoss && !tiers.includes('boss')) {
      // Upgrade the highest existing tier to boss (champion → elite → strong → normal)
      const upgrade: Tier[] = ['champion', 'elite', 'strong', 'normal']
      const idx = upgrade.reduce((best, t) => {
        const i = tiers.indexOf(t)
        return i >= 0 && best < 0 ? i : best
      }, -1)
      if (idx >= 0) tiers[idx] = 'boss'
      else tiers.push('boss')
    }

    const halfW = app.screen.width / 2
    const halfH = (app.screen.height - HUD_HEIGHT) / 2
    const rawShift = gaussian() * balance.wave.directionStdDev
    const shift = Math.max(-balance.wave.maxDirectionShift, Math.min(balance.wave.maxDirectionShift, rawShift))
    const clusterAngle = lastWaveAngle === null
      ? Math.random() * Math.PI * 2
      : lastWaveAngle + shift
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
      if (tier === 'boss') {
        lifeMult = ev.bossLifeMin      + Math.random() * (ev.bossLifeMax      - ev.bossLifeMin)
        dmgMult  = ev.bossDamageMin    + Math.random() * (ev.bossDamageMax    - ev.bossDamageMin)
      } else if (tier === 'champion') {
        lifeMult = ev.championLifeMin  + Math.random() * (ev.championLifeMax  - ev.championLifeMin)
        dmgMult  = ev.championDamageMin + Math.random() * (ev.championDamageMax - ev.championDamageMin)
      } else if (tier === 'elite') {
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
      const moveSpeedMult = (tier === 'boss' || tier === 'champion') ? ev.eliteSpeedMult
                          : tier === 'elite' ? ev.eliteSpeedMult : 1
      const sizeMult = tier === 'boss'     ? ev.bossSizeMult
                     : tier === 'champion' ? ev.championSizeMult
                     : tier === 'elite'    ? ev.eliteSizeMult
                     : tier === 'strong'   ? ev.strongSizeMult : 1
      const spawnRadius = Math.round(balance.enemyA.radius * sizeMult)
      const enemy = createEnemyEntity(
        `enemy-${++enemyIdCounter}`,
        spawnX, spawnY,
        'enemyA',
        spawnRadius,
        { moveSpeed: balance.enemyA.moveSpeed * speedScale * moveSpeedMult, maxLife: Math.round(balance.enemyA.maxLife * lifeScale * lifeMult) },
      )
      assignAction(enemy, randomAction().id as ActionId)
      // Enemies gain +0.5% range per level above 1 (area handled at cast time).
      enemy.actionRange *= 1 + (enemyProgress.level - 1) * balance.enemyLevel.rangeAreaAddPerLevel
      enemy.actionDamage *= damageScale * balance.enemyA.damageMultiplier * dmgMult
      const rMin = tier === 'boss'      ? ev.bossResistMin
                 : tier === 'champion'  ? ev.championResistMin
                 : tier === 'elite'     ? ev.eliteResistMin
                 : tier === 'strong'    ? ev.strongResistMin : ev.normalResistMin
      const rMax = tier === 'boss'      ? ev.bossResistMax
                 : tier === 'champion'  ? ev.championResistMax
                 : tier === 'elite'     ? ev.eliteResistMax
                 : tier === 'strong'    ? ev.strongResistMax : ev.normalResistMax
      enemy.physRotResist = Math.round(rMin + Math.random() * (rMax - rMin))
      enemy.eleResist     = Math.round(rMin + Math.random() * (rMax - rMin))
      if (enemy.physRotResist >= ev.highResistThreshold || enemy.eleResist >= ev.highResistThreshold) {
        highResistEntities.add(enemy.id)
      }
      if (tier === 'boss') {
        enemy.actionSpeed *= ev.bossActionSpeedMult
        bossEntities.add(enemy.id)
        championEntities.add(enemy.id)
        eliteEntities.add(enemy.id)
        strongEntities.add(enemy.id)
        playSound('boss.spawn')
        void preloadSounds(['boss.defeat'])
        if (!isTutorialSeen('first-boss') && !getPrefs().tutorialDisabled) {
          const wasPaused = paused
          if (!wasPaused) togglePause()
          showTutorial({
            id: 'first-boss',
            steps: [{ message: getTutorialMessage('first-boss', 0) }],
            parent: container,
            openGuide,
            onDone: () => { if (!wasPaused && paused) togglePause() },
          })
        }
      } else if (tier === 'champion') {
        enemy.actionSpeed *= ev.championActionSpeedMult
        championEntities.add(enemy.id)
        eliteEntities.add(enemy.id)
        strongEntities.add(enemy.id)
      } else if (tier === 'elite') {
        enemy.actionSpeed *= ev.eliteSpeedMult
        strongEntities.add(enemy.id)
        eliteEntities.add(enemy.id)
      } else if (tier === 'strong') {
        enemy.actionSpeed *= ev.strongSpeedMult
        strongEntities.add(enemy.id)
      }
      enemyLevels.set(enemy.id, enemyProgress.level)
      // Enemies beyond the base wave count came from this tree (proliferate/more) and don't roll.
      if (i >= baseCount) proliferateSourceEntities.add(enemy.id)
      entities.push(enemy)
      createEntityBody(enemy)
      initEntityDisplay(enemy)
    }
  }

  function spawnBossWave(): void {
    // Despawn the current wave immediately (no XP, no death animation)
    for (const entity of [...entities]) {
      if (entity.role !== 'player') removeEntity(entity)
    }
    if (enemySpawnTimeout !== null) {
      clearTimeout(enemySpawnTimeout)
      enemySpawnTimeout = null
    }
    waveScheduled = false
    cheatForceBoss = true
    spawnEnemies()
  }

  // ── VFX ──────────────────────────────────────────────────────────────────

  // Returns the action's base crit chance as a 0..100 percentage, before mastery scaling.
  function baseCritChancePct(tags: ActionTag[]): number {
    if (tags.includes('strike')) return balance.criticalHit.chanceStrike * 100
    if (tags.includes('area')) return balance.criticalHit.chanceArea * 100
    if (tags.includes('projectile')) return balance.criticalHit.chanceProjectile * 100
    return 0
  }

  function critChanceForAction(tags: ActionTag[], target?: Entity): number {
    // Critical hits don't exist until the first ascension is reached.
    if (ascentCount < 1 && !getPrefs().fullMastery) return 0
    const basePct = baseCritChancePct(tags)
    if (basePct <= 0) return 0
    const cb = getCriticalHitBonuses()
    let totalPct = (basePct + critBaseAddTotal()) * (1 + cb.chanceIncrease / 100) * (1 + cb.chanceMore / 100)
    if (cb.moreChanceVsAfflicted > 0 && target && hasAnyAffliction(target)) {
      totalPct *= 1 + cb.moreChanceVsAfflicted / 100
    }
    return Math.min(1, totalPct / 100)
  }

  // excludeTree0: when damageToAfflictions is active, tree-0 bonuses go to afflictions, not direct hits
  function critDamageMultiplier(excludeTree0 = false): number {
    const cb = getCriticalHitBonuses()
    const dmgInc = excludeTree0 ? cb.damageIncrease - cb.damageIncreaseTree0 : cb.damageIncrease
    const dmgMore = excludeTree0 ? cb.damageMore - cb.damageMoreTree0 : cb.damageMore
    return (balance.criticalHit.damageMultiplier + dmgInc / 100) * (1 + dmgMore / 100)
  }

  function spawnCritVfx(x: number, y: number, r: number): void {
    addVfx(320, (g, p) => {
      g.clear()
      g.position.set(x, y)
      const alpha = 1 - p
      g.circle(0, 0, r + p * r * 2)
      g.stroke({ color: 0xffee44, width: 2.5 * alpha, alpha: alpha * 0.7 })
      for (let i = 0; i < 8; i++) {
        const ang = (Math.PI * 2 * i) / 8
        const inner = r * 0.3
        const outer = r * 0.5 + p * r * 2.8
        g.moveTo(Math.cos(ang) * inner, Math.sin(ang) * inner)
        g.lineTo(Math.cos(ang) * outer, Math.sin(ang) * outer)
        g.stroke({ color: 0xffee44, width: Math.max(0.5, 2 * alpha), alpha })
      }
    })
  }

  function addVfx(maxAge: number, tick: (g: Graphics, progress: number) => void, onComplete?: () => void): void {
    if (!app) return
    const g = new Graphics()
    app.stage.addChild(g)
    vfxList.push({ g, age: 0, maxAge, tick: (p) => tick(g, p), onComplete })
  }

  function playArtifactDropAnimation(sx: number, sy: number, artifact: Artifact): void {
    if (!app) return
    const RARITY_COLORS: Record<number, number> = { 1: 0x4a7ea5, 2: 0x7b5ea7, 3: 0xc89b3c }
    const rarityColor = RARITY_COLORS[artifact.lines.length] ?? 0x4a7ea5
    addVfx(1500, (g, p) => {
      if (!app) return
      g.clear()
      // Ease-out so the card decelerates as it settles into the centre.
      const e = 1 - Math.pow(1 - p, 3)
      // VFX live on the camera-transformed stage (world space). The camera keeps
      // the player screen-centred, so the player's world position is the centre
      // of the visible play area — fly the card there as the player moves.
      g.position.set(sx + (playerEntity.x - sx) * e, sy + (playerEntity.y - sy) * e)
      g.rotation = e * Math.PI * 3
      // Cancel the camera zoom so the card grows toward a fixed on-screen size
      // instead of being multiplied by the current zoom level.
      const zoom = app.stage.scale.x || 1
      g.scale.set((0.35 + e * 0.9) / zoom)
      // Geometry below is authored in on-screen pixels; g.scale handles sizing.
      const w = 64, h = 84
      g.roundRect(-w / 2, -h / 2, w, h, 7)
      g.fill({ color: rarityColor, alpha: 0.9 })
      g.roundRect(-w / 2, -h / 2, w, h, 7)
      g.stroke({ color: 0xffffff, width: 2.5, alpha: 0.65 })
      const n = artifact.lines.length
      for (let i = 0; i < n; i++) {
        const lineY = -h * 0.15 + (i / Math.max(1, n - 1)) * h * 0.3
        g.rect(-w * 0.32, lineY - 2, w * 0.64, 4)
        g.fill({ color: 0xffffff, alpha: 0.6 })
      }
    }, () => {
      if (destroyed) return
      const bagArtifact = (): void => {
        artifacts.push(artifact)
        persistState()
        refreshArtifactDot()
      }
      mountArtifactCardModal(el, artifact, {
        onBag: bagArtifact,
        onEquip: () => {
          const usedEq = artifacts.filter(a => a.equipped).length
          if (usedEq < maxEquippedArtifacts(ascentCount, transcendCount > 0)) artifact.equipped = true
          artifacts.push(artifact)
          recomputeArtifactMods()
          assignAction(playerEntity, playerActionId)
          persistState()
          refreshArtifactDot()
        },
        // Explicitly discarding a fresh drop scraps it, same as deleting from the bag.
        onDrop: () => {
          scraps += scrapsForArtifact(artifact)
          persistState()
        },
        // Click-away must not silently destroy the drop: bag it while there's
        // room. Only the explicit trash button discards an artifact.
        onDismiss: () => {
          if (artifacts.length < maxBaggedArtifacts(ascentCount)) bagArtifact()
        },
      }, () => {})
    })
  }

  // Pre-hit VFX: spawned at attack-start, plays until damage lands (1/3 of cycle).
  // Each action has a natural duration; if it's less than preHitDuration the animation
  // starts late (startFraction > 0) so it completes right at impact.
  function spawnPreHitVfx(attacker: Entity, target: Entity, action: ActionDef, preHitDuration: number): void {
    const rig = entityRigs.get(attacker.id)
    if (rig) {
      rig.setFacing(target.x >= attacker.x ? 1 : -1)
      rig.playAttack(preHitDuration)
    }
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
    } else if (action.id === 'ice-spear') {
      // Ice spear in flight — an icy shard flying toward the target with a frosty trail.
      const cos = Math.cos(baseAng), sin = Math.sin(baseAng)
      const tr = target.radius
      addVfx(preHitDuration, (g, p) => {
        g.clear()
        const cx = ax + (tx - ax) * p
        const cy = ay + (ty - ay) * p
        const px = -sin, py = cos  // perpendicular to travel
        // Frosty trail
        for (let i = 0; i < 4; i++) {
          const back = (i + 1) * 10
          g.circle(cx - cos * back, cy - sin * back, Math.max(0.5, tr * 0.4 * (1 - i * 0.22)))
          g.fill({ color: i % 2 ? 0x9fd0ff : 0x3f86f5, alpha: 0.4 - i * 0.08 })
        }
        // Spear shard: an elongated diamond pointing along the travel direction
        const len = tr * 1.5, half = tr * 0.3
        g.moveTo(cx + cos * len, cy + sin * len)
        g.lineTo(cx + px * half, cy + py * half)
        g.lineTo(cx - cos * len * 0.5, cy - sin * len * 0.5)
        g.lineTo(cx - px * half, cy - py * half)
        g.closePath()
        g.fill({ color: 0x5a9dff, alpha: 0.9 })
        // Icy highlight core
        g.circle(cx, cy, tr * 0.22)
        g.fill({ color: 0xeaf6ff, alpha: 0.95 })
      })
    } else if (action.id === 'poisonous-arrow') {
      // Toxic arrow in flight — fills the full pre-hit window, trailing green vapour.
      const cos = Math.cos(baseAng), sin = Math.sin(baseAng)
      addVfx(preHitDuration, (g, p) => {
        g.clear()
        const cx = ax + (tx - ax) * p
        const cy = ay + (ty - ay) * p
        const trailLen = 60
        g.moveTo(cx - cos * trailLen, cy - sin * trailLen)
        g.lineTo(cx, cy)
        g.stroke({ color: 0x77cc55, width: 6, alpha: 0.35 })
        g.moveTo(cx - cos * (trailLen * 0.6), cy - sin * (trailLen * 0.6))
        g.lineTo(cx, cy)
        g.stroke({ color: 0x55cc44, width: 3, alpha: 0.7 })
        g.moveTo(cx - cos * 14, cy - sin * 14)
        g.lineTo(cx, cy)
        g.stroke({ color: 0xbff080, width: 2.5 })
        g.moveTo(cx, cy)
        g.lineTo(cx - cos * 6 + sin * 4, cy - sin * 6 - cos * 4)
        g.lineTo(cx - cos * 6 - sin * 4, cy - sin * 6 + cos * 4)
        g.closePath()
        g.fill({ color: 0xbff080 })
      })
    }
    // zap, bolt, rotten-dagger: no pre-hit animation (instant strike)
  }

  // Pre-hit VFX for area actions: an expanding ring at the area centre.
  function spawnAreaPreHitVfx(attacker: Entity, center: Entity, areaRadiusPx: number, action: ActionDef, preHitDuration: number): void {
    const rig = entityRigs.get(attacker.id)
    if (rig) {
      if (center !== attacker as unknown) rig.setFacing(center.x >= attacker.x ? 1 : -1)
      rig.playAttack(preHitDuration)
    }
    const cx = center.x, cy = center.y
    if (action.id === 'fire-nova') {
      addVfx(preHitDuration, (g, p) => {
        g.clear()
        const pulse = 1 + 0.08 * Math.sin(p * 30)
        // Thick leading ring + a trail of fading rings behind it, so the swept area
        // stays filled with visuals even when the nova fires quickly.
        const TRAIL = 5
        for (let k = 0; k < TRAIL; k++) {
          const tp = p - k * 0.18
          if (tp <= 0) continue
          const rr = areaRadiusPx * tp * pulse
          const fade = 1 - k / TRAIL
          g.circle(cx, cy, rr)
          g.stroke({ color: 0xff6600, width: Math.max(1.5, 9 * fade), alpha: 0.6 * fade })
          g.circle(cx, cy, rr * 0.88)
          g.stroke({ color: 0xffcc33, width: Math.max(1, 5 * fade), alpha: 0.7 * fade })
        }
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
        const pulse = 1 + 0.08 * Math.sin(p * 30)
        // Thick leading ring + trailing rings fill the swept area on fast casts.
        const TRAIL = 5
        for (let k = 0; k < TRAIL; k++) {
          const tp = p - k * 0.18
          if (tp <= 0) continue
          const rr = areaRadiusPx * tp * pulse
          const fade = 1 - k / TRAIL
          g.circle(cx, cy, rr)
          g.stroke({ color: 0x9a7dff, width: Math.max(1.5, 9 * fade), alpha: 0.6 * fade })
          g.circle(cx, cy, rr * 0.88)
          g.stroke({ color: 0xc6b3ff, width: Math.max(1, 5 * fade), alpha: 0.7 * fade })
        }
        g.circle(cx, cy, areaRadiusPx * 0.22 * (0.5 + p * 0.7) * pulse)
        g.fill({ color: 0xb39dff, alpha: 0.45 + p * 0.4 })
        g.circle(cx, cy, areaRadiusPx * 0.12 * (0.6 + p * 0.6))
        g.fill({ color: 0xffffff, alpha: 0.7 + p * 0.3 })
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * Math.PI * 2 + i * 0.3
          const sd = areaRadiusPx * (0.2 + p * 0.85)
          g.circle(cx + Math.cos(a) * sd, cy + Math.sin(a) * sd, Math.max(0.5, 2.5 * (1 - p * 0.5)))
          g.fill({ color: i % 2 ? 0xc4b0ff : 0xffffff, alpha: 1 - p * 0.3 })
        }
      })
    } else if (action.id === 'cold-nova') {
      addVfx(preHitDuration, (g, p) => {
        g.clear()
        const pulse = 1 + 0.06 * Math.sin(p * 26)
        // Thick leading ring + a trail of deep-blue rings behind it, so the swept
        // area stays filled with visuals even when the nova fires quickly.
        const TRAIL = 5
        for (let k = 0; k < TRAIL; k++) {
          const tp = p - k * 0.18
          if (tp <= 0) continue
          const rr = areaRadiusPx * tp * pulse
          const fade = 1 - k / TRAIL
          g.circle(cx, cy, rr)
          g.stroke({ color: 0x1f5fd6, width: Math.max(1.5, 9 * fade), alpha: 0.6 * fade })
          g.circle(cx, cy, rr * 0.88)
          g.stroke({ color: 0x3f86f5, width: Math.max(1, 5 * fade), alpha: 0.7 * fade })
        }
        // Frosty core building up
        g.circle(cx, cy, areaRadiusPx * 0.22 * (0.5 + p * 0.7) * pulse)
        g.fill({ color: 0x5a9dff, alpha: 0.45 + p * 0.4 })
        g.circle(cx, cy, areaRadiusPx * 0.12 * (0.6 + p * 0.6))
        g.fill({ color: 0xd6ecff, alpha: 0.7 + p * 0.3 })
        // Radial ice crystal shards reaching for the ring
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2 + i * 0.26
          const r0 = areaRadiusPx * 0.12
          const r1 = areaRadiusPx * (0.2 + p * 0.9)
          g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0)
          g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1)
          g.stroke({ color: i % 2 ? 0x9fd0ff : 0x4f8ff0, width: Math.max(0.5, 2 * (1 - p * 0.5)), alpha: 1 - p * 0.4 })
        }
      })
    } else if (action.id === 'putrid-nova') {
      addVfx(preHitDuration, (g, p) => {
        g.clear()
        const pulse = 1 + 0.07 * Math.sin(p * 24)
        // Thick leading ring + a trail of toxic-green rings behind it, so the swept
        // area stays filled with visuals even when the nova fires quickly.
        const TRAIL = 5
        for (let k = 0; k < TRAIL; k++) {
          const tp = p - k * 0.18
          if (tp <= 0) continue
          const rr = areaRadiusPx * tp * pulse
          const fade = 1 - k / TRAIL
          g.circle(cx, cy, rr)
          g.stroke({ color: 0x2a8f2a, width: Math.max(1.5, 9 * fade), alpha: 0.6 * fade })
          g.circle(cx, cy, rr * 0.88)
          g.stroke({ color: 0x55cc44, width: Math.max(1, 5 * fade), alpha: 0.7 * fade })
        }
        // Festering core building up at the centre
        g.circle(cx, cy, areaRadiusPx * 0.22 * (0.5 + p * 0.7) * pulse)
        g.fill({ color: 0x44aa33, alpha: 0.45 + p * 0.4 })
        g.circle(cx, cy, areaRadiusPx * 0.12 * (0.6 + p * 0.6))
        g.fill({ color: 0xbff080, alpha: 0.7 + p * 0.3 })
        // Drifting toxic bubbles fanning out toward the ring
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2 + i * 0.27
          const sd = areaRadiusPx * (0.2 + p * 0.85)
          const wob = Math.sin(p * 12 + i) * areaRadiusPx * 0.04
          g.circle(cx + Math.cos(a) * sd, cy + Math.sin(a) * sd + wob, Math.max(0.5, 3 * (1 - p * 0.5)))
          g.fill({ color: i % 2 ? 0x77cc55 : 0xbff080, alpha: 1 - p * 0.3 })
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
  function spawnPostHitVfx(attacker: Entity, target: Entity, action: ActionDef, multiActionType?: MultiActionType): void {
    const ax = attacker.x, ay = attacker.y
    const tx = target.x, ty = target.y
    const tr = target.radius
    const baseAng = Math.atan2(ty - ay, tx - ax)

    // Elemental actions (fire/lightning/cold) fire constantly; halve their post-hit
    // opacity so the enemies and their affliction auras stay readable under the
    // stacked impact "bubbles". Non-elemental hits keep full opacity.
    const isElementalHit = action.tags.includes('fire') || action.tags.includes('lightning') || action.tags.includes('cold')
    const addHitVfx = (maxAge: number, tick: (g: Graphics, p: number) => void): void => {
      if (!isElementalHit) { addVfx(maxAge, tick); return }
      addVfx(maxAge, (g, p) => { g.alpha = 0.5; tick(g, p) })
    }

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
      addHitVfx(310, (g, p) => {
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
      addHitVfx(260, (g, p) => {
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
      addHitVfx(240, (g, p) => {
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
      addHitVfx(310, (g, p) => {
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
      // Primary hammer-slam's main shockwave is rendered by spawnAreaPreHitVfx on the
      // caster. Only emit a per-victim nova when the hit is from a tremor proc.
      if (multiActionType !== 'tremor') return
      addVfx(360, (g, p) => {
        g.clear()
        g.circle(tx, ty, tr * (0.8 + p * 3.2))
        g.stroke({ color: 0xffffff, width: 6 * (1 - p), alpha: (1 - p) * 0.95 })
        g.circle(tx, ty, tr * (0.5 + p * 2.4))
        g.stroke({ color: 0xddccaa, width: 4 * (1 - p), alpha: (1 - p) * 0.8 })
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 + i * 0.3
          const r0 = tr * 0.4
          const r1 = tr * (1.0 + p * 1.9)
          g.moveTo(tx + Math.cos(a) * r0, ty + Math.sin(a) * r0)
          g.lineTo(tx + Math.cos(a) * r1, ty + Math.sin(a) * r1)
          g.stroke({ color: 0xeeeeee, width: 2.5 * (1 - p), alpha: 1 - p })
        }
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2 + i * 0.5
          const d = tr * (0.4 + p * 2.0)
          const yhop = -Math.sin(p * Math.PI) * 5
          g.circle(tx + Math.cos(a) * d, ty + Math.sin(a) * d + yhop, Math.max(0.5, 3 * (1 - p)))
          g.fill({ color: i % 2 ? 0xddbb88 : 0xffffff, alpha: 1 - p })
        }
      })
    } else if (action.id === 'lightning-nova') {
      addHitVfx(260, (g, p) => {
        g.clear()
        g.circle(tx, ty, tr * (0.7 + p * 1.8))
        g.fill({ color: 0x9a7dff, alpha: (1 - p) * 0.6 })
        g.circle(tx, ty, tr * (0.45 + p * 1.0))
        g.fill({ color: 0xc6b3ff, alpha: (1 - p) * 0.85 })
        g.circle(tx, ty, tr * (0.25 + p * 0.5))
        g.fill({ color: 0xffffff, alpha: (1 - p) * 0.95 })
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + i * 0.4
          const d = tr * (0.5 + p * 2.0)
          g.circle(tx + Math.cos(a) * d, ty + Math.sin(a) * d, Math.max(0.5, 2.5 * (1 - p)))
          g.fill({ color: i % 2 ? 0xc4b0ff : 0xffffff, alpha: 1 - p })
        }
      })
    } else if (action.id === 'cold-nova') {
      addHitVfx(260, (g, p) => {
        g.clear()
        // Deep-blue expanding burst with icy-white core
        g.circle(tx, ty, tr * (0.7 + p * 1.8))
        g.fill({ color: 0x1f5fd6, alpha: (1 - p) * 0.6 })
        g.circle(tx, ty, tr * (0.45 + p * 1.0))
        g.fill({ color: 0x4f8ff0, alpha: (1 - p) * 0.85 })
        g.circle(tx, ty, tr * (0.25 + p * 0.5))
        g.fill({ color: 0xd6ecff, alpha: (1 - p) * 0.95 })
        // Flung ice shards
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + i * 0.4
          const d = tr * (0.5 + p * 2.0)
          const sx = tx + Math.cos(a) * d, sy = ty + Math.sin(a) * d
          const px = -Math.sin(a), py = Math.cos(a)
          const w = Math.max(0.5, 2.5 * (1 - p))
          g.moveTo(sx + px * w, sy + py * w)
          g.lineTo(sx + Math.cos(a) * tr * 0.6, sy + Math.sin(a) * tr * 0.6)
          g.lineTo(sx - px * w, sy - py * w)
          g.closePath()
          g.fill({ color: i % 2 ? 0x9fd0ff : 0xeaf6ff, alpha: 1 - p })
        }
      })
    } else if (action.id === 'putrid-nova') {
      addHitVfx(260, (g, p) => {
        g.clear()
        // Toxic-green expanding burst with sickly pale core
        g.circle(tx, ty, tr * (0.7 + p * 1.8))
        g.fill({ color: 0x2a8f2a, alpha: (1 - p) * 0.6 })
        g.circle(tx, ty, tr * (0.45 + p * 1.0))
        g.fill({ color: 0x55cc44, alpha: (1 - p) * 0.85 })
        g.circle(tx, ty, tr * (0.25 + p * 0.5))
        g.fill({ color: 0xbff080, alpha: (1 - p) * 0.95 })
        // Spattered toxic globs flung outward
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + i * 0.4
          const d = tr * (0.5 + p * 2.0)
          g.circle(tx + Math.cos(a) * d, ty + Math.sin(a) * d, Math.max(0.5, 3 * (1 - p)))
          g.fill({ color: i % 2 ? 0x77cc55 : 0xbff080, alpha: 1 - p })
        }
      })
    } else if (action.id === 'rotten-dagger') {
      // Quick green slash with toxic spatter (mirrors the sword slash, rot-tinted).
      addHitVfx(280, (g, p) => {
        g.clear()
        for (let i = -1; i <= 1; i++) {
          const ang = baseAng + Math.PI / 2 + i * 0.35
          const len = tr * (1.8 - Math.abs(i) * 0.3)
          const dx = Math.cos(ang) * len
          const dy = Math.sin(ang) * len
          g.moveTo(tx - dx, ty - dy); g.lineTo(tx + dx, ty + dy)
          g.stroke({ color: 0xbff080, width: Math.max(0.5, 5 * (1 - p)), alpha: 1 - p })
        }
        const sp = Math.min(1, p * 1.4)
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 + i * 0.7
          const d = tr * (0.3 + sp * 2.4)
          g.circle(tx + Math.cos(a) * d, ty + Math.sin(a) * d, Math.max(0.5, 3.5 * (1 - sp)))
          g.fill({ color: i % 2 ? 0x77cc55 : 0xbff080, alpha: 1 - sp })
        }
        if (p < 0.35) {
          const fp = p / 0.35
          g.circle(tx, ty, tr * (0.6 + fp * 2.4))
          g.fill({ color: 0x55cc44, alpha: (1 - fp) * 0.6 })
        }
      })
    } else if (action.id === 'poisonous-arrow') {
      // Toxic impact burst: green rings, radiating spokes, and a sickly core.
      addHitVfx(180, (g, p) => {
        g.clear()
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2
          const r0 = tr * 0.4
          const r1 = tr * (0.9 + p * 2)
          g.moveTo(tx + Math.cos(a) * r0, ty + Math.sin(a) * r0)
          g.lineTo(tx + Math.cos(a) * r1, ty + Math.sin(a) * r1)
          g.stroke({ color: 0x77cc55, width: 2.5 * (1 - p), alpha: 1 - p })
        }
        g.circle(tx, ty, tr * (0.8 + p * 2))
        g.stroke({ color: 0x55cc44, width: 3 * (1 - p), alpha: (1 - p) * 0.9 })
        g.circle(tx, ty, tr * (1 - p * 0.5))
        g.fill({ color: 0xbff080, alpha: (1 - p) * 0.55 })
      })
    } else if (action.id === 'bolt') {
      addHitVfx(120, (g, p) => {
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
    } else if (action.id === 'ice-spear') {
      addHitVfx(240, (g, p) => {
        g.clear()
        // Icy impact: expanding frost ring, cold core, and a spray of ice shards.
        g.circle(tx, ty, tr * (0.6 + p * 1.6))
        g.stroke({ color: 0x3f86f5, width: Math.max(0.5, 3 * (1 - p)), alpha: (1 - p) * 0.85 })
        g.circle(tx, ty, tr * (0.3 + p * 0.7))
        g.fill({ color: 0xd6ecff, alpha: (1 - p) * 0.85 })
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2 + i * 0.5
          const d = tr * (0.4 + p * 1.8)
          const sx = tx + Math.cos(a) * d, sy = ty + Math.sin(a) * d
          const px = -Math.sin(a), py = Math.cos(a)
          const w = Math.max(0.5, 2 * (1 - p))
          g.moveTo(sx + px * w, sy + py * w)
          g.lineTo(sx + Math.cos(a) * tr * 0.5, sy + Math.sin(a) * tr * 0.5)
          g.lineTo(sx - px * w, sy - py * w)
          g.closePath()
          g.fill({ color: i % 2 ? 0x9fd0ff : 0xeaf6ff, alpha: 1 - p })
        }
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
  setGameplayActive(true)  // entered the game scene → gameplay is running

  function startFirstGameTutorial(): void {
    if (isTutorialSeen('first-game') || getPrefs().tutorialDisabled) return
    const wasPaused = paused
    if (!wasPaused) togglePause()
    showTutorial({
      id: 'first-game',
      steps: [
        {
          message: getTutorialMessage('first-game', 0),
          targetSelector: '.game-viewport',
        },
        {
          message: getTutorialMessage('first-game', 1),
          targetSelector: '.stat-bar--life',
        },
        {
          message: getTutorialMessage('first-game', 2),
          targetSelector: '.stat-bar--mana',
        },
        {
          message: getTutorialMessage('first-game', 3),
          targetSelector: '.stat-bars',
        },
        {
          message: getTutorialMessage('first-game', 4),
          targetSelector: '[data-action="open-config"]',
          requiresInteraction: true,
        },
        {
          message: getTutorialMessage('first-game', 5),
          transparent: true,
        },
      ],
      guideSection: 'Actions & Action Levels',
      parent: container,
      openGuide,
      onDone:  () => { if (!wasPaused && paused) togglePause() },
      onGuide: () => { /* leave game paused — user will resume after reading the guide */ },
    })
  }

  function startEnemyLevelTutorial(): void {
    if (isTutorialSeen('first-enemy-level') || getPrefs().tutorialDisabled) return
    const wasPaused = paused
    if (!wasPaused) togglePause()
    showTutorial({
      id: 'first-enemy-level',
      steps: [
        {
          message: getTutorialMessage('first-enemy-level', 0),
          targetSelector: '[data-action="toggle-enemy"]',
          requiresInteraction: true,
        },
        {
          message: getTutorialMessage('first-enemy-level', 1),
          targetSelector: '.enemy-level-ctrl',
          transparent: true,
        },
      ],
      parent: container,
      openGuide,
      onDone: () => { if (!wasPaused && paused) togglePause() },
    })
  }

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

      // ── Background simulation ───────────────────────────────────────────────
      // While the tab is visible, Pixi's ticker runs on requestAnimationFrame.
      // When hidden, rAF stops firing, so we stop the ticker and pump it manually
      // from a worker-driven timer, advancing it to wall-clock in <=BG_STEP_MS
      // chunks (each pass still sees a bounded deltaMS — the ticker clamps to
      // minFPS). This keeps combat/spawns/effects progressing in an idle tab.
      const pumpBackground = (): void => {
        if (destroyed || paused || !app) return
        const ticker = app.ticker
        const now = performance.now()
        const elapsed = now - ticker.lastTime
        if (elapsed <= 0) return
        if (elapsed > BG_MAX_CATCHUP_MS) {
          // The worker was frozen too long (deep suspend). Don't fast-simulate the
          // whole gap; just resync the clock and let the next live tick credit it
          // via the away/stockpile path (which keys off the unchanged lastTickAt).
          ticker.lastTime = now
          return
        }
        let target = ticker.lastTime
        while (now - target > 0) {
          target = Math.min(now, target + BG_STEP_MS)
          ticker.update(target)
        }
      }
      bgTicker = createBackgroundTicker(pumpBackground, BG_TICK_INTERVAL_MS)

      onVisibilityChange = (): void => {
        if (destroyed || !app) return
        if (document.hidden) {
          if (paused) return
          app.ticker.stop()      // cancel the pending rAF; we drive it ourselves now
          app.ticker.lastTime = performance.now()
          bgTicker?.start()
        } else {
          bgTicker?.stop()
          // Resync so the first live frame doesn't replay the hidden interval as
          // one giant delta; the away/stockpile path handles any real absence.
          app.ticker.lastTime = performance.now()
          if (!paused) app.ticker.start()
        }
      }
      document.addEventListener('visibilitychange', onVisibilityChange)
      // The tab may already be hidden when the scene mounts.
      if (document.hidden) onVisibilityChange()

      const wrapper = document.createElement('div')
      wrapper.className = 'game-canvas-wrapper'
      wrapper.appendChild(app.canvas)
      viewportEl.appendChild(wrapper)

      const [tiles] = await Promise.all([
        loadTileTextures(),
        preloadEntityArt(),
      ])
      const { floorOptions: fo, treeOptions: to, decoOptions: dco } = tiles
      floorOptions = fo
      treeOptions  = to
      decoOptions  = dco

      if (destroyed) return

      floorContainer = new Container()
      wallContainer  = new Container()
      // Trees overflow upward into the tile above; sort by zIndex (assigned in
      // top-to-bottom draw order) so lower sprites paint over higher ones.
      wallContainer.sortableChildren = true
      burnGroundContainer = new Container()
      app.stage.addChild(floorContainer)
      app.stage.addChild(wallContainer)
      app.stage.addChild(burnGroundContainer)

      initEntityDisplay(playerEntity)
      drawGrid()
      updateCamera()
      app.renderer.on('resize', () => { drawGrid(); updateCamera() })

      // Paint one frame of the terrain + player before starting the first-game
      // tutorial — otherwise step 0 would point at a still-black viewport.
      app.renderer.render(app.stage)
      requestAnimationFrame(() => {
        if (destroyed) return
        startFirstGameTutorial()
      })

      app.ticker.add((ticker) => {
        // ── ×2-speed stockpile: detect absences (gap since last frame), then consume ─
        const nowReal = Date.now()
        const gap = nowReal - lastTickAt
        if (gap >= AWAY_DETECT_MS) {
          const earned = computeAward(gap, fastForwardMs)
          if (earned > 0) {
            // Pre-ad: ×2 time granted for being away, before the away-bonus ad is offered.
            trackEvent('x2_speed_earned', { ascent: String(ascentCount) })
            const beforeAward = fastForwardMs
            fastForwardMs = Math.min(STOCKPILE_MAX_MS, fastForwardMs + earned)
            if (isPaid() || !adsAvailable()) {
              // No-ad mode: grant the post-ad (doubled) value directly, up to the
              // doubled cap, then show an informational welcome-back modal.
              fastForwardMs = Math.min(STOCKPILE_DOUBLED_MAX_MS, fastForwardMs + earned)
              persistState()
              mountAwayBonusModal(el, gap, fastForwardMs - beforeAward, ascentCount, () => {})
            } else {
              mountAwayBonusModal(el, gap, earned, ascentCount, () => {}, (bonusMs) => {
                fastForwardMs = Math.min(STOCKPILE_DOUBLED_MAX_MS, fastForwardMs + bonusMs)
                updateSpeedUI()
                persistState()
              }, makeAdLifecycle())
            }
            updateSpeedUI()
          }
        }
        lastTickAt = nowReal
        if (!_gg && nowReal > _gT) {
          _gg = true
          if (!import.meta.env.DEV) {
            const _d = (s: string): number => { let n = 0x6b2f3c5a; for (let i = 0; i < s.length; i++) n = Math.imul(n ^ s.charCodeAt(i), 0x01000193) >>> 0; return n }
            const _cg = (h: string): boolean => { const p = h.split('.'); const i = p.indexOf('crazygames'); return i !== -1 && i >= p.length - 3 }
            _gi = [2157669096, 2248086539, 3219935836].includes(_d(location.hostname)) || _cg(location.hostname)
            if (_gi && window.self !== window.top) {
              try {
                const _ao = location.ancestorOrigins
                const _po = (_ao?.length ? _ao[0] : '') || document.referrer
                const _h = _po ? new URL(_po).hostname : ''
                _gi = _h ? ([2454481520, 1833763267].includes(_d(_h)) || _cg(_h)) : false
              } catch { _gi = false }
            }
          }
        }
        if (gameSpeed === 2 && fastForwardMs > 0) {
          // ticker.deltaMS is already scaled by app.ticker.speed = 2; divide back to real ms
          fastForwardMs = Math.max(0, fastForwardMs - ticker.deltaMS / gameSpeed)
          if (fastForwardMs === 0) {
            // Pre-ad: the banked ×2 time just drained to zero, before the refill ad is offered.
            trackEvent('x2_speed_depleted', { ascent: String(ascentCount) })
            setSpeed(1)
            offerRefillAd()
          }
        }

        gameTimeMs += ticker.deltaMS
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
          if (v.age >= v.maxAge) { v.g.destroy(); vfxList.splice(i, 1); v.onComplete?.(); continue }
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
          const dashMaxCharges = movBonuses.dashExtraCharge ? 2 : 1
          if (movBonuses.dashChargeChance > 0 && dashCharges < dashMaxCharges
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

          // Movement range: minimum of all independent-trigger action ranges
          // (auto-attack + time/mana-trigger extra slots). Dependent triggers ignore range.
          let effectiveRange = entity.actionRange
          if (entity.role === 'player') {
            const activeSlotCt = activeExtraSlotCount()
            for (let si = 0; si < activeSlotCt; si++) {
              const sl = extraSlots[si]
              if (!sl?.actionId || (sl.triggerType !== 'time' && sl.triggerType !== 'mana')) continue
              const sd = getAction(sl.actionId as ActionId)
              const baseRU = sd.selfTargeted ? (sd.area ?? 0) * (2 / 3) : sd.range
              let sr = baseRU * balance.player.radius
              if (sd.tags.includes('projectile')) { const pb = getProjectileBonuses(); sr *= (1 + pb.rangeIncrease / 100) * (1 + pb.rangeMore / 100) }
              if (sd.tags.includes('strike')) { const sb = getStrikeBonuses(); sr *= (1 + sb.rangeIncrease / 100) * (1 + sb.moreRange / 100) }
              if (sd.selfTargeted && sd.tags.includes('area')) { const ab = getAreaBonuses(); sr *= (1 + ab.sizeIncrease / 100) * (1 + ab.moreSize / 100) }
              if (sr < effectiveRange) effectiveRange = sr
            }
          }
          // Kite check for player (before stop-distance check to avoid early exit)
          const playerMb = entity.role === 'player' ? getMovementBonuses() : null
          const shouldKite = playerMb !== null && playerMb.kiteSpeedFraction > 0 && dist <= effectiveRange / 2

          // Close-gap: when key node active + dash available, stop only when touching
          const closeGapActive = entity.role === 'player' && (playerMb?.dashCloseGapToTarget ?? false) && dashCharges > 0
          const stopDist = closeGapActive
            ? entity.radius + target.radius
            : effectiveRange + target.radius

          if (!shouldKite && dist <= stopDist) {
            if (entity.role === 'player') {
              playerIsKiting = false
            }
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
              * Math.max(0, 1 - artifactMods.moveSpeedLess / 100)

            // dashLessDistance penalty from extra-charge key node, stacked with dashDistanceIncrease
            const dashDistMult = (1 + mb.dashDistanceIncrease / 100)
              * Math.max(0, 1 - mb.dashLessDistance / 100)

            // Active dash — run to completion
            if (dashRemainingMs > 0) {
              dashRemainingMs = Math.max(0, dashRemainingMs - ticker.deltaMS)
              const dashSpeed = effectiveMs * DASH_SPEED_MULT * dashDistMult
              Matter.Body.setVelocity(body, {
                x: dashMoveX * dashSpeed * MATTER_BASE_DT,
                y: dashMoveY * dashSpeed * MATTER_BASE_DT,
              })
              // On natural landing, play the dash sound if the player covered at
              // least DASH_SOUND_MIN_FRACTION of the full dash (a dash blocked
              // immediately by a wall/enemy stays silent).
              if (dashRemainingMs === 0) endDashSound(entity.x, entity.y)
              playerMovedSinceLastAction = true
              continue
            }

            playerIsKiting = shouldKite
            if (shouldKite) {
              const kiteMoveX = -(dx / dist)
              const kiteMoveY = -(dy / dist)
              if (dashCharges > 0 && mb.kiteAllowDash) {
                dashCharges--
                dashRemainingMs = DASH_DURATION_MS
                dashStartX = entity.x; dashStartY = entity.y
                dashMaxDist = effectiveMs * dashDistMult
                dashMoveX = kiteMoveX; dashMoveY = kiteMoveY
                const dashSpeed = effectiveMs * DASH_SPEED_MULT * dashDistMult
                Matter.Body.setVelocity(body, {
                  x: dashMoveX * dashSpeed * MATTER_BASE_DT,
                  y: dashMoveY * dashSpeed * MATTER_BASE_DT,
                })
              } else {
                const kiteSpeedMore = mb.kiteMoreSpeed > 0 ? (1 + mb.kiteMoreSpeed / 100) : 1
                const kiteMs = effectiveMs * mb.kiteSpeedFraction * kiteSpeedMore
                Matter.Body.setVelocity(body, {
                  x: kiteMoveX * kiteMs * MATTER_BASE_DT,
                  y: kiteMoveY * kiteMs * MATTER_BASE_DT,
                })
              }
              playerMovedSinceLastAction = true
              playerStationaryActionCount = 0
              continue
            }

            // Moving toward enemy — trigger dash if a charge is available
            if (dashCharges > 0) {
              dashCharges--
              dashRemainingMs = DASH_DURATION_MS
              dashStartX = entity.x; dashStartY = entity.y
              dashMaxDist = effectiveMs * dashDistMult
              dashMoveX = moveX; dashMoveY = moveY
              const dashSpeed = effectiveMs * DASH_SPEED_MULT * dashDistMult
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
            playerMovedSinceLastAction = true
            playerStationaryActionCount = 0
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
          if (entity.role === 'enemy' && frostTimers.has(entity.id)) {
            const cbFrost = getColdBonuses()
            const frostSlow = (balance.frost.baseMoveSlowPct + cbFrost.frostSlowIncrease) * (1 + cbFrost.frostSlowMore / 100)
            ms *= Math.max(0, 1 - frostSlow / 100)
          }
          // Weakening — poisoned enemies move slower (Rot mastery, Weakening tree node 2)
          if (entity.role === 'enemy' && isPoisoned(entity)) {
            const rbSlow = getRotBonuses()
            if (rbSlow.weakeningSpeedReduction > 0) ms *= Math.max(0, 1 - rbSlow.weakeningSpeedReduction / 100)
          }
          // Knockback slow debuff
          const kbSlow = knockbackSlowState.get(entity.id)
          if (kbSlow) ms *= Math.max(0, 1 - kbSlow.amount / 100)
          // Knockback velocity impulse.
          // While knockback is active, suppress the enemy's own movement so the
          // impulse isn't cancelled by their move-toward-player velocity (at
          // high levels enemy speed ≈ knockback speed, and the two summed to
          // ~zero when the enemy was in direct contact with the player).
          const kb = knockbackState.get(entity.id)
          const kbVx = kb ? kb.vx * MATTER_BASE_DT : 0
          const kbVy = kb ? kb.vy * MATTER_BASE_DT : 0
          if (kb) ms = 0
          Matter.Body.setVelocity(body, {
            x: moveX * ms * MATTER_BASE_DT + kbVx,
            y: moveY * ms * MATTER_BASE_DT + kbVy,
          })
        }

        // ── Player crowd-push: nudge enemies in the player's path ────────────
        // Default Matter contact resolution can't unstick the player from a
        // wall of enemies because all bodies share the same default mass.
        // Add a velocity component along the player's movement direction to
        // enemies in the front hemisphere of near-contact range. Walking gives
        // a gentle shove (~30% transfer); dashing carries enemies along (~85%)
        // so the player can plow through a crowd to reach a back-row target.
        {
          const pBody = entityBodies.get(playerEntity.id)
          if (pBody) {
            const pvx = pBody.velocity.x
            const pvy = pBody.velocity.y
            const pSpeed = Math.sqrt(pvx * pvx + pvy * pvy)
            if (pSpeed > 0.01) {
              const dirX = pvx / pSpeed
              const dirY = pvy / pSpeed
              const pushFraction = dashRemainingMs > 0 ? 0.85 : 0.3
              for (const e of entities) {
                if (e.role !== 'enemy') continue
                // Don't interfere with active knockback velocity
                if (knockbackState.has(e.id)) continue
                const ex = e.x - playerEntity.x
                const ey = e.y - playerEntity.y
                const edist = Math.sqrt(ex * ex + ey * ey)
                if (edist <= 0) continue
                if (edist > playerEntity.radius + e.radius + 6) continue
                const dot = (ex / edist) * dirX + (ey / edist) * dirY
                if (dot <= 0) continue
                const eBody = entityBodies.get(e.id)
                if (!eBody) continue
                const k = pSpeed * pushFraction * dot
                Matter.Body.setVelocity(eBody, {
                  x: eBody.velocity.x + dirX * k,
                  y: eBody.velocity.y + dirY * k,
                })
              }
            }
          }
        }

        // ── Physics step ────────────────────────────────────────────────────
        // Substep so each Matter step stays near its design timestep (~16.7 ms),
        // keeping integration stable at high gameSpeed (deltaMS up to ~83 ms at 5×).
        let physicsRemaining = ticker.deltaMS
        while (physicsRemaining > 0) {
          const step = Math.min(physicsRemaining, PHYSICS_MAX_STEP_MS)
          Matter.Engine.update(physicsEngine, step)
          physicsRemaining -= step
        }

        // ── Sync positions + animate rigs ───────────────────────────────────
        for (const entity of entities) {
          const body = entityBodies.get(entity.id)
          if (body) {
            entity.x = body.position.x
            entity.y = body.position.y
          }
          entityContainers.get(entity.id)?.position.set(entity.x, entity.y)
          const rig = entityRigs.get(entity.id)
          if (rig) {
            const body2 = entityBodies.get(entity.id)
            const vx = body2 ? body2.velocity.x / MATTER_BASE_DT : 0
            const vy = body2 ? body2.velocity.y / MATTER_BASE_DT : 0
            rig.update(ticker.deltaMS, {
              vx,
              speed:    Math.hypot(vx, vy),
              maxSpeed: entity.moveSpeed,
            })
          }
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
        let currentHitIsMainSlot = false  // set before each applyHit call; gates affliction trigger counting

        // Apply a single hit: damage + XP + damage number + VFX. Mana / cooldown / triggers handled by caller.
        const applyHit = (attacker: Entity, target: Entity, damage: number, action: ActionDef, actionId: ActionId, guaranteedAfflictions = false, impactX?: number, impactY?: number, isDoubleDamage = false): boolean => {
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
            totalResistance = Math.max(0, Math.min(100, totalResistance - artifactMods.resistanceLess))
            finalDamage = damage * (1 - totalResistance / 100)
            if (artifactMods.damageTakenMore > 0) finalDamage *= 1 + artifactMods.damageTakenMore / 100
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
          if (isElectrocuted(target)) {
            if (target.role === 'enemy') {
              const lbElec = getLightningBonuses()
              const totalDmgTaken = balance.effects.electrocutionBaseDamageTakenPct + lbElec.electrocuteDamageTakenIncrease
              finalDamage *= 1 + totalDmgTaken / 100
            } else {
              // Player target: no player-side mastery bonuses (those buff outgoing electrocution).
              finalDamage *= 1 + balance.effects.electrocutionBaseDamageTakenPct / 100
            }
          }
          // Critical hit + ignore-mitigation rolls (player vs enemy only).
          // Rolled BEFORE the resistance multiplier so we can skip it on ignore.
          let isCrit = false
          let ignoreMitigation = false
          const cb = getCriticalHitBonuses()
          if (attacker.role === 'player' && target.role === 'enemy') {
            const critChance = critChanceForAction(action.tags, target)
            if (critChance > 0 && Math.random() < critChance) isCrit = true
            const ab = getActionBonuses()
            const ignoreChance = ab.ignoreMitigationChance + (isCrit ? cb.ignoreMitigationChance : 0)
            if (ignoreChance > 0 && Math.random() * 100 < ignoreChance) ignoreMitigation = true
            // Chance key 14: crits guarantee an affliction on top of the standard roll
            if (isCrit && cb.guaranteedAffliction) guaranteedAfflictions = true
          }
          // critAfflMult: Damage key 14 — tree-0 crit damage bonus redirected to affliction initial dps
          const critAfflMult = (isCrit && cb.damageToAfflictions)
            ? (1 + cb.damageIncreaseTree0 / 100) * (1 + cb.damageMoreTree0 / 100)
            : 1
          // Enemy resistance: last damage-mitigation step before applying the hit.
          // Skipped when ignoreMitigation rolled true above.
          if (target.role === 'enemy' && !ignoreMitigation) {
            let physRotR = 0
            let eleR = 0
            if (action.tags.includes('physical') || action.tags.includes('rot')) physRotR = target.physRotResist ?? 0
            if (action.tags.includes('fire') || action.tags.includes('lightning') || action.tags.includes('cold')) eleR = target.eleResist ?? 0
            if (action.tags.includes('fire') && isBurning(target)) {
              const fbResist = getFireBonuses()
              if (fbResist.burnEnemyResistReduction > 0) eleR = Math.max(0, eleR - fbResist.burnEnemyResistReduction)
            }
            // Weakening node 5: poison stacks reduce enemy physRot resistance on direct physical/rot hits
            if ((action.tags.includes('physical') || action.tags.includes('rot')) && isPoisoned(target)) {
              const rbResist = getRotBonuses()
              if (rbResist.weakeningResistPerStack > 0) {
                const stackCount = poisonStacks.get(target.id)?.length ?? 0
                physRotR = Math.max(0, physRotR - stackCount * rbResist.weakeningResistPerStack)
              }
            }
            const enemyResist = physRotR + eleR
            if (enemyResist > 0) finalDamage *= 1 - Math.min(100, enemyResist) / 100
          }
          // Frost — frosted enemies take more damage from non-cold sources (Cold Damage tree node 11)
          if (target.role === 'enemy' && frostTimers.has(target.id) && !action.tags.includes('cold')) {
            const cbVuln = getColdBonuses()
            if (cbVuln.frostedVulnerable > 0) finalDamage *= 1 + cbVuln.frostedVulnerable / 100
          }
          // Rot: poisoned enemies take more rot damage (Rot Damage tree node 11 + Weakening tree nodes 0 & 3)
          if (target.role === 'enemy' && action.tags.includes('rot') && isPoisoned(target)) {
            const rbVuln = getRotBonuses()
            if (rbVuln.poisonedTakeMore > 0)        finalDamage *= 1 + rbVuln.poisonedTakeMore / 100
            if (rbVuln.weakeningRotDamageTaken > 0) finalDamage *= 1 + rbVuln.weakeningRotDamageTaken / 100
          }
          // Apply crit damage multiplier after resistance.
          // Chance key 14: noDamageBonus means crits trigger effects but deal no extra direct damage.
          // Damage key 14: damageToAfflictions excludes tree-0 bonuses from direct hits.
          // Damage key 15: tripleDamageOnDouble upgrades the ×2 to ×3 when this hit already doubled.
          if (isCrit) {
            if (!cb.noDamageBonus) finalDamage *= critDamageMultiplier(cb.damageToAfflictions)
            if (cb.tripleDamageOnDouble && isDoubleDamage) finalDamage *= 1.5
          }
          // Knockback damage reduction: knocked-back enemies deal less damage to the player
          if (target.role === 'player' && attacker.role === 'enemy') {
            const kbDR = knockbackDamageReductionState.get(attacker.id)
            if (kbDR) finalDamage *= Math.max(0, 1 - kbDR.amount / 100)
          }
          // Frost — frosted enemies deal less damage (Frost mastery node 11)
          if (target.role === 'player' && attacker.role === 'enemy' && frostTimers.has(attacker.id)) {
            const cbFrostDealLess = getColdBonuses()
            if (cbFrostDealLess.frostedDealLess > 0) finalDamage *= Math.max(0, 1 - cbFrostDealLess.frostedDealLess / 100)
          }
          // Weakening — poisoned enemies deal less damage (Rot mastery, Weakening tree node 1 & 4)
          if (target.role === 'player' && attacker.role === 'enemy' && isPoisoned(attacker)) {
            const rbWeak = getRotBonuses()
            if (rbWeak.weakeningDealLess > 0) finalDamage *= Math.max(0, 1 - rbWeak.weakeningDealLess / 100)
          }
          // Frozen Armor: damage reduction for the player based on stacks
          if (target.role === 'player' && frozenArmorStacks > 0) {
            const cbArmor = getColdBonuses()
            const reductionPerStack = cbArmor.frozenArmorDmgReductionPerStack
            if (reductionPerStack > 0) {
              finalDamage *= Math.max(0, 1 - Math.min(frozenArmorStacks * reductionPerStack, 80) / 100)
            }
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
          // Block: the target may block a fraction of the incoming hit. Last
          // mitigation layer; never applies to affliction ticks (those bypass
          // applyHit entirely). Life XP still uses the pre-block value, and
          // afflictions keep their pre-mitigation `damage` basis.
          let blockedAmount = 0
          let blockSuppressAffl = false
          if (finalDamage > 0) {
            const bp = blockParamsFor(target)
            if (bp && (blockCooldowns.get(target.id) ?? 0) <= 0 && Math.random() * 100 < bp.chancePct) {
              blockedAmount = finalDamage * bp.blockedPct / 100
              finalDamage -= blockedAmount
              blockCooldowns.set(target.id, bp.cooldownMs)
              blockSuppressAffl = bp.suppressAfflictions
              if (bp.healPct > 0) {
                target.currentLife = Math.min(target.maxLife, target.currentLife + blockedAmount * bp.healPct / 100)
              }
            }
          }
          // Bleed/Burn key 14: player physical/fire hits deal no direct damage (afflictions still
          // calculated from the original `damage` value). Capture whether the hit would have
          // landed pre-suppression so affliction gates that read `actualDamage > 0` still fire.
          const wouldHaveLanded = finalDamage > 0
          if (attacker.role === 'player' && target.role === 'enemy') {
            if (action.tags.includes('physical') && getPhysicalBonuses().suppressPhysicalHitDamage) finalDamage = 0
            if (action.tags.includes('fire')     && getFireBonuses().suppressFireHitDamage)         finalDamage = 0
            if (action.tags.includes('rot')      && getRotBonuses().suppressRotHitDamage)           finalDamage = 0
          }
          const prevLife = target.currentLife
          if (!_gi && target.role === 'enemy') {
            // integrity hold — enemy health unmodified
          } else {
            target.currentLife = Math.max(0, target.currentLife - finalDamage)
          }
          const actualDamage = prevLife - target.currentLife
          if (attacker.role === 'player' && target.role === 'enemy' && (actualDamage > 0 || wouldHaveLanded)) {
            playSound(essenceSfxId(action.tags))
          }
          // Enemies emit the same essence sound when their action lands on the player.
          if (attacker.role === 'enemy' && target.role === 'player' && (actualDamage > 0 || wouldHaveLanded)) {
            playSound(essenceSfxId(action.tags))
          }
          // Track the last direct hit type on boss entities for trigger unlock detection.
          if (attacker.role === 'player' && target.role === 'enemy' && bossEntities.has(target.id) && actualDamage > 0) {
            bossLastHitWasCrit.set(target.id, isCrit)
            bossLastHitWasAffl.set(target.id, false)
          }
          if (attacker.role === 'player' && actualDamage > 0) {
            const eLevel = enemyLevels.get(target.id) ?? 1
            const xpMult = Math.pow(balance.enemyLevel.xpMultiplierPerLevel, eLevel - 1) * tierXpMult(target.id)
            awardXp(actionId, actualDamage * xpMult)
            if (enemyProgress.level === enemyProgress.maxLevel) awardEnemyXp(actualDamage)
            awardAscentXp(actualDamage)
            if (isCrit) {
              runCritXp += actualDamage
              spawnCritVfx(target.x, target.y, target.radius)
              spawnDamageNumber(target.x, target.y - target.radius - 8, actualDamage, 0xffee44)
            } else {
              spawnDamageNumber(target.x, target.y - target.radius - 8, actualDamage, 0xffffff)
            }
            applyLifeSteal(actualDamage)
            applyManaSteal(actualDamage)
            recordDps(actionId, actualDamage, currentHitMultiType ? `multi:${currentHitMultiType}` : 'direct')
            // Base vs crit split: the first 1× of damage is base, the remainder is crit bonus
            const critMult = (isCrit && !cb.noDamageBonus)
              ? critDamageMultiplier(cb.damageToAfflictions) * (cb.tripleDamageOnDouble && isDoubleDamage ? 1.5 : 1)
              : 1
            const baseDmg = actualDamage / critMult
            recordDps(actionId, baseDmg, 'hit:base')
            if (isCrit) recordDps(actionId, actualDamage - baseDmg, 'hit:crit')
          }
          if (target.role === 'player' && (actualDamage > 0 || blockedAmount > 0)) {
            const eLevel = enemyLevels.get(attacker.id) ?? 1
            const xpMult = Math.pow(balance.enemyLevel.xpMultiplierPerLevel, eLevel - 1) * tierXpMult(attacker.id)
            // Blocking never reduces life XP — the basis is the full damage the
            // hit would have dealt without the block.
            awardStatXp('life', (actualDamage + blockedAmount) * balance.stat.lifeXpFromDamage * xpMult)
            // Block mastery XP from the damage prevented — same model as life.
            if (blockedAmount > 0) awardBlockXp(blockedAmount * balance.stat.lifeXpFromDamage * xpMult)
            if (actualDamage > 0) spawnDamageNumber(target.x, target.y - target.radius - 8, actualDamage, 0xff3333)
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
              // Use impactX/Y (area center) as knockback origin when provided, so area
              // hits push enemies away from the explosion center, not from the player.
              const originX = impactX ?? attacker.x
              const originY = impactY ?? attacker.y
              const dx = target.x - originX
              const dy = target.y - originY
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

          // Burning: roll on fire-tagged player hits to enemy targets.
          // The hit-suppression key can zero actualDamage; gate on whether the hit would have
          // landed in absence of suppression so afflictions still trigger.
          if (attacker.role === 'player' && target.role === 'enemy' && action.tags.includes('fire') && (actualDamage > 0 || wouldHaveLanded)) {
            const fb = getFireBonuses()
            const immolBurnBonus = hasEffect('immolation') ? fb.immolateBurnChance : 0
            const chance = balance.effects.baseApplyChance + fb.burnApplyChance + immolBurnBonus + extraAfflChance
            if (guaranteedAfflictions || Math.random() * 100 < chance) {
              const dps = damage * balance.effects.burnDpsFraction
                * (1 + fb.burnDamageIncrease / 100)
                * (1 + fb.burnMoreDamage / 100)
                * Math.max(0, 1 - fb.burnLessDamage / 100)
                * fb.burnDamageMult
                * critAfflMult
              const duration = balance.effects.burnBaseDurationMs
                * (1 + fb.burnDurationIncrease / 100)
                * fb.burnDurationMult
              const list = burnStacks.get(target.id) ?? []
              list.push({ dps, remainingMs: duration, sourceActionId: actionId })
              burnStacks.set(target.id, list)
              if (currentHitIsMainSlot) { afflictionAppliedThisTick++; afflictionLastTarget = target }
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
              const duration = balance.effects.electrocutionBaseDurationMs
                * (1 + lbElec.electrocuteDurationIncrease / 100)
                * lbElec.electrocuteDurationMult
              electrocuteStacks.set(target.id, duration)
              if (currentHitIsMainSlot) { afflictionAppliedThisTick++; afflictionLastTarget = target }
            }
          }
          // Electrifying: lightning-tagged player hits roll a chance to apply Electrified to the player
          if (attacker.role === 'player' && action.tags.includes('lightning') && actualDamage > 0) {
            const lbElec = getLightningBonuses()
            if (lbElec.electrifyChance > 0 && Math.random() * 100 < lbElec.electrifyChance) applyElectrified()
          }
          // Frost: roll on cold-tagged player hits to enemy targets. A positive roll always
          // counts toward the affliction trigger (even if the target is already frosted);
          // a new frost is only applied when not already frosted (immune while active — no refresh).
          if (attacker.role === 'player' && target.role === 'enemy' && action.tags.includes('cold') && actualDamage > 0) {
            const cbFrostApply = getColdBonuses()
            const frostChance = balance.frost.baseFrostChancePct + cbFrostApply.frostApplyChance + extraAfflChance
            if (guaranteedAfflictions || Math.random() * 100 < frostChance) {
              if (currentHitIsMainSlot) { afflictionAppliedThisTick++; afflictionLastTarget = target }
              // Frozen Armor accrues on every successful frost roll, even if the target
              // was already frosted (immune while active) so no new frost is applied.
              totalFrostRolls++
              const threshold = Math.max(1, balance.frozenArmor.frostsPerStack - cbFrostApply.frozenArmorFrostsReduction)
              const maxStacks = balance.frozenArmor.maxStacks + cbFrostApply.frozenArmorMaxStacksBonus
              if (totalFrostRolls % threshold === 0 && frozenArmorStacks < maxStacks) {
                // Double-stack chance: gain 2 stacks instead of 1 (clamped to the max).
                const gain = (Math.random() * 100 < cbFrostApply.frozenArmorDoubleStackChance) ? 2 : 1
                frozenArmorStacks = Math.min(maxStacks, frozenArmorStacks + gain)
                renderBuffBar()
              }
              // Apply the frost itself only when not already frosted (no refresh).
              if (!frostTimers.has(target.id)) {
                const frostDuration = balance.frost.baseDurationMs
                  * (1 + cbFrostApply.frostDurationIncrease / 100)
                  * cbFrostApply.frostDurationMult
                frostTimers.set(target.id, frostDuration)
              }
            }
          }
          // Bleeding: roll on physical-tagged player hits to enemy targets. The hit-suppression
          // key can zero actualDamage; gate on whether the hit would have landed pre-suppression.
          if (attacker.role === 'player' && target.role === 'enemy' && action.tags.includes('physical') && (actualDamage > 0 || wouldHaveLanded)) {
            const pb = getPhysicalBonuses()
            const bloodlustBleedBonus = hasEffect('bloodlust') ? pb.bloodlustBleedChance : 0
            const chance = balance.effects.baseApplyChance + pb.bleedApplyChance + bloodlustBleedBonus + extraAfflChance
            if (guaranteedAfflictions || Math.random() * 100 < chance) {
              const newBaseDps  = damage * balance.effects.bleedDpsFraction * critAfflMult
              const duration    = balance.effects.bleedBaseDurationMs
                * (1 + pb.bleedDurationIncrease / 100)
                * pb.bleedDurationMult
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
              if (currentHitIsMainSlot) { afflictionAppliedThisTick++; afflictionLastTarget = target }
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
          // Poison: roll on rot-tagged player hits to enemy targets (burn model: always push new stack)
          if (attacker.role === 'player' && target.role === 'enemy' && action.tags.includes('rot') && (actualDamage > 0 || wouldHaveLanded)) {
            const rb = getRotBonuses()
            const chance = balance.effects.baseApplyChance + rb.poisonApplyChance + extraAfflChance
            if (guaranteedAfflictions || Math.random() * 100 < chance) {
              const newDps  = damage * (balance.ascent.poisonBaseDamagePct / 100) * critAfflMult
              const duration = balance.ascent.poisonBaseDurationMs
                * (1 + rb.poisonDurationIncrease / 100)
                * rb.poisonDurationMult
              const list = poisonStacks.get(target.id) ?? []
              list.push({ dps: newDps, remainingMs: duration, sourceActionId: actionId })
              poisonStacks.set(target.id, list)
              totalPoisonApplications++
              // Green Veins threshold: gain a stack every N poison applications
              const threshold = Math.max(1, Math.round(balance.ascent.greenVeinsPoisonsPerStack * (1 - rb.greenVeinsTriggerReduction / 100)))
              if (totalPoisonApplications >= threshold) {
                totalPoisonApplications = 0
                const maxStacks = balance.ascent.greenVeinsMaxStacks + rb.greenVeinsMaxStacksBonus
                const extra = Math.random() * 100 < rb.greenVeinsChanceOnPoison ? 1 : 0
                // The buff window has a fixed lifetime: the timer starts only when the
                // window opens (0 → first stack) and is NOT refreshed by later stacks.
                // Stacks keep building during the window; when it expires they all clear
                // together and the application counter restarts from scratch.
                if (greenVeinsStacks === 0) {
                  greenVeinsTimer = balance.ascent.greenVeinsBaseDurationMs * (1 + rb.greenVeinsDurationIncrease / 100)
                }
                greenVeinsStacks = Math.min(maxStacks, greenVeinsStacks + 1 + extra)
                renderBuffBar()
              }
              if (currentHitIsMainSlot) { afflictionAppliedThisTick++; afflictionLastTarget = target }
            }
          }

          // Enemy → player affliction rolls: baseline 5% chance × 0.5, duration × 0.5.
          // No mastery bonuses on the enemy side (those are player-attacker buffs).
          if (attacker.role === 'enemy' && target.role === 'player' && actualDamage > 0 && !blockSuppressAffl) {
            const enemyChance = balance.effects.baseApplyChance * balance.effects.enemyAfflictionChanceMult
            const durMult = balance.effects.enemyAfflictionDurationMult
            if (action.tags.includes('fire') && Math.random() * 100 < enemyChance) {
              const dps = damage * balance.effects.burnDpsFraction
              const duration = balance.effects.burnBaseDurationMs * durMult
              const list = burnStacks.get(target.id) ?? []
              list.push({ dps, remainingMs: duration, sourceActionId: actionId })
              burnStacks.set(target.id, list)
            }
            if (action.tags.includes('lightning') && Math.random() * 100 < enemyChance) {
              const duration = balance.effects.electrocutionBaseDurationMs * durMult
              electrocuteStacks.set(target.id, duration)
            }
            if (action.tags.includes('physical') && Math.random() * 100 < enemyChance) {
              const newBaseDps = damage * balance.effects.bleedDpsFraction
              const duration   = balance.effects.bleedBaseDurationMs * durMult
              const existing   = bleedStacks.get(target.id)
              if (!existing) {
                bleedStacks.set(target.id, { baseDps: newBaseDps, stackedIncrease: 0, remainingMs: duration, sourceActionId: actionId })
              } else {
                const currentEffective = existing.baseDps * (1 + existing.stackedIncrease / 100)
                if (newBaseDps > currentEffective) existing.baseDps = newBaseDps
                else existing.stackedIncrease += balance.effects.bleedStackIncreasePerProc
                existing.remainingMs    = duration
                existing.sourceActionId = actionId
              }
            }
            if (action.tags.includes('rot') && Math.random() * 100 < enemyChance) {
              const newDps = damage * (balance.ascent.poisonBaseDamagePct / 100)
              const duration = balance.ascent.poisonBaseDurationMs * durMult
              const list = poisonStacks.get(target.id) ?? []
              list.push({ dps: newDps, remainingMs: duration, sourceActionId: actionId })
              poisonStacks.set(target.id, list)
            }
          }
          return isCrit
        }

        // ── Pending-hit countdown: apply damage when the pre-hit window expires ─
        mainSlotCritTarget = null
        afflictionAppliedThisTick = 0
        afflictionLastTarget = null
        for (const [entityId, ph] of pendingHits) {
          ph.countdown -= ticker.deltaMS
          if (ph.countdown > 0) continue
          pendingHits.delete(entityId)
          if (!entities.includes(ph.target) || ph.target.currentLife <= 0) continue
          if (!entities.includes(ph.attacker)) continue
          currentHitMultiType = ph.multiActionType
          currentHitIsMainSlot = ph.isMainSlot ?? false
          const wasCrit = applyHit(ph.attacker, ph.target, ph.damage, ph.action, ph.actionId, ph.guaranteedAfflictions, ph.impactX, ph.impactY, ph.isDoubleDamage)
          if (ph.isMainSlot && wasCrit) mainSlotCritTarget = ph.target
          spawnPostHitVfx(ph.attacker, ph.target, ph.action, ph.multiActionType)
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
          const tranceStacks = isPlayer ? effectStacks('trance') : 0
          const rb = entity.role === 'player' ? getRuneBonuses(actionId) : null

          // Action Speed node 11: when double acting, the SECOND action's initial hit is guaranteed
          // to apply afflictions. Scope is strictly the doubleAction MA itself — children spawned
          // from it (split, jump, additionalProjectile, tremor, additionalTarget) roll normally.
          const guaranteedAfflictions =
            pending?.type === 'doubleAction' && actionBonuses?.guaranteedAfflictions === true

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
            const lessFactor = actionBonuses.lessManaCost / 100
            // Mana-tree key 12: reductions from this tree become increases of the same magnitude
            if (actionBonuses.invertManaCostReductions) {
              gateCost = action.manaCost * (1 + reduction) * (1 + lessFactor)
            } else {
              gateCost = action.manaCost
                * Math.max(0, 1 - reduction)
                * Math.max(0, 1 - lessFactor)
            }
            // Damage-tree key 13: +20% more action mana cost
            if (actionBonuses.moreManaCost > 0) {
              gateCost *= 1 + actionBonuses.moreManaCost / 100
            }
            paidCost = gateCost
            if (actionBonuses.noManaCostChance > 0 && Math.random() * 100 < actionBonuses.noManaCostChance) {
              // Mana-tree key 12: no-mana chance becomes double-mana chance
              paidCost = actionBonuses.invertManaCostReductions ? gateCost * 2 : 0
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
          if (tranceStacks > 0 && actionBonuses && actionBonuses.tranceDamageIncrease > 0) {
            effectiveDamage *= 1 + (tranceStacks * actionBonuses.tranceDamageIncrease) / 100
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
          let isDoubleDamageRolled = false
          if (totalDDC > 0 && Math.random() * 100 < totalDDC) {
            effectiveDamage *= 2
            isDoubleDamageRolled = true
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
          // Movement mastery key bonuses: first-action-after-moving / stationary stacking
          if (entity.role === 'player' && !pending) {
            const movB = getMovementBonuses()
            if (movB.firstActionMoreDamage > 0 && playerMovedSinceLastAction) {
              effectiveDamage *= 1 + movB.firstActionMoreDamage / 100
            }
            if (movB.stationaryMoreDamagePerAction > 0 && !playerMovedSinceLastAction) {
              playerStationaryActionCount = Math.min(playerStationaryActionCount + 1, 10)
              effectiveDamage *= 1 + (movB.stationaryMoreDamagePerAction * playerStationaryActionCount) / 100
            }
            playerMovedSinceLastAction = false
          }
          // Ascent: independent damage multiplier per ascension, plus universe point C
          // (more damage) and transcendence power (applies even at ascent 0).
          if (entity.role === 'player' && (ascentCount > 0 || transcendCount > 0)) {
            effectiveDamage *= (1 + ascentCount * balance.ascent.damagePerAscent) * universeDamageMult() * transcendDamageMult()
          }

          // ── Cycle duration ────────────────────────────────────────────────
          const tranceSpeedMult = (tranceStacks > 0 && actionBonuses && actionBonuses.tranceActionSpeedIncrease > 0)
            ? 1 + (tranceStacks * actionBonuses.tranceActionSpeedIncrease) / 100
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
          if (entity.role === 'enemy' && frostTimers.has(entity.id)) {
            const cbAtkFrost = getColdBonuses()
            const frostSlow = (balance.frost.baseActionSlowPct + cbAtkFrost.frostSlowIncrease) * (1 + cbAtkFrost.frostSlowMore / 100)
            effectiveAttackSpeed *= Math.max(0, 1 - frostSlow / 100)
          }
          // Weakening — poisoned enemies act slower (Rot mastery, Weakening tree node 2)
          if (entity.role === 'enemy' && isPoisoned(entity)) {
            const rbAtkSlow = getRotBonuses()
            if (rbAtkSlow.weakeningSpeedReduction > 0) effectiveAttackSpeed *= Math.max(0, 1 - rbAtkSlow.weakeningSpeedReduction / 100)
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
          // Kite mastery key 13: action speed bonus while kiting
          if (entity.role === 'player' && playerIsKiting) {
            const movBSpd = getMovementBonuses()
            if (movBSpd.kiteMoreActionSpeed > 0) effectiveAttackSpeed *= 1 + movBSpd.kiteMoreActionSpeed / 100
          }
          // Ascent: independent action speed multiplier per ascension, plus universe point D (more action speed)
          if (entity.role === 'player' && ascentCount > 0) {
            effectiveAttackSpeed *= (1 + ascentCount * balance.ascent.actionSpeedPerAscent) * universeActionSpeedMult()
          }
          const baseCooldown = (1000 / effectiveAttackSpeed) / tranceSpeedMult
          const preHitDuration = baseCooldown / 3

          const areaVictims: Entity[] = []
          if (action.tags.includes('area')) {
            const ab = entity.role === 'player' ? getAreaBonuses() : null
            let areaRadiusPx = (action.area ?? 0) * balance.player.radius
            if (ab) areaRadiusPx *= (1 + ab.sizeIncrease / 100) * (1 + ab.moreSize / 100) * Math.max(0, 1 - artifactMods.areaLess / 100)
            // Enemies gain +0.5% area size per level above 1.
            else areaRadiusPx *= 1 + ((enemyLevels.get(entity.id) ?? 1) - 1) * balance.enemyLevel.rangeAreaAddPerLevel
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
                guaranteedAfflictions, isDoubleDamage: isDoubleDamageRolled,
                multiActionType: pending?.type,
                isMainSlot: isPlayer,
                impactX: center.x, impactY: center.y,
              })
              areaVictims.push(v)
            }
            spawnAreaPreHitVfx(entity, center, areaRadiusPx, action, preHitDuration)
          } else {
            pendingHits.set(`${entity.id}:${++hitSeq}`, {
              attacker: entity, target, damage: effectiveDamage,
              action, actionId, countdown: preHitDuration,
              guaranteedAfflictions, isDoubleDamage: isDoubleDamageRolled,
              multiActionType: pending?.type,
              isMainSlot: isPlayer,
            })
            spawnPreHitVfx(entity, target, action, preHitDuration)
          }

          // Lock player movement during the animation phase and cancel any active dash.
          // Casting an action on arrival cuts the dash short, so sound it here too
          // (based on distance covered) instead of waiting for the full duration.
          if (entity.role === 'player') {
            playerAnimLockMs = preHitDuration
            if (dashRemainingMs > 0) endDashSound(entity.x, entity.y)
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
                manaSpentThisTick += paidCost
                const eLevel = enemyLevels.get(target.id) ?? 1
                const xpMult = Math.pow(balance.enemyLevel.xpMultiplierPerLevel, eLevel - 1) * tierXpMult(target.id)
                awardStatXp('mana', paidCost * balance.stat.manaXpMultiplier * xpMult)
              }
            }
          }

          // ── Status triggers — all casts (including multi-actions) can trigger ──
          if (isPlayer && actionBonuses && actionBonuses.tranceTriggerChance > 0
              && Math.random() * 100 < actionBonuses.tranceTriggerChance) {
            const canStack = actionBonuses.tranceCanStack
            const tranceDuration = canStack
              ? balance.buffs.tranceDurationMs / 2
              : balance.buffs.tranceDurationMs
            applyEffect(
              { id: 'trance', iconName: 'book', kind: 'buff' },
              tranceDuration,
              canStack ? 2 : 1,
            )
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
            const cap = entity.role === 'player'
              ? Math.floor(MAX_MULTI_QUEUE * multiActionSpeedMult())
              : MAX_MULTI_QUEUE
            if (arr.length >= cap) return
            const idx = arr.findIndex(x => MULTI_ACTION_PRIORITY[x.type] > MULTI_ACTION_PRIORITY[type])
            const entry: PendingMultiAction = { type, inheritedDamageMult: inherited, target: maTarget }
            if (chainProjectile) entry.isChainProjectile = true
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
            if (tranceStacks > 0 && actionBonuses) totalChance += tranceStacks * actionBonuses.tranceMultiTargetChance
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
            // Speed-tree key 14: double actions reroll for double action once.
            if (actionBonuses.doubleActionReroll
                && Math.random() * 100 < actionBonuses.doubleActionChance) {
              queueMA('doubleAction', childInherited)
            }
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
            const jumpChance = lbJump.jumpChance
              + (isElectrocuted(target as Entity) ? lbJump.jumpFromElectrocutedChance : 0)
            if (jumpChance > 0 && Math.random() * 100 < jumpChance) {
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
          const maMult = entity.role === 'player' ? multiActionSpeedMult() : 1
          actionCooldowns.set(entity.id,
            nextQueue && nextQueue.length > 0
              ? baseCooldown / (MULTI_ACTION_COOLDOWN_DIV[nextQueue[0].type] * maMult)
              : baseCooldown)
        }
        if (playerManaSpent) updateBars()

        // ── Extra action slot tick ────────────────────────────────────────────
        {
          const activeSlots = activeExtraSlotCount()

          function fireExtraSlot(slotI: number, trigger: TriggerType, triggerTarget?: Entity): boolean {
            const slot = extraSlots[slotI]
            if (!slot?.actionId) return false
            const slotActionId = slot.actionId as ActionId
            const slotDef = getAction(slotActionId)
            if (playerEntity.currentMana < slotDef.manaCost) return false

            // Dependent triggers (crit/affliction) use the triggering entity directly and ignore range.
            // Independent triggers select a target and enforce range.
            // Note: do NOT check currentLife > 0 here, and do NOT use entities.includes() — the triggering
            // entity may have just been killed by the hit that fired the trigger (e.g. a lethal crit).
            // killEntity runs after the extra-slot tick, so the entity is always valid for this tick.
            const isDependent = trigger === 'crit' || trigger === 'affliction'
            let slotTarget: Entity
            if (isDependent && triggerTarget) {
              slotTarget = triggerTarget
            } else {
              const selected = selectPlayerTarget(entities)
              if (!selected) return false
              if (!isDependent) {
                // Enforce range including mastery range bonuses
                const baseRangeUnits = slotDef.selfTargeted ? (slotDef.area ?? 0) * (2 / 3) : slotDef.range
                let slotEffRange = baseRangeUnits * balance.player.radius
                if (slotDef.tags.includes('projectile')) { const pb = getProjectileBonuses(); slotEffRange *= (1 + pb.rangeIncrease / 100) * (1 + pb.rangeMore / 100) }
                if (slotDef.tags.includes('strike')) { const sb = getStrikeBonuses(); slotEffRange *= (1 + sb.rangeIncrease / 100) * (1 + sb.moreRange / 100) }
                if (slotDef.selfTargeted && slotDef.tags.includes('area')) { const ab = getAreaBonuses(); slotEffRange *= (1 + ab.sizeIncrease / 100) * (1 + ab.moreSize / 100) }
                const sdx = selected.x - playerEntity.x, sdy = selected.y - playerEntity.y
                if (Math.sqrt(sdx * sdx + sdy * sdy) > slotEffRange + selected.radius) return false
              }
              slotTarget = selected
            }

            playerEntity.currentMana = Math.max(0, playerEntity.currentMana - slotDef.manaCost)
            manaSpentThisTick += slotDef.manaCost

            const slotLevel = actionProgress[slotActionId]?.level ?? 1
            let slotDmg = slotDef.damage
              * Math.pow(balance.action.damageMult, slotLevel - 1)
              * (1 + (slotLevel - 1) * balance.action.damageAddPerLevel)

            // Compute native speed (for time-trigger speed-balance) and full effective speed (for dependent triggers).
            // Mirrors the same mastery pipeline as assignAction so all speed bonuses apply correctly.
            const leveledSpeed = slotDef.speed * (1 + (slotLevel - 1) * balance.action.speedBonusPerLevel)
            const slotAb = getActionBonuses()
            const slotRb = getRuneBonuses(slotActionId)
            let effectiveSlotSpeed = leveledSpeed * (1 + ascentCount * balance.ascent.actionSpeedPerAscent) * universeActionSpeedMult()
              * (1 + slotAb.actionSpeedIncrease / 100) * (1 + slotAb.moreActionSpeed / 100)
            if (slotDef.tags.includes('projectile')) effectiveSlotSpeed *= (1 + getProjectileBonuses().actionSpeedIncrease / 100)
            if (slotDef.tags.includes('strike')) { const sb = getStrikeBonuses(); effectiveSlotSpeed *= (1 + sb.actionSpeedIncrease / 100) * (1 + sb.moreActionSpeed / 100) }
            if (slotDef.tags.includes('lightning')) { const lb = getLightningBonuses(); effectiveSlotSpeed *= (1 + lb.actionSpeedIncrease / 100) * (1 + lb.moreActionSpeed / 100) }
            if (slotDef.tags.includes('fire')) effectiveSlotSpeed *= (1 + getFireBonuses().actionSpeedIncrease / 100)
            if (slotDef.tags.includes('cold')) effectiveSlotSpeed *= (1 + getColdBonuses().actionSpeedIncrease / 100)
            if (slotDef.tags.includes('physical')) effectiveSlotSpeed *= (1 + getPhysicalBonuses().actionSpeedIncrease / 100)
            if (slotDef.tags.includes('area')) effectiveSlotSpeed *= Math.max(0.01, 1 - getAreaBonuses().lessActionSpeed / 100)
            effectiveSlotSpeed *= (1 + slotRb.speedIncrease / 100) * slotRb.speedMore
            if (slotRb.slowHeavy) effectiveSlotSpeed *= 0.5
            { const mb = getManaBonuses(); if (mb.actionSpeedIncrease > 0) effectiveSlotSpeed *= (1 + mb.actionSpeedIncrease / 100) }

            // Speed-balance:
            //   Independent (time): use native speed only — action speed bonus shortens the interval instead.
            //   Fixed-frequency (crit/affliction/mana): use full effective speed — speed bonus increases damage since frequency is fixed.
            const speedForBalance = trigger === 'time' ? leveledSpeed : effectiveSlotSpeed
            slotDmg *= (balance.ascent.timeTriggerIntervalMs / 1000) * speedForBalance
            if (trigger === 'crit')       slotDmg *= balance.ascent.critTriggerDamageMult
            if (trigger === 'affliction') slotDmg *= balance.ascent.afflictionTriggerDamageMult
            slotDmg *= balance.transcend.slotDamagePenalties[slotI] ?? 1
            slotDmg *= (1 + slotAb.damageIncrease / 100) * (1 + slotAb.moreDamage / 100)
            if (slotDef.tags.includes('projectile')) { const b = getProjectileBonuses(); slotDmg *= (1 + b.damageIncrease / 100) * (1 + b.moreDamage / 100) }
            if (slotDef.tags.includes('strike')) { const b = getStrikeBonuses(); slotDmg *= (1 + b.damageIncrease / 100) * (1 + b.moreDamage / 100) }
            if (slotDef.tags.includes('lightning')) { const b = getLightningBonuses(); slotDmg *= (1 + b.damageIncrease / 100) * (1 + b.moreDamage / 100) }
            if (slotDef.tags.includes('fire')) { const b = getFireBonuses(); slotDmg *= (1 + b.damageIncrease / 100) * (1 + b.moreDamage / 100) }
            if (slotDef.tags.includes('cold')) { const b = getColdBonuses(); slotDmg *= (1 + b.damageIncrease / 100) * (1 + b.moreDamage / 100) }
            if (slotDef.tags.includes('physical')) { const b = getPhysicalBonuses(); slotDmg *= (1 + b.damageIncrease / 100) * (1 + b.moreDamage / 100) }
            if (slotDef.tags.includes('area')) { const b = getAreaBonuses(); slotDmg *= (1 + b.damageIncrease / 100) * (1 + b.moreDamage / 100) }
            slotDmg *= (1 + slotRb.damageIncrease / 100) * slotRb.damageMore
            if (slotRb.slowHeavy) slotDmg *= 2
            if (ascentCount > 0 || transcendCount > 0) slotDmg *= (1 + ascentCount * balance.ascent.damagePerAscent) * universeDamageMult() * transcendDamageMult()

            const slotPreHitDuration = (1000 / effectiveSlotSpeed) / 3

            // For dependent self-targeted area actions, the cast originates at the triggering entity.
            const areaOrigin = isDependent && triggerTarget && slotDef.selfTargeted ? triggerTarget : playerEntity
            const slotAreaVictims: Entity[] = []
            if (slotDef.tags.includes('area')) {
              const ab = getAreaBonuses()
              let areaRadiusPx = (slotDef.area ?? 0) * balance.player.radius
              areaRadiusPx *= (1 + ab.sizeIncrease / 100) * (1 + ab.moreSize / 100)
              const center = slotDef.selfTargeted ? areaOrigin : slotTarget
              for (const v of entities) {
                if (v.role !== 'enemy') continue
                const vdx = v.x - center.x, vdy = v.y - center.y
                if (Math.sqrt(vdx * vdx + vdy * vdy) - v.radius > areaRadiusPx) continue
                slotAreaVictims.push(v)
                pendingHits.set(`extra:${slotI}:${++hitSeq}`, {
                  attacker: playerEntity, target: v,
                  damage: slotDmg, action: slotDef, actionId: slotActionId,
                  countdown: slotPreHitDuration, guaranteedAfflictions: false,
                })
              }
              spawnAreaPreHitVfx(playerEntity, center, areaRadiusPx, slotDef, slotPreHitDuration)
            } else {
              pendingHits.set(`extra:${slotI}:${++hitSeq}`, {
                attacker: playerEntity, target: slotTarget,
                damage: slotDmg, action: slotDef, actionId: slotActionId,
                countdown: slotPreHitDuration, guaranteedAfflictions: false,
              })
              spawnPreHitVfx(playerEntity, slotTarget, slotDef, slotPreHitDuration)
            }

            // ── Multi-action rolling ──────────────────────────────────────────
            {
              const q = extraSlotMAQueues[slotI]
              const childInherited = 0.9
              const queueSlotMA = (type: MultiActionType, inherited: number, maTarget?: Entity): void => {
                if (q.length >= MAX_MULTI_QUEUE) return
                q.push({
                  type, inheritedDamageMult: inherited, slotDmg, slotDef, slotActionId, slotI, trigger,
                  target: maTarget, slotPreHitDuration,
                  // Snapshot the area centre so self-targeted MAs (doubleAction, splitAction, tremor)
                  // on dependent triggers fire at the triggering enemy's position, not the player.
                  areaOriginX: slotDef.selfTargeted ? areaOrigin.x : undefined,
                  areaOriginY: slotDef.selfTargeted ? areaOrigin.y : undefined,
                })
              }
              // doubleAction — on dependent triggers, inherit the trigger target so the MA fires at the
              // same enemy, not at selectPlayerTarget (which would be whatever is nearest the player).
              if (slotAb.doubleActionChance > 0 && Math.random() * 100 < slotAb.doubleActionChance) {
                queueSlotMA('doubleAction', childInherited, isDependent && !slotDef.selfTargeted ? slotTarget : undefined)
              }
              // additionalTarget (strike + projectile)
              {
                let totalAtChance = 0
                if (slotDef.tags.includes('strike')) {
                  const sb = getStrikeBonuses()
                  totalAtChance += sb.additionalTargetChance * (1 + sb.additionalTargetMore / 100)
                }
                if (slotDef.tags.includes('projectile')) totalAtChance += getProjectileBonuses().additionalTargetChance
                if (totalAtChance > 0 && Math.random() * 100 < totalAtChance) {
                  const extra = selectPlayerTarget(entities.filter(e => e !== slotTarget))
                  if (extra) queueSlotMA('additionalTarget', childInherited, extra)
                }
              }
              // additionalProjectile
              if (slotDef.tags.includes('projectile')) {
                const pb = getProjectileBonuses()
                if (pb.extraChance > 0 && Math.random() * 100 < pb.extraChance) {
                  const other = selectPlayerTarget(entities.filter(e => e !== slotTarget)) ?? slotTarget
                  queueSlotMA('additionalProjectile', childInherited, other)
                }
              }
              // splitAction (rune) — same target inheritance as doubleAction for dependent triggers
              if (slotRb.splitCast) queueSlotMA('splitAction', childInherited, isDependent && !slotDef.selfTargeted ? slotTarget : undefined)
              // jump (lightning)
              if (slotDef.tags.includes('lightning')) {
                const lb = getLightningBonuses()
                const jumpChance = lb.jumpChance
                  + (isElectrocuted(slotTarget) ? lb.jumpFromElectrocutedChance : 0)
                if (jumpChance > 0 && Math.random() * 100 < jumpChance) {
                  const jumped = new Set<string>([slotTarget.id])
                  const jumpRange = (slotDef.range * balance.player.radius + slotTarget.radius) * (1 + lb.jumpRangeIncrease / 100)
                  const jumpTarget = selectJumpTarget(slotTarget, jumped, jumpRange)
                  if (jumpTarget) queueSlotMA('jump', childInherited, jumpTarget)
                }
              }
              // tremor (area — roll for non-primary victims)
              if (slotDef.tags.includes('area') && slotAreaVictims.length > 1) {
                const tremorChance = getAreaBonuses().tremorChance
                if (tremorChance > 0) {
                  for (const v of slotAreaVictims) {
                    if (v === slotAreaVictims[0]) continue
                    if (Math.random() * 100 < tremorChance) queueSlotMA('tremor', childInherited, v)
                  }
                }
              }
              if (q.length > 0 && extraSlotMACooldowns[slotI] <= 0) {
                extraSlotMACooldowns[slotI] = slotPreHitDuration / MULTI_ACTION_COOLDOWN_DIV[q[0].type]
              }
            }

            awardXp(slotActionId, slotDmg)
            awardAscentXp(slotDmg)
            return true
          }

          let extraManaSpent = false

          // Time trigger: decrement timer (interval scaled by action speed bonus), fire on expiry
          for (let slotI = 0; slotI < activeSlots; slotI++) {
            const slot = extraSlots[slotI]
            if (!slot?.actionId || slot.triggerType !== 'time') continue
            // Compute the effective trigger interval, shortened by action speed bonuses (mirrors
            // the auto-attack: faster speed = more fires per second, same damage per fire).
            const tSlotDef = getAction(slot.actionId as ActionId)
            const tAb = getActionBonuses()
            const tRb = getRuneBonuses(slot.actionId as ActionId)
            let tSpeedMult = (1 + ascentCount * balance.ascent.actionSpeedPerAscent) * universeActionSpeedMult()
              * (1 + tAb.actionSpeedIncrease / 100) * (1 + tAb.moreActionSpeed / 100)
            if (tSlotDef.tags.includes('projectile')) tSpeedMult *= (1 + getProjectileBonuses().actionSpeedIncrease / 100)
            if (tSlotDef.tags.includes('strike')) { const sb = getStrikeBonuses(); tSpeedMult *= (1 + sb.actionSpeedIncrease / 100) * (1 + sb.moreActionSpeed / 100) }
            if (tSlotDef.tags.includes('lightning')) { const lb = getLightningBonuses(); tSpeedMult *= (1 + lb.actionSpeedIncrease / 100) * (1 + lb.moreActionSpeed / 100) }
            if (tSlotDef.tags.includes('fire')) tSpeedMult *= (1 + getFireBonuses().actionSpeedIncrease / 100)
            if (tSlotDef.tags.includes('cold')) tSpeedMult *= (1 + getColdBonuses().actionSpeedIncrease / 100)
            if (tSlotDef.tags.includes('physical')) tSpeedMult *= (1 + getPhysicalBonuses().actionSpeedIncrease / 100)
            if (tSlotDef.tags.includes('area')) tSpeedMult *= Math.max(0.01, 1 - getAreaBonuses().lessActionSpeed / 100)
            tSpeedMult *= (1 + tRb.speedIncrease / 100) * tRb.speedMore
            if (tRb.slowHeavy) tSpeedMult *= 0.5
            { const mb = getManaBonuses(); if (mb.actionSpeedIncrease > 0) tSpeedMult *= (1 + mb.actionSpeedIncrease / 100) }
            // Action speed bonus multiplier shortens the trigger interval
            const effectiveInterval = balance.ascent.timeTriggerIntervalMs / tSpeedMult
            const prev = extraSlotTimers[slotI] ?? effectiveInterval
            const next = prev - ticker.deltaMS
            extraSlotTimers[slotI] = next
            if (next > 0) continue
            extraSlotTimers[slotI] = effectiveInterval
            if (fireExtraSlot(slotI, 'time')) extraManaSpent = true
          }

          // Crit trigger: fire for the enemy that received the crit
          if (mainSlotCritTarget !== null) {
            for (let slotI = 0; slotI < activeSlots; slotI++) {
              const slot = extraSlots[slotI]
              if (!slot?.actionId || slot.triggerType !== 'crit') continue
              if (fireExtraSlot(slotI, 'crit', mainSlotCritTarget)) extraManaSpent = true
            }
          }

          // Affliction trigger: fire targeting the enemy that received the threshold-crossing affliction
          for (let slotI = 0; slotI < activeSlots; slotI++) {
            const slot = extraSlots[slotI]
            if (!slot?.actionId || slot.triggerType !== 'affliction') continue
            afflictionTriggerCounters[slotI] = (afflictionTriggerCounters[slotI] ?? 0) + afflictionAppliedThisTick
            if (afflictionTriggerCounters[slotI] >= balance.ascent.afflictionTriggerCount) {
              afflictionTriggerCounters[slotI] -= balance.ascent.afflictionTriggerCount
              if (fireExtraSlot(slotI, 'affliction', afflictionLastTarget ?? undefined)) extraManaSpent = true
            }
          }

          // Mana trigger: fire once per threshold of mana spent by the player (any slot).
          // Mana spent by the trigger's own cast lands in manaSpentThisTick and counts next tick.
          for (let slotI = 0; slotI < activeSlots; slotI++) {
            const slot = extraSlots[slotI]
            if (!slot?.actionId || slot.triggerType !== 'mana') continue
            manaTriggerCounters[slotI] = (manaTriggerCounters[slotI] ?? 0) + manaSpentThisTick
            if (manaTriggerCounters[slotI] >= balance.ascent.manaTriggerSpend) {
              manaTriggerCounters[slotI] -= balance.ascent.manaTriggerSpend
              if (fireExtraSlot(slotI, 'mana')) extraManaSpent = true
            }
          }
          manaSpentThisTick = 0

          if (extraManaSpent) updateBars()

          // ── Extra slot multi-action queue processing ──────────────────────
          for (let slotI = 0; slotI < 2; slotI++) {
            const maQueue = extraSlotMAQueues[slotI]
            if (maQueue.length === 0) continue
            extraSlotMACooldowns[slotI] -= ticker.deltaMS
            if (extraSlotMACooldowns[slotI] > 0) continue
            const ma = maQueue.shift()!
            // Validate target
            const maTarget = ma.target
              ? (entities.includes(ma.target) && ma.target.currentLife > 0 ? ma.target : selectPlayerTarget(entities))
              : selectPlayerTarget(entities)
            if (!maTarget) {
              if (maQueue.length > 0) extraSlotMACooldowns[slotI] = ma.slotPreHitDuration / MULTI_ACTION_COOLDOWN_DIV[maQueue[0].type]
              continue
            }
            // Compute type-specific damage multiplier
            let ownMult = 1.0
            if (ma.type === 'splitAction') ownMult = 0.5
            else if (ma.type === 'additionalProjectile') {
              const pb = getProjectileBonuses()
              ownMult = 0.5 * (1 + pb.extraDamage / 100)
            } else if (ma.type === 'jump') {
              const lb = getLightningBonuses()
              ownMult = Math.max(0, 1 - (balance.effects.jumpBaseDamagePenalty - lb.jumpDamagePenaltyReduce) / 100)
            } else if (ma.type === 'tremor') {
              ownMult = 0.5 * (1 + getAreaBonuses().tremorDamage / 100)
            }
            const maDmg = ma.slotDmg * ma.inheritedDamageMult * ownMult
            const maHitKey = `extra:${slotI}:ma:${++hitSeq}`
            if (ma.slotDef.tags.includes('area')) {
              const ab = getAreaBonuses()
              let areaRadiusPx = (ma.slotDef.area ?? 0) * balance.player.radius
              areaRadiusPx *= (1 + ab.sizeIncrease / 100) * (1 + ab.moreSize / 100)
              // For self-targeted area MAs on dependent triggers, use the snapshotted origin position
              // (recorded at queue time from the triggering entity's location). Falls back to playerEntity
              // for independent triggers or if no snapshot exists.
              const maCx = ma.slotDef.selfTargeted ? (ma.areaOriginX ?? playerEntity.x) : maTarget.x
              const maCy = ma.slotDef.selfTargeted ? (ma.areaOriginY ?? playerEntity.y) : maTarget.y
              for (const v of entities) {
                if (v.role !== 'enemy') continue
                const vdx = v.x - maCx, vdy = v.y - maCy
                if (Math.sqrt(vdx * vdx + vdy * vdy) - v.radius > areaRadiusPx) continue
                pendingHits.set(`${maHitKey}:${v.id}`, {
                  attacker: playerEntity, target: v,
                  damage: maDmg, action: ma.slotDef, actionId: ma.slotActionId,
                  countdown: ma.slotPreHitDuration, guaranteedAfflictions: false,
                  multiActionType: ma.type,
                  impactX: maCx, impactY: maCy,
                })
              }
              spawnAreaPreHitVfx(playerEntity, { x: maCx, y: maCy } as unknown as Entity, areaRadiusPx, ma.slotDef, ma.slotPreHitDuration)
            } else {
              pendingHits.set(maHitKey, {
                attacker: playerEntity, target: maTarget,
                damage: maDmg, action: ma.slotDef, actionId: ma.slotActionId,
                countdown: ma.slotPreHitDuration, guaranteedAfflictions: false,
                multiActionType: ma.type,
              })
              spawnPreHitVfx(playerEntity, maTarget, ma.slotDef, ma.slotPreHitDuration)
            }
            // Advance to next MA cooldown if more are queued
            if (maQueue.length > 0) {
              extraSlotMACooldowns[slotI] = ma.slotPreHitDuration / MULTI_ACTION_COOLDOWN_DIV[maQueue[0].type]
            }
          }
        }

        // ── Burning effect tick (registers burned entities for death pass) ─
        tickBurns(ticker.deltaMS, damagedIds)
        tickBleeds(ticker.deltaMS, damagedIds)
        tickBurnGrounds(ticker.deltaMS, damagedIds)
        tickElectrocutions(ticker.deltaMS)
        tickFrosts(ticker.deltaMS)
        tickFrozenArmor(ticker.deltaMS)
        tickBlockCooldowns(ticker.deltaMS)
        tickKnockbacks(ticker.deltaMS)
        tickElectrocuteEffects()
        tickFrostEffects()
        tickBurnEffects()
        tickBleedEffects()
        tickPoisonEffects()
        tickBurnGroundEffects()
        tickPoisons(ticker.deltaMS, damagedIds)
        tickGreenVeins(ticker.deltaMS)

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
    setGameplayActive(false)  // leaving the game scene → gameplay stopped
    stopRegen()
    if (!playerDead) persistState()
    clearInterval(saveInterval)
    clearInterval(stockpileUiInterval)
    clearInterval(dpsMeterInterval)
    clearInterval(masteryDotInterval)
    if (enemySpawnTimeout !== null) { clearTimeout(enemySpawnTimeout); enemySpawnTimeout = null }
    if (onVisibilityChange) { document.removeEventListener('visibilitychange', onVisibilityChange); onVisibilityChange = null }
    if (bgTicker) { bgTicker.dispose(); bgTicker = null }
    if (modalCleanup) { modalCleanup(); modalCleanup = null }
    unmountSettings()
    entityRigs.clear()
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

interface TriggerDef {
  type: TriggerType
  label: string
  description: string
  unlockHint: string
}

function getTriggerDefs(): TriggerDef[] {
  return [
    {
      type: 'time',
      label: t('game', 'triggerTime'),
      description: t('game', 'triggerTimeDesc'),
      unlockHint: '',
    },
    {
      type: 'crit',
      label: t('game', 'triggerCrit'),
      description: t('game', 'triggerCritDesc'),
      unlockHint: t('game', 'triggerCritLock'),
    },
    {
      type: 'affliction',
      label: t('game', 'triggerAffliction'),
      description: t('game', 'triggerAfflictionDesc'),
      unlockHint: t('game', 'triggerAfflictionLock'),
    },
    {
      type: 'mana',
      label: t('game', 'triggerMana'),
      description: t('game', 'triggerManaDesc'),
      unlockHint: '',
    },
  ]
}

// Confirmation gate for the manual die-and-rebirth button. Can be turned off
// via the "Confirm before manual death" setting (prefs.confirmManualDeath).
function mountDieConfirmModal(parent: HTMLElement, onConfirm: () => void): () => void {
  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop settings-submodal-backdrop'
  backdrop.innerHTML = `
    <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="die-confirm-title">
      <button class="modal-close-btn" data-action="close" aria-label="${t('settings', 'close')}"></button>
      <h2 class="modal-title" id="die-confirm-title">${t('game', 'dieConfirmTitle')}</h2>
      <p class="save-data-desc save-data-warning">${t('game', 'dieConfirmBody')}</p>
      <div class="modal-actions">
        <button class="modal-btn modal-btn--ghost" data-action="cancel" data-sfx="modal">${t('settings', 'cancel')}</button>
        <button class="modal-btn modal-btn--danger" data-action="confirm" data-sfx="modal">${t('game', 'dieConfirmYes')}</button>
      </div>
    </div>
  `
  playSound('modal.open')
  parent.appendChild(backdrop)

  const dismiss = (): void => { playSound('modal.close'); backdrop.remove() }
  backdrop.querySelector<HTMLButtonElement>('[data-action="close"]')!.addEventListener('click', dismiss)
  backdrop.querySelector<HTMLButtonElement>('[data-action="cancel"]')!.addEventListener('click', dismiss)
  backdrop.addEventListener('click', e => { if (e.target === backdrop) dismiss() })
  backdrop.querySelector<HTMLButtonElement>('[data-action="confirm"]')!.addEventListener('click', () => {
    playSound('modal.close')
    backdrop.remove()
    onConfirm()
  })

  return () => backdrop.remove()
}

function mountTriggerPickerModal(
  parent: HTMLElement,
  currentType: TriggerType | null,
  unlockedTriggers: ('crit' | 'affliction')[],
  onSelect: (type: TriggerType) => void,
  onClose: () => void,
): () => void {
  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop settings-submodal-backdrop'

  const panel = document.createElement('div')
  panel.className = 'modal-panel'
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-modal', 'true')
  panel.innerHTML = `
    <button class="modal-close-btn" data-action="close" aria-label="${t('settings', 'close')}"></button>
    <h2 class="modal-title">${t('game', 'actionTriggerTitle')}</h2>
    <div class="trigger-picker-options"></div>
  `

  const optionsEl = panel.querySelector<HTMLElement>('.trigger-picker-options')!
  for (const def of getTriggerDefs()) {
    const isUnlocked = def.type === 'time' || def.type === 'mana' || unlockedTriggers.includes(def.type as 'crit' | 'affliction')
    const isActive = def.type === currentType
    const btn = document.createElement('button')
    btn.className = 'trigger-picker-opt'
    btn.dataset.sfx = 'modal'  // selecting closes the modal → modal.close, not toggle
    if (!isUnlocked) btn.classList.add('trigger-picker-opt--locked')
    if (isActive) btn.classList.add('trigger-picker-opt--active')
    btn.disabled = !isUnlocked
    btn.innerHTML = `
      <span class="trigger-picker-opt-name">${def.label}</span>
      <span class="trigger-picker-opt-desc">${def.description}</span>
      ${!isUnlocked ? `<span class="trigger-picker-opt-unlock">🔒 ${def.unlockHint}</span>` : ''}
    `
    if (isUnlocked) {
      btn.addEventListener('click', () => {
        playSound('modal.close')
        backdrop.remove()
        onClose()
        onSelect(def.type)
      })
    }
    optionsEl.appendChild(btn)
  }

  const dismissTrigger = (): void => { playSound('modal.close'); backdrop.remove(); onClose() }
  panel.querySelector<HTMLButtonElement>('[data-action="close"]')!
    .addEventListener('click', dismissTrigger)

  backdrop.appendChild(panel)
  playSound('modal.open')
  parent.appendChild(backdrop)
  backdrop.addEventListener('click', e => { if (e.target === backdrop) dismissTrigger() })

  return () => backdrop.remove()
}

interface BattleConfigModalHooks {
  getActionXp: (actionId: string) => ActionThumbXp
  hasUnassignedRune: (actionId: string) => boolean
  openRunesModal: () => void
  openRunesModalForSlot: (actionId: string) => void
  getUnlockedTriggers: () => ('crit' | 'affliction')[]
}

function mountBattleConfigModal(
  parent: HTMLElement,
  currentActionId: ActionId,
  showCritChance: boolean,
  critBaseAdd: number,
  activeExtraSlotCount: number,
  currentExtraSlots: ExtraActionSlot[],
  hooks: BattleConfigModalHooks,
  onSelectAction: (id: ActionId) => void,
  onUpdateExtraSlot: (slotIndex: number, update: Partial<ExtraActionSlot>) => void,
  onClose: () => void,
): { cleanup: () => void; updateXp: () => void } {
  let selectedActionId = currentActionId

  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop'

  const panel = document.createElement('div')
  panel.className = 'modal-panel battle-config-panel'
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-modal', 'true')
  panel.innerHTML = `
    <button class="modal-close-btn" data-action="close" aria-label="${t('settings', 'close')}"></button>
    <h2 class="modal-title">${t('game', 'triggersTitle')}</h2>
    <div class="trigger-list"></div>
  `

  const triggerList = panel.querySelector<HTMLElement>('.trigger-list')!

  function renderTriggerCard(): void {
    triggerList.innerHTML = ''

    // ── Slot 1: Auto attack ───────────────────────────────────────────────
    const wrap = document.createElement('div')
    wrap.className = 'action-trigger-wrap'

    const title = document.createElement('div')
    title.className = 'action-trigger-title'
    title.textContent = t('game', 'triggerAutoAction')
    wrap.appendChild(title)

    const row = document.createElement('div')
    row.className = 'action-trigger-row'

    const card = document.createElement('button')
    card.className = 'action-trigger-card'
    card.dataset.sfx = 'modal'
    card.appendChild(buildActionThumbnail(
      getAction(selectedActionId), false, showCritChance, critBaseAdd, hooks.getActionXp(selectedActionId),
    ))
    row.appendChild(card)

    const runeBtn = document.createElement('button')
    runeBtn.className = 'action-trigger-rune-btn'
    runeBtn.setAttribute('aria-label', t('rune', 'runesAriaLabel'))
    runeBtn.dataset.sfx = 'modal'
    runeBtn.innerHTML = '<i data-lucide="sparkles" aria-hidden="true"></i><span class="notif-dot rune-notif-dot" hidden></span>'
    row.appendChild(runeBtn)

    wrap.appendChild(row)
    triggerList.appendChild(wrap)

    card.addEventListener('click', () => {
      mountActionPickerModal(
        parent, allActions, selectedActionId,
        (id) => { selectedActionId = id as ActionId; onSelectAction(id as ActionId); renderTriggerCard() },
        () => {},
        showCritChance, critBaseAdd,
      )
    })
    runeBtn.addEventListener('click', e => { e.stopPropagation(); hooks.openRunesModal() })

    // ── Extra slots (slot 2 / slot 3) ─────────────────────────────────────
    const SLOT_PENALTIES = balance.transcend.slotDamagePenalties
    const TRIGGER_LABELS: Record<TriggerType, string> = {
      time:       t('game', 'triggerTime'),
      crit:       t('game', 'triggerCrit'),
      affliction: t('game', 'triggerAffliction'),
      mana:       t('game', 'triggerMana'),
    }

    function openTriggerPicker(slotIdx: number): void {
      const slot = currentExtraSlots[slotIdx] ?? { actionId: null, triggerType: null }
      const unlocked = hooks.getUnlockedTriggers()
      mountTriggerPickerModal(
        parent,
        slot.triggerType,
        unlocked,
        (type) => {
          currentExtraSlots[slotIdx] = { ...currentExtraSlots[slotIdx], triggerType: type }
          onUpdateExtraSlot(slotIdx, { triggerType: type })
          renderTriggerCard()
        },
        () => {},
      )
    }

    for (let i = 0; i < activeExtraSlotCount; i++) {
      const slot = currentExtraSlots[i] ?? { actionId: null, triggerType: null }
      const penalty = SLOT_PENALTIES[i]

      const extraWrap = document.createElement('div')
      extraWrap.className = 'action-trigger-wrap action-trigger-wrap--extra'

      if (!slot.triggerType) {
        // Newly unlocked — show "Select action trigger" button
        const selectBtn = document.createElement('button')
        selectBtn.className = 'action-trigger-select-btn'
        selectBtn.dataset.sfx = 'modal'
        selectBtn.textContent = t('game', 'selectActionTrigger')
        selectBtn.addEventListener('click', () => openTriggerPicker(i))
        extraWrap.appendChild(selectBtn)
      } else {
        // Trigger type chosen — show same layout as auto-attack slot
        const titleBtn = document.createElement('button')
        titleBtn.className = 'action-trigger-title'
        titleBtn.dataset.sfx = 'modal'
        titleBtn.innerHTML = `${TRIGGER_LABELS[slot.triggerType]}<span class="action-trigger-penalty">×${penalty}</span>`
        titleBtn.addEventListener('click', () => openTriggerPicker(i))
        extraWrap.appendChild(titleBtn)

        const extraRow = document.createElement('div')
        extraRow.className = 'action-trigger-row'

        const extraCard = document.createElement('button')
        extraCard.className = 'action-trigger-card'
        extraCard.dataset.sfx = 'modal'
        if (slot.actionId) {
          extraCard.appendChild(buildActionThumbnail(
            getAction(slot.actionId as ActionId), false, showCritChance, critBaseAdd,
            hooks.getActionXp(slot.actionId),
          ))
        } else {
          const empty = document.createElement('div')
          empty.className = 'action-trigger-empty'
          extraCard.appendChild(empty)
        }
        extraCard.addEventListener('click', () => {
          const fallbackId = (slot.actionId as ActionId | null) ?? allActions[0].id as ActionId
          mountActionPickerModal(
            parent, allActions, fallbackId,
            (id) => {
              currentExtraSlots[i] = { ...currentExtraSlots[i], actionId: id as string }
              onUpdateExtraSlot(i, { actionId: id as string })
              renderTriggerCard()
            },
            () => {},
            showCritChance, critBaseAdd,
          )
        })
        extraRow.appendChild(extraCard)

        if (slot.actionId) {
          const extraRuneBtn = document.createElement('button')
          extraRuneBtn.className = 'action-trigger-rune-btn'
          extraRuneBtn.setAttribute('aria-label', 'Runes')
          extraRuneBtn.dataset.sfx = 'modal'
          extraRuneBtn.innerHTML = '<i data-lucide="sparkles" aria-hidden="true"></i><span class="notif-dot rune-notif-dot" hidden></span>'
          const extraDot = extraRuneBtn.querySelector<HTMLElement>('.rune-notif-dot')!
          extraDot.hidden = !hooks.hasUnassignedRune(slot.actionId)
          extraRuneBtn.addEventListener('click', e => {
            e.stopPropagation()
            hooks.openRunesModalForSlot(slot.actionId as string)
          })
          extraRow.appendChild(extraRuneBtn)
        }

        extraWrap.appendChild(extraRow)
      }

      triggerList.appendChild(extraWrap)
    }

    // Reflect rune-dot state for the in-modal rune button.
    const modalDot = runeBtn.querySelector<HTMLElement>('.rune-notif-dot')
    if (modalDot) modalDot.hidden = !hooks.hasUnassignedRune(selectedActionId)

    refreshActionThumbnailIcons()
  }

  function updateXp(): void {
    // Live-update the XP fill widths and level labels without redrawing the
    // whole modal (which would churn icon createIcons() and lose focus).
    const cards = triggerList.querySelectorAll<HTMLElement>('.action-trigger-card')
    const ids: (string | null)[] = [selectedActionId]
    for (let i = 0; i < activeExtraSlotCount; i++) ids.push(currentExtraSlots[i]?.actionId ?? null)
    cards.forEach((cardEl, idx) => {
      const actionId = ids[idx]
      if (!actionId) return
      const x = hooks.getActionXp(actionId)
      const pct = Math.min(100, Math.round(x.xp / Math.max(1, x.xpNeeded) * 100))
      const fill = cardEl.querySelector<HTMLElement>('.action-thumb-xp-fill')
      const lbl  = cardEl.querySelector<HTMLElement>('.action-thumb-xp-label')
      if (fill) fill.style.width = `${pct}%`
      if (lbl)  lbl.textContent = `Lv.${x.level}`
    })
  }

  const dismiss = () => { playSound('modal.close'); backdrop.remove(); onClose() }
  panel.querySelector<HTMLButtonElement>('[data-action="close"]')!
    .addEventListener('click', dismiss)

  backdrop.appendChild(panel)
  backdrop.addEventListener('click', e => { if (e.target === backdrop) dismiss() })

  playSound('modal.open')
  parent.appendChild(backdrop)
  renderTriggerCard()
  return { cleanup: () => backdrop.remove(), updateXp }
}

function actionXpNeeded(level: number): number {
  return Math.round(balance.action.xpPerLevel * Math.pow(balance.action.xpGrowth, level - 1))
}

function statXpNeeded(level: number): number {
  return Math.round(balance.stat.xpPerLevel * Math.pow(balance.stat.xpGrowth, level - 1))
}

// Per-level cost multiplier for reaching `level`: base xpGrowth, softened to
// the tier value at and after each tier's fromLevel (e.g. 1.4× from level 30).
function enemyMaxLevelGrowthAt(level: number): number {
  let growth: number = balance.enemyLevel.xpGrowth
  for (const tier of balance.enemyLevel.xpGrowthTiers) {
    if (level >= tier.fromLevel) growth = tier.growth
  }
  return growth
}

function enemyMaxLevelXpNeeded(maxLevel: number): number {
  let base = balance.enemyLevel.xpPerMaxLevel
  for (let level = 2; level <= maxLevel; level++) base *= enemyMaxLevelGrowthAt(level)
  const divider = balance.enemyLevel.xpDividerBase + balance.enemyLevel.xpDividerPerLevel * (maxLevel - 1)
  return Math.round(base / divider)
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

// Layout item: offset and size relative to one grid square (gs = 1 unit).
interface TreeSprite { ox: number; oy: number; w: number; h: number; sdx: number; sdy: number }

// Deterministically pick a multi-tree layout for a tree tile.
// Returns 1–3 items, each describing one sprite relative to (tx*gs, ty*gs).
// sdx/sdy are secondary hash seeds so each sprite in a multi-tree tile picks a
// different texture.
function pickTreeLayout(tx: number, ty: number, gs: number): TreeSprite[] {
  // Use a secondary hash (shifted seed) for layout selection
  const ux = tx >= 0 ? tx * 2 : -tx * 2 - 1
  const uy = ty >= 0 ? ty * 2 : -ty * 2 - 1
  let s = ((Math.imul(ux ^ 0xdeadbeef, 73856093) ^ Math.imul(uy ^ 0xcafef00d, 19349663)) >>> 0) || 1
  s = (Math.imul(s ^ (s >>> 15), s | 1) ^ (s + Math.imul(s ^ (s >>> 7), s | 61))) >>> 0
  const r = s / 0x100000000

  if (r < 0.20) {
    // Single normal tree
    return [{ ox: 0, oy: 0, w: gs, h: gs, sdx: 0, sdy: 0 }]
  } else if (r < 0.35) {
    // Single large tree (overflows top)
    return [{ ox: -0.15 * gs, oy: -0.30 * gs, w: 1.30 * gs, h: 1.30 * gs, sdx: 0, sdy: 0 }]
  } else if (r < 0.45) {
    // Single extra-large tree
    return [{ ox: -0.25 * gs, oy: -0.50 * gs, w: 1.50 * gs, h: 1.50 * gs, sdx: 0, sdy: 0 }]
  } else if (r < 0.72) {
    // Two trees: back-left (slightly larger) + front-right (slightly smaller)
    return [
      { ox: -0.10 * gs, oy: -0.20 * gs, w: 1.15 * gs, h: 1.15 * gs, sdx: 0, sdy: 0 },
      { ox:  0.30 * gs, oy:  0.10 * gs, w: 0.75 * gs, h: 0.75 * gs, sdx: 1, sdy: 0 },
    ]
  } else if (r < 0.90) {
    // Large + small side-by-side
    return [
      { ox: -0.20 * gs, oy: -0.35 * gs, w: 1.20 * gs, h: 1.20 * gs, sdx: 0, sdy: 0 },
      { ox:  0.55 * gs, oy:  0.05 * gs, w: 0.65 * gs, h: 0.65 * gs, sdx: 0, sdy: 1 },
    ]
  } else {
    // Three small trees
    return [
      { ox: -0.05 * gs, oy: -0.10 * gs, w: 0.80 * gs, h: 0.80 * gs, sdx: 0, sdy: 0 },
      { ox:  0.55 * gs, oy: -0.05 * gs, w: 0.70 * gs, h: 0.70 * gs, sdx: 1, sdy: 0 },
      { ox:  0.20 * gs, oy:  0.25 * gs, w: 0.65 * gs, h: 0.65 * gs, sdx: 0, sdy: 1 },
    ]
  }
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
