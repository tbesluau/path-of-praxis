// Google IMA SDK wrapper for web rewarded ads (AdSense for Games / Ad Manager).
// The SDK script is loaded lazily on first ad request so non-web builds and
// users who never trigger an ad never pay the network cost.

// Google's sample VAST tag — always returns a test linear ad. Replace with
// the production ad-tag URL from Google Ad Manager / AdSense for Games before
// going live. Documented at https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side/tags
const REWARDED_AD_TAG =
  'https://pubads.g.doubleclick.net/gampad/ads' +
  '?iu=/21775744923/external/single_ad_samples' +
  '&sz=640x480' +
  '&cust_params=sample_ct%3Dlinear' +
  '&ciu_szs=300x250%2C728x90' +
  '&gdfp_req=1' +
  '&output=vast' +
  '&unviewed_position_start=1' +
  '&env=vp' +
  '&impl=s' +
  '&correlator='

const IMA_SDK_URL = 'https://imasdk.googleapis.com/js/sdkloader/ima3.js'

let imaReady: Promise<void> | null = null

function loadImaSdk(): Promise<void> {
  if (imaReady) return imaReady
  imaReady = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${IMA_SDK_URL}"]`)
    if (existing) { resolve(); return }
    const s = document.createElement('script')
    s.src = IMA_SDK_URL
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('IMA SDK failed to load'))
    document.head.appendChild(s)
  })
  return imaReady
}

export async function showWebRewardedAd(): Promise<boolean> {
  await loadImaSdk()
  const ima = (window as unknown as { google?: { ima?: typeof globalThis } }).google?.ima as
    | undefined
    | {
        AdDisplayContainer: new (el: HTMLElement) => { initialize(): void; destroy(): void }
        AdsLoader:          new (c: unknown) => {
          addEventListener: (t: string, f: (e: unknown) => void) => void
          requestAds:       (req: unknown) => void
        }
        AdsRequest:         new () => { adTagUrl: string }
        AdsManagerLoadedEvent: { Type: { ADS_MANAGER_LOADED: string } }
        AdErrorEvent:       { Type: { AD_ERROR: string } }
        AdEvent:            { Type: { COMPLETE: string; SKIPPED: string; ALL_ADS_COMPLETED: string; AD_ERROR: string } }
        ViewMode:           { FULLSCREEN: string }
      }

  if (!ima) return false

  return new Promise<boolean>((resolve) => {
    const container = document.createElement('div')
    container.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#000'
    document.body.appendChild(container)

    let rewarded = false
    let resolved = false
    const finish = (result: boolean): void => {
      if (resolved) return
      resolved = true
      try { adContainer.destroy() } catch { /* ignore */ }
      container.remove()
      resolve(result)
    }

    const adContainer = new ima.AdDisplayContainer(container)
    adContainer.initialize()

    const loader = new ima.AdsLoader(adContainer)

    loader.addEventListener(ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED, (e: unknown) => {
      const mgr = (e as { getAdsManager: (c: HTMLElement) => unknown }).getAdsManager(container) as {
        addEventListener: (t: string, f: (e: unknown) => void) => void
        init: (w: number, h: number, mode: string) => void
        start: () => void
      }
      mgr.addEventListener(ima.AdEvent.Type.COMPLETE,          () => { rewarded = true })
      mgr.addEventListener(ima.AdEvent.Type.ALL_ADS_COMPLETED, () => { finish(rewarded) })
      mgr.addEventListener(ima.AdEvent.Type.SKIPPED,           () => { finish(false) })
      mgr.addEventListener(ima.AdEvent.Type.AD_ERROR,          () => { finish(false) })
      mgr.init(container.clientWidth, container.clientHeight, ima.ViewMode.FULLSCREEN)
      mgr.start()
    })
    loader.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, () => { finish(false) })

    const req = new ima.AdsRequest()
    req.adTagUrl = REWARDED_AD_TAG
    loader.requestAds(req)
  })
}
