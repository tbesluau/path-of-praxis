import { AdMob, RewardAdPluginEvents } from '@capacitor-community/admob'
import { Capacitor } from '@capacitor/core'

// Ad unit IDs for rewarded ads. Android uses the production ID; iOS still uses
// Google's test ID until the iOS app is submitted (replace before iOS release).
// Configure the matching AdMob App IDs in the native manifests:
//   Android: AndroidManifest.xml — com.google.android.gms.ads.APPLICATION_ID
//   iOS: Info.plist — GADApplicationIdentifier
const REWARDED_AD_ID: Record<'ios' | 'android', string> = {
  ios:     'ca-app-pub-3940256099942544/1712485313',
  android: 'ca-app-pub-8347272028014390/3781042496',
}

export async function initAdMob(): Promise<void> {
  await AdMob.initialize({
    initializeForTesting: false,
    testingDevices:       [],
  })
}

export async function showNativeRewardedAd(): Promise<boolean> {
  const platform = Capacitor.getPlatform() as 'ios' | 'android' | 'web'
  if (platform === 'web') return false
  const adId = REWARDED_AD_ID[platform]

  let rewarded = false
  const rewardedHandle  = await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => { rewarded = true })
  const dismissedHandle = await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {})
  const failHandle      = await AdMob.addListener(RewardAdPluginEvents.FailedToLoad, () => {})

  try {
    await AdMob.prepareRewardVideoAd({ adId })
    await AdMob.showRewardVideoAd()
  } finally {
    await rewardedHandle.remove()
    await dismissedHandle.remove()
    await failHandle.remove()
  }
  return rewarded
}
