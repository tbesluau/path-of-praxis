import { Container, Sprite } from 'pixi.js'
import {
  pickVariants,
  getBodyTex, getHeadTex, getLegTex, getArmTex, getWeaponTex,
  type Tier, type Weapon,
} from '../assets/entity-art'
import type { EntityRole } from '../core/entity'

// ── Animation constants ───────────────────────────────────────────────────────

const BASE_RADIUS   = 20
const WALK_FREQ     = 0.006   // rad/ms — leg swing frequency
const LEG_SWING     = 0.55   // max leg rotation (rad)
const ARM_COUNTER   = 0.4    // arm counter-swing fraction of leg swing
const BOB_AMOUNT    = 1.8    // px, body vertical bob
const BREATHE_FREQ  = 0.0012 // idle breathing frequency

// Weapon anchor.y values (fraction from top = grip position in SVG)
const WEAPON_GRIP_Y: Record<string, number> = {
  sword:  0.79,
  bow:    0.5,
  hammer: 0.81,
  staff:  0.76,
  wand:   0.75,
}
const WEAPON_GRIP_X = 0.5

// Parts sized for BASE_RADIUS = 20 (px). All positions are in rig-local space
// where y=0 is the entity centre (waist). Scaled via container.scale at runtime.
const BODY_W  = 36, BODY_H  = 22
const HEAD_W  = 24, HEAD_H  = 20
const LEG_W   = 10, LEG_H   = 18
const ARM_W   = 10, ARM_H   = 16

// Rig-local positions (y < 0 = up, y > 0 = down)
const BODY_Y      = -13
const HEAD_Y      = -26   // bottom of head (anchor = bottom-centre)
const HEAD_X      = 2     // slight forward offset for 3/4 perspective
const BACK_LEG_X  = -5
const FRONT_LEG_X = 5
const LEG_Y       = 0
const BACK_ARM_X  = -16
const FRONT_ARM_X = 16
const ARM_Y       = -26   // shoulder pivot

// ── EntityRig interface ───────────────────────────────────────────────────────

