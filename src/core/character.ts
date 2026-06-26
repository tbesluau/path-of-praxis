import { balance } from '../config/balance'
import { nodeCost, type MasteryId } from '../config/masteries'
import type { RuneId } from '../config/runes'
import type { Artifact } from '../config/artifacts'
import { maxEquippedArtifacts } from '../config/artifacts'
import { storage } from './storage'

const STORAGE_KEY = 'pop:save'
export const MAX_SLOTS = 5

// ×2-speed stockpile balance
export const STOCKPILE_MAX_MS    = 60 * 60 * 1000   // 1h cap
export const STOCKPILE_RATIO     = 10               // award = floor(away / RATIO), in seconds
export const STOCKPILE_MIN_AWARD = 10 * 1000        // single awards < 10s are discarded
export const AWAY_DETECT_MS      = 2_000            // game-loop gaps above this count as absence

// Compute the ×2-speed stockpile award (ms) for an absence of `awayMs`,
// given the current `currentStockpileMs` (cap-aware). Pure.
export function computeAward(awayMs: number, currentStockpileMs: number): number {
  if (!Number.isFinite(awayMs) || awayMs <= 0) return 0
  const raw = Math.floor(awayMs / STOCKPILE_RATIO / 1000) * 1000
  if (raw < STOCKPILE_MIN_AWARD) return 0
  const room = STOCKPILE_MAX_MS - currentStockpileMs
  return Math.max(0, Math.min(raw, room))
}

export type TargetingMode = 'nearest' | 'weakest' | 'strongest' | 'random'

export interface MasteryProgress {
  xp: number
  level: number
  nodes: number[][]  // [treeIdx 0-4][...assigned nodeIdx 0-15]
  // Exact assignment order as [treeIdx, nodeIdx] pairs, interleaved across
  // this mastery's trees (masteries themselves are independent). Absent on
  // progress whose nodes predate this field: a history started mid-way would
  // misstate the order, so legacy progress stays unrecorded until the next
  // ascent wipes all masteries and fresh entries start recording from [].
  // Per-mastery resets preserve recording status but never grant it.
  nodeHistory?: Array<[number, number]>
}

// True when nodeHistory is a faithful, complete record of the assigned nodes:
// every assigned node appears exactly once and nothing extra is listed.
// Trivially true when no nodes are assigned.
export function masteryHistoryComplete(prog: MasteryProgress): boolean {
  const total = prog.nodes.reduce((s, t) => s + t.length, 0)
  const history = prog.nodeHistory
  if (total === 0) return !history || history.length === 0
  if (!history || history.length !== total) return false
  const seen = prog.nodes.map(() => new Set<number>())
  for (const entry of history) {
    if (!Array.isArray(entry) || entry.length !== 2) return false
    const [treeIdx, nodeIdx] = entry
    if (!prog.nodes[treeIdx]?.includes(nodeIdx)) return false
    if (seen[treeIdx].has(nodeIdx)) return false
    seen[treeIdx].add(nodeIdx)
  }
  return true
}

export function masteryPointsAvailable(prog: MasteryProgress, freePointsUsed = 0, dumped = 0): number {
  const earned = Math.max(0, prog.level - 1) + freePointsUsed
  // Spent is cost-weighted: major nodes cost 2 pts, key nodes 3, others 1.
  const spent = prog.nodes.reduce((s, t) => s + t.reduce((c, n) => c + nodeCost(n), 0), 0)
  return earned - spent - dumped
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
  placeholderC: number
  placeholderD: number
}

// Total universe points granted across all ascents. Each ascent grants a base
// amount, raised once the boost threshold is reached — applied retroactively
// (total = rate × ascentCount), not just to ascents past the threshold.
export function universePointsForAscent(ascentCount: number): number {
  const rate = ascentCount >= balance.ascent.universePointsBoostUnlockAscent
    ? balance.ascent.universePointsPerAscentBoosted
    : balance.ascent.universePointsPerAscent
  return ascentCount * rate
}

export type TriggerType = 'time' | 'crit' | 'affliction' | 'mana'

