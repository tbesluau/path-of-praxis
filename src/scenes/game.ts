import { Application, Graphics, Text, TextStyle } from 'pixi.js'
import { tokens } from '../theme'
import type { SceneId } from '../core/router'

const CIRCLE_RADIUS = 120
const HUD_HEIGHT = 128

export function createGameScene(
  container: HTMLElement,
  _navigate: (to: SceneId) => void,
): () => void {
  const el = document.createElement('div')
  el.className = 'scene scene-game'
  el.innerHTML = `
    <div class="game-hud">
      <button class="game-action-btn" data-label="A">A</button>
      <button class="game-action-btn" data-label="B">B</button>
      <button class="game-action-btn" data-label="C">C</button>
    </div>
  `
  container.appendChild(el)

  let app: Application | null = null
  let destroyed = false

  ;(async () => {
    try {
      const instance = new Application()
      await instance.init({
        background: tokens.color.surface,
        resizeTo: el,
        antialias: true,
        resolution: devicePixelRatio,
        autoDensity: true,
      })

      if (destroyed) {
        instance.destroy(true)
        return
      }

      app = instance

      const wrapper = document.createElement('div')
      wrapper.className = 'game-canvas-wrapper'
      wrapper.appendChild(app.canvas)
      el.insertBefore(wrapper, el.firstChild)

      const circle = new Graphics()
      circle.circle(0, 0, CIRCLE_RADIUS)
      circle.fill({ color: tokens.color.surfacePanel })
      circle.stroke({ color: tokens.color.primary, width: 3 })
      app.stage.addChild(circle)

      const label = new Text({
        text: '',
        style: new TextStyle({
          fill: tokens.color.text,
          fontSize: 72,
          fontFamily: "'Inter', sans-serif",
          fontWeight: '600',
        }),
      })
      label.anchor.set(0.5)
      app.stage.addChild(label)

      function reposition(): void {
        if (!app) return
        const { width, height } = app.screen
        circle.position.set(width / 2, (height - HUD_HEIGHT) / 2)
        label.position.set(width / 2, (height - HUD_HEIGHT) / 2)
      }

      reposition()
      app.renderer.on('resize', reposition)

      el.querySelectorAll<HTMLButtonElement>('.game-action-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          label.text = btn.dataset['label'] ?? ''
        })
      })
    } catch (err) {
      console.error('[game] PixiJS init failed:', err)
    }
  })()

  return () => {
    destroyed = true
    app?.destroy(true)
    app = null
    el.remove()
  }
}
