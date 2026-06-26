// Swappable synchronous key/value storage backend.
//
// All persisted game data (save, prefs, locale) flows through the `storage`
// proxy rather than touching `localStorage` directly. The active backend is
// chosen once at startup by `initStorage()` based on the runtime context:
// localStorage by default, or the CrazyGames data store when iframed there.
//
// The interface is intentionally synchronous — both `localStorage` and the
// CrazyGames `data` module expose a synchronous getItem/setItem/removeItem API,
// so callers never need to await a save. Only one-time SDK init is async, and
// that is handled here before the first read.

import { isCrazyGames } from './context'

export interface StorageBackend {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

// Default backend: localStorage with the same graceful try/catch the codebase
// has always used (private-mode / quota errors degrade to no-ops).
const localStorageBackend: StorageBackend = {
  getItem(key) {
    try { return localStorage.getItem(key) } catch { return null }
  },
  setItem(key, value) {
    try { localStorage.setItem(key, value) } catch { /* storage disabled */ }
  },
  removeItem(key) {
    try { localStorage.removeItem(key) } catch { /* storage disabled */ }
  },
}

let active: StorageBackend = localStorageBackend

/** Replace the active backend. Used by the CrazyGames bootstrap. */
export function setStorageBackend(backend: StorageBackend): void {
  active = backend
}

/** Stable proxy imported by the persistence modules. Always hits the active backend. */
export const storage: StorageBackend = {
  getItem: (key) => active.getItem(key),
  setItem: (key, value) => active.setItem(key, value),
  removeItem: (key) => active.removeItem(key),
}

/**
 * One-time storage selection. Call once at startup BEFORE any persisted data is
 * read. In the CrazyGames context this loads their SDK and routes storage to
 * the CrazyGames data store; on any failure it leaves the localStorage backend
 * in place (graceful fallback). No-op everywhere else.
 */
export async function initStorage(): Promise<void> {
  if (!isCrazyGames()) return
  try {
    const { initCrazyGames } = await import('../sdk/crazygames')
    const backend = await initCrazyGames()
    if (backend) setStorageBackend(backend)
  } catch (err) {
    console.warn('[storage] CrazyGames init failed, using localStorage:', err)
  }
}
