// CrazyGames rewarded-video ad contract (SDK v3).
//
// The SDK is already loaded/initialised in the CrazyGames context (see
// src/sdk/crazygames.ts, wired from initStorage at boot). Here we drive the
// rewarded-ad request and translate its callbacks into a single
// resolve(true|false) — true means "grant the reward".
//
// Per CrazyGames requirements we mute the audio and pause the game while the ad
// plays (adStarted) and restore both when it finishes or fails (adFinished /
// adError). Muting is done here via setExternalMute; pausing is delegated to the
// caller through the AdLifecycle hooks (the game owns its pause state).

import { setExternalMute } from '../audio'
import type { AdLifecycle } from './index'

type AdType = 'rewarded' | 'midgame'

interface AdErrorData {
  code?: string
  message?: string
}

interface AdCallbacks {
  adStarted?: () => void
  adFinished?: () => void
  adError?: (error: AdErrorData | unknown) => void
}

interface CrazyAdSDK {
  environment?: 'local' | 'crazygames' | 'disabled'
  ad?: { requestAd(type: AdType, callbacks: AdCallbacks): void }
}

function getSdk(): CrazyAdSDK | undefined {
  return (window as unknown as { CrazyGames?: { SDK?: CrazyAdSDK } }).CrazyGames?.SDK
}

// During Basic Launch (the initial limited release) ads are disabled entirely,
// and the SDK reports it with this exact error code. There is no ad to watch,
// so we still grant the reward — the player opted in by clicking. Every other
// code (unfilled, adblock, adCooldown, other) is a normal failure and grants
// nothing, per CrazyGames policy.
function isAdsDisabled(error: unknown): boolean {
  const code = error && typeof error === 'object' && 'code' in error
    ? String((error as AdErrorData).code)
    : ''
  return code === 'adsDisabledBasicLaunch'
}

/**
 * Request a CrazyGames rewarded ad. Resolves true when the user watches it to
 * completion, OR when ads are disabled for the Basic Launch / the SDK has no ad
 * support in this environment. Resolves false on a genuine no-fill, adblock,
 * cooldown, error, or skip.
 */
export function showCrazyGamesRewardedAd(lifecycle?: AdLifecycle): Promise<boolean> {
  return new Promise((resolve) => {
    const sdk = getSdk()
    // Ad API absent, or the SDK is in its 'disabled' environment (non-CrazyGames
    // host): no ad will ever play → grant without pausing/muting.
    if (!sdk?.ad?.requestAd || sdk.environment === 'disabled') {
      resolve(true)
      return
    }

    let settled = false
    let started = false
    const done = (granted: boolean): void => {
      if (settled) return
      settled = true
      // Only restore audio/pause if we actually started (and thus muted/paused).
      if (started) {
        setExternalMute(false)
        lifecycle?.onAdEnd?.()
      }
      resolve(granted)
    }

    try {
      sdk.ad.requestAd('rewarded', {
        adStarted: () => {
          started = true
          setExternalMute(true)
          lifecycle?.onAdStart?.()
        },
        adFinished: () => done(true),
        adError: (error) => done(isAdsDisabled(error)),
      })
    } catch (err) {
      // Synchronous throw — typically the SDK reporting the feature is disabled.
      console.warn('[ads] CrazyGames requestAd threw (treating as disabled):', err)
      done(true)
    }
  })
}
