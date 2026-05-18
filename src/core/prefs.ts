const STORAGE_KEY = 'pop:prefs'

export interface Prefs {
  showDamageNumbers: boolean
  showDpsMeter:      boolean
  fullMastery:       boolean
  zoomLevel:         number
}

const defaults: Prefs = {
  showDamageNumbers: true,
  showDpsMeter:      false,
  fullMastery:       false,
  zoomLevel:         1.0,
}

let cache: Prefs | null = null

function load(): Prefs {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    cache = raw ? { ...defaults, ...JSON.parse(raw) as Partial<Prefs> } : { ...defaults }
  } catch {
    cache = { ...defaults }
  }
  return cache
}

export function getPrefs(): Prefs {
  return load()
}

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]): void {
  const p = load()
  p[key] = value
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)) } catch { /* storage disabled */ }
}

export function isCheatMode(): boolean {
  return new URLSearchParams(location.search).get('cheat') === 'bro'
}
