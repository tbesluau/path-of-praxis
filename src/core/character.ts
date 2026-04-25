const STORAGE_KEY = 'pop:save'
export const MAX_SLOTS = 5

export interface Character {
  id: string
  name: string
  createdAt: number
  maxLife: number
  maxMana: number
  currentLife: number
  currentMana: number
}

interface SaveData {
  characters: Character[]
  currentId: string | null
}

function normalize(c: Partial<Character> & Pick<Character, 'id' | 'name' | 'createdAt'>): Character {
  const maxLife = c.maxLife ?? 100
  const maxMana = c.maxMana ?? 100
  return {
    id: c.id,
    name: c.name,
    createdAt: c.createdAt,
    maxLife,
    maxMana,
    // Legacy saves without current values default to full — new characters
    // are explicitly set to 50 in createCharacter.
    currentLife: c.currentLife ?? maxLife,
    currentMana: c.currentMana ?? maxMana,
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

export function createCharacter(name: string): Character {
  const data = read()
  if (data.characters.length >= MAX_SLOTS) throw new Error('All save slots are full')
  const trimmed = name.trim()
  if (data.characters.some(c => c.name === trimmed)) throw new Error('Name already taken')
  const char: Character = {
    id: crypto.randomUUID(),
    name: trimmed,
    createdAt: Date.now(),
    maxLife: 100,
    maxMana: 100,
    currentLife: 50,
    currentMana: 50,
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

export function saveCharacterState(id: string, currentLife: number, currentMana: number): void {
  const data = read()
  const char = data.characters.find(c => c.id === id)
  if (!char) return
  char.currentLife = currentLife
  char.currentMana = currentMana
  write(data)
}
