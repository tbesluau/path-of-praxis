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

  it('grants when the error looks like a disabled/unsupported feature', async () => {
    setSdk({ environment: 'crazygames', ad: { requestAd: (_t: string, c: Cbs) => c.adError?.({ code: 'unsupported' }) } })
    expect(await showCrazyGamesRewardedAd()).toBe(true)
  })

  it('denies on a genuine no-fill / generic error', async () => {
    setSdk({ environment: 'crazygames', ad: { requestAd: (_t: string, c: Cbs) => c.adError?.('unfilled') } })
    expect(await showCrazyGamesRewardedAd()).toBe(false)
  })

  it('grants when requestAd throws synchronously', async () => {
    setSdk({ environment: 'crazygames', ad: { requestAd: () => { throw new Error('SDK disabled') } } })
    expect(await showCrazyGamesRewardedAd()).toBe(true)
  })

  it('ignores callbacks after the first settles', async () => {
    setSdk({ environment: 'crazygames', ad: { requestAd: (_t: string, c: Cbs) => { c.adFinished?.(); c.adError?.('unfilled') } } })
    expect(await showCrazyGamesRewardedAd()).toBe(true)
  })
})
