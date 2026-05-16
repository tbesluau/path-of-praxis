/**
 * Game balance configuration — edit freely to tune gameplay.
 *
 * Units are noted inline. actionRange is expressed in "range units"
 * where 1 unit = player radius, so 1 = melee (touching), 2 = twice
 * that reach, etc.
 */
export const balance = {

  // ── Player ──────────────────────────────────────────────────────────────
  player: {
    radius:        20,   // pixels
    moveSpeed:    120,   // pixels per second
    maxLife:       100,
    maxMana:       100,
    startingLife:  100,  // on new character creation and after rebirth
    startingMana:  100,
    regenRate:     0.01, // fraction of max life/mana recovered per second
    // action stats are defined per-action in src/config/weapons.ts and spells.ts
  },

  // ── Enemy teams ─────────────────────────────────────────────────────────
  enemyA: {
    radius:           20,   // pixels
    moveSpeed:        60,   // pixels per second
    maxLife:          50,
    damageMultiplier: 0.5,  // applied on top of the action's base damage
  },

  enemyB: {
    radius:           20,   // pixels
    moveSpeed:        60,   // pixels per second
    maxLife:          50,
    damageMultiplier: 0.5,
  },

  // ── Enemy waves ─────────────────────────────────────────────────────────
  wave: {
    spawnDelay:        2000, // ms delay for intro spawns (new char, flee, rebirth, continue)
    clusterSpread:      0.15, // total angular span (radians) of each enemy cluster
    directionStdDev:   Math.PI / 12, // gaussian σ (rad) of next wave's angle vs the previous one
    spawnMargin:        315, // px beyond screen edge enemies appear
    spawnDepthVariance:  90, // additional random px beyond spawnMargin
    nextWaveThreshold:    0, // spawn next wave when live enemy count reaches this
    // +1 extra enemy: 15% chance; +2 extra enemies: 5% chance (independent rolls)
    extraOneChance:    0.15,
    extraTwoChance:    0.05,
  },

  // ── Per-enemy stat variance ───────────────────────────────────────────────
  enemyVariance: {
    lifeMin:   0.8,  lifeMax:   1.2,  // normal life multiplier range
    damageMin: 0.8,  damageMax: 1.2,  // normal damage multiplier range
    strongChance:    0.10,             // probability of spawning as "strong"
    strongLifeMin:   1.0,  strongLifeMax:   1.8,
    strongDamageMin: 1.0,  strongDamageMax: 1.8,
    strongSpeedMult: 1.2,
    strongXpMultiplier: 2,            // XP multiplier for action/life/mana XP from strong enemies
    eliteChance:        0,             // probability that a strong enemy is upgraded to "elite" (mastery-only)
    eliteLifeMin:    1.5,  eliteLifeMax:   2.5,
    eliteDamageMin:  1.5,  eliteDamageMax: 2.5,
    eliteSpeedMult:  1.2,             // applied to BOTH attack speed AND move speed
    eliteXpMultiplier:  3,
    normalResistMin:  0,  normalResistMax: 20,  // % resist range for normal enemies (physRot and ele rolled separately)
    strongResistMin: 10,  strongResistMax: 40,  // % resist range for strong enemies
    eliteResistMin:  25,  eliteResistMax:  50,  // % resist range for elite enemies
    highResistThreshold: 40,                    // enemies at or above this value on either resist show a shield icon
  },

  // ── Death animation ──────────────────────────────────────────────────────
  death: {
    fragmentCount:    8,   // shards per entity
    fragmentLifetime: 750, // ms (each shard has ±300 ms variance on top)
  },

  // ── Buffs / Debuffs ──────────────────────────────────────────────────────
  buffs: {
    tranceDurationMs:        3000, // how long trance lasts after each trigger
    feedingFrenzyDurationMs: 5000, // how long Feeding Frenzy lasts after each trigger
    feedingFrenzyStealBonus:   20, // additive % to life/mana steal while active
    feedingFrenzyRegenBonus:   20, // additive % to life/mana regen while active
    frenzyDurationMs:        3000, // how long each Frenzy stack window lasts (refreshed on re-gain)
    frenzyMaxCharges:          10, // maximum Frenzy charges (raised to 20 by mastery final node)
    bloodlustDurationMs:     4000, // how long Bloodlust lasts after each trigger
    electrifiedDurationMs:   4000, // how long Electrified lasts after each trigger
    knockbackDurationMs:      200, // how long the knockback velocity impulse lasts
    knockbackSlowDurationMs: 2000, // how long the post-knockback move speed slow lasts
    knockbackDamageReductionDurationMs: 2000, // how long knocked-back enemies deal reduced damage
  },

  // ── Damage-type effects (burning, bleeding, electrocuted, ...) ───────────
  effects: {
    baseApplyChance:        5,    // % baseline chance to inflict an effect on hit
    burnDpsFraction:        0.20, // burn dps = hit damage * this
    burnBaseDurationMs:     5000, // base burn duration
    burnSplashRadius:       100,  // px radius for major-node splash to non-burning neighbors
    burnDisplayIntervalMs:  500,  // ms between accumulated burn-damage number emissions
    burnGroundBaseDurationMs: 4000, // base burning ground duration (extended only by Burning Ground tree strong node)
    immolationSelfBurnCapFraction: 0.04, // max immolation self-burn DPS as fraction of max life/s (reduced by immolateDamageMult nodes)
    bleedDpsFraction:       0.25, // bleed dps = hit damage * this
    bleedBaseDurationMs:    2000, // base bleed duration
    bleedStackIncreasePerProc: 20, // % additive increase to baseDps when a weaker proc hits a bleeding enemy
    bleedDisplayIntervalMs: 500,  // ms between accumulated bleed-damage number emissions
    electrocutionBaseDamageTakenPct: 10,   // base % additional damage taken while electrocuted
    electrocutionBaseDurationMs:     3000, // base electrocution duration
    jumpBaseDamagePenalty:           40,   // % damage penalty on jump hits (40 = ×0.6 damage; reduced by mastery)
  },

  // ── World ────────────────────────────────────────────────────────────────
  world: {
    gridSize: 64,  // pixels per grid cell
    map: {
      chunkSize:       16,    // tiles per chunk side
      forgetRange:      3,    // chunks beyond this Chebyshev distance are forgotten (~2× spawn dist)
      blockedDensity: 1.00,   // probability of placing an obstacle at each placement-grid point
      placementGrid:    7,    // tiles between obstacle placement centres
      wallLengthMin:    3,    // min wall segment length in tiles
      wallLengthMax:    4,    // max wall segment length (≤ placementGrid−3 keeps corridors ≥3 tiles wide)
      scatterDensity: 0.12,  // probability of placing a 1×1 scatter tile where ≥3 cardinal tiles are free
    },
  },

  // ── Action XP ────────────────────────────────────────────────────────────
  action: {
    xpPerLevel:             100,  // XP required for level 1 → 2
    xpGrowth:               1.4,  // each subsequent level costs xpGrowth× the previous
    damageMult:             1.1,  // multiplicative damage bonus per level (1.1^(level-1))
    damageAddPerLevel:      0.20, // additive damage bonus per level above 1 (stacks on top of mult)
    speedBonusPerLevel:     0.01, // additive attack-speed bonus per level above 1
  },

  // ── Stat XP (life / mana leveling) ──────────────────────────────────────
  stat: {
    xpPerLevel:         100,   // XP required for level 1 → 2
    xpGrowth:           1.2,   // each subsequent level costs xpGrowth× the previous
    bonusPerLevel:      0.10,  // non-multiplicative +10% of base per level above 1
    lifeXpFromDamage:     4,   // multiplier on life XP earned from taking damage
    manaXpMultiplier:     2,   // multiplier on mana XP earned per mana point spent
  },

  // ── Mastery leveling ──────────────────────────────────────────────────────
  mastery: {
    xpPerLevel:         1000, // XP required for mastery level 1 → 2
    xpGrowth:           1.5,  // each subsequent level costs xpGrowth× the previous
    actionXpMultiplier: 0.2,  // fraction of run action XP that feeds tag masteries
    levelsPerRebirth:   5,    // max mastery levels gained per rebirth
  },

  // ── Enemy leveling ────────────────────────────────────────────────────────
  enemyLevel: {
    xpPerMaxLevel:      1000, // XP required for max-level 1 → 2
    xpGrowth:           1.5,  // each subsequent max-level costs xpGrowth× the previous
    lifeMultiplier:      1.2, // multiplicative per-level bonus on enemy life
    damageMultiplier:    1.1, // multiplicative per-level bonus on enemy damage
    lifeAddPerLevel:     0.30, // additive life bonus per level above 1, stacks on top of lifeMultiplier
    speedAddPerLevel:    0.025, // additive move-speed bonus per level above 1
    xpMultiplierPerLevel: 1.1, // per-enemy-level XP multiplier: 1.1^(level-1) applied to action/life/mana XP
  },

  // ── Ascension ─────────────────────────────────────────────────────────────
  ascent: {
    requiredEnemyLevelBase: 30,   // first ascension needs enemy maxLevel ≥ 30
    requiredLevelStep:       5,   // each subsequent ascension raises the requirement by 5
    xpMultiplier:            5,   // ascent bar = xpMultiplier × enemy max-level XP at required level
    damagePerAscent:        0.10, // +10% damage per ascent count (additive, independent multiplier)
    xpGainPerAscent:        0.10, // +10% all XP per ascent count
    actionSpeedPerAscent:   0.05, // +5% action speed per ascent count
    moveSpeedPerAscent:     0.05, // +5% move speed per ascent count
    universePointMaxA:      10,
    universePointMaxB:      10,
  },

} as const
