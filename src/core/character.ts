const STORAGE_KEY = 'pop:save'
export const MAX_SLOTS = 5

export interface Character {
  id: string
  name: string
  createdAt: number
}

interface SaveData {
  characters: Character[]
  currentId: string | null
}

function read(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as SaveData
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
  const char: Character = { id: crypto.randomUUID(), name: name.trim(), createdAt: Date.now() }
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
  if (data.currentId === id) data.currentId = data.characters[0]?.id ?? null
  write(data)
}
