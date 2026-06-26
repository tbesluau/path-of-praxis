// Unified ad entry point. The rest of the game imports from here and never
// touches the platform-specific SDK modules directly. Rewarded ads run on
// native (Capacitor iOS/Android) via AdMob and, in the CrazyGames context, via
// the CrazyGames SDK. Other web contexts (pathofpraxis.com direct, galaxy,
// staging) ship no ad SDK — callers branch on `adsAvailable()` and grant the
// reward directly ("no-ad" mode) when it returns false.

import { isNativeApp, isCrazyGames } from '../core/context'

/**
 * Lifecycle hooks invoked around the actual ad playback so the caller can pause
 * the game while the ad is on screen and resume it afterwards. `onAdStart` fires
 * when the ad begins, `onAdEnd` when it finishes or fails (only if it started).
 */
export interface AdLifecycle {
  onAdStart?: () => void
  onAdEnd?: () => void
}

export function isNative(): boolean {
  return isNativeApp()
}

/** True when the current context has a rewarded-ad SDK wired up. */
export function adsAvailable(): boolean {
  return isNativeApp() || isCrazyGames()
}

/**
 * Show a rewarded video ad. Resolves true when the user watches the ad to
 * completion (and is eligible for the reward), false if they skip/dismiss
 * early or the ad fails to load. In a context without an ad SDK it resolves
 * false (callers in that case use the no-ad path and never reach here).
 *
 * On CrazyGames, if rewarded ads are disabled (the Basic Launch / limited
 * release), this resolves true — there is no ad to watch but the player has
 * opted in, so the reward is still granted. The optional `lifecycle` hooks are
 * called around CrazyGames ad playback so the caller can pause/resume the game.
 */
export async function showRewardedAd(lifecycle?: AdLifecycle): Promise<boolean> {
  if (isNativeApp()) {
    try {
      // Native AdMob ads are fullscreen and pause the app at the OS level, so
      // they don't use the lifecycle hooks.
      const { showNativeRewardedAd } = await import('./admob')
      return await showNativeRewardedAd()
    } catch (err) {
      console.warn('[ads] showRewardedAd (native) failed:', err)
      return false
    }
  }
  if (isCrazyGames()) {
    try {
      const { showCrazyGamesRewardedAd } = await import('./crazygames')
      return await showCrazyGamesRewardedAd(lifecycle)
    } catch (err) {
      console.warn('[ads] showRewardedAd (crazygames) failed:', err)
      return false
    }
  }
  return false
}

/**
 * One-time SDK initialisation. Call once at app startup. No-op on web.
 */
export async function initAds(): Promise<void> {
  if (!isNative()) return
  try {
    const { initAdMob } = await import('./admob')
    await initAdMob()
  } catch (err) {
    console.warn('[ads] AdMob init failed:', err)
  }
}
