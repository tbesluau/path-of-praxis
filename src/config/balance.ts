/**
 * Game balance configuration — edit freely to tune gameplay.
 *
 * Units are noted inline. attackRange is expressed in "range units"
 * where 1 unit = player radius, so 1 = melee (touching), 2 = twice
 * that reach, etc.
 */
export const balance = {

  // ── Player ──────────────────────────────────────────────────────────────
  player: {
    radius:        20,   // pixels
    moveSpeed:     80,   // pixels per second
    maxLife:       100,
    maxMana:       100,
    startingLife:  100,  // on new character creation and after rebirth
    startingMana:  100,
    regenRate:     0.01, // fraction of max life/mana recovered per second
    // attack stats are defined per-action in src/config/weapons.ts and spells.ts
  },

  // ── Enemy teams ─────────────────────────────────────────────────────────
  enemyA: {
    radius:           20,   // pixels
    moveSpeed:        40,   // pixels per second
    maxLife:          50,
    damageMultiplier: 0.5,  // applied on top of the action's base damage
  },

  enemyB: {
    radius:           20,   // pixels
    moveSpeed:        40,   // pixels per second
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
  },

  // ── Damage-type effects (burning, bleeding, electrocuted, ...) ───────────
  effects: {
    baseApplyChance:        5,    // % baseline chance to inflict an effect on hit
    burnDpsFraction:        0.20, // burn dps = hit damage * this
    burnBaseDurationMs:     5000, // base burn duration
    burnSplashRadius:       100,  // px radius for major-node splash to non-burning neighbors
    burnDisplayIntervalMs:  500,  // ms between accumulated burn-damage number emissions
    bleedDpsFraction:       0.20, // bleed dps = hit damage * this
    bleedBaseDurationMs:    5000, // base bleed duration
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
  },

  // ── Enemy leveling ────────────────────────────────────────────────────────
  enemyLevel: {
    xpPerMaxLevel:      1000, // XP required for max-level 1 → 2
    xpGrowth:           1.5,  // each subsequent max-level costs xpGrowth× the previous
    lifeMultiplier:      1.2, // multiplicative per-level bonus on enemy life
    damageMultiplier:    1.1, // multiplicative per-level bonus on enemy damage
    lifeAddPerLevel:     0.10, // additive life bonus per level above 1, stacks on top of lifeMultiplier
    speedAddPerLevel:    0.025, // additive move-speed bonus per level above 1
    xpMultiplierPerLevel: 1.1, // per-enemy-level XP multiplier: 1.1^(level-1) applied to action/life/mana XP
  },

} as const
