import { AdMob, RewardAdPluginEvents } from '@capacitor-community/admob'
import { Capacitor } from '@capacitor/core'

// Google's official test ad unit IDs — always serve a test ad and never count
// toward real revenue. Replace with production IDs before App Store / Play
// submission, and configure the matching App IDs in the native manifests
// (Info.plist on iOS, AndroidManifest.xml on Android).
const REWARDED_AD_ID: Record<'ios' | 'android', string> = {
  ios:     'ca-app-pub-3940256099942544/1712485313',
  android: 'ca-app-pub-3940256099942544/5224354917',
}

export async function initAdMob(): Promise<void> {
  await AdMob.initialize({
    initializeForTesting: true,
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
