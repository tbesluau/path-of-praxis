import { isNative } from '../ads'

let _paid = false

async function checkPaidStatus(): Promise<boolean> {
  // Web has no ads or IAP — treat as ad-free.
  // On native (iOS/Android), default to free until a real store entitlement check is wired up.
  return !isNative()
}

export async function initEntitlement(): Promise<void> {
  _paid = await checkPaidStatus()
}

export function isPaid(): boolean {
  return _paid
}
