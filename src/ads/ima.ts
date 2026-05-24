// Fixture web "ad" implementation. The real IMA SDK integration is removed
// for the time being — this stub immediately grants the reward so we can
// exercise the rewarded-ad workflow (modals, callbacks, reward credit)
// without showing anything. Swap this for a real ad SDK before going live.

export async function showWebRewardedAd(): Promise<boolean> {
  return true
}
