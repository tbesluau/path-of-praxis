import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('router', () => {
  let router: typeof import('./router')
  let container: HTMLElement

  beforeEach(async () => {
    vi.resetModules()
    router = await import('./router')
    container = document.createElement('div')
    router.initRouter(container)
  })

  it('calls the scene factory with container and navigate', () => {
    const factory = vi.fn(() => vi.fn())
    router.registerScenes({ menu: factory, game: factory })
    router.navigate('menu')
    expect(factory).toHaveBeenCalledOnce()
    expect(factory).toHaveBeenCalledWith(container, expect.any(Function))
  })

  it('tears down the previous scene before mounting the next', () => {
    const teardown = vi.fn()
    const factory = vi.fn(() => teardown)
    router.registerScenes({ menu: factory, game: factory })
    router.navigate('menu')
    router.navigate('game')
    expect(teardown).toHaveBeenCalledOnce()
    expect(factory).toHaveBeenCalledTimes(2)
  })

  it('passes a working navigate callback to the scene', () => {
    const inner = vi.fn(() => vi.fn())
    const outer = vi.fn((_el, nav: (to: import('./router').SceneId) => void) => {
      nav('game')
      return vi.fn()
    })
    router.registerScenes({ menu: outer, game: inner })
    router.navigate('menu')
    expect(inner).toHaveBeenCalledOnce()
  })

  it('throws when navigating to an unregistered scene', () => {
    expect(() => router.navigate('game')).toThrow(/not registered/)
  })
})
