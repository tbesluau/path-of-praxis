// Unified ad entry point. The rest of the game imports from here and never
// touches the platform-specific SDK modules directly. Ads only run on native
// (Capacitor iOS/Android) via AdMob — the web build ships without any ad SDK.
// Callers should branch on `adsAvailable()` and grant the reward directly
// when it returns false.

import { isNativeApp } from '../core/context'

export function isNative(): boolean {
  return isNativeApp()
}

/** True when the current platform has a rewarded-ad SDK wired up. */
export function adsAvailable(): boolean {
  return isNative()
}

/**
 * Show a rewarded video ad. Resolves true when the user watches the ad to
 * completion (and is eligible for the reward), false if they skip/dismiss
 * early, if the ad fails to load, or if the platform has no ad SDK (web).
 */
export async function showRewardedAd(): Promise<boolean> {
  if (!isNative()) return false
  try {
    const { showNativeRewardedAd } = await import('./admob')
    return await showNativeRewardedAd()
  } catch (err) {
    console.warn('[ads] showRewardedAd failed:', err)
    return false
  }
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