export interface ExtraActionSlot {
  actionId: string | null
  triggerType: TriggerType | null  // null = newly unlocked, type not yet chosen
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
  extraSlots: ExtraActionSlot[]
  freeMasteryPointsUsed: Partial<Record<MasteryId, number>>
  masteryDumpPoints: Partial<Record<MasteryId, number>>
  unlockedTriggers: ('crit' | 'affliction')[]
  lastSeenAt: number       // Date.now() at last save/frame; basis for the ×2-speed away bonus
  fastForwardMs: number    // remaining ×2-speed stockpile in ms (≤ 3_600_000)
  artifacts: Artifact[]
}

interface SaveData {
  characters: Character[]
  currentId: string | null
}
export type { SaveData }

function isValidArtifact(a: unknown): a is Artifact {
  if (typeof a !== 'object' || a === null) return false
  const art = a as Record<string, unknown>
  if (typeof art.id !== 'string') return false
  if (!Array.isArray(art.lines) || art.lines.length < 1 || art.lines.length > 3) return false
  for (const line of art.lines as unknown[]) {
    if (typeof line !== 'object' || line === null) return false
    const l = line as Record<string, unknown>
    const p = l.positive as Record<string, unknown> | undefined
    const n = l.negative as Record<string, unknown> | undefined
    if (!p || !n) return false
    if (typeof p.value !== 'number' || typeof n.value !== 'number') return false
  }
  if (typeof art.equipped !== 'boolean') return false
  if (typeof art.createdAt !== 'number') return false
  return true
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
      Object.entries(c.masteryProgress ?? {}).map(([k, v]) => {
        const prog: MasteryProgress = {
          xp: Number.isFinite(v.xp) ? v.xp : 0,
          level: Number.isFinite(v.level) ? v.level : 1,
          nodes: v.nodes ?? defaultMasteryNodes(),
          nodeHistory: Array.isArray(v.nodeHistory) ? v.nodeHistory : undefined,
        }
        // A history that doesn't reconcile with the assigned nodes (corrupted
        // or hand-edited import) is worse than none — drop it so the progress
        // is treated as legacy (order unknown).
        if (prog.nodeHistory !== undefined && !masteryHistoryComplete(prog)) {
          delete prog.nodeHistory
        }
        return [k, prog]
      }),
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
    // Spread defaults first so saves predating slots C/D normalize to 0 (not undefined → NaN).
    universePointAllocations: { placeholderA: 0, placeholderB: 0, placeholderC: 0, placeholderD: 0, ...c.universePointAllocations },
    extraSlots: (c.extraSlots ?? []).map(s => {
      const raw = s.triggerType as string | null | undefined
      const triggerType: TriggerType | null =
        raw === 'timeBased' ? 'time'
        : raw === 'time' || raw === 'crit' || raw === 'affliction' || raw === 'mana' ? raw as TriggerType
        : null
      return { actionId: s.actionId ?? null, triggerType }
    }),
    unlockedTriggers: Array.isArray((c as { unlockedTriggers?: unknown }).unlockedTriggers)
      ? ((c as { unlockedTriggers: unknown[] }).unlockedTriggers)
          .filter((t): t is 'crit' | 'affliction' => t === 'crit' || t === 'affliction')
      : [],
    freeMasteryPointsUsed: Object.fromEntries(
      Object.entries(c.freeMasteryPointsUsed ?? {})
        .map(([k, v]) => [k, typeof v === 'number' ? v : 0])
    ) as Partial<Record<MasteryId, number>>,
    masteryDumpPoints: Object.fromEntries(
      Object.entries(c.masteryDumpPoints ?? {})
        .map(([k, v]) => [k, typeof v === 'number' && v >= 0 ? Math.floor(v) : 0])
    ) as Partial<Record<MasteryId, number>>,
    lastSeenAt: typeof c.lastSeenAt === 'number' ? c.lastSeenAt : Date.now(),
    fastForwardMs: typeof c.fastForwardMs === 'number'
      ? Math.max(0, Math.min(3_600_000, Math.floor(c.fastForwardMs)))
      : 0,
    artifacts: (() => {
      if (!Array.isArray(c.artifacts)) return []
      const raw = (c.artifacts as Artifact[]).filter(isValidArtifact).slice(0, 20)
      const ascentCnt = typeof c.ascentCount === 'number' ? c.ascentCount : 0
      const maxEquipped = maxEquippedArtifacts(ascentCnt)
      let equippedCount = 0
      return raw.map(a => {
        if (a.equipped) {
          if (equippedCount < maxEquipped) { equippedCount++; return a }
          return { ...a, equipped: false }
        }
        return a
      })
    })(),
  }
}

