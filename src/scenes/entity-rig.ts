import { Container, Sprite } from 'pixi.js'
import {
  pickVariants,
  getBodyTex, getHeadTex, getLegTex, getArmTex, getWeaponTex, getPlayerShieldTex,
  getPlayerBodyTex, getPlayerHeadTex, getPlayerLegTex, getPlayerArmTex,
  type Tier, type Weapon, type PlayerColorKey, type HeadVariant, type ShieldVariant,
} from '../assets/entity-art'
import type { EntityRole } from '../core/entity'

// ── Animation constants ───────────────────────────────────────────────────────

const BASE_RADIUS   = 20
const WALK_FREQ     = 0.014   // rad/ms — leg swing frequency
const LEG_SWING     = 0.85   // max leg rotation (rad)
const ARM_COUNTER   = 0.7    // arm counter-swing fraction of leg swing
const BOB_AMOUNT    = 2.6    // px, body vertical bob
const BODY_WOBBLE   = 0.09   // rad, upper-body side-to-side lean while walking
const BREATHE_FREQ  = 0.0012 // idle breathing frequency

// Weapons render 20% larger than their native SVG size for visibility.
const WEAPON_SCALE  = 1.2
// Shields render slightly larger too, hanging from the back (non-weapon) hand.
const SHIELD_SCALE  = 1.1

// Weapon anchor.y values (fraction from top = grip position in SVG)
const WEAPON_GRIP_Y: Record<string, number> = {
  sword:          0.79,
  bow:            0.5,
  hammer:         0.81,
  staff:          0.76,
  wand:           0.75,
  bomb:           0.25,   // hold near wick; body hangs below
  branch_staff:   0.78,
  lightning_bolt: 0.79,
}
const WEAPON_GRIP_X = 0.5

// Parts sized for BASE_RADIUS = 20 (px). All positions are in rig-local space
// where y=0 is the entity centre (waist). Scaled via container.scale at runtime.
const BODY_W  = 30, BODY_H  = 27
const HEAD_W  = 24, HEAD_H  = 20
const LEG_W   = 10, LEG_H   = 18
const ARM_W   = 10, ARM_H   = 16

// Rig-local positions (y < 0 = up, y > 0 = down)
const BODY_Y      = -11   // lowered so the slimmer, taller trunk overlaps the leg tops
const HEAD_Y      = -26   // bottom of head (anchor = bottom-centre)
const HEAD_X      = 2     // slight forward offset for 3/4 perspective
const BACK_LEG_X  = -5
const FRONT_LEG_X = 5
const LEG_Y       = 0
const BACK_ARM_X  = -16
const FRONT_ARM_X = 16
const ARM_Y       = -26   // shoulder pivot

// Topmost visual point of the rig (head crown) in rig-local space, including a
// little headroom for the walk bob — used to place HP bars/markers above the head.
const RIG_TOP_LOCAL = (HEAD_Y - HEAD_H) - 3   // negative (up)

/** Distance from the entity centre to the top of the rendered rig for a given radius. */
export function rigTopOffset(radius: number): number {
  return Math.abs(RIG_TOP_LOCAL) * (radius / BASE_RADIUS)
}

// ── EntityRig interface ───────────────────────────────────────────────────────

