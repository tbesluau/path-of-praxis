const STORAGE_KEY = 'pop:prefs'

export interface Prefs {
  showDamageNumbers:  boolean
  showDpsMeter:       boolean
  confirmManualDeath: boolean
  fullMastery:        boolean
  zoomLevel:          number
  soundVolume:        number
  soundMuted:         boolean
  tutorialDisabled?:  boolean
  seenTutorials?:     string[]
  // Bump the suffix (V1 → V2 → …) to re-prompt all users when the
  // Privacy Policy or EULA materially changes.
  acceptedTermsV1?:   boolean
}

const defaults: Prefs = {
  showDamageNumbers: true,
  showDpsMeter:      false,
  confirmManualDeath: true,
  fullMastery:       false,
  zoomLevel:         1.0,
  soundVolume:       0.7,
  soundMuted:        false,
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
  if (new URLSearchParams(location.search).get('cheat') !== 'bro') return false
  // Cheats are limited to the dev/staging URL — never the production site.
  return import.meta.env.DEV || location.hostname === 'tbesluau.github.io'
}
