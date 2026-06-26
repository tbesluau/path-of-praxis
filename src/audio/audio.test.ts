import { describe, it, expect, beforeEach } from 'vitest'
import { setExternalMute, isExternalMuted, isMuted } from './index'

describe('external (portal) mute', () => {
  beforeEach(() => {
    setExternalMute(false)
  })

  it('toggles the transient external-mute flag', () => {
    expect(isExternalMuted()).toBe(false)
    setExternalMute(true)
    expect(isExternalMuted()).toBe(true)
    setExternalMute(false)
    expect(isExternalMuted()).toBe(false)
  })

  it('does not change the user mute state or persist a preference', () => {
    const before = isMuted()
    setExternalMute(true)
    // The portal mute is independent of the user's own mute toggle.
    expect(isMuted()).toBe(before)
    expect(localStorage.getItem('pop:prefs')).toBeNull()
  })
})
