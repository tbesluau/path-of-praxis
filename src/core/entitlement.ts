let _paid = false

async function checkPaidStatus(): Promise<boolean> {
  // No "remove ads" store entitlement is wired up yet, so nobody is paid.
  // Whether ads run is decided by the caller via `adsAvailable()`: ad contexts
  // (native AdMob, CrazyGames) show rewarded ads; ad-free contexts (direct web,
  // galaxy, staging) take the no-ad path. `isPaid()` is reserved for a future
  // IAP that suppresses ads even where they're available.
  return false
}

export async function initEntitlement(): Promise<void> {
  _paid = await checkPaidStatus()
}

export function isPaid(): boolean {
  return _paid
}
