// CrazyGames gameplay-state signal.
//
// CrazyGames wants to know when the actual gameplay loop is running so it can
// time ads and analytics. We bracket it with gameplayStart()/gameplayStop():
// gameplay is "active" while the game scene is running and not paused.
//
// No-op outside the CrazyGames context. State is deduped so start/stop calls
// stay paired and are never repeated.

import { isCrazyGames } from '../core/context'

interface CrazyGameApi {
  gameplayStart?: () => void
  gameplayStop?: () => void
}

function gameApi(): CrazyGameApi | undefined {
  return (window as unknown as { CrazyGames?: { SDK?: { game?: CrazyGameApi } } })
    .CrazyGames?.SDK?.game
}

let active = false

/**
 * Mark whether the gameplay loop is actively running. Call with `true` when
 * gameplay (re)starts — entering the game scene or unpausing — and `false` when
 * it stops — pausing or leaving to the menu.
 */
export function setGameplayActive(next: boolean): void {
  if (!isCrazyGames() || next === active) return
  const game = gameApi()
  // SDK not ready yet — leave state unflipped so the next transition retries
  // and start/stop stay paired.
  if (!game) return
  active = next
  try {
    if (next) game.gameplayStart?.()
    else game.gameplayStop?.()
  } catch (err) {
    console.warn('[crazygames] gameplay signal failed:', err)
  }
}

/**
 * Emit a paired gameplayStart()/gameplayStop() back-to-back. Called once the
 * SDK has loaded so CrazyGames sees an immediate gameplay cycle. Independent of
 * the run/pause tracking above — it does not touch the `active` state.
 */
export function flashGameplay(): void {
  if (!isCrazyGames()) return
  const game = gameApi()
  if (!game) return
  try {
    game.gameplayStart?.()
    game.gameplayStop?.()
  } catch (err) {
    console.warn('[crazygames] gameplay flash failed:', err)
  }
}