export interface EntityRig {
  container: Container
  setWeapon(w: Weapon): void
  setFacing(f: 1 | -1): void
  playAttack(durationMs: number): void
  update(deltaMs: number, opts: { vx: number; speed: number; maxSpeed: number }): void
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function createEntityRig(opts: {
  role:   EntityRole
  tier:   Tier
  weapon: Weapon
  radius: number
  seed:   string
}): EntityRig {
  const { tier, weapon, radius, seed } = opts
  const { body: bodyV, head: headV } = pickVariants(seed)
  const rigScale = radius / BASE_RADIUS

  // ── Build sprites ──────────────────────────────────────────────────────────

  function makeSprite(tex: Texture, w: number, h: number, ax: number, ay: number): Sprite {
    const s = new Sprite(tex)
    s.width = w; s.height = h
    s.anchor.set(ax, ay)
    return s
  }

  const backLeg  = makeSprite(getLegTex(tier),  LEG_W, LEG_H, 0.5, 0)
  const backArm  = makeSprite(getArmTex(tier),  ARM_W, ARM_H, 0.5, 0)
  const body     = makeSprite(getBodyTex(bodyV, tier), BODY_W, BODY_H, 0.5, 0.5)
  const head     = makeSprite(getHeadTex(headV, tier), HEAD_W, HEAD_H, 0.5, 1.0)
  const frontLeg = makeSprite(getLegTex(tier),  LEG_W, LEG_H, 0.5, 0)
  const frontArm = makeSprite(getArmTex(tier),  ARM_W, ARM_H, 0.5, 0)

  const weaponSprite = makeSprite(
    getWeaponTex(weapon),
    getWeaponTex(weapon).width,
    getWeaponTex(weapon).height,
    WEAPON_GRIP_X,
    WEAPON_GRIP_Y[weapon.type] ?? 0.75,
  )

  // Front arm gets a sub-container so the weapon rotates with it
  const frontArmC = new Container()
  frontArmC.addChild(frontArm)
  frontArmC.addChild(weaponSprite)
  weaponSprite.position.set(0, ARM_H)  // grip at hand position

  // ── Layout ────────────────────────────────────────────────────────────────

  backLeg.position.set(BACK_LEG_X,   LEG_Y)
  backArm.position.set(BACK_ARM_X,   ARM_Y)
  body.position.set(0,                BODY_Y)
  head.position.set(HEAD_X,           HEAD_Y)
  frontLeg.position.set(FRONT_LEG_X, LEG_Y)
  frontArmC.position.set(FRONT_ARM_X, ARM_Y)

  // ── Container assembly (back-to-front order) ───────────────────────────────

  const container = new Container()
  container.addChild(backLeg)
  container.addChild(backArm)
  container.addChild(body)
  container.addChild(head)
  container.addChild(frontLeg)
  container.addChild(frontArmC)

  container.scale.y = rigScale

  // ── Mutable state ─────────────────────────────────────────────────────────

  let lastFacing:    1 | -1 = 1
  let attackRemMs  = 0
  let attackTotMs  = 0
  let walkAcc      = 0    // walk phase accumulator (ms)

  // ── Methods ───────────────────────────────────────────────────────────────

  function setWeapon(w: Weapon): void {
    const tex = getWeaponTex(w)
    weaponSprite.texture  = tex
    weaponSprite.width    = tex.width
    weaponSprite.height   = tex.height
    weaponSprite.anchor.y = WEAPON_GRIP_Y[w.type] ?? 0.75
    weaponSprite.anchor.x = WEAPON_GRIP_X
    weaponSprite.position.set(0, ARM_H)
  }

  function setFacing(f: 1 | -1): void { lastFacing = f }

  function playAttack(durationMs: number): void {
    attackRemMs = durationMs
    attackTotMs = durationMs
  }

  function update(deltaMs: number, opts: { vx: number; speed: number; maxSpeed: number }): void {
    const { vx, speed, maxSpeed } = opts

    // Update facing
    if (Math.abs(vx) > 0.5) lastFacing = vx > 0 ? 1 : -1
    container.scale.x = lastFacing * rigScale

    const speedFrac = maxSpeed > 0 ? Math.min(1, speed / maxSpeed) : 0

    // Walk phase
    if (speedFrac > 0.05) {
      walkAcc += deltaMs
    }
    const walkPhase = walkAcc * WALK_FREQ

    // Body bob
    body.y  = BODY_Y  - (speedFrac > 0.05 ? Math.abs(Math.sin(walkPhase)) * BOB_AMOUNT * speedFrac : Math.sin(walkAcc * BREATHE_FREQ) * 0.4)
    head.y  = HEAD_Y  - (speedFrac > 0.05 ? Math.abs(Math.sin(walkPhase)) * BOB_AMOUNT * speedFrac : Math.sin(walkAcc * BREATHE_FREQ) * 0.4)

    // Leg swing
    const legSwing = speedFrac > 0.05
      ? Math.sin(walkPhase) * LEG_SWING * speedFrac
      : 0
    frontLeg.rotation = legSwing
    backLeg.rotation  = -legSwing

    // Attack animation
    if (attackRemMs > 0) {
      attackRemMs = Math.max(0, attackRemMs - deltaMs)
      const p = 1 - attackRemMs / attackTotMs   // 0 → 1
      // wind-up (0→0.35): arm swings back; swing (0.35→0.7): arm sweeps forward; return (0.7→1)
      let angle: number
      if (p < 0.35)      angle = -0.9 * (p / 0.35)
      else if (p < 0.7)  angle = -0.9 + 2.4 * ((p - 0.35) / 0.35)
      else               angle =  1.5 - 1.5 * ((p - 0.7) / 0.3)
      frontArmC.rotation = angle
      backArm.rotation   = 0
    } else {
      // Idle / walk arm swing (counter to legs)
      const armSwing = speedFrac > 0.05 ? -legSwing * ARM_COUNTER : 0
      frontArmC.rotation = armSwing
      backArm.rotation   = -armSwing
    }
  }

  return { container, setWeapon, setFacing, playAttack, update }
}

// Re-export Sprite type for use without importing pixi directly
import type { Texture } from 'pixi.js'
