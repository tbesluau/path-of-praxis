// Single source of truth for the runtime context the bundle is executing in.
//
// One TypeScript bundle ships to many runtimes (web direct, iframed on game
// portals, native iOS/Android). Feature code should branch on context with a
// one-liner — e.g. `if (isCrazyGames())` or `if (getContext() !== 'iphone')` —
// instead of re-deriving platform/iframe/hostname checks in place.
//
// NOTE: the obfuscated anti-tamper gates in `host-guard.ts` and `character.ts`
// deliberately do NOT consume this module — keeping a readable enum out of the
// tamper-resistance path is intentional.

import { Capacitor } from '@capacitor/core'

export type GameContext =
  | 'web'        // pathofpraxis.com, opened directly
  | 'galaxy'     // iframed on galaxy.click
  | 'crazygames' // iframed on crazygames
  | 'test'       // tbesluau.github.io staging or local dev
  | 'android'    // native Capacitor wrapper
  | 'iphone'     // native Capacitor wrapper

export interface ContextInputs {
  native: boolean
  platform: string
  dev: boolean
  hostname: string
  inIframe: boolean
  parentHost: string | null
}

/**
 * Pure classification from ambient inputs — kept separate from `detect()` so it
 * is fully unit-testable without stubbing globals.
 */
export function classifyContext(i: ContextInputs): GameContext {
  if (i.native) return i.platform === 'ios' ? 'iphone' : 'android'
  if (i.dev || i.hostname === 'tbesluau.github.io' || i.hostname === 'localhost') return 'test'
  if (i.inIframe && i.parentHost) {
    if (i.parentHost === 'crazygames.com' || i.parentHost.endsWith('.crazygames.com')) return 'crazygames'
    if (i.parentHost === 'galaxy.click' || i.parentHost.endsWith('.galaxy.click')) return 'galaxy'
  }
  return 'web'
}

function inIframe(): boolean {
  try { return window.top !== window.self } catch { return true }
}

function parentHostname(): string | null {
  try {
    const a = location.ancestorOrigins
    if (a?.length) return new URL(a[0]).hostname
  } catch { /* ancestorOrigins unsupported */ }
  try {
    if (document.referrer) return new URL(document.referrer).hostname
  } catch { /* malformed referrer */ }
  return null
}

function detect(): GameContext {
  return classifyContext({
    native: Capacitor.isNativePlatform(),
    platform: Capacitor.getPlatform(),
    dev: import.meta.env.DEV,
    hostname: location.hostname,
    inIframe: inIframe(),
    parentHost: parentHostname(),
  })
}

let cached: GameContext | null = null

/** The runtime context, computed once and memoized. */
export function getContext(): GameContext {
  return (cached ??= detect())
}

/** True when the current context is any of `want`. */
export function isContext(...want: GameContext[]): boolean {
  return want.includes(getContext())
}

/** Native Capacitor wrapper (iOS or Android). */
export function isNativeApp(): boolean {
  return isContext('android', 'iphone')
}

/** Iframed and running on CrazyGames. */
export function isCrazyGames(): boolean {
  return getContext() === 'crazygames'
}

/** Iframed on a whitelisted game portal (galaxy.click or CrazyGames). */
export function isEmbedded(): boolean {
  return isContext('galaxy', 'crazygames')
}

/** pathofpraxis.com opened directly (not iframed, not native, not staging). */
export function isWebDirect(): boolean {
  return getContext() === 'web'
}
