import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js'
import { tokens } from '../theme'
import { t } from '../i18n'
import { createExperience } from '../core/experience'
import type { SceneId } from '../core/router'

const CIRCLE_RADIUS = 120
const HUD_HEIGHT = 220

interface WeaponDef {
  id: string
  label: string
  name: string
  baseDamage: number
}

const WEAPONS: WeaponDef[] = [
  { id: 'sword', label: 'A', name: 'Sword', baseDamage: 5 },
  { id: 'axe', label: 'B', name: 'Axe', baseDamage: 10 },
  { id: 'bow', label: 'C', name: 'Bow', baseDamage: 20 },
]

interface FloatingNumber {
  text: Text
  vy: number
  life: number
}

export function createGameScene(
  container: HTMLElement,
  _navigate: (to: SceneId) => void,
): () => void {
  const xp = createExperience()
  for (const w of WEAPONS) xp.register(w.id)

  const el = document.createElement('div')
  el.className = 'scene scene-game'
  el.innerHTML = `
    <div class="game-hud">
      <div class="weapon-panel">
        ${WEAPONS.map(
          w => `
          <div class="weapon-card" data-weapon="${w.id}">
            <div class="weapon-card-head">
              <span class="weapon-card-name">${w.name}</span>
              <span class="weapon-card-level" data-field="level">Lv 1</span>
            </div>
            <div class="weapon-card-bar"><div class="weapon-card-fill" data-field="fill"></div></div>
            <div class="weapon-card-meta">
              <span data-field="xp">0 / 100 xp</span>
              <span data-field="dmg">${w.baseDamage} dmg</span>
            </div>
          </div>
        `,
        ).join('')}
      </div>
      <div class="game-action-row">
        ${WEAPONS.map(
          w => `
          <button class="game-action-btn" data-weapon="${w.id}">${w.label}</button>
        `,
        ).join('')}
        <button class="game-action-btn game-action-die" data-action="die" title="${t('game', 'die')}">
          ${t('game', 'die')}
        </button>
      </div>
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

      const stage = app.stage
      const dummy = new Container()
      stage.addChild(dummy)

      const dummyBody = new Graphics()
      dummyBody.circle(0, 0, CIRCLE_RADIUS)
      dummyBody.fill({ color: tokens.color.surfacePanel })
      dummyBody.stroke({ color: tokens.color.primary, width: 3 })
      dummy.addChild(dummyBody)

      const dummyLabel = new Text({
        text: t('game', 'dummy'),
        style: new TextStyle({
          fill: tokens.color.textMuted,
          fontSize: 18,
          fontFamily: "'Inter', sans-serif",
          fontWeight: '500',
          letterSpacing: 4,
        }),
      })
      dummyLabel.anchor.set(0.5)
      dummy.addChild(dummyLabel)

      const fxLayer = new Container()
      stage.addChild(fxLayer)

      function reposition(): void {
        if (!app) return
        const { width, height } = app.screen
        dummy.position.set(width / 2, (height - HUD_HEIGHT) / 2)
        fxLayer.position.set(width / 2, (height - HUD_HEIGHT) / 2)
      }

      reposition()
      app.renderer.on('resize', reposition)

      const floats: FloatingNumber[] = []

      function spawnDamage(value: number, leveledUp: boolean): void {
        const text = new Text({
          text: leveledUp ? `+${formatNumber(value)} ★` : `-${formatNumber(value)}`,
          style: new TextStyle({
            fill: leveledUp ? tokens.color.accent : tokens.color.text,
            fontSize: leveledUp ? 28 : 22,
            fontFamily: "'Inter', sans-serif",
            fontWeight: '700',
          }),
        })
        text.anchor.set(0.5)
        text.position.set((Math.random() - 0.5) * CIRCLE_RADIUS, -CIRCLE_RADIUS * 0.4)
        fxLayer.addChild(text)
        floats.push({ text, vy: -0.9, life: 1 })
      }

      app.ticker.add(ticker => {
        const dt = ticker.deltaTime
        for (let i = floats.length - 1; i >= 0; i--) {
          const f = floats[i]
          f.text.y += f.vy * dt
          f.life -= 0.012 * dt
          f.text.alpha = Math.max(0, f.life)
          if (f.life <= 0) {
            fxLayer.removeChild(f.text)
            f.text.destroy()
            floats.splice(i, 1)
          }
        }

        const pulse = 1 + Math.sin(ticker.lastTime / 240) * 0.012
        dummy.scale.set(pulse)
      })

      let flashEnergy = 0

      app.ticker.add(ticker => {
        if (flashEnergy > 0) {
          flashEnergy = Math.max(0, flashEnergy - 0.06 * ticker.deltaTime)
          const v = Math.floor(0xff - (0xff - 0xa5) * (1 - flashEnergy))
          dummyBody.tint = (v << 16) | (v << 8) | v
        } else {
          dummyBody.tint = 0xffffff
        }
      })

      function flash(): void {
        flashEnergy = 1
      }

      function onAttack(weapon: WeaponDef): void {
        const damage = xp.damageFor(weapon.id, weapon.baseDamage)
        const result = xp.recordDamage(weapon.id, damage)
        spawnDamage(damage, result.levelsGained > 0)
        flash()
        refreshCard(weapon)
      }

      el.querySelectorAll<HTMLButtonElement>('.game-action-btn[data-weapon]').forEach(btn => {
        const weapon = WEAPONS.find(w => w.id === btn.dataset['weapon'])
        if (!weapon) return
        btn.addEventListener('click', () => onAttack(weapon))
      })

      el.querySelector<HTMLButtonElement>('[data-action="die"]')?.addEventListener('click', () => {
        xp.onDeath()
        for (const w of WEAPONS) refreshCard(w)
      })

      function refreshCard(weapon: WeaponDef): void {
        const card = el.querySelector<HTMLElement>(`.weapon-card[data-weapon="${weapon.id}"]`)
        if (!card) return
        const s = xp.snapshot(weapon.id)
        const next = s.level * 100
        const levelEl = card.querySelector<HTMLElement>('[data-field="level"]')
        const fillEl = card.querySelector<HTMLElement>('[data-field="fill"]')
        const xpEl = card.querySelector<HTMLElement>('[data-field="xp"]')
        const dmgEl = card.querySelector<HTMLElement>('[data-field="dmg"]')
        if (levelEl) {
          const bonus =
            s.bonusMultiplier > 1
              ? ` ×${s.bonusMultiplier.toFixed(2)}`
              : s.maxLevelEver > s.level
                ? ` (max ${s.maxLevelEver})`
                : ''
          levelEl.textContent = `Lv ${s.level}${bonus}`
        }
        if (fillEl) fillEl.style.width = `${Math.min(100, (s.xp / next) * 100)}%`
        if (xpEl) xpEl.textContent = `${formatNumber(s.xp)} / ${formatNumber(next)} xp`
        if (dmgEl) dmgEl.textContent = `${formatNumber(weapon.baseDamage * s.level)} dmg`
      }

      for (const w of WEAPONS) refreshCard(w)
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

function formatNumber(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(n >= 10_000 ? 0 : 1) + 'k'
  return n % 1 === 0 ? String(n) : n.toFixed(1)
}
