import { balance } from '../config/balance'

const STORAGE_KEY = 'pop:save'
export const MAX_SLOTS = 5

export interface StatProgress {
  xp: number
  level: number
}

export interface ActionProgress {
  xp: number
  level: number
  maxLevel: number  // highest level ever reached; survives rebirth
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
    actionProgress: c.actionProgress ?? {},
    lifeProgress: c.lifeProgress ?? { xp: 0, level: 1 },
    manaProgress: c.manaProgress ?? { xp: 0, level: 1 },
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
  write(data)
}
