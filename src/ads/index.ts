// Unified ad entry point. The rest of the game imports from here and never
// touches the platform-specific SDK modules directly. On native (Capacitor
// iOS/Android) we route to AdMob; on the web we route to Google's IMA SDK
// (AdSense for Games). Dynamic imports keep each SDK out of the other
// platform's bundle path.

import { Capacitor } from '@capacitor/core'

export function isNative(): boolean {
  return Capacitor.isNativePlatform()
}

/**
 * Show a rewarded video ad. Resolves true when the user watches the ad to
 * completion (and is eligible for the reward), false if they skip/dismiss
 * early or if the ad fails to load.
 */
export async function showRewardedAd(): Promise<boolean> {
  try {
    if (isNative()) {
      const { showNativeRewardedAd } = await import('./admob')
      return await showNativeRewardedAd()
    }
    const { showWebRewardedAd } = await import('./ima')
    return await showWebRewardedAd()
  } catch (err) {
    console.warn('[ads] showRewardedAd failed:', err)
    return false
  }
}

/**
 * One-time SDK initialisation. Call once at app startup. Safe to call on any
 * platform — the web path is a no-op (the IMA SDK loads lazily on first use).
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
