import { describe, it, expect } from 'vitest'
import { initEntitlement, isPaid } from './entitlement'

describe('entitlement', () => {
  // Regression guard: isPaid() must NOT be true just because the context is
  // non-native (web). CrazyGames is non-native but shows ads, and a true here
  // would short-circuit the rewarded-ad flow into the silent no-ad path.
  it('reports not-paid until a real store entitlement is wired up', async () => {
    expect(isPaid()).toBe(false)
    await initEntitlement()
    expect(isPaid()).toBe(false)
  })
})