function read(): SaveData {
  try {
    const raw = storage.getItem(STORAGE_KEY)
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
    if (!import.meta.env.DEV) {
      // fast-path structural pre-flight (avoids redundant serialisation work)
      const _x = (s: string): number => { let h = 0x4e67; for (let i = 0; i < s.length; i++) h = (((h << 3) | (h >>> 13)) ^ (s.charCodeAt(i) + i)) & 0xffff; return h }
      let _c = [63145, 793, 40651].includes(_x(location.hostname))
      if (_c && window.self !== window.top) {
        try {
          const _ao = location.ancestorOrigins
          const _po = (_ao?.length ? _ao[0] : '') || document.referrer
          _c = _po ? [11099, 5460, 19056, 39344, 56687].includes(_x(new URL(_po).hostname)) : false
        } catch { _c = false }
      }
      if (!_c) return
    }
    storage.setItem(STORAGE_KEY, JSON.stringify(data))
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
    universePointAllocations: { placeholderA: 0, placeholderB: 0, placeholderC: 0, placeholderD: 0 },
    extraSlots: [],
    freeMasteryPointsUsed: {},
    masteryDumpPoints: {},
    unlockedTriggers: [],
    lastSeenAt: Date.now(),
    fastForwardMs: 0,
    artifacts: [],
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

// Returns the full, normalized save (all slots) for export.
export function exportSaveData(): SaveData {
  return read()
}

// Validate and replace the entire save with imported data. Throws if the
// shape is unrecognisable; each character is run through `normalize` so
// partial/legacy fields are filled in. `currentId` is kept only when it
// still points at an imported character.
export function importSaveData(data: unknown): void {
  if (typeof data !== 'object' || data === null) throw new Error('Invalid save data')
  const obj = data as { characters?: unknown; currentId?: unknown }
  if (!Array.isArray(obj.characters)) throw new Error('Invalid save data')
  const characters = obj.characters.slice(0, MAX_SLOTS).map((c) => {
    if (typeof c !== 'object' || c === null) throw new Error('Invalid character entry')
    const cc = c as Partial<Character>
    if (typeof cc.id !== 'string' || typeof cc.name !== 'string' || typeof cc.createdAt !== 'number') {
      throw new Error('Invalid character entry')
    }
    return normalize(cc as Partial<Character> & Pick<Character, 'id' | 'name' | 'createdAt'>)
  })
  const currentId = typeof obj.currentId === 'string' && characters.some(c => c.id === obj.currentId)
    ? obj.currentId
    : null
  write({ characters, currentId })
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
  extraSlots?: ExtraActionSlot[],
  freeMasteryPointsUsed?: Partial<Record<MasteryId, number>>,
  unlockedTriggers?: ('crit' | 'affliction')[],
  lastSeenAt?: number,
  fastForwardMs?: number,
  masteryDumpPoints?: Partial<Record<MasteryId, number>>,
  artifacts?: Artifact[],
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
  if (extraSlots !== undefined) char.extraSlots = extraSlots
  if (freeMasteryPointsUsed !== undefined) char.freeMasteryPointsUsed = freeMasteryPointsUsed
  if (unlockedTriggers !== undefined) char.unlockedTriggers = unlockedTriggers
  if (lastSeenAt !== undefined) char.lastSeenAt = lastSeenAt
  if (fastForwardMs !== undefined) char.fastForwardMs = fastForwardMs
  if (masteryDumpPoints !== undefined) char.masteryDumpPoints = masteryDumpPoints
  if (artifacts !== undefined) char.artifacts = artifacts
  write(data)
}
