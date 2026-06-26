import { describe, it, expect } from 'vitest'
import { classifyContext, type ContextInputs } from './context'

const base: ContextInputs = {
  native: false,
  platform: 'web',
  dev: false,
  hostname: 'pathofpraxis.com',
  inIframe: false,
  parentHost: null,
}

describe('classifyContext', () => {
  it('detects native iOS as iphone', () => {
    expect(classifyContext({ ...base, native: true, platform: 'ios' })).toBe('iphone')
  })

  it('detects native Android as android', () => {
    expect(classifyContext({ ...base, native: true, platform: 'android' })).toBe('android')
  })

  it('classifies dev builds as test regardless of host', () => {
    expect(classifyContext({ ...base, dev: true })).toBe('test')
  })

  it('classifies the GitHub Pages staging host as test', () => {
    expect(classifyContext({ ...base, hostname: 'tbesluau.github.io' })).toBe('test')
  })

  it('classifies localhost as test', () => {
    expect(classifyContext({ ...base, hostname: 'localhost' })).toBe('test')
  })

  it('detects CrazyGames from the parent frame origin', () => {
    expect(classifyContext({ ...base, inIframe: true, parentHost: 'crazygames.com' })).toBe('crazygames')
    expect(classifyContext({ ...base, inIframe: true, parentHost: 'www.crazygames.com' })).toBe('crazygames')
    expect(classifyContext({ ...base, inIframe: true, parentHost: 'games.crazygames.com' })).toBe('crazygames')
  })

  it('detects galaxy.click from the parent frame origin', () => {
    expect(classifyContext({ ...base, inIframe: true, parentHost: 'galaxy.click' })).toBe('galaxy')
    expect(classifyContext({ ...base, inIframe: true, parentHost: 'www.galaxy.click' })).toBe('galaxy')
  })

  it('falls back to web for an unknown iframe parent', () => {
    expect(classifyContext({ ...base, inIframe: true, parentHost: 'evil.example.com' })).toBe('web')
  })

  it('falls back to web when iframed but the parent origin is unknown', () => {
    expect(classifyContext({ ...base, inIframe: true, parentHost: null })).toBe('web')
  })

  it('classifies a direct production load as web', () => {
    expect(classifyContext(base)).toBe('web')
  })

  it('does not mistake a lookalike host suffix for a whitelisted portal', () => {
    expect(classifyContext({ ...base, inIframe: true, parentHost: 'notcrazygames.com.evil.com' })).toBe('web')
    expect(classifyContext({ ...base, inIframe: true, parentHost: 'crazygames.com.evil.com' })).toBe('web')
  })

  it('prioritises native over hostname/iframe signals', () => {
    expect(classifyContext({ ...base, native: true, platform: 'ios', dev: true, inIframe: true, parentHost: 'crazygames.com' })).toBe('iphone')
  })
})
