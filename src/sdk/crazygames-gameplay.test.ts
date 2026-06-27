import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({ crazy: true }))
vi.mock('../core/context', () => ({ isCrazyGames: () => h.crazy }))

function setGame(game: unknown): void {
  ;(window as unknown as { CrazyGames?: unknown }).CrazyGames =
    game === undefined ? undefined : { SDK: { game } }
}

describe('setGameplayActive', () => {
  let start: ReturnType<typeof vi.fn>
  let stop: ReturnType<typeof vi.fn>
  let setGameplayActive: (b: boolean) => void
  let flashGameplay: () => void

  beforeEach(async () => {
    vi.resetModules()
    h.crazy = true
    start = vi.fn()
    stop = vi.fn()
    setGame({ gameplayStart: start, gameplayStop: stop })
    ;({ setGameplayActive, flashGameplay } = await import('./crazygames-gameplay'))
  })

  it('starts on first activate and dedupes repeats', () => {
    setGameplayActive(true)
    setGameplayActive(true)
    expect(start).toHaveBeenCalledTimes(1)
    expect(stop).not.toHaveBeenCalled()
  })

  it('pairs start/stop across transitions', () => {
    setGameplayActive(true)
    setGameplayActive(false)
    setGameplayActive(true)
    expect(start).toHaveBeenCalledTimes(2)
    expect(stop).toHaveBeenCalledTimes(1)
  })

  it('does nothing outside the CrazyGames context', () => {
    h.crazy = false
    setGameplayActive(true)
    setGameplayActive(false)
    expect(start).not.toHaveBeenCalled()
    expect(stop).not.toHaveBeenCalled()
  })

  it('does not flip state when the SDK game API is absent (retries later)', () => {
    setGame(undefined)
    setGameplayActive(true)
    expect(start).not.toHaveBeenCalled()
    // SDK becomes available on the next transition → start fires.
    setGame({ gameplayStart: start, gameplayStop: stop })
    setGameplayActive(true)
    expect(start).toHaveBeenCalledTimes(1)
  })

  it('flashGameplay emits a paired start then stop without touching active state', () => {
    flashGameplay()
    expect(start).toHaveBeenCalledTimes(1)
    expect(stop).toHaveBeenCalledTimes(1)
    expect(start.mock.invocationCallOrder[0]).toBeLessThan(stop.mock.invocationCallOrder[0])
    // active state untouched: a real start afterwards still fires.
    setGameplayActive(true)
    expect(start).toHaveBeenCalledTimes(2)
  })

  it('flashGameplay no-ops outside the CrazyGames context', () => {
    h.crazy = false
    flashGameplay()
    expect(start).not.toHaveBeenCalled()
    expect(stop).not.toHaveBeenCalled()
  })
})
