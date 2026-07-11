import { storage } from './storage'

const STORAGE_KEY = 'pop:prefs'

export interface Prefs {
  showDamageNumbers:  boolean
  showDpsMeter:       boolean
  confirmManualDeath: boolean
  fullMastery:        boolean
  zoomLevel:          number
  soundVolume:        number
  soundMuted:         boolean
  effectOpacity:      number   // 0.1–1.0 — alpha applied to all action/affliction effect visuals
  effectDetail:       number   // 1–5 — how much of the effect load is rendered (5 = everything)
  tutorialDisabled?:  boolean
  seenTutorials?:     string[]
  // Bump the suffix (V1 → V2 → …) to re-prompt all users when the
  // Privacy Policy or EULA materially changes.
  acceptedTermsV1?:   boolean
  // Character appearance
  playerHatVariant?:  string
  playerColorKey?:    string
  playerShieldVariant?: string   // shield in the non-weapon hand (Block unlock)
  // Stable, anonymous analytics client identifier. Generated on first use and
  // persisted here alongside the other settings — it lives in localStorage,
  // NOT in the character save, so it never rides along with an exported save
  // code (a save imported on another device keeps that device's own id).
  clientId?:          string
  // Mastery build-plan presets (up to 3 saved strings). Cross-character, persists across ascents.
  masteryPresets?:    [string?, string?, string?]
  // The currently active mastery build plan. Cleared on ascent.
  activeMasteryPlan?: string
}

const defaults: Prefs = {
  showDamageNumbers: true,
  showDpsMeter:      false,
  confirmManualDeath: true,
  fullMastery:       false,
  zoomLevel:         1.0,
  soundVolume:       0.7,
  soundMuted:        false,
  effectOpacity:     1.0,
  effectDetail:      5,
}

let cache: Prefs | null = null

function load(): Prefs {
  if (cache) return cache
  try {
    const raw = storage.getItem(STORAGE_KEY)
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
  storage.setItem(STORAGE_KEY, JSON.stringify(p))
}

function generateClientId(): string {
  try {
    if (crypto?.randomUUID) return crypto.randomUUID()
  } catch { /* fall through to manual UUIDv4 */ }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// Returns the stable anonymous analytics client id, generating and persisting
// one on first call. Stored with the prefs so it survives reloads but stays out
// of the exportable character save.
export function getClientId(): string {
  const p = load()
  if (!p.clientId) {
    p.clientId = generateClientId()
    storage.setItem(STORAGE_KEY, JSON.stringify(p))
  }
  return p.clientId
}

export function isCheatMode(): boolean {
  if (new URLSearchParams(location.search).get('cheat') !== 'bro') return false
  // Cheats are limited to the dev/staging URL — never the production site.
  return import.meta.env.DEV || location.hostname === 'tbesluau.github.io'
}
