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
    maxLife:          60,
    damageMultiplier: 0.5,  // applied on top of the action's base damage
  },

  enemyB: {
    radius:           20,   // pixels
    moveSpeed:        60,   // pixels per second
    maxLife:          60,
    damageMultiplier: 0.5,
  },

  // ── Enemy waves ─────────────────────────────────────────────────────────
  wave: {
    spawnDelay:        2000, // ms delay for intro spawns (new char, flee, rebirth, continue)
    clusterSpread:      0.15, // total angular span (radians) of each enemy cluster
    directionStdDev:   Math.PI / 12, // gaussian σ (rad) of next wave's angle vs the previous one
    maxDirectionShift: Math.PI / 9,  // hard cap (rad) on per-wave angle delta (~20°); prevents enemies from coming from all around
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
    strongSizeMult:  1.07,            // strong enemies are 7% larger than normal
    strongXpMultiplier: 2,            // XP multiplier for action/life/mana XP from strong enemies
    eliteChance:        0,             // probability that a strong enemy is upgraded to "elite" (mastery-only)
    eliteLifeMin:    1.5,  eliteLifeMax:   2.5,
    eliteDamageMin:  1.5,  eliteDamageMax: 2.5,
    eliteSpeedMult:  1.2,             // applied to BOTH attack speed AND move speed
    eliteSizeMult:   1.15,            // elite enemies are 15% larger than normal
    eliteXpMultiplier:  3,
    championChance:     0,             // probability that an elite is upgraded to "champion" (mastery-only, requires 2 ascensions)
    championLifeMin:    3,   championLifeMax:    5,
    championDamageMin:  3,   championDamageMax:  5,
    championResistMin: 40,   championResistMax:  70,
    championActionSpeedMult: 2,
    championXpMultiplier: 5,
    championSizeMult:   1.25,         // champion enemies are 25% larger than normal
    bossChance:         0,             // probability that a champion is upgraded to "boss" (mastery-only)
    bossLifeMin:       48,   bossLifeMax:       60,
    bossDamageMin:     12,   bossDamageMax:     15,
    bossResistMin:     80,   bossResistMax:     90,
    bossActionSpeedMult: 2,
    bossXpMultiplier:  10,
    bossSizeMult:       1.5,
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
    enemyAfflictionChanceMult:   0.5, // enemies inflict afflictions on the player at half base chance
    enemyAfflictionDurationMult: 0.5, // and the resulting stacks/timers last half as long
    burnDpsFraction:        0.40, // burn dps = hit damage * this
    burnBaseDurationMs:     5000, // base burn duration
    burnSplashRadius:       100,  // px radius for major-node splash to non-burning neighbors
    burnDisplayIntervalMs:  500,  // ms between accumulated burn-damage number emissions
    burnGroundBaseDurationMs: 4000, // base burning ground duration (extended only by Burning Ground tree strong node)
    immolationSelfBurnCapFraction: 0.04, // max immolation self-burn DPS as fraction of max life/s (reduced by immolateDamageMult nodes)
    bleedDpsFraction:       0.50, // bleed dps = hit damage * this
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
    xpPerLevel:                  1000, // XP required for mastery level 1 → 2
    xpGrowth:                    1.5,  // each subsequent level costs xpGrowth× the previous
    lifeManaMasteryXpGrowth:     1.20, // slower growth for life/mana masteries (lvl-20 cost ≈ current lvl-15 cost)
    movementMasteryXpAddPerLevel: 0.20, // additive +20% of base XP per level for movement mastery (linear, not exponential)
    actionXpMultiplier:          0.2,  // fraction of run action XP that feeds tag masteries
    movementXpMult:              3,    // flat multiplier on movement mastery XP at rebirth
    // Soft cap: run XP buys less the further you climb in one rebirth. Each level
    // gained beyond the committed (last-rebirth) level taxes incoming XP by an
    // extra (1 + penalty) factor — the Nth unearned level needs (1+penalty)^N raw
    // XP per natural point. Rebirth commits the current level, resetting the tax.
    // penalty=1.0 → tax doubles per level: ÷2 for 1st, ÷4 for 2nd, ÷8 for 3rd…
    unearnedLevelXpPenalty:      1.0,
  },

  // ── Enemy leveling ────────────────────────────────────────────────────────
  enemyLevel: {
    xpPerMaxLevel:      1000, // XP required for max-level 1 → 2
    xpGrowth:           1.5,  // each subsequent max-level costs xpGrowth× the previous
    // Growth softens at higher levels: from each threshold level onward, the
    // per-level cost multiplier drops to the given value (divider unchanged).
    xpGrowthTiers:      [
      { fromLevel: 30, growth: 1.4 },
      { fromLevel: 40, growth: 1.3 },
      { fromLevel: 50, growth: 1.2 },
    ],
    xpDividerBase:      0.5,  // divider at level 1 → 2× XP cost; increases xpDividerPerLevel per level
    xpDividerPerLevel:  0.02, // +0.02 per level → divider reaches 1.0 at level 26 (unchanged), >1 above
    lifeMultiplier:      1.229, // multiplicative per-level bonus on enemy life (~2× at lv30 vs 1.2)
    damageMultiplier:    1.1266, // multiplicative per-level bonus on enemy damage (~2× at lv30 vs 1.1)
    lifeAddPerLevel:     0.30, // additive life bonus per level above 1, stacks on top of lifeMultiplier
    speedAddPerLevel:    0.01, // additive move-speed bonus per level above 1 (40% faster at lv41)
    rangeAreaAddPerLevel: 0.005, // additive +0.5% range and area size per enemy level above 1
    xpMultiplierPerLevel: 1.1, // per-enemy-level XP multiplier: 1.1^(level-1) applied to action/life/mana XP
  },

  // ── Ascension ─────────────────────────────────────────────────────────────
  ascent: {
    requiredEnemyLevelBase: 30,   // first ascension needs enemy maxLevel ≥ 30
    requiredLevelStep:       5,   // each subsequent ascension raises the requirement by 5
    xpMultiplier:           10,   // ascent bar = xpMultiplier × enemy max-level XP at required level
    damagePerAscent:        0.10, // +10% damage per ascent count (additive, independent multiplier)
    xpGainPerAscent:        0.10, // +10% all XP per ascent count
    actionSpeedPerAscent:   0.05, // +5% action speed per ascent count
    moveSpeedPerAscent:     0.05, // +5% move speed per ascent count
    universePointMaxA:      10,
    universePointMaxB:      10,
    freeMasteryPointsUnlockAscent: 4,  // ascentCount at which free mastery points are earned (1 per ascent)
    slot2UnlockAscent:       3,    // ascentCount required for 2nd action trigger slot
    slot3UnlockAscent:       6,    // ascentCount required for 3rd action trigger slot
    slot2DamagePenalty:      0.75,  // global damage multiplier for slot 2
    slot3DamagePenalty:      0.50,  // global damage multiplier for slot 3
    artifactSlot1UnlockAscent: 5,   // ascentCount required for 1st artifact equip slot
    artifactSlot2UnlockAscent: 10,  // ascentCount required for 2nd artifact equip slot
    timeTriggerIntervalMs:  2000,   // fire period (ms) for the time trigger type
    critTriggerDamageMult:        0.1,   // extra multiplier for crit trigger (on top of speed balance)
    afflictionTriggerDamageMult:  0.5,   // extra multiplier for affliction trigger (on top of speed balance)
    afflictionTriggerCount:        10,   // affliction applications before affliction trigger fires
    manaTriggerSpend:             100,   // mana the player must spend before the mana trigger fires
    poisonBaseDurationMs:         10000, // base poison duration (10 s)
    poisonBaseDamagePct:          20,    // poison dps = hit damage × 0.20 (half of burn)
    poisonDisplayIntervalMs:      500,   // ms between accumulated poison-damage number emissions
    greenVeinsBaseDurationMs:     10000, // how long Green Veins buff lasts after each trigger (10 s)
    greenVeinsMaxStacks:          25,    // default maximum Green Vein stacks (major node adds 25 more → 50 total)
    greenVeinsPoisonsPerStack:    100,   // poison applications needed to gain 1 Green Vein stack
  },

  // ── Frost affliction ──────────────────────────────────────────────────────
  frost: {
    baseDurationMs:     1000,  // frost lasts 1 s; no refresh while active (immune)
    baseMoveSlowPct:    20,    // enemy move speed reduction while frosted
    baseActionSlowPct:  20,    // enemy action speed reduction while frosted
    baseFrostChancePct: 5,     // base frost apply chance before mastery bonuses
  },

  // ── Shatter (on frosted-enemy death) ──────────────────────────────────────
  shatter: {
    damageBaseFraction: 0.05,  // cold damage = frosted enemy maxLife × this fraction
    rangeUnits:         3,     // explosion radius in game units
  },

  // ── Frozen Armor (player buff from frosting enemies) ──────────────────────
  frozenArmor: {
    stackDecayMs:    2000,  // one stack expires every 2 s
    maxStacks:       10,
    frostsPerStack:  100,   // frosts needed to gain 1 stack
  },

  // ── Artifacts ─────────────────────────────────────────────────────────────
  artifacts: {
    maxCount: 20,
    dropChances: {
      one:   0.25,   // 1-line artifact
      two:   0.10,   // 2-line artifact
      three: 0.05,   // 3-line artifact
      // remainder 0.60 = no drop
    },
    // Multi-line artifacts require a minimum boss level. Below it, that tier's
    // drop probability folds back into the no-drop pool instead of downgrading.
    lineUnlockLevels: {
      two:   30,   // 2-line artifacts only drop above boss level 30
      three: 50,   // 3-line artifacts only drop above boss level 50
    },
  },

  // ── Critical hits ─────────────────────────────────────────────────────────
  criticalHit: {
    chanceProjectile: 0.05,  // 5% base chance for projectile actions
    chanceArea:       0.03,  // 3% base chance for area actions
    chanceStrike:     0.07,  // 7% base chance for strike actions
    damageMultiplier: 2,     // ×2 damage on a critical hit
  },

} as const
