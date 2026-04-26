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
    startingLife:  50,   // on new character creation and after rebirth
    startingMana:  50,
    regenRate:     1,    // life and mana recovered per second
    // attack stats are defined per-action in src/config/weapons.ts and spells.ts
  },

  // ── Enemy teams ─────────────────────────────────────────────────────────
  enemyA: {
    radius:        20,   // pixels
    moveSpeed:     80,   // pixels per second
    maxLife:       50,
    // attack stats are defined per-action in src/config/weapons.ts and spells.ts
  },

  enemyB: {
    radius:        20,   // pixels
    moveSpeed:     80,   // pixels per second
    maxLife:       50,
    // attack stats are defined per-action in src/config/weapons.ts and spells.ts
  },

  // ── Enemy waves ─────────────────────────────────────────────────────────
  wave: {
    spawnDelay:         2000, // ms between wave clear and next wave appearing
    spawnDistance:       300, // pixels from player center at spawn
    nextWaveThreshold:     0, // spawn next wave when live enemy count reaches this
    minCount:              1, // guaranteed enemies per wave
    extraChance:         0.3, // probability to add one more enemy (re-rolled repeatedly)
  },

  // ── Death animation ──────────────────────────────────────────────────────
  death: {
    fragmentCount:    8,   // shards per entity
    fragmentLifetime: 750, // ms (each shard has ±300 ms variance on top)
  },

  // ── World ────────────────────────────────────────────────────────────────
  world: {
    gridSize: 64,  // pixels per grid cell
  },

  // ── Action XP ────────────────────────────────────────────────────────────
  action: {
    xpPerLevel: 100,  // XP needed for next level = currentLevel × xpPerLevel
  },

  // ── Stat XP (life / mana leveling) ──────────────────────────────────────
  stat: {
    xpPerLevel:    100,   // XP needed for next level = currentLevel × xpPerLevel
    bonusPerLevel: 0.10,  // non-multiplicative +10% of base per level above 1
  },

  // ── Enemy leveling ────────────────────────────────────────────────────────
  enemyLevel: {
    xpPerMaxLevel:  1000, // damage needed to raise max level = currentMaxLevel × xpPerMaxLevel
    statMultiplier: 1.2,  // multiplicative per-level bonus on enemy HP and damage
  },

} as const
