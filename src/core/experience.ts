export interface ActionProgress {
  level: number
  xp: number
  maxLevelEver: number
  bonusMultiplier: number
}

export interface RecordResult {
  damageInflicted: number
  xpGained: number
  levelsGained: number
  level: number
  xp: number
  xpToNext: number
}

export const XP_PER_LEVEL = 100

function emptyProgress(): ActionProgress {
  return { level: 1, xp: 0, maxLevelEver: 1, bonusMultiplier: 1 }
}

export function xpToNext(level: number): number {
  return level * XP_PER_LEVEL
}

export function createExperience() {
  const actions = new Map<string, ActionProgress>()

  function ensure(id: string): ActionProgress {
    let s = actions.get(id)
    if (!s) {
      s = emptyProgress()
      actions.set(id, s)
    }
    return s
  }

  function register(id: string): ActionProgress {
    return { ...ensure(id) }
  }

  function snapshot(id: string): ActionProgress {
    return { ...ensure(id) }
  }

  function damageFor(id: string, baseDamage: number): number {
    return baseDamage * ensure(id).level
  }

  function recordDamage(id: string, damageInflicted: number): RecordResult {
    const s = ensure(id)
    const xpGained = damageInflicted * s.bonusMultiplier
    s.xp += xpGained

    let levelsGained = 0
    while (s.xp >= xpToNext(s.level)) {
      s.xp -= xpToNext(s.level)
      s.level += 1
      levelsGained += 1
      if (s.level > s.maxLevelEver) s.maxLevelEver = s.level
    }

    return {
      damageInflicted,
      xpGained,
      levelsGained,
      level: s.level,
      xp: s.xp,
      xpToNext: xpToNext(s.level),
    }
  }

  function onDeath(): void {
    for (const s of actions.values()) {
      s.level = 1
      s.xp = 0
      s.bonusMultiplier = Math.sqrt(s.maxLevelEver)
    }
  }

  function ids(): string[] {
    return [...actions.keys()]
  }

  return { register, snapshot, damageFor, recordDamage, onDeath, ids }
}

export type Experience = ReturnType<typeof createExperience>
