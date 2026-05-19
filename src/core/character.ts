import { balance } from '../config/balance'
import type { MasteryId } from '../config/masteries'
import type { RuneId } from '../config/runes'

const STORAGE_KEY = 'pop:save'
export const MAX_SLOTS = 5

export type TargetingMode = 'nearest' | 'weakest' | 'strongest' | 'random'

export interface MasteryProgress {
  xp: number
  level: number
  nodes: number[][]  // [treeIdx 0-4][...assigned nodeIdx 0-15]
}

export function masteryPointsAvailable(prog: MasteryProgress): number {
  const earned = Math.max(0, prog.level - 1)
  const spent = prog.nodes.reduce((s, t) => s + t.length, 0)
  return earned - spent
}

export function defaultMasteryNodes(): number[][] {
  return [[], [], [], [], []]
}

export interface StatProgress {
  xp: number
  level: number
}

export interface EnemyProgress {
  xp: number
  level: number    // currently selected enemy level (1 ≤ level ≤ maxLevel)
  maxLevel: number // highest unlocked max level
  autoLevel: boolean
}

export interface ActionProgress {
  xp: number
  level: number
  maxLevel: number  // highest level ever reached; survives rebirth
}

export interface ActionRunes {
  selected:  (RuneId | null)[]
  history:   RuneId[]
  autoApply: boolean
}

export function defaultActionRunes(): ActionRunes {
  return { selected: [null, null, null, null, null, null], history: [], autoApply: true }
}

export interface RunProgress {
  actionXp: Record<string, number>
  lifeXp: number
  manaXp: number
  enemyXp: number
  distancePx: number
  critXp: number
}

export function defaultRunProgress(): RunProgress {
  return { actionXp: {}, lifeXp: 0, manaXp: 0, enemyXp: 0, distancePx: 0, critXp: 0 }
}

export interface UniversePointAllocations {
  placeholderA: number
  placeholderB: number
}

export interface Character {
  id: string
  name: string
  createdAt: number
  maxLife: number
  maxMana: number
  currentLife: number
  currentMana: number
  actionId: string
  actionProgress: Record<string, ActionProgress>
  lifeProgress: StatProgress
  manaProgress: StatProgress
  enemyProgress: EnemyProgress
  targetingMode: TargetingMode
  masteryProgress: Partial<Record<MasteryId, MasteryProgress>>
  runProgress: RunProgress
  actionRunes: Partial<Record<string, ActionRunes>>
  ascentCount: number
  ascentXp: number
  universePointAllocations: UniversePointAllocations
}

interface SaveData {
  characters: Character[]
  currentId: string | null
}

function normalize(c: Partial<Character> & Pick<Character, 'id' | 'name' | 'createdAt'>): Character {
  const maxLife = c.maxLife ?? balance.player.maxLife
  const maxMana = c.maxMana ?? balance.player.maxMana
  return {
    id: c.id,
    name: c.name,
    createdAt: c.createdAt,
    maxLife,
    maxMana,
    // Legacy saves without current values default to full — new characters
    // are explicitly set via balance.player.startingLife/startingMana.
    currentLife: c.currentLife ?? maxLife,
    currentMana: c.currentMana ?? maxMana,
    actionId: c.actionId ?? 'sword',
    actionProgress: Object.fromEntries(
      Object.entries(c.actionProgress ?? {}).map(([k, v]) => [
        k,
        { xp: v.xp ?? 0, level: v.level ?? 1, maxLevel: v.maxLevel ?? Math.max(1, v.level ?? 1) },
      ]),
    ),
    lifeProgress: c.lifeProgress ?? { xp: 0, level: 1 },
    manaProgress: c.manaProgress ?? { xp: 0, level: 1 },
    enemyProgress: c.enemyProgress ?? { xp: 0, level: 1, maxLevel: 1, autoLevel: false },
    targetingMode: c.targetingMode ?? 'nearest',
    masteryProgress: Object.fromEntries(
      Object.entries(c.masteryProgress ?? {}).map(([k, v]) => [
        k,
        {
          xp: Number.isFinite(v.xp) ? v.xp : 0,
          level: Number.isFinite(v.level) ? v.level : 1,
          nodes: v.nodes ?? defaultMasteryNodes(),
        },
      ]),
    ) as Partial<Record<MasteryId, MasteryProgress>>,
    runProgress: c.runProgress ? {
      // Scrub any NaN/missing fields a corrupted save may have left behind so
      // mastery gains aren't permanently poisoned.
      actionXp: Object.fromEntries(
        Object.entries(c.runProgress.actionXp ?? {})
          .map(([k, v]) => [k, Number.isFinite(v) ? v : 0]),
      ),
      lifeXp: Number.isFinite(c.runProgress.lifeXp) ? c.runProgress.lifeXp : 0,
      manaXp: Number.isFinite(c.runProgress.manaXp) ? c.runProgress.manaXp : 0,
      enemyXp: Number.isFinite(c.runProgress.enemyXp) ? c.runProgress.enemyXp : 0,
      distancePx: Number.isFinite(c.runProgress.distancePx) ? c.runProgress.distancePx : 0,
      critXp: Number.isFinite(c.runProgress.critXp) ? c.runProgress.critXp : 0,
    } : defaultRunProgress(),
    actionRunes: c.actionRunes ?? {},
    ascentCount: c.ascentCount ?? 0,
    ascentXp: c.ascentXp ?? 0,
    universePointAllocations: c.universePointAllocations ?? { placeholderA: 0, placeholderB: 0 },
  }
}