export interface EntityRig {
  container: Container
  setWeapon(w: Weapon): void
  setShield(v: ShieldVariant | null): void
  setFacing(f: 1 | -1): void
  playAttack(durationMs: number): void
  update(deltaMs: number, opts: { vx: number; speed: number; maxSpeed: number }): void
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function createEntityRig(opts: {
  role:         EntityRole
  tier:         Tier
  weapon:       Weapon
  radius:       number
  seed:         string
  colorKey?:    PlayerColorKey
  headOverride?: HeadVariant
  shield?:      ShieldVariant | null
}): EntityRig {
  const { tier, weapon, radius, seed } = opts
  const { body: bodyV, head: seedHeadV } = pickVariants(seed)
  const headV = opts.headOverride ?? seedHeadV
  const rigScale = radius / BASE_RADIUS
  const colorKey = opts.colorKey

  const legTex  = colorKey ? getPlayerLegTex(colorKey)           : getLegTex(tier)
  const armTex  = colorKey ? getPlayerArmTex(colorKey)           : getArmTex(tier)
  const bodyTex = colorKey ? getPlayerBodyTex(bodyV, colorKey)   : getBodyTex(bodyV, tier)
  const headTex = colorKey ? getPlayerHeadTex(headV, colorKey)   : getHeadTex(headV, tier)

  // ── Build sprites ──────────────────────────────────────────────────────────

  function makeSprite(tex: Texture, w: number, h: number, ax: number, ay: number): Sprite {
    const s = new Sprite(tex)
    s.width = w; s.height = h
    s.anchor.set(ax, ay)
    return s
  }

  const backLeg  = makeSprite(legTex,  LEG_W, LEG_H, 0.5, 0)
  const backArm  = makeSprite(armTex,  ARM_W, ARM_H, 0.5, 0)
  const body     = makeSprite(bodyTex, BODY_W, BODY_H, 0.5, 0.5)
  const head     = makeSprite(headTex, HEAD_W, HEAD_H, 0.5, 1.0)
  const frontLeg = makeSprite(legTex,  LEG_W, LEG_H, 0.5, 0)
  const frontArm = makeSprite(armTex,  ARM_W, ARM_H, 0.5, 0)

  const weaponSprite = makeSprite(
    getWeaponTex(weapon),
    getWeaponTex(weapon).width  * WEAPON_SCALE,
    getWeaponTex(weapon).height * WEAPON_SCALE,
    WEAPON_GRIP_X,
    WEAPON_GRIP_Y[weapon.type] ?? 0.75,
  )

  // Front arm gets a sub-container so the weapon rotates with it
  const frontArmC = new Container()
  frontArmC.addChild(frontArm)
  frontArmC.addChild(weaponSprite)
  weaponSprite.position.set(0, ARM_H)  // grip at hand position

  // Back arm gets a sub-container too so a shield swings with it. Player-only
  // today (shield textures exist per player colour), but the seam is generic.
  const backArmC = new Container()
  backArmC.addChild(backArm)
  const shieldSprite = new Sprite()
  shieldSprite.anchor.set(0.5, 0.45)
  shieldSprite.position.set(0, ARM_H)  // held at the hand
  shieldSprite.visible = false
  backArmC.addChild(shieldSprite)

  // ── Layout ────────────────────────────────────────────────────────────────

  backLeg.position.set(BACK_LEG_X,   LEG_Y)
  backArmC.position.set(BACK_ARM_X,  ARM_Y)
  body.position.set(0,                BODY_Y)
  head.position.set(HEAD_X,           HEAD_Y)
  frontLeg.position.set(FRONT_LEG_X, LEG_Y)
  frontArmC.position.set(FRONT_ARM_X, ARM_Y)

  // ── Container assembly (back-to-front order) ───────────────────────────────

  const container = new Container()
  container.addChild(backLeg)
  container.addChild(backArmC)
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

  function setShield(v: ShieldVariant | null): void {
    if (!v || !colorKey) {
      shieldSprite.visible = false
      return
    }
    const tex = getPlayerShieldTex(v, colorKey)
    shieldSprite.texture = tex
    shieldSprite.width   = tex.width  * SHIELD_SCALE
    shieldSprite.height  = tex.height * SHIELD_SCALE
    shieldSprite.visible = true
  }
  if (opts.shield) setShield(opts.shield)

  function setWeapon(w: Weapon): void {
    const tex = getWeaponTex(w)
    weaponSprite.texture  = tex
    weaponSprite.width    = tex.width  * WEAPON_SCALE
    weaponSprite.height   = tex.height * WEAPON_SCALE
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
    const walking   = speedFrac > 0.05

    // Walk phase
    if (walking) {
      walkAcc += deltaMs
    }
    const walkPhase = walkAcc * WALK_FREQ
    const stride    = Math.sin(walkPhase)          // -1 → 1, drives legs/arms/wobble
    const bob       = Math.abs(stride)             // 0 → 1, two bobs per stride cycle

    // Body bob (vertical lift on each footfall)
    const bobY = walking ? bob * BOB_AMOUNT * speedFrac : Math.sin(walkAcc * BREATHE_FREQ) * 0.4
    body.y = BODY_Y - bobY
    head.y = HEAD_Y - bobY

    // Upper-body wobble — torso & head lean side to side in step with the stride
    const wobble = walking ? stride * BODY_WOBBLE * speedFrac : 0
    body.rotation = wobble
    head.rotation = wobble * 0.6

    // Leg swing
    const legSwing = walking ? stride * LEG_SWING * speedFrac : 0
    frontLeg.rotation = legSwing
    backLeg.rotation  = -legSwing

    // Attack animation
    if (attackRemMs > 0) {
      attackRemMs = Math.max(0, attackRemMs - deltaMs)
      const p = 1 - attackRemMs / attackTotMs   // 0 → 1
      // wind-up (0→0.3): arm cocks back; swing (0.3→0.65): big forward sweep;
      // follow-through/return (0.65→1) settles back to neutral.
      let angle: number
      if (p < 0.3)       angle = -1.3 * (p / 0.3)
      else if (p < 0.65) angle = -1.3 + 3.6 * ((p - 0.3) / 0.35)   // sweeps to +2.3
      else               angle =  2.3 - 2.3 * ((p - 0.65) / 0.35)
      frontArmC.rotation = angle
      // Back arm and torso counter the swing for follow-through punch
      backArmC.rotation  = angle * -0.25
      body.rotation      = wobble + angle * 0.12
    } else {
      // Idle / walk arm swing (counter to legs)
      const armSwing = walking ? -legSwing * ARM_COUNTER : 0
      frontArmC.rotation = armSwing
      backArmC.rotation  = -armSwing
    }
  }

  return { container, setWeapon, setShield, setFacing, playAttack, update }
}

// Re-export Sprite type for use without importing pixi directly
import type { Texture } from 'pixi.js'
