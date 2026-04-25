export type SceneId = 'menu' | 'game'
export type NavigateFn = (to: SceneId) => void

type SceneFactory = (container: HTMLElement, navigate: NavigateFn) => () => void

const registry = new Map<SceneId, SceneFactory>()
let appContainer: HTMLElement | null = null
let currentTeardown: (() => void) | null = null
let currentSceneId: SceneId | null = null

export function getCurrentSceneId(): SceneId | null {
  return currentSceneId
}

export function registerScenes(factories: Record<SceneId, SceneFactory>): void {
  for (const [id, factory] of Object.entries(factories) as Array<[SceneId, SceneFactory]>) {
    registry.set(id, factory)
  }
}

export function initRouter(container: HTMLElement): void {
  appContainer = container
}

export function navigate(to: SceneId): void {
  if (!appContainer) return
  currentTeardown?.()
  const factory = registry.get(to)
  if (!factory) throw new Error(`Scene "${to}" is not registered`)
  currentSceneId = to
  currentTeardown = factory(appContainer, navigate)
}
