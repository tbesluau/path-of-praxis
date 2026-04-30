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
    regenRate:     1,    // life and mana recovered per second
    // attack stats are defined per-action in src/config/weapons.ts and spells.ts
  },

  // ── Enemy teams ─────────────────────────────────────────────────────────
  enemyA: {
    radius:           20,   // pixels
    moveSpeed:        80,   // pixels per second
    maxLife:          50,
    damageMultiplier: 0.5,  // applied on top of the action's base damage
  },

  enemyB: {
    radius:           20,   // pixels
    moveSpeed:        80,   // pixels per second
    maxLife:          50,
    damageMultiplier: 0.5,
  },

  // ── Enemy waves ─────────────────────────────────────────────────────────
  wave: {
    spawnDelay:         2000, // ms delay for intro spawns (new char, flee, rebirth, continue)
    clusterSpread:       1.0, // total angular span (radians) of each enemy cluster
    spawnMargin:         120, // px beyond screen edge enemies appear
    spawnDepthVariance:  160, // additional random px beyond spawnMargin
    nextWaveThreshold:     0, // spawn next wave when live enemy count reaches this
    minCount:              1, // guaranteed enemies per wave
    extraChanceBase:    0.20, // base probability of spawning one additional enemy
    extraChancePerLevel:0.01, // added per enemy level (so level 1 = 20%, level 51 = 70%)
    extraChanceCap:     0.70, // maximum spawn-chain probability
  },

  // ── Death animation ──────────────────────────────────────────────────────
  death: {
    fragmentCount:    8,   // shards per entity
    fragmentLifetime: 750, // ms (each shard has ±300 ms variance on top)
  },

  // ── World ────────────────────────────────────────────────────────────────
  world: {
    gridSize: 64,  // pixels per grid cell
    map: {
      chunkSize:       16,    // tiles per chunk side
      forgetRange:      2,    // chunks beyond this Chebyshev distance are forgotten (~2× spawn dist)
      blockedDensity: 1.00,   // probability of placing an obstacle at each placement-grid point
      placementGrid:    7,    // tiles between obstacle placement centres
      wallLengthMin:    3,    // min wall segment length in tiles
      wallLengthMax:    4,    // max wall segment length (≤ placementGrid−3 keeps corridors ≥3 tiles wide)
    },
  },

  // ── Action XP ────────────────────────────────────────────────────────────
  action: {
    xpPerLevel: 100,  // XP required for level 1 → 2
    xpGrowth:   1.5,  // each subsequent level costs xpGrowth× the previous
  },

  // ── Stat XP (life / mana leveling) ──────────────────────────────────────
  stat: {
    xpPerLevel:       100,   // XP needed for next level = currentLevel × xpPerLevel
    bonusPerLevel:    0.10,  // non-multiplicative +10% of base per level above 1
    lifeXpFromDamage: 2,     // multiplier on life XP earned from taking damage
  },

  // ── Mastery leveling ──────────────────────────────────────────────────────
  mastery: {
    xpPerLevel:         1000, // XP required for mastery level 1 → 2
    xpGrowth:           1.5,  // each subsequent level costs xpGrowth× the previous
    actionXpMultiplier: 0.2,  // fraction of run action XP that feeds tag masteries
  },

  // ── Enemy leveling ────────────────────────────────────────────────────────
  enemyLevel: {
    xpPerMaxLevel:  1000, // damage needed to raise max level = currentMaxLevel × xpPerMaxLevel
    statMultiplier: 1.2,  // multiplicative per-level bonus on enemy HP and damage
  },

} as const
