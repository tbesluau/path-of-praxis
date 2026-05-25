let _paid = false

async function checkPaidStatus(): Promise<boolean> {
  // Fixture: always paid. Replace with real store receipt / entitlement API later.
  return true
}

export async function initEntitlement(): Promise<void> {
  _paid = await checkPaidStatus()
}

export function isPaid(): boolean {
  return _paid
}
