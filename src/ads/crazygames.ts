// CrazyGames rewarded-video ad contract (SDK v3).
//
// The SDK is already loaded/initialised in the CrazyGames context (see
// src/sdk/crazygames.ts, wired from initStorage at boot). Here we only drive
// the rewarded-ad request and translate its callbacks into a single
// resolve(true|false) — true means "grant the reward".
//
// Audio: we deliberately do NOT mute here. CrazyGames mutes the game itself
// during its ads by flipping the `muteAudio` setting, which our settings-change
// listener already routes to setExternalMute().

type AdType = 'rewarded' | 'midgame'

interface AdCallbacks {
  adStarted?: () => void
  adFinished?: () => void
  adError?: (error: unknown) => void
}

interface CrazyAdSDK {
  environment?: 'local' | 'crazygames' | 'disabled'
  ad?: { requestAd(type: AdType, callbacks: AdCallbacks): void }
}

function getSdk(): CrazyAdSDK | undefined {
  return (window as unknown as { CrazyGames?: { SDK?: CrazyAdSDK } }).CrazyGames?.SDK
}

// Best-effort detection that rewarded ads are *disabled / unsupported* in this
// environment (e.g. the initial limited release on CrazyGames where the ad unit
// is turned off), as opposed to a normal no-fill / user-skip. When ads are
// genuinely off there is no ad to watch, so we still grant the reward — the
// player has gone through the motions of opting in. A plain no-fill or runtime
// error follows CrazyGames policy and grants nothing.
//
// NOTE: the exact errorData shape for the disabled case is unverified against a
// live limited-release build; this matches on the wording CrazyGames uses for
// "disabled / unsupported / unavailable". Tune the regex here once observed in
// the CrazyGames QA tool.
function looksDisabled(error: unknown): boolean {
  let text = ''
  if (typeof error === 'string') text = error
  else if (error && typeof error === 'object') {
    const e = error as { code?: unknown; message?: unknown }
    text = String(e.code ?? '') + ' ' + String(e.message ?? '')
  }
  return /disabl|unsupported|not supported|unavailable|no ad provider/i.test(text)
}

/**
 * Request a CrazyGames rewarded ad. Resolves true when the user watches it to
 * completion, OR when rewarded ads are disabled/unsupported in this environment
 * (limited release). Resolves false on a genuine no-fill, error, or skip.
 */
export function showCrazyGamesRewardedAd(): Promise<boolean> {
  return new Promise((resolve) => {
    const sdk = getSdk()
    // Ad API absent, or the SDK is in its 'disabled' environment (non-CrazyGames
    // host): no ad will ever play → grant.
    if (!sdk?.ad?.requestAd || sdk.environment === 'disabled') {
      resolve(true)
      return
    }

    let settled = false
    const done = (granted: boolean): void => {
      if (settled) return
      settled = true
      resolve(granted)
    }

    try {
      sdk.ad.requestAd('rewarded', {
        adStarted: () => { /* CrazyGames handles muting/pausing via muteAudio */ },
        adFinished: () => done(true),
        adError: (error) => done(looksDisabled(error)),
      })
    } catch (err) {
      // Synchronous throw — typically the SDK reporting the feature is disabled.
      console.warn('[ads] CrazyGames requestAd threw (treating as disabled):', err)
      done(true)
    }
  })
}
