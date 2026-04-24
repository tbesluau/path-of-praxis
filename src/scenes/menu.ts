import { createIcons, Play, Trophy, Settings } from 'lucide'
import { t } from '../i18n'
import { tokens } from '../theme'
import type { SceneId } from '../core/router'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  opacity: number
  color: string
}

const PARTICLE_COLORS = [
  tokens.color.primary,
  tokens.color.accent,
  tokens.color.accentAlt,
]

export function createMenuScene(
  container: HTMLElement,
  navigate: (to: SceneId) => void,
): () => void {
  const el = document.createElement('div')
  el.className = 'scene scene-menu'
  el.innerHTML = `
    <canvas class="scene-bg" id="menu-canvas"></canvas>
    <div class="menu-content">
      <header class="menu-header">
        <h1 class="game-title">${t('game', 'title')}</h1>
        <p class="game-subtitle">${t('game', 'subtitle')}</p>
      </header>
      <nav class="menu-nav" aria-label="${t('menu', 'nav')}">
        <button class="menu-btn" data-action="play">
          <i data-lucide="play" aria-hidden="true"></i>
          <span>${t('menu', 'play')}</span>
        </button>
        <button class="menu-btn" data-action="ladder">
          <i data-lucide="trophy" aria-hidden="true"></i>
          <span>${t('menu', 'ladder')}</span>
        </button>
        <button class="menu-btn" data-action="options">
          <i data-lucide="settings" aria-hidden="true"></i>
          <span>${t('menu', 'options')}</span>
        </button>
      </nav>
    </div>
  `

  container.appendChild(el)
  createIcons({ icons: { Play, Trophy, Settings } })

  const canvas = el.querySelector<HTMLCanvasElement>('#menu-canvas')!
  const stopParticles = startParticles(canvas)

  el.querySelectorAll<HTMLButtonElement>('.menu-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset['action']
      if (action === 'play') navigate('game')
      else console.info(`[menu] action: ${action}`)
    })
  })

  return () => {
    stopParticles()
    el.remove()
  }
}

function startParticles(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext('2d')!
  let rafId = 0
  const particles: Particle[] = []

  function resize(): void {
    canvas.width = canvas.offsetWidth * devicePixelRatio
    canvas.height = canvas.offsetHeight * devicePixelRatio
  }

  function spawn(): void {
    particles.push({
      x: Math.random() * canvas.width,
      y: canvas.height + 8,
      vx: (Math.random() - 0.5) * 0.6,
      vy: -(Math.random() * 1.2 + 0.4),
      radius: Math.random() * 2.5 + 0.5,
      opacity: Math.random() * 0.5 + 0.2,
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
    })
  }

  function draw(): void {
    if (Math.random() < 0.25) spawn()

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      p.x += p.vx
      p.y += p.vy
      p.opacity -= 0.0015

      if (p.opacity <= 0 || p.y < -8) {
        particles.splice(i, 1)
        continue
      }

      ctx.globalAlpha = p.opacity
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.globalAlpha = 1
    rafId = requestAnimationFrame(draw)
  }

  resize()
  window.addEventListener('resize', resize)
  draw()

  return () => {
    cancelAnimationFrame(rafId)
    window.removeEventListener('resize', resize)
  }
}
