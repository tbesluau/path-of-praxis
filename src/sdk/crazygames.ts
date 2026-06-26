// CrazyGames HTML5 SDK v3 glue.
//
// Loaded lazily (dynamic import from storage.ts) only in the CrazyGames context,
// so the SDK script and this module stay out of every other bundle. The SDK's
// `data` module mirrors the localStorage API synchronously, so once `init()`
// resolves we can hand back a plain StorageBackend.

import type { StorageBackend } from '../core/storage'

const SDK_SRC = 'https://sdk.crazygames.com/crazygames-sdk-v3.js'

interface CrazyData {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  clear(): void
}

interface CrazySDK {
  init(): Promise<void>
  data: CrazyData
}

declare global {
  interface Window {
    CrazyGames?: { SDK: CrazySDK }
  }
}

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.CrazyGames?.SDK) return resolve()
    const script = document.createElement('script')
    script.src = SDK_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('CrazyGames SDK failed to load'))
    document.head.appendChild(script)
  })
}

/**
 * Load and initialise the CrazyGames SDK, returning a StorageBackend backed by
 * its data module. Returns null on any failure so the caller can fall back to
 * localStorage without crashing.
 */
export async function initCrazyGames(): Promise<StorageBackend | null> {
  try {
    await loadScript()
    const sdk = window.CrazyGames?.SDK
    if (!sdk) return null
    await sdk.init()
    const data = sdk.data
    return {
      getItem(key) {
        try { return data.getItem(key) } catch { return null }
      },
      setItem(key, value) {
        try { data.setItem(key, value) } catch { /* SDK unavailable */ }
      },
      removeItem(key) {
        try { data.removeItem(key) } catch { /* SDK unavailable */ }
      },
    }
  } catch (err) {
    console.warn('[crazygames] SDK init failed:', err)
    return null
  }
}
