import { describe, it, expect, afterEach } from 'vitest'
import { showCrazyGamesRewardedAd } from './crazygames'

type Cbs = { adStarted?: () => void; adFinished?: () => void; adError?: (e: unknown) => void }

function setSdk(sdk: unknown): void {
  ;(window as unknown as { CrazyGames?: unknown }).CrazyGames = sdk === undefined ? undefined : { SDK: sdk }
}

afterEach(() => { setSdk(undefined) })

describe('showCrazyGamesRewardedAd', () => {
  it('grants when the ad API is absent', async () => {
    setSdk({})
    expect(await showCrazyGamesRewardedAd()).toBe(true)
  })

  it("grants when the SDK environment is 'disabled'", async () => {
    setSdk({ environment: 'disabled', ad: { requestAd: () => { throw new Error('should not be called') } } })
    expect(await showCrazyGamesRewardedAd()).toBe(true)
  })

  it('grants when the ad finishes', async () => {
    setSdk({ environment: 'crazygames', ad: { requestAd: (_t: string, c: Cbs) => c.adFinished?.() } })
    expect(await showCrazyGamesRewardedAd()).toBe(true)
  })

  it('grants on the Basic Launch ads-disabled error code', async () => {
    setSdk({ environment: 'crazygames', ad: { requestAd: (_t: string, c: Cbs) => c.adError?.({ code: 'adsDisabledBasicLaunch', message: 'Ads disabled' }) } })
    expect(await showCrazyGamesRewardedAd()).toBe(true)
  })

  it('denies on no-fill, adblock, cooldown, and other errors', async () => {
    for (const code of ['unfilled', 'adblock', 'adCooldown', 'other']) {
      setSdk({ environment: 'crazygames', ad: { requestAd: (_t: string, c: Cbs) => c.adError?.({ code, message: 'x' }) } })
      expect(await showCrazyGamesRewardedAd(), code).toBe(false)
    }
  })

  it('grants when requestAd throws synchronously', async () => {
    setSdk({ environment: 'crazygames', ad: { requestAd: () => { throw new Error('SDK disabled') } } })
    expect(await showCrazyGamesRewardedAd()).toBe(true)
  })

  it('ignores callbacks after the first settles', async () => {
    setSdk({ environment: 'crazygames', ad: { requestAd: (_t: string, c: Cbs) => { c.adFinished?.(); c.adError?.('unfilled') } } })
    expect(await showCrazyGamesRewardedAd()).toBe(true)
  })

  it('runs the pause lifecycle around a started ad', async () => {
    const events: string[] = []
    setSdk({ environment: 'crazygames', ad: { requestAd: (_t: string, c: Cbs) => { c.adStarted?.(); c.adFinished?.() } } })
    const granted = await showCrazyGamesRewardedAd({
      onAdStart: () => events.push('start'),
      onAdEnd: () => events.push('end'),
    })
    expect(granted).toBe(true)
    expect(events).toEqual(['start', 'end'])
  })

  it('does not fire onAdEnd when the ad never started (no-fill)', async () => {
    const events: string[] = []
    setSdk({ environment: 'crazygames', ad: { requestAd: (_t: string, c: Cbs) => c.adError?.({ code: 'unfilled' }) } })
    await showCrazyGamesRewardedAd({
      onAdStart: () => events.push('start'),
      onAdEnd: () => events.push('end'),
    })
    expect(events).toEqual([])
  })
})