function read(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw) as { characters: Parameters<typeof normalize>[0][]; currentId: string | null }
      return { characters: data.characters.map(normalize), currentId: data.currentId }
    }
  } catch {
    // ignore corrupt data
  }
  return { characters: [], currentId: null }
}

function write(data: SaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // ignore storage errors (e.g. private mode quota)
  }
}

export function getCharacters(): Character[] {
  return read().characters
}

export function getCurrentId(): string | null {
  return read().currentId
}

export function getCurrentCharacter(): Character | null {
  const { characters, currentId } = read()
  return characters.find(c => c.id === currentId) ?? null
}

export function createCharacter(name: string, actionId: string): Character {
  const data = read()
  if (data.characters.length >= MAX_SLOTS) throw new Error('All save slots are full')
  const trimmed = name.trim()
  if (data.characters.some(c => c.name === trimmed)) throw new Error('Name already taken')
  const char: Character = {
    id: crypto.randomUUID(),
    name: trimmed,
    createdAt: Date.now(),
    maxLife: balance.player.maxLife,
    maxMana: balance.player.maxMana,
    currentLife: balance.player.startingLife,
    currentMana: balance.player.startingMana,
    actionId,
    actionProgress: {},
    lifeProgress: { xp: 0, level: 1 },
    manaProgress: { xp: 0, level: 1 },
    enemyProgress: { xp: 0, level: 1, maxLevel: 1, autoLevel: false },
    targetingMode: 'nearest',
    masteryProgress: {},
    runProgress: defaultRunProgress(),
    actionRunes: {},
    ascentCount: 0,
    ascentXp: 0,
    universePointAllocations: { placeholderA: 0, placeholderB: 0 },
  }
  data.characters.push(char)
  data.currentId = char.id
  write(data)
  return char
}

export function loadCharacter(id: string): void {
  const data = read()
  if (!data.characters.find(c => c.id === id)) throw new Error('Character not found')
  data.currentId = id
  write(data)
}

export function deleteCharacter(id: string): void {
  const data = read()
  data.characters = data.characters.filter(c => c.id !== id)
  if (data.currentId === id) data.currentId = null
  write(data)
}

export function saveCharacterState(
  id: string,
  currentLife: number,
  currentMana: number,
  actionId?: string,
  actionProgress?: Record<string, ActionProgress>,
  lifeProgress?: StatProgress,
  manaProgress?: StatProgress,
  enemyProgress?: EnemyProgress,
  targetingMode?: TargetingMode,
  masteryProgress?: Partial<Record<MasteryId, MasteryProgress>>,
  runProgress?: RunProgress,
  actionRunes?: Partial<Record<string, ActionRunes>>,
  ascentCount?: number,
  ascentXp?: number,
  universePointAllocations?: UniversePointAllocations,
): void {
  const data = read()
  const char = data.characters.find(c => c.id === id)
  if (!char) return
  char.currentLife = currentLife
  char.currentMana = currentMana
  if (actionId !== undefined) char.actionId = actionId
  if (actionProgress !== undefined) char.actionProgress = actionProgress
  if (lifeProgress !== undefined) char.lifeProgress = lifeProgress
  if (manaProgress !== undefined) char.manaProgress = manaProgress
  if (enemyProgress !== undefined) char.enemyProgress = enemyProgress
  if (targetingMode !== undefined) char.targetingMode = targetingMode
  if (masteryProgress !== undefined) char.masteryProgress = masteryProgress
  if (runProgress !== undefined) char.runProgress = runProgress
  if (actionRunes !== undefined) char.actionRunes = actionRunes
  if (ascentCount !== undefined) char.ascentCount = ascentCount
  if (ascentXp !== undefined) char.ascentXp = ascentXp
  if (universePointAllocations !== undefined) char.universePointAllocations = universePointAllocations
  write(data)
}
